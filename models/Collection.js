import mongoose from 'mongoose';

const collectionPaymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  installmentNo: { type: Number, required: true },
  amount: { type: Number, required: true, min: 0 },
  fineAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true },
  paymentDate: { type: String, required: true }, // DD/MM/YYYY format
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'NEFT', 'RTGS'], 
    default: 'Cash' 
  },
  status: { 
    type: String, 
    enum: ['Received', 'Pending', 'Failed', 'Refunded'], 
    default: 'Received' 
  },
  collectedBy: { type: String, default: 'system' },
  notes: { type: String, default: '' },
  receiptNumber: { type: String }
}, { _id: false });

const collectionInstallmentSchema = new mongoose.Schema({
  installmentNo: { type: Number, required: true },
  originalDueDate: { type: String, required: true },
  emiAmount: { type: Number, required: true },
  principalAmount: { type: Number, required: true },
  interestAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Paid', 'Overdue', 'Partial'], 
    default: 'Pending' 
  },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  lastPaymentDate: { type: String },
  overdueDate: { type: String },
  overdueDays: { type: Number, default: 0 }
}, { _id: false });

const collectionSchema = new mongoose.Schema({
  // Reference to original loan
  loanId: { 
    type: String, 
    required: true, 
    index: true,
    ref: 'SavedLoanDetail'
  },
  
  // Customer information (duplicated for quick access)
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerAddress: { type: String, required: true },
  customerPhoto: { type: String },
  
  // Loan summary
  originalLoanAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  totalInterest: { type: Number, required: true },
  numberOfInstallments: { type: Number, required: true },
  installmentFrequency: { 
    type: String, 
    enum: ['Daily', 'Weekly', 'Monthly'], 
    required: true 
  },
  
  // Collection status
  collectionStatus: { 
    type: String, 
    enum: ['Active', 'Completed', 'Defaulted', 'Suspended'], 
    default: 'Active' 
  },
  
  // Payment summary
  totalPaidAmount: { type: Number, default: 0 },
  totalFinesPaid: { type: Number, default: 0 },
  remainingBalance: { type: Number, required: true },
  
  // Progress tracking
  paidInstallments: { type: Number, default: 0 },
  pendingInstallments: { type: Number, required: true },
  overdueInstallments: { type: Number, default: 0 },
  
  // Next due information
  nextDueDate: { type: String },
  nextDueAmount: { type: Number },
  nextInstallmentNo: { type: Number },
  
  // Collection schedule and payments
  installments: [collectionInstallmentSchema],
  payments: [collectionPaymentSchema],
  
  // Collection metadata
  firstPaymentDate: { type: String },
  lastPaymentDate: { type: String },
  expectedCompletionDate: { type: String },
  
  // Collection agent/officer
  assignedTo: { type: String },
  collectionRoute: { type: String },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Medium' 
  },
  
  // Additional notes and flags
  notes: { type: String },
  flags: [{
    type: { type: String },
    description: { type: String },
    date: { type: String },
    resolvedDate: { type: String },
    status: { type: String, enum: ['Active', 'Resolved'], default: 'Active' }
  }],
  
  // Audit trail
  createdBy: { type: String, default: 'system' },
  lastUpdatedBy: { type: String, default: 'system' },
  syncedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for performance
collectionSchema.index({ loanId: 1 });
collectionSchema.index({ customerId: 1, collectionStatus: 1 });
collectionSchema.index({ collectionStatus: 1, nextDueDate: 1 });
collectionSchema.index({ assignedTo: 1, collectionStatus: 1 });
collectionSchema.index({ customerName: 'text', loanId: 'text' });
collectionSchema.index({ createdAt: -1 });
collectionSchema.index({ nextDueDate: 1, collectionStatus: 1 });

// Static method to create collection record from SavedLoanDetail
collectionSchema.statics.createFromLoan = async function(savedLoanDetail) {
  try {
    // Check if collection record already exists
    const existing = await this.findOne({ loanId: savedLoanDetail.loanId });
    if (existing) {
      return existing;
    }

    const nextUnpaid = savedLoanDetail.installments.find(inst => inst.status !== 'Paid');
    const totalPaid = savedLoanDetail.installments
      .filter(inst => inst.status === 'Paid')
      .reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
    
    const totalFines = savedLoanDetail.payments
      .reduce((sum, payment) => sum + (payment.fineAmount || 0), 0);

    const collectionData = {
      loanId: savedLoanDetail.loanId,
      customerId: savedLoanDetail.customerId,
      customerName: savedLoanDetail.customerName,
      customerPhone: savedLoanDetail.customerPhone,
      customerAddress: savedLoanDetail.customerAddress,
      customerPhoto: savedLoanDetail.customerPhoto,
      
      originalLoanAmount: savedLoanDetail.loanAmount,
      totalAmount: savedLoanDetail.totalAmount,
      totalInterest: savedLoanDetail.totalInterest,
      numberOfInstallments: savedLoanDetail.numberOfInstallments,
      installmentFrequency: savedLoanDetail.installmentFrequency,
      
      collectionStatus: savedLoanDetail.status === 'Closed' ? 'Completed' : 'Active',
      
      totalPaidAmount: totalPaid,
      totalFinesPaid: totalFines,
      remainingBalance: savedLoanDetail.totalAmount - totalPaid,
      
      paidInstallments: savedLoanDetail.installments.filter(inst => inst.status === 'Paid').length,
      pendingInstallments: savedLoanDetail.installments.filter(inst => inst.status !== 'Paid').length,
      overdueInstallments: savedLoanDetail.installments.filter(inst => inst.status === 'Overdue').length,
      
      nextDueDate: nextUnpaid?.dueDate,
      nextDueAmount: nextUnpaid?.emiAmount,
      nextInstallmentNo: nextUnpaid?.installmentNo,
      
      installments: savedLoanDetail.installments.map(inst => ({
        installmentNo: inst.installmentNo,
        originalDueDate: inst.dueDate,
        emiAmount: inst.emiAmount,
        principalAmount: inst.principalAmount,
        interestAmount: inst.interestAmount,
        status: inst.status,
        paidAmount: inst.paidAmount || 0,
        remainingAmount: inst.emiAmount - (inst.paidAmount || 0),
        lastPaymentDate: inst.paidDate,
        overdueDate: inst.status === 'Overdue' ? inst.dueDate : null,
        overdueDays: 0 // Calculate based on current date vs due date
      })),
      
      payments: savedLoanDetail.payments.map(payment => ({
        paymentId: payment.paymentId,
        installmentNo: payment.installmentNo,
        amount: payment.amount,
        fineAmount: payment.fineAmount || 0,
        totalAmount: payment.totalAmount,
        paymentDate: payment.date,
        paymentMethod: payment.paymentMethod || 'Cash',
        status: payment.status || 'Received',
        collectedBy: 'system',
        notes: payment.notes || '',
        receiptNumber: payment.paymentId
      })),
      
      firstPaymentDate: savedLoanDetail.payments.length > 0 ? savedLoanDetail.payments[0].date : null,
      lastPaymentDate: savedLoanDetail.payments.length > 0 ? 
        savedLoanDetail.payments[savedLoanDetail.payments.length - 1].date : null,
      
      createdBy: savedLoanDetail.createdBy || 'system',
      lastUpdatedBy: savedLoanDetail.lastUpdatedBy || 'system'
    };

    const collection = new this(collectionData);
    return await collection.save();
  } catch (error) {
    throw new Error(`Failed to create collection record: ${error.message}`);
  }
};

// Instance method to sync with SavedLoanDetail
collectionSchema.methods.syncWithLoan = async function() {
  try {
    const SavedLoanDetail = mongoose.model('SavedLoanDetail');
    const loan = await SavedLoanDetail.findOne({ loanId: this.loanId });
    
    if (!loan) {
      throw new Error('Associated loan not found');
    }

    // Update collection data based on loan data
    const nextUnpaid = loan.installments.find(inst => inst.status !== 'Paid');
    const totalPaid = loan.installments
      .filter(inst => inst.status === 'Paid')
      .reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
    
    const totalFines = loan.payments
      .reduce((sum, payment) => sum + (payment.fineAmount || 0), 0);

    this.collectionStatus = loan.status === 'Closed' ? 'Completed' : 'Active';
    this.totalPaidAmount = totalPaid;
    this.totalFinesPaid = totalFines;
    this.remainingBalance = loan.totalAmount - totalPaid;
    
    this.paidInstallments = loan.installments.filter(inst => inst.status === 'Paid').length;
    this.pendingInstallments = loan.installments.filter(inst => inst.status !== 'Paid').length;
    
    this.nextDueDate = nextUnpaid?.dueDate;
    this.nextDueAmount = nextUnpaid?.emiAmount;
    this.nextInstallmentNo = nextUnpaid?.installmentNo;
    
    this.syncedAt = new Date();
    this.lastUpdatedBy = 'sync_system';
    
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to sync collection record: ${error.message}`);
  }
};

// Instance method to get collection summary
collectionSchema.methods.getCollectionSummary = function() {
  const paymentProgress = this.totalPaidAmount > 0 ? 
    (this.totalPaidAmount / this.totalAmount) * 100 : 0;
  
  const completionRate = this.paidInstallments > 0 ? 
    (this.paidInstallments / this.numberOfInstallments) * 100 : 0;

  return {
    loanId: this.loanId,
    customerName: this.customerName,
    collectionStatus: this.collectionStatus,
    totalAmount: this.totalAmount,
    paidAmount: this.totalPaidAmount,
    remainingBalance: this.remainingBalance,
    paymentProgress: Math.round(paymentProgress * 100) / 100,
    completionRate: Math.round(completionRate * 100) / 100,
    nextDueDate: this.nextDueDate,
    nextDueAmount: this.nextDueAmount,
    overdueInstallments: this.overdueInstallments,
    totalPayments: this.payments.length,
    lastPaymentDate: this.lastPaymentDate
  };
};

// Pre-save middleware to calculate overdue information
collectionSchema.pre('save', function(next) {
  const today = new Date();
  
  // Calculate overdue installments
  this.overdueInstallments = this.installments.filter(inst => {
    if (inst.status === 'Paid') return false;
    
    const dueDate = new Date(inst.originalDueDate.split('/').reverse().join('-'));
    return today > dueDate;
  }).length;

  // Update priority based on overdue status
  if (this.overdueInstallments > 2) {
    this.priority = 'Critical';
  } else if (this.overdueInstallments > 0) {
    this.priority = 'High';
  } else {
    this.priority = 'Medium';
  }

  next();
});

const Collection = mongoose.model('Collection', collectionSchema);
export default Collection;