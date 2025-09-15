// controllers/collectionController.js
import SavedLoanDetail from '../models/SavedLoanDetail.js';
import Collection from '../models/Collection.js';
import { v4 as uuidv4 } from 'uuid';

// Helper function to format Date to DD/MM/YYYY
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Get all loans for collection page with optional search
export const getAllLoans = async (req, res) => {
  try {
    const { searchQuery, page = 1, limit = 50 } = req.query;
    let query = { collectionStatus: { $in: ['Active', 'Suspended'] } }; // Exclude completed loans

    if (searchQuery) {
      query = {
        ...query,
        $or: [
          { loanId: { $regex: searchQuery, $options: 'i' } },
          { customerName: { $regex: searchQuery, $options: 'i' } },
          { customerPhone: { $regex: searchQuery, $options: 'i' } },
        ],
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Try to get from Collection model first
    let collections = await Collection.find(query)
      .select('loanId customerName customerPhone totalAmount remainingBalance collectionStatus nextDueDate nextDueAmount nextInstallmentNo overdueInstallments priority lastPaymentDate')
      .sort({ nextDueDate: 1, priority: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // If no collections found, try to sync from SavedLoanDetail
    if (collections.length === 0) {
      console.log('No collections found, attempting to sync from SavedLoanDetail...');
      await syncCollectionsFromLoans();
      
      // Try again after sync
      collections = await Collection.find(query)
        .select('loanId customerName customerPhone totalAmount remainingBalance collectionStatus nextDueDate nextDueAmount nextInstallmentNo overdueInstallments priority lastPaymentDate')
        .sort({ nextDueDate: 1, priority: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    const totalCount = await Collection.countDocuments(query);

    res.status(200).json({
      success: true,
      data: collections,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalRecords: totalCount,
        recordsPerPage: parseInt(limit)
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching loans for collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loans',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Get single loan details for collection
export const getLoanForCollection = async (req, res) => {
  try {
    const { loanId } = req.params;

    let collection = await Collection.findOne({ loanId });

    if (!collection) {
      // Try to create from SavedLoanDetail
      const savedLoan = await SavedLoanDetail.findOne({ loanId });
      if (savedLoan) {
        collection = await Collection.createFromLoan(savedLoan);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Loan not found',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Sync with latest loan data
    await collection.syncWithLoan();

    res.status(200).json({
      success: true,
      data: collection,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching loan for collection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan details',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Mark an installment as paid
export const markInstallmentPaid = async (req, res) => {
  try {
    const { loanId, installmentNo } = req.params;
    const { paidAmount, fineAmount = 0, paymentMethod = 'Cash', notes = '' } = req.body;

    // Validate inputs
    if (!paidAmount || paidAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid paid amount',
        timestamp: new Date().toISOString(),
      });
    }
    if (fineAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Fine amount cannot be negative',
        timestamp: new Date().toISOString(),
      });
    }

    // Get the loan from SavedLoanDetail (main source of truth)
    const loan = await SavedLoanDetail.findOne({ loanId });
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Find the installment
    const installment = loan.installments.find(
      (inst) => inst.installmentNo === parseInt(installmentNo)
    );
    if (!installment) {
      return res.status(404).json({
        success: false,
        message: 'Installment not found',
        timestamp: new Date().toISOString(),
      });
    }

    if (installment.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Installment already paid',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate paid amount against EMI amount
    if (paidAmount < installment.emiAmount) {
      return res.status(400).json({
        success: false,
        message: 'Paid amount must be at least the EMI amount',
        timestamp: new Date().toISOString(),
      });
    }

    // Calculate remaining balance
    const totalPaid = loan.installments.reduce(
      (sum, inst) => sum + (inst.paidAmount || 0),
      0
    );
    const remainingBalance = loan.totalAmount - totalPaid;
    if (paidAmount > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: 'Paid amount cannot exceed remaining balance',
        timestamp: new Date().toISOString(),
      });
    }

    // Update installment in SavedLoanDetail
    installment.status = 'Paid';
    installment.paidAmount = paidAmount;
    installment.paidDate = formatDate(new Date());

    // Add payment record to SavedLoanDetail
    const payment = {
      paymentId: `PAY${uuidv4().slice(0, 8)}`,
      installmentNo: parseInt(installmentNo),
      amount: paidAmount,
      fineAmount,
      totalAmount: paidAmount + fineAmount,
      date: formatDate(new Date()),
      status: 'Received',
      paymentMethod,
      notes,
    };
    loan.payments.push(payment);

    // Save the loan
    await loan.save();

    // Update collection record
    let collection = await Collection.findOne({ loanId });
    if (!collection) {
      collection = await Collection.createFromLoan(loan);
    } else {
      await collection.syncWithLoan();
    }

    // Add payment to collection record
    const collectionPayment = {
      paymentId: payment.paymentId,
      installmentNo: parseInt(installmentNo),
      amount: paidAmount,
      fineAmount,
      totalAmount: paidAmount + fineAmount,
      paymentDate: formatDate(new Date()),
      paymentMethod,
      status: 'Received',
      collectedBy: req.user?.name || 'system',
      notes,
      receiptNumber: payment.paymentId
    };
    collection.payments.push(collectionPayment);

    // Update collection installment status
    const collectionInstallment = collection.installments.find(
      inst => inst.installmentNo === parseInt(installmentNo)
    );
    if (collectionInstallment) {
      collectionInstallment.status = 'Paid';
      collectionInstallment.paidAmount = paidAmount;
      collectionInstallment.remainingAmount = 0;
      collectionInstallment.lastPaymentDate = formatDate(new Date());
    }

    await collection.save();

    // Prepare success message
    let successMessage = `Payment of ₹${paidAmount.toLocaleString()} received successfully!`;
    if (fineAmount > 0) {
      successMessage += ` (Including fine: ₹${fineAmount.toLocaleString()})`;
    }

    res.status(200).json({
      success: true,
      message: successMessage,
      data: {
        loanId,
        installmentNo: parseInt(installmentNo),
        payment: collectionPayment,
        loanStatus: loan.status,
        collectionStatus: collection.collectionStatus,
        remainingBalance: collection.remainingBalance,
        nextDueDate: collection.nextDueDate,
        nextDueAmount: collection.nextDueAmount
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error marking installment as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark installment as paid',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Update loan status (e.g., to 'Closed')
export const updateLoanStatus = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Closed', 'Defaulted'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        timestamp: new Date().toISOString(),
      });
    }

    const loan = await SavedLoanDetail.findOne({ loanId });
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
        timestamp: new Date().toISOString(),
      });
    }

    // If setting to 'Closed', ensure all installments are paid
    if (status === 'Closed') {
      const allPaid = loan.installments.every((inst) => inst.status === 'Paid');
      if (!allPaid) {
        return res.status(400).json({
          success: false,
          message: 'Cannot close loan: not all installments are paid',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Update SavedLoanDetail
    loan.status = status;
    loan.lastUpdatedBy = req.user?.id || 'system';
    await loan.save();

    // Update Collection record
    let collection = await Collection.findOne({ loanId });
    if (!collection) {
      collection = await Collection.createFromLoan(loan);
    } else {
      collection.collectionStatus = status === 'Closed' ? 'Completed' : 
                                   status === 'Defaulted' ? 'Defaulted' : 'Active';
      collection.lastUpdatedBy = req.user?.id || 'system';
      await collection.save();
    }

    res.status(200).json({
      success: true,
      message: `Loan status updated to ${status}`,
      data: { 
        loanId, 
        status, 
        collectionStatus: collection.collectionStatus 
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating loan status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update loan status',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Sync all collections from SavedLoanDetail
export const syncCollectionsFromLoans = async (req, res) => {
  try {
    console.log('Starting collection sync from loans...');
    
    const activeLoans = await SavedLoanDetail.find({ 
      status: { $ne: 'Closed' } 
    }).lean();

    let syncedCount = 0;
    let createdCount = 0;
    let errorCount = 0;

    for (const loan of activeLoans) {
      try {
        let collection = await Collection.findOne({ loanId: loan.loanId });
        
        if (!collection) {
          collection = await Collection.createFromLoan(loan);
          createdCount++;
        } else {
          await collection.syncWithLoan();
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error syncing loan ${loan.loanId}:`, error.message);
        errorCount++;
      }
    }

    const result = {
      success: true,
      message: `Collection sync completed`,
      data: {
        totalLoans: activeLoans.length,
        syncedCount,
        createdCount,
        errorCount
      },
      timestamp: new Date().toISOString()
    };

    if (res) {
      res.status(200).json(result);
    }

    return result;
  } catch (error) {
    console.error('Error syncing collections:', error);
    const result = {
      success: false,
      message: 'Failed to sync collections',
      error: error.message,
      timestamp: new Date().toISOString()
    };

    if (res) {
      res.status(500).json(result);
    }

    return result;
  }
};

// Get collection dashboard stats
export const getCollectionDashboard = async (req, res) => {
  try {
    const activeCollections = await Collection.find({ 
      collectionStatus: { $in: ['Active', 'Suspended'] } 
    });

    const totalActiveLoans = activeCollections.length;
    const totalOutstanding = activeCollections.reduce((sum, col) => sum + col.remainingBalance, 0);
    const totalOverdue = activeCollections.filter(col => col.overdueInstallments > 0).length;
    
    const todayDue = activeCollections.filter(col => {
      if (!col.nextDueDate) return false;
      const today = formatDate(new Date());
      return col.nextDueDate === today;
    }).length;

    const priorityBreakdown = {
      Critical: activeCollections.filter(col => col.priority === 'Critical').length,
      High: activeCollections.filter(col => col.priority === 'High').length,
      Medium: activeCollections.filter(col => col.priority === 'Medium').length,
      Low: activeCollections.filter(col => col.priority === 'Low').length,
    };

    res.status(200).json({
      success: true,
      data: {
        totalActiveLoans,
        totalOutstanding,
        totalOverdue,
        todayDue,
        priorityBreakdown,
        averageLoanAmount: totalActiveLoans > 0 ? Math.round(totalOutstanding / totalActiveLoans) : 0,
        collectionEfficiency: totalActiveLoans > 0 ? 
          Math.round(((totalActiveLoans - totalOverdue) / totalActiveLoans) * 100) : 0
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching collection dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};