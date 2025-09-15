import SavedLoanDetail from '../models/SavedLoanDetail.js';
import mongoose from 'mongoose';

// Get all saved loans with filtering, sorting, and pagination
export const getSavedLoans = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      customerId, 
      customerName, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (customerId) {
      filter.customerId = { $regex: customerId, $options: 'i' };
    }
    
    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const loans = await SavedLoanDetail.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean() for better performance

    // Get total count for pagination
    const totalCount = await SavedLoanDetail.countDocuments(filter);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    // Get loan statistics
    const stats = await getLoanStatistics();

    res.json({
      success: true,
      data: loans,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: totalCount,
        recordsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      },
      statistics: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching saved loans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved loans',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get a single saved loan by ID
export const getSavedLoanById = async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await SavedLoanDetail.findOne({ loanId }).lean();

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
        timestamp: new Date().toISOString()
      });
    }

    // Add calculated statistics for this loan
    const loanStats = {
      activeInstallments: loan.installments.filter(inst => inst.status !== 'Paid').length,
      paidInstallments: loan.installments.filter(inst => inst.status === 'Paid').length,
      totalPaidAmount: loan.installments
        .filter(inst => inst.status === 'Paid')
        .reduce((sum, inst) => sum + (inst.paidAmount || 0), 0),
      remainingAmount: loan.totalAmount - loan.installments
        .filter(inst => inst.status === 'Paid')
        .reduce((sum, inst) => sum + (inst.paidAmount || 0), 0)
    };

    res.json({
      success: true,
      data: { ...loan, statistics: loanStats },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching saved loan by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved loan',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Create a new saved loan
export const createSavedLoan = async (req, res) => {
  try {
    const loanData = req.body;

    // Generate loan ID if not provided
    if (!loanData.loanId) {
      loanData.loanId = SavedLoanDetail.generateLoanId();
    }

    // Validate required fields
    const requiredFields = ['customerName', 'customerPhone', 'customerAddress', 'loanAmount', 'interestRate', 'numberOfInstallments', 'installmentFrequency', 'startDate'];
    const missingFields = requiredFields.filter(field => !loanData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields,
        timestamp: new Date().toISOString()
      });
    }

    // Create the loan
    const savedLoan = new SavedLoanDetail(loanData);
    await savedLoan.save();

    res.status(201).json({
      success: true,
      message: 'Loan created successfully',
      data: savedLoan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating saved loan:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Loan ID already exists',
        error: 'Duplicate loan ID',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create saved loan',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Update an existing saved loan
export const updateSavedLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.loanId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Add lastUpdatedBy field
    updateData.lastUpdatedBy = req.user?.id || 'system';

    const updatedLoan = await SavedLoanDetail.findOneAndUpdate(
      { loanId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedLoan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Loan updated successfully',
      data: updatedLoan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating saved loan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update saved loan',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Delete a saved loan
export const deleteSavedLoan = async (req, res) => {
  try {
    const { loanId } = req.params;

    const deletedLoan = await SavedLoanDetail.findOneAndDelete({ loanId });

    if (!deletedLoan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Loan deleted successfully',
      data: { loanId: deletedLoan.loanId },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting saved loan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete saved loan',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Mark an installment as paid
export const markInstallmentPaid = async (req, res) => {
  try {
    const { loanId, installmentNo } = req.params;
    const { paidAmount, fineAmount = 0, paymentMethod = 'Cash', notes = '' } = req.body;

    const loan = await SavedLoanDetail.findOne({ loanId });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
        timestamp: new Date().toISOString()
      });
    }

    // Find the installment
    const installment = loan.installments.find(inst => inst.installmentNo === parseInt(installmentNo));

    if (!installment) {
      return res.status(404).json({
        success: false,
        message: 'Installment not found',
        timestamp: new Date().toISOString()
      });
    }

    if (installment.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Installment already paid',
        timestamp: new Date().toISOString()
      });
    }

    // Update installment
    installment.status = 'Paid';
    installment.paidAmount = paidAmount || installment.emiAmount;
    installment.paidDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Add payment record
    const payment = {
      paymentId: `PAY${Date.now()}`,
      installmentNo: parseInt(installmentNo),
      amount: paidAmount || installment.emiAmount,
      fineAmount,
      totalAmount: (paidAmount || installment.emiAmount) + fineAmount,
      date: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
      status: 'Received',
      paymentMethod,
      notes
    };

    loan.payments.push(payment);

    // Save the loan
    await loan.save();

    res.json({
      success: true,
      message: 'Installment marked as paid successfully',
      data: {
        loanId,
        installmentNo: parseInt(installmentNo),
        payment,
        loanStatus: loan.status
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error marking installment as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark installment as paid',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get loan statistics
export const getLoanStatistics = async () => {
  try {
    const stats = await SavedLoanDetail.aggregate([
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalLoans: { $sum: 1 },
                totalLoanAmount: { $sum: '$loanAmount' },
                totalInterestAmount: { $sum: '$totalInterest' },
                totalAmount: { $sum: '$totalAmount' },
                totalPaidAmount: { $sum: '$paidAmount' }
              }
            }
          ],
          statusStats: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' }
              }
            }
          ],
          frequencyStats: [
            {
              $group: {
                _id: '$installmentFrequency',
                count: { $sum: 1 },
                avgLoanAmount: { $avg: '$loanAmount' }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];
    
    return {
      total: result.totalStats[0] || {
        totalLoans: 0,
        totalLoanAmount: 0,
        totalInterestAmount: 0,
        totalAmount: 0,
        totalPaidAmount: 0
      },
      byStatus: result.statusStats,
      byFrequency: result.frequencyStats
    };

  } catch (error) {
    console.error('Error getting loan statistics:', error);
    return {
      total: {
        totalLoans: 0,
        totalLoanAmount: 0,
        totalInterestAmount: 0,
        totalAmount: 0,
        totalPaidAmount: 0
      },
      byStatus: [],
      byFrequency: []
    };
  }
};

// Get loan statistics endpoint
export const getLoanStats = async (req, res) => {
  try {
    const stats = await getLoanStatistics();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching loan statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan statistics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Bulk operations
export const bulkUpdateLoans = async (req, res) => {
  try {
    const { loanIds, updateData } = req.body;

    if (!Array.isArray(loanIds) || loanIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'loanIds must be a non-empty array',
        timestamp: new Date().toISOString()
      });
    }

    // Remove fields that shouldn't be bulk updated
    delete updateData._id;
    delete updateData.loanId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const result = await SavedLoanDetail.updateMany(
      { loanId: { $in: loanIds } },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: 'Bulk update completed',
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk update',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Search loans
export const searchLoans = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        timestamp: new Date().toISOString()
      });
    }

    const searchResults = await SavedLoanDetail.find({
      $or: [
        { customerName: { $regex: query, $options: 'i' } },
        { customerId: { $regex: query, $options: 'i' } },
        { loanId: { $regex: query, $options: 'i' } },
        { customerPhone: { $regex: query, $options: 'i' } }
      ]
    })
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .lean();

    res.json({
      success: true,
      data: searchResults,
      count: searchResults.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error searching loans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search loans',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};