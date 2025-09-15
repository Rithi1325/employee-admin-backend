// controllers/overviewController.js
import SavedLoanDetail from '../models/SavedLoanDetail.js';

// Helper functions (adapted from frontend for consistency)
const parseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string' || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return new Date();
  }
  const [day, month, year] = dateStr.split('/').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

const isSameDay = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
};

const isSameWeek = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const startOfWeek = new Date(d2);
  startOfWeek.setDate(d2.getDate() - (d2.getDay() === 0 ? 6 : d2.getDay() - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return d1 >= startOfWeek && d1 <= endOfWeek;
};

const isSameMonth = (date1, date2) => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
};

export const getOverviewData = async (req, res) => {
  try {
    const { date = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) } = req.query;
    const loans = await SavedLoanDetail.find({}).limit(1000).lean();
    const savedLoans = loans.map(loan => ({
      ...loan,
      installmentFrequency: (loan.installmentFrequency || 'Monthly').toLowerCase(),
      installments: Array.isArray(loan.installments) ? loan.installments : [],
      payments: Array.isArray(loan.payments) ? loan.payments : [],
      customerId: loan.customerId || 'N/A',
    }));

    const dailyLoans = savedLoans.filter(
      (loan) =>
        loan.installmentFrequency === 'daily' &&
        loan.installments.some((inst) => isSameDay(inst.dueDate, date) && inst.status !== 'Paid')
    ).length;

    const weeklyLoans = savedLoans.filter(
      (loan) =>
        loan.installmentFrequency === 'weekly' &&
        loan.installments.some((inst) => isSameWeek(inst.dueDate, date) && inst.status !== 'Paid')
    ).length;

    const monthlyLoans = savedLoans.filter(
      (loan) =>
        loan.installmentFrequency === 'monthly' &&
        loan.installments.some((inst) => isSameMonth(inst.dueDate, date) && inst.status !== 'Paid')
    ).length;

    const dailyCollection = savedLoans
      .filter((loan) => loan.installmentFrequency === 'daily')
      .reduce((sum, loan) => {
        const payments = (loan.payments || []).filter(p => p && typeof p.totalAmount === 'number');
        return sum + payments.reduce((pSum, payment) => pSum + (payment.totalAmount || 0), 0);
      }, 0);

    const weeklyCollection = savedLoans
      .filter((loan) => loan.installmentFrequency === 'weekly')
      .reduce((sum, loan) => {
        const payments = (loan.payments || []).filter(p => p && typeof p.totalAmount === 'number');
        return sum + payments.reduce((pSum, payment) => pSum + (payment.totalAmount || 0), 0);
      }, 0);

    const monthlyCollection = savedLoans
      .filter((loan) => loan.installmentFrequency === 'monthly')
      .reduce((sum, loan) => {
        const payments = (loan.payments || []).filter(p => p && typeof p.totalAmount === 'number');
        return sum + payments.reduce((pSum, payment) => pSum + (payment.totalAmount || 0), 0);
      }, 0);

    const totalCapital = savedLoans.reduce((sum, loan) => sum + Number(loan.loanAmount || 0), 0);

    res.json({
      success: true,
      data: {
        dailyLoans,
        weeklyLoans,
        monthlyLoans,
        dailyCollection,
        weeklyCollection,
        monthlyCollection,
        totalCapital,
      },
    });
  } catch (err) {
    console.error('Error in getOverviewData:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getFilteredLoans = async (req, res) => {
  try {
    const { period, date } = req.query;
    if (!period || !date) {
      return res.status(400).json({ success: false, message: 'Period and date are required' });
    }

    const loans = await SavedLoanDetail.find({}).limit(1000).lean();
    const savedLoans = loans.map(loan => ({
      ...loan,
      installmentFrequency: (loan.installmentFrequency || 'Monthly').toLowerCase(),
      installments: Array.isArray(loan.installments) ? loan.installments : [],
      payments: Array.isArray(loan.payments) ? loan.payments : [],
      customerId: loan.customerId || 'N/A',
    }));

    let filterFn;
    switch (period.toLowerCase()) {
      case 'daily':
        filterFn = (inst) => isSameDay(inst.dueDate, date) && inst.status !== 'Paid';
        break;
      case 'weekly':
        filterFn = (inst) => isSameWeek(inst.dueDate, date) && inst.status !== 'Paid';
        break;
      case 'monthly':
        filterFn = (inst) => isSameMonth(inst.dueDate, date) && inst.status !== 'Paid';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid period' });
    }

    const filteredLoans = savedLoans.filter(
      (loan) =>
        loan.installmentFrequency === period.toLowerCase() &&
        loan.installments.some(filterFn)
    );

    res.json({ success: true, data: filteredLoans });
  } catch (err) {
    console.error('Error in getFilteredLoans:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getReceivedPayments = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const loans = await SavedLoanDetail.find({}).limit(1000).lean();
    const savedLoans = loans.map(loan => ({
      ...loan,
      installmentFrequency: (loan.installmentFrequency || 'Monthly').toLowerCase(),
      installments: Array.isArray(loan.installments) ? loan.installments : [],
      payments: Array.isArray(loan.payments) ? loan.payments : [],
      customerId: loan.customerId || 'N/A',
    }));

    const receivedPayments = savedLoans.flatMap((loan) =>
      loan.payments.filter((payment) => isSameDay(payment.date, date)).map((payment) => ({
        paymentId: payment.paymentId || `PAY-${loan.loanId}-${payment.installmentNo}`,
        customerName: loan.customerName,
        loanAmount: Number(loan.loanAmount || 0),
        outstandingAmount: loan.installments.reduce(
          (sum, inst) => sum + (inst.status === 'Paid' ? 0 : Number(inst.emiAmount || 0)),
          0
        ),
        paidAmount: Number(payment.totalAmount || 0),
        balanceAmount: loan.installments.reduce(
          (sum, inst) => sum + (inst.status === 'Paid' ? 0 : Number(inst.emiAmount || 0)),
          0
        ) - Number(payment.totalAmount || 0),
        frequency: loan.installmentFrequency,
      }))
    );

    res.json({ success: true, data: receivedPayments });
  } catch (err) {
    console.error('Error in getReceivedPayments:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};