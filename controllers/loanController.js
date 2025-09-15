// controllers/loanController.js
import Loan from "../models/Loan.js";

// Get all loans
export const getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find();
    res.status(200).json({
      success: true,
      count: loans.length,
      data: loans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Get single loan
export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findOne({ loanId: req.params.id });

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: "Loan not found",
      });
    }

    res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Create new loan
export const createLoan = async (req, res) => {
  try {
    const loan = await Loan.create(req.body);

    res.status(201).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Loan ID already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Update loan
export const updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { loanId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: "Loan not found",
      });
    }

    res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Delete loan
export const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({ loanId: req.params.id });

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: "Loan not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Process payment
export const processPayment = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { amount, fineAmount } = req.body;

    const loan = await Loan.findOne({ loanId });

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: "Loan not found",
      });
    }

    if (loan.status === "Closed") {
      return res.status(400).json({
        success: false,
        error: "Loan is already closed",
      });
    }

    // Find next unpaid installment
    const nextUnpaid = loan.installments.find((inst) => inst.status !== "Paid");

    if (!nextUnpaid) {
      return res.status(400).json({
        success: false,
        error: "All installments are already paid",
      });
    }

    // Calculate remaining payment
    const remainingForInstallment =
      nextUnpaid.emiAmount - nextUnpaid.paidAmount;

    if (amount > remainingForInstallment) {
      return res.status(400).json({
        success: false,
        error: "Payment amount exceeds remaining installment amount",
      });
    }

    // Update installment
    const installmentIndex = loan.installments.findIndex(
      (inst) => inst.installmentNo === nextUnpaid.installmentNo
    );

    loan.installments[installmentIndex].paidAmount += amount;
    loan.installments[installmentIndex].status =
      loan.installments[installmentIndex].paidAmount >=
      loan.installments[installmentIndex].emiAmount
        ? "Paid"
        : "Partial";

    // Add payment record
    const paymentRecord = {
      paymentId: `PAY${Date.now()}`,
      installmentNo: nextUnpaid.installmentNo,
      amount,
      fineAmount: fineAmount || 0,
      totalAmount: amount + (fineAmount || 0),
      date: new Date().toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      status: "Received",
    };

    if (fineAmount > 0) {
      paymentRecord.notes = "Payment includes fine for overdue installment";
    }

    loan.payments.push(paymentRecord);

    // Check if all installments are paid
    const allPaid = loan.installments.every((inst) => inst.status === "Paid");
    if (allPaid) {
      loan.status = "Closed";
    }

    await loan.save();

    res.status(200).json({
      success: true,
      data: loan,
      message: "Payment processed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Get loan statistics
export const getLoanStats = async (req, res) => {
  try {
    const loans = await Loan.find();

    const totalLoans = loans.length;
    const activeLoans = loans.filter((loan) => loan.status === "Active").length;
    const closedLoans = loans.filter((loan) => loan.status === "Closed").length;
    const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.loanAmount, 0);
    const totalInterestAmount = loans.reduce(
      (sum, loan) => sum + loan.totalInterest,
      0
    );

    const totalOutstanding = loans
      .filter((loan) => loan.status === "Active")
      .reduce((sum, loan) => {
        const paidInstallments = loan.installments.filter(
          (inst) => inst.status === "Paid"
        ).length;
        const remainingAmount =
          loan.totalAmount -
          paidInstallments * loan.installments[0].emiAmount;
        return sum + Math.max(0, remainingAmount);
      }, 0);

    res.status(200).json({
      success: true,
      data: {
        totalLoans,
        activeLoans,
        closedLoans,
        totalLoanAmount,
        totalInterestAmount,
        totalOutstanding,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

// Get collection report
export const getCollectionReport = async (req, res) => {
  try {
    const { date, period } = req.query;

    if (!date || !period) {
      return res.status(400).json({
        success: false,
        error: "Date and period are required",
      });
    }

    const queryDate = new Date(date);
    let filteredLoans = [];

    if (period === "daily") {
      filteredLoans = await Loan.find({
        "installments.dueDate": {
          $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
          $lt: new Date(queryDate.setHours(23, 59, 59, 999)),
        },
        "installments.status": { $ne: "Paid" },
      });
    } else if (period === "weekly") {
      const startOfWeek = new Date(queryDate);
      startOfWeek.setDate(
        queryDate.getDate() - queryDate.getDay() + (queryDate.getDay() === 0 ? -6 : 1)
      );
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      filteredLoans = await Loan.find({
        "installments.dueDate": {
          $gte: startOfWeek,
          $lt: endOfWeek,
        },
        "installments.status": { $ne: "Paid" },
      });
    } else if (period === "monthly") {
      const startOfMonth = new Date(
        queryDate.getFullYear(),
        queryDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        queryDate.getFullYear(),
        queryDate.getMonth() + 1,
        0
      );
      endOfMonth.setHours(23, 59, 59, 999);

      filteredLoans = await Loan.find({
        "installments.dueDate": {
          $gte: startOfMonth,
          $lt: endOfMonth,
        },
        "installments.status": { $ne: "Paid" },
      });
    }

    const reportData = filteredLoans.map((loan) => {
      const paidAmount = loan.payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
      const remainingAmount = loan.totalAmount - paidAmount;

      return {
        loanId: loan.loanId,
        customerId: loan.customerId,
        customerName: loan.customerName,
        totalLoanAmount: loan.totalAmount,
        paidAmount,
        remainingAmount,
      };
    });

    res.status(200).json({
      success: true,
      count: reportData.length,
      data: reportData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};
