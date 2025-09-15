import mongoose from 'mongoose';

const loanItemSchema = new mongoose.Schema({
  billNo: { type: String, required: true },
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, default: 'N/A' },
  customerAddress: { type: String, default: 'N/A' },
  jewelType: { type: String, enum: ['gold', 'silver', 'diamond'], default: 'gold' },
  grossWeight: { type: Number, default: 0 },
  netWeight: { type: Number, default: 0 },
  loanAmount: { type: Number, required: true },
  finalLoanAmount: { type: Number, required: true },
  interestRate: { type: Number, default: 0 },
  interestAmount: { type: Number, default: 0 },
  overallLoanAmount: { type: Number, required: true },
  disbursementDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Active', 'Partial', 'Overdue', 'Closed'], 
    default: 'Active' 
  },
  loanStatus: {
    type: String,
    enum: ['active', 'overdue', 'closed', 'inactive'],
    default: 'active'
  },
  repaidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentProgress: { type: Number, default: 0 },
  daysOverdue: { type: Number, default: 0 },
  lastPaymentDate: { type: Date },
  monthsPaid: { type: Number, default: 0 },
  totalInterestPaid: { type: Number, default: 0 },
  closedDate: { type: Date },
  jewelryItems: [{ type: String }],
  voucherId: { type: mongoose.Schema.Types.ObjectId },
  sourceType: { type: String, enum: ['voucher', 'daybook', 'manual'], default: 'manual' },
  sourceId: { type: mongoose.Schema.Types.ObjectId }
}, { _id: true });

const stockSummarySchema = new mongoose.Schema({
  // Summary Statistics
  totalLoans: { type: Number, default: 0 },
  activeLoans: { type: Number, default: 0 },
  overdueLoans: { type: Number, default: 0 },
  closedLoans: { type: Number, default: 0 },
  partialLoans: { type: Number, default: 0 },
  
  // Financial Summary
  totalLoanAmount: { type: Number, default: 0 },
  totalActiveLoanAmount: { type: Number, default: 0 },
  totalOverdueLoanAmount: { type: Number, default: 0 },
  totalClosedLoanAmount: { type: Number, default: 0 },
  totalRepaidAmount: { type: Number, default: 0 },
  totalBalanceAmount: { type: Number, default: 0 },
  totalInterestAmount: { type: Number, default: 0 },
  
  // Rates and Ratios
  overdueRate: { type: Number, default: 0 },
  collectionRate: { type: Number, default: 0 },
  averageLoanAmount: { type: Number, default: 0 },
  averageInterestRate: { type: Number, default: 0 },
  
  // Jewel Type Summary
  jewelTypeSummary: {
    gold: {
      count: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
      closed: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      averageAmount: { type: Number, default: 0 }
    },
    silver: {
      count: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
      closed: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      averageAmount: { type: Number, default: 0 }
    },
    diamond: {
      count: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
      closed: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      averageAmount: { type: Number, default: 0 }
    }
  },
  
  // Monthly Statistics (for trends)
  monthlyStats: [{
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    monthName: { type: String, required: true },
    loansIssued: { type: Number, default: 0 },
    loansClosed: { type: Number, default: 0 },
    amountDisbursed: { type: Number, default: 0 },
    amountCollected: { type: Number, default: 0 },
    interestCollected: { type: Number, default: 0 }
  }],
  
  // All loan items for detailed view
  loans: [loanItemSchema],
  
  // Metadata
  lastUpdated: { type: Date, default: Date.now },
  lastSyncedAt: { type: Date, default: Date.now },
  dataVersion: { type: String, default: '1.0' },
  syncStatus: { type: String, enum: ['synced', 'pending', 'error'], default: 'synced' },
  recordCount: { type: Number, default: 0 },
  
  // Auto-calculated fields
  generatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'stocksummary' // This will create a 'stocksummary' collection in MongoDB
});

// Pre-save hook to calculate summary statistics
stockSummarySchema.pre('save', function(next) {
  if (this.loans && this.loans.length > 0) {
    // Calculate basic counts
    this.totalLoans = this.loans.length;
    this.activeLoans = this.loans.filter(loan => loan.loanStatus === 'active').length;
    this.overdueLoans = this.loans.filter(loan => loan.loanStatus === 'overdue').length;
    this.closedLoans = this.loans.filter(loan => loan.loanStatus === 'closed').length;
    this.partialLoans = this.loans.filter(loan => loan.status === 'Partial').length;
    
    // Calculate financial summaries
    this.totalLoanAmount = this.loans.reduce((sum, loan) => sum + (loan.finalLoanAmount || 0), 0);
    this.totalActiveLoanAmount = this.loans
      .filter(loan => loan.loanStatus === 'active')
      .reduce((sum, loan) => sum + (loan.finalLoanAmount || 0), 0);
    this.totalOverdueLoanAmount = this.loans
      .filter(loan => loan.loanStatus === 'overdue')
      .reduce((sum, loan) => sum + (loan.finalLoanAmount || 0), 0);
    this.totalClosedLoanAmount = this.loans
      .filter(loan => loan.loanStatus === 'closed')
      .reduce((sum, loan) => sum + (loan.finalLoanAmount || 0), 0);
    this.totalRepaidAmount = this.loans.reduce((sum, loan) => sum + (loan.repaidAmount || 0), 0);
    this.totalBalanceAmount = this.loans.reduce((sum, loan) => sum + (loan.balanceAmount || 0), 0);
    this.totalInterestAmount = this.loans.reduce((sum, loan) => sum + (loan.interestAmount || 0), 0);
    
    // Calculate rates
    this.overdueRate = this.totalLoans > 0 ? Math.round((this.overdueLoans / this.totalLoans) * 100) : 0;
    this.collectionRate = this.totalLoanAmount > 0 ? Math.round((this.totalRepaidAmount / this.totalLoanAmount) * 100) : 0;
    this.averageLoanAmount = this.totalLoans > 0 ? Math.round(this.totalLoanAmount / this.totalLoans) : 0;
    
    // Calculate jewel type summary
    ['gold', 'silver', 'diamond'].forEach(type => {
      const typeLoans = this.loans.filter(loan => loan.jewelType === type);
      this.jewelTypeSummary[type] = {
        count: typeLoans.length,
        active: typeLoans.filter(loan => loan.loanStatus === 'active').length,
        overdue: typeLoans.filter(loan => loan.loanStatus === 'overdue').length,
        closed: typeLoans.filter(loan => loan.loanStatus === 'closed').length,
        totalAmount: typeLoans.reduce((sum, loan) => sum + (loan.finalLoanAmount || 0), 0),
        averageAmount: typeLoans.length > 0 ? 
          Math.round(typeLoans.reduce((sum, loan) => sum + (loan.finalLoanAmount || 0), 0) / typeLoans.length) : 0
      };
    });
    
    this.recordCount = this.loans.length;
  }
  
  this.lastUpdated = new Date();
  next();
});

// Indexes for better performance
stockSummarySchema.index({ lastUpdated: -1 });
stockSummarySchema.index({ 'loans.billNo': 1 });
stockSummarySchema.index({ 'loans.customerId': 1 });
stockSummarySchema.index({ 'loans.loanStatus': 1 });
stockSummarySchema.index({ 'loans.jewelType': 1 });
stockSummarySchema.index({ 'loans.disbursementDate': -1 });
stockSummarySchema.index({ 'loans.dueDate': 1 });

export default mongoose.model('StockSummary', stockSummarySchema);