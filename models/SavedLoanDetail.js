import mongoose from 'mongoose';

const installmentSchema = new mongoose.Schema({
  installmentNo: { type: Number, required: true },
  dueDate: { type: String, required: true }, // Using String to match frontend format
  emiAmount: { type: Number, required: true },
  principalAmount: { type: Number, required: true },
  interestAmount: { type: Number, required: true },
  remainingBalance: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending' },
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: String }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true },
  installmentNo: { type: Number, required: true },
  amount: { type: Number, required: true },
  fineAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  date: { type: String, required: true }, // Using String to match frontend format
  status: { type: String, enum: ['Received', 'Pending', 'Failed'], default: 'Received' },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'], default: 'Cash' },
  notes: String
}, { _id: false });

const savedLoanDetailSchema = new mongoose.Schema({
  // Loan identification
  loanId: { type: String, required: true, unique: true, index: true },
  
  // Customer information
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerFatherSpouse: { type: String, default: '' },
  customerAltPhone: { type: String, default: '' },
  customerAddress: { type: String, required: true },
  customerGovIdType: { type: String, default: '' },
  customerGovIdNumber: { type: String, default: '' },
  customerPhoto: { type: String, default: null },
  
  // Loan details
  loanAmount: { type: Number, required: true, min: 1000 },
  interestRate: { type: Number, required: true, min: 0, max: 100 },
  numberOfInstallments: { type: Number, required: true, min: 1 },
  installmentFrequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
  startDate: { type: String, required: true }, // Using String to match frontend format
  
  // Calculated amounts
  totalAmount: { type: Number, required: true },
  totalInterest: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  
  // Status and tracking
  status: { type: String, enum: ['Active', 'Closed', 'Defaulted'], default: 'Active' },
  
  // Installment schedule and payments
  installments: [installmentSchema],
  payments: [paymentSchema],
  
  // Additional fields
  notes: String,
  
  // Metadata
  createdBy: { type: String, default: 'system' },
  lastUpdatedBy: { type: String, default: 'system' }
}, {
  timestamps: true
});

// Indexes for performance
savedLoanDetailSchema.index({ customerId: 1, status: 1 });
savedLoanDetailSchema.index({ createdAt: -1 });
savedLoanDetailSchema.index({ status: 1 });
savedLoanDetailSchema.index({ customerName: 'text', customerId: 'text' });

// Static method to generate loan ID
savedLoanDetailSchema.statics.generateLoanId = function() {
  return `LOAN${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
};

// Instance method to calculate loan statistics
savedLoanDetailSchema.methods.getLoanStats = function() {
  const activeInstallments = this.installments.filter(inst => inst.status !== 'Paid').length;
  const paidInstallments = this.installments.filter(inst => inst.status === 'Paid').length;
  const totalPaidAmount = this.installments
    .filter(inst => inst.status === 'Paid')
    .reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
  
  const remainingAmount = this.totalAmount - totalPaidAmount;
  const paymentProgress = totalPaidAmount > 0 ? (totalPaidAmount / this.totalAmount) * 100 : 0;
  
  return {
    activeInstallments,
    paidInstallments,
    totalPaidAmount,
    remainingAmount,
    paymentProgress: Math.round(paymentProgress * 100) / 100
  };
};

// Pre-save middleware to update status based on installments
savedLoanDetailSchema.pre('save', function(next) {
  const allInstallmentsPaid = this.installments.every(inst => inst.status === 'Paid');
  const anyInstallmentPaid = this.installments.some(inst => inst.status === 'Paid');
  
  if (allInstallmentsPaid && this.installments.length > 0) {
    this.status = 'Closed';
  } else if (anyInstallmentPaid) {
    this.status = 'Active';
  }
  
  // Calculate total paid amount
  this.paidAmount = this.installments
    .filter(inst => inst.status === 'Paid')
    .reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
  
  next();
});

const SavedLoanDetail = mongoose.model('SavedLoanDetail', savedLoanDetailSchema);
export default SavedLoanDetail;