// models/FinancialYear.js
import mongoose from 'mongoose';

const financialYearSchema = new mongoose.Schema({
  year: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const FinancialYear = mongoose.model('FinancialYear', financialYearSchema);

export default FinancialYear;