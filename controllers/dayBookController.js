// controllers/dayBookController.js
import Voucher from '../models/Voucher.js';

export const getDayBook = async (req, res) => {
  try {
    const { date } = req.params;
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    // 1. New Loans: Vouchers disbursed or created on the date
    const newLoans = await Voucher.find({
      $or: [
        { disbursementDate: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } },
      ],
    }).populate('customer', 'customerId fullName');

    const newLoansData = newLoans.map((voucher) => ({
      id: voucher._id.toString(),
      billNo: voucher.billNo,
      customerId: voucher.customer?.customerId || 'N/A',
      customerName: voucher.customer?.fullName || 'N/A',
      finalLoanAmount: voucher.finalLoanAmount || 0,
      jewelType: voucher.jewelType || 'gold',
      netWeight: voucher.netWeight || 0,
      interestRate: voucher.interestRate || 0,
      disbursementDate: voucher.disbursementDate || voucher.createdAt,
    }));

    // 2. Interest Received: Unwind paymentHistory and match date
    const interestReceived = await Voucher.aggregate([
      { $unwind: { path: '$paymentHistory', preserveNullAndEmptyArrays: true } },
      { $match: { 'paymentHistory.date': { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          id: { $concat: [{ $toString: '$_id' }, '-', { $toString: '$paymentHistory._id' }] },
          customerId: '$customer.customerId',
          customerName: '$customer.fullName',
          interestAmount: '$paymentHistory.amount',
          paymentDate: '$paymentHistory.date',
          paymentMethod: '$paymentHistory.paymentMethod',
          receiptNo: '$paymentHistory.receiptNo',
          months: '$paymentHistory.months',
          billNo: '$billNo',
        },
      },
    ]);

    // 3. Closed Loans: Closed on the date
    const closedLoans = await Voucher.find({
      status: 'Closed',
      closedDate: { $gte: start, $lte: end },
    }).populate('customer', 'customerId fullName');

    const closedLoansData = closedLoans.map((voucher) => ({
      id: voucher._id.toString(),
      customerId: voucher.customer?.customerId || 'N/A',
      customerName: voucher.customer?.fullName || 'N/A',
      originalAmount: voucher.finalLoanAmount || 0,
      interestPaid: voucher.totalInterestPaid || 0,
      totalSettled: (voucher.finalLoanAmount || 0) + (voucher.totalInterestPaid || 0),
      closureDate: voucher.closedDate,
      billNo: voucher.billNo,
      monthsPaid: voucher.monthsPaid || 0,
    }));

    res.json({
      success: true,
      newLoans: newLoansData,
      interestReceived: interestReceived || [],
      closedLoans: closedLoansData,
    });
  } catch (err) {
    console.error('Error fetching daybook data:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch daybook data', error: err.message });
  }
};