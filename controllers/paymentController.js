// controllers/paymentController.js
const Payment = require('../models/Payment');
const Voucher = require('../models/Voucher');

// Get all payments
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('voucher', 'billNo customer jewelType finalLoanAmount interestRate')
      .sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get payments by voucher ID
exports.getPaymentsByVoucherId = async (req, res) => {
  try {
    const payments = await Payment.find({ voucher: req.params.voucherId })
      .sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create new payment
exports.createPayment = async (req, res) => {
  try {
    const { voucher, months, amount, date } = req.body;
    
    // Validate input
    if (!voucher || !months || !amount || !date) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const newPayment = new Payment({
      voucher,
      months,
      amount,
      date
    });
    
    const savedPayment = await newPayment.save();
    
    // Update voucher with payment reference
    await Voucher.findByIdAndUpdate(voucher, {
      $push: { paymentHistory: savedPayment._id }
    });
    
    res.status(201).json(savedPayment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete payment
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Remove payment reference from voucher
    await Voucher.findByIdAndUpdate(payment.voucher, {
      $pull: { paymentHistory: payment._id }
    });
    
    await payment.deleteOne();
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};