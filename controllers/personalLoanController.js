import PersonalLoan from "../models/personalloan.js";

// Helper function to calculate installments
const calculateInstallments = (loanAmount, interestRate, numberOfInstallments, installmentFrequency, startDate) => {
  const principal = parseFloat(loanAmount);
  const rate = parseFloat(interestRate) / 100;
  const totalInterest = principal * rate;
  const totalAmount = principal + totalInterest;
  const emi = totalAmount / numberOfInstallments;

  const installments = [];
  let remainingBalance = principal;
  const loanStartDate = new Date(startDate);

  for (let i = 1; i <= numberOfInstallments; i++) {
    const interestAmount = emi * (totalInterest / totalAmount);
    const principalAmount = emi - interestAmount;
    remainingBalance -= principalAmount;

    const dueDate = new Date(loanStartDate);
    if (installmentFrequency === 'Daily') {
      dueDate.setDate(loanStartDate.getDate() + i);
    } else if (installmentFrequency === 'Weekly') {
      dueDate.setDate(loanStartDate.getDate() + (i * 7));
    } else if (installmentFrequency === 'Monthly') {
      dueDate.setMonth(loanStartDate.getMonth() + i);
    }

    installments.push({
      installmentNo: i,
      dueDate,
      emiAmount: parseFloat(emi.toFixed(2)),
      principalAmount: parseFloat(principalAmount.toFixed(2)),
      interestAmount: parseFloat(interestAmount.toFixed(2)),
      remainingBalance: parseFloat(Math.max(0, remainingBalance).toFixed(2)),
      status: 'Pending'
    });
  }

  return { installments, totalInterest, totalAmount };
};

// Create a new personal loan
export const createPersonalLoan = async (req, res) => {
  try {
    const {
      customerId, customerName, customerPhone, customerAddress,
      loanAmount, interestRate, numberOfInstallments, installmentFrequency, startDate
    } = req.body;

    if (!customerId || !customerName || !loanAmount || !numberOfInstallments) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const loanId = `LOAN${Date.now()}`;
    const { installments, totalInterest, totalAmount } = calculateInstallments(
      loanAmount, interestRate, numberOfInstallments, installmentFrequency, startDate
    );

    const newLoan = new PersonalLoan({
      loanId,
      ...req.body,
      loanAmount: parseFloat(loanAmount),
      totalInterest,
      totalAmount,
      installments,
      status: 'Active'
    });

    const savedLoan = await newLoan.save();
    res.status(201).json({
      success: true,
      message: 'Loan created successfully',
      data: savedLoan
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create loan',
      error: error.message
    });
  }
};

// Get all loans with pagination
export const getPersonalLoans = async (req, res) => {
  try {
    const { page = 1, limit = 10, customerId, status, search } = req.query;
    
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { loanId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const loans = await PersonalLoan.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PersonalLoan.countDocuments(filter);

    res.json({
      success: true,
      data: loans,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loans',
      error: error.message
    });
  }
};

// Get loan by ID
export const getPersonalLoanById = async (req, res) => {
  try {
    const loan = await PersonalLoan.findOne({
      $or: [{ _id: req.params.id }, { loanId: req.params.id }]
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    res.json({ success: true, data: loan });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve loan',
      error: error.message
    });
  }
};

// Update loan
export const updatePersonalLoan = async (req, res) => {
  try {
    const loan = await PersonalLoan.findOneAndUpdate(
      { $or: [{ _id: req.params.id }, { loanId: req.params.id }] },
      req.body,
      { new: true }
    );

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    res.json({
      success: true,
      message: 'Loan updated successfully',
      data: loan
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update loan',
      error: error.message
    });
  }
};

// Delete loan
export const deletePersonalLoan = async (req, res) => {
  try {
    const loan = await PersonalLoan.findOneAndDelete({
      $or: [{ _id: req.params.id }, { loanId: req.params.id }]
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    res.json({
      success: true,
      message: 'Loan deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete loan',
      error: error.message
    });
  }
};

// Mark installment as paid
export const markInstallmentPaid = async (req, res) => {
  try {
    const { installmentNo, paidAmount, paymentMethod = 'Cash' } = req.body;

    const loan = await PersonalLoan.findOne({
      $or: [{ _id: req.params.id }, { loanId: req.params.id }]
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    const installment = loan.installments.find(inst => inst.installmentNo === installmentNo);
    if (!installment || installment.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Installment not found or already paid'
      });
    }

    // Update installment
    installment.status = 'Paid';
    installment.paidAmount = paidAmount || installment.emiAmount;
    installment.paidDate = new Date();

    // Add payment record
    loan.payments.push({
      paymentId: `PAY${Date.now()}`,
      installmentNo,
      amount: installment.paidAmount,
      fineAmount: 0,
      totalAmount: installment.paidAmount,
      paymentMethod,
      status: 'Received'
    });

    // Update loan totals
    loan.paidAmount += installment.paidAmount;
    
    // Check if all installments are paid
    const allPaid = loan.installments.every(inst => inst.status === 'Paid');
    if (allPaid) loan.status = 'Closed';

    await loan.save();

    res.json({
      success: true,
      message: 'Installment paid successfully',
      data: loan
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark installment as paid',
      error: error.message
    });
  }
};

// Get loan statistics
export const getLoanStatistics = async (req, res) => {
  try {
    const { customerId } = req.query;
    const filter = customerId ? { customerId } : {};

    const stats = await PersonalLoan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          activeLoans: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
          closedLoans: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
          totalLoanAmount: { $sum: '$loanAmount' },
          totalInterestAmount: { $sum: '$totalInterest' },
          totalPaid: { $sum: '$paidAmount' }
        }
      }
    ]);

    const result = stats[0] || {
      totalLoans: 0,
      activeLoans: 0,
      closedLoans: 0,
      totalLoanAmount: 0,
      totalInterestAmount: 0,
      totalPaid: 0
    };

    res.json({ success: true, data: result });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
};