// models/InterestRate.js - Fixed ES6 Version
import mongoose from 'mongoose';

const interestRateSchema = new mongoose.Schema({
  metalType: {
    type: String,
    required: true,
    enum: ['gold', 'silver']
  },
  minAmount: {
    type: Number,  // Changed from String to Number for proper validation
    required: true
  },
  maxAmount: {
    type: Number,  // Changed from String to Number for proper validation  
    required: true
  },
  interest: {
    type: Number,  // Changed from String to Number for proper calculations
    required: true
  },
  date: {  // Changed from dateAdded to date to match controller
    type: String,  // Keep as String since you're storing formatted dates
    default: () => new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }
}, {
  timestamps: true  // This adds createdAt and updatedAt fields automatically
});

// Add index for better query performance
interestRateSchema.index({ metalType: 1, minAmount: 1 });

// Add validation middleware
interestRateSchema.pre('save', function(next) {
  // Ensure minAmount is less than maxAmount
  if (this.minAmount >= this.maxAmount) {
    next(new Error('Maximum amount must be greater than minimum amount'));
  } else {
    next();
  }
});

const InterestRate = mongoose.model('InterestRate', interestRateSchema);

export default InterestRate;