import mongoose from 'mongoose';

const installmentSchema = new mongoose.Schema({
  installmentNo: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  emiAmount: { type: Number, required: true },
  principalAmount: { type: Number, required: true },
  interestAmount: { type: Number, required: true },
  remainingBalance: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending' },
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: Date }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true },
  installmentNo: { type: Number, required: true },
  amount: { type: Number, required: true },
  fineAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['Received', 'Pending', 'Failed'], default: 'Received' },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'], default: 'Cash' },
  notes: String
}, { _id: false });

const personalLoanSchema = new mongoose.Schema({
  loanId: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerFatherSpouse: { type: String, default: '' },
  customerAltPhone: { type: String, default: '' },
  customerAddress: { type: String, required: true },
  customerGovIdType: { type: String, default: '' },
  customerGovIdNumber: { type: String, default: '' },
  customerPhoto: { type: String, default: null },
  
  loanAmount: { type: Number, required: true, min: 1000 },
  interestRate: { type: Number, required: true, min: 0, max: 100 },
  numberOfInstallments: { type: Number, required: true, min: 1 },
  installmentFrequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
  startDate: { type: Date, required: true },
  
  totalAmount: { type: Number, required: true },
  totalInterest: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  
  status: { type: String, enum: ['Active', 'Closed', 'Defaulted'], default: 'Active' },
  installments: [installmentSchema],
  payments: [paymentSchema],
  notes: String
}, {
  timestamps: true
});

// Indexes
personalLoanSchema.index({ customerId: 1, status: 1 });
personalLoanSchema.index({ createdAt: -1 });

// Static methods
personalLoanSchema.statics.generateLoanId = function() {
  return `LOAN${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
};

const PersonalLoan = mongoose.model('PersonalLoan', personalLoanSchema);
export default PersonalLoan;