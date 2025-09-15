// controllers/financialYearController.js
import FinancialYear from "../models/FinancialYear.js";
import Voucher from "../models/Voucher.js";
import Customer from "../models/Customer.js";
import generateId from "../utils/generateId.js"; // if used elsewhere

// @desc    Get all financial years
// @route   GET /api/financial-year
// @access  Private
export const getFinancialYears = async (req, res) => {
  try {
    const financialYears = await FinancialYear.find().sort({ year: -1 });
    res.json(financialYears);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Create a financial year
// @route   POST /api/financial-year
// @access  Private (Admin only)
export const createFinancialYear = async (req, res) => {
  const { year, initialStockValue, finalStockValue } = req.body;

  try {
    const existingYear = await FinancialYear.findOne({ year });
    if (existingYear) {
      return res.status(400).json({ msg: "Financial year already exists" });
    }

    const period = `01/04/${year} - 31/03/${year + 1}`;
    const startDate = new Date(`${year}-04-01`);
    const endDate = new Date(`${year + 1}-03-31`);

    await FinancialYear.updateMany({ isActive: true }, { isActive: false });

    const newFinancialYear = new FinancialYear({
      year,
      period,
      startDate,
      endDate,
      isActive: true,
      initialStockValue: initialStockValue || 0,
      finalStockValue: finalStockValue || 0,
    });

    const financialYear = await newFinancialYear.save();
    res.json(financialYear);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get financial summary for a specific year
// @route   GET /api/financial-year/summary/:year
// @access  Private
export const getFinancialSummary = async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const financialYear = await FinancialYear.findOne({ year });
    if (!financialYear) return res.status(404).json({ msg: "Financial year not found" });

    const vouchers = await Voucher.find({ financialYearId: financialYear._id });
    const customers = await Customer.find();

    const totalLoans = vouchers
      .filter(v => v.type === "loan" && v.status === "active")
      .reduce((sum, v) => sum + v.amount, 0);

    const totalInterest = vouchers
      .filter(v => v.type === "interest" && v.status === "active")
      .reduce((sum, v) => sum + v.amount, 0);

    const totalTransactionAmount = vouchers.reduce((sum, v) => sum + v.amount, 0);
    const activeCustomers = customers.filter(c => c.status === "active").length;

    const netProfit = financialYear.finalStockValue - financialYear.initialStockValue + totalInterest - totalTransactionAmount;

    const formatCurrency = (value) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);

    const currentDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const summary = {
      period: financialYear.period,
      totalLoans: formatCurrency(totalLoans),
      totalInterest: formatCurrency(totalInterest),
      initialStockValue: formatCurrency(financialYear.initialStockValue),
      finalStockValue: formatCurrency(financialYear.finalStockValue),
      netProfit: formatCurrency(netProfit),
      lastUpdated: currentDate,
      vouchers,
      customers,
      activeCustomers,
    };

    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Update a financial year
// @route   PUT /api/financial-year/:id
// @access  Private (Admin only)
export const updateFinancialYear = async (req, res) => {
  const { initialStockValue, finalStockValue, isActive } = req.body;

  try {
    let financialYear = await FinancialYear.findById(req.params.id);
    if (!financialYear) return res.status(404).json({ msg: "Financial year not found" });

    if (isActive) {
      await FinancialYear.updateMany({ _id: { $ne: req.params.id } }, { isActive: false });
    }

    financialYear = await FinancialYear.findByIdAndUpdate(
      req.params.id,
      { $set: { initialStockValue, finalStockValue, isActive } },
      { new: true }
    );

    res.json(financialYear);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Cleanup inactive vouchers and customers
// @route   DELETE /api/financial-year/cleanup
// @access  Private (Admin only)
export const cleanupInactiveData = async (req, res) => {
  try {
    const voucherResult = await Voucher.deleteMany({ status: "inactive" });
    const customerResult = await Customer.deleteMany({ status: "inactive" });

    res.json({
      msg: "Cleanup completed successfully",
      deletedVouchers: voucherResult.deletedCount,
      deletedCustomers: customerResult.deletedCount,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Get active financial year
// @route   GET /api/financial-year/active
// @access  Private
export const getActiveFinancialYear = async (req, res) => {
  try {
    const activeYear = await FinancialYear.findOne({ isActive: true });
    if (!activeYear) return res.status(404).json({ msg: "No active financial year found" });

    res.json(activeYear);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
