const mongoose = require('mongoose');

const interestRateSchema = new mongoose.Schema({
  metalType: {
    type: String,
    required: true,
    enum: ['gold', 'silver']
  },
  minAmount: {
    type: String,
    required: true
  },
  maxAmount: {
    type: String,
    required: true
  },
  interest: {
    type: String,
    required: true
  },
  dateAdded: {
    type: String,
    default: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  }
});

module.exports = mongoose.model('InterestRate', interestRateSchema);