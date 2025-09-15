// models/DayBook.js
import mongoose from 'mongoose';

const dayBookSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  summary: {
    newLoans: {
      count: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      transactions: [{
        voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
        billNo: String,
        customerId: String,
        customerName: String,
        amount: Number,
        jewelType: String,
        netWeight: Number,
        interestRate: Number,
        createdAt: Date
      }]
    },
    interestReceived: {
      count: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      transactions: [{
        voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
        billNo: String,
        customerId: String,
        customerName: String,
        amount: Number,
        months: Number,
        paymentMethod: String,
        receiptNo: String,
        paymentDate: Date
      }]
    },
    closedLoans: {
      count: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
      transactions: [{
        voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
        billNo: String,
        customerId: String,
        customerName: String,
        originalAmount: Number,
        interestPaid: Number,
        totalSettled: Number,
        monthsPaid: Number,
        closureDate: Date
      }]
    }
  },
  totalActivity: {
    type: Number,
    default: 0
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
dayBookSchema.index({ date: 1 });
dayBookSchema.index({ 'summary.newLoans.transactions.customerId': 1 });
dayBookSchema.index({ 'summary.interestReceived.transactions.customerId': 1 });
dayBookSchema.index({ 'summary.closedLoans.transactions.customerId': 1 });

// Method to calculate total activity
dayBookSchema.methods.calculateTotalActivity = function() {
  this.totalActivity = 
    this.summary.newLoans.totalAmount + 
    this.summary.interestReceived.totalAmount + 
    this.summary.closedLoans.totalAmount;
  return this.totalActivity;
};

// Static method to generate or retrieve day book for a specific date
dayBookSchema.statics.generateForDate = async function(date, forceRegenerate = false) {
  const Voucher = mongoose.model('Voucher');
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const dateString = startOfDay.toISOString().split('T')[0];

  try {
    // Check if a DayBook document exists for the date
    let dayBook = await this.findOne({ date: startOfDay });

    if (dayBook && !forceRegenerate) {
      // Return existing document if not forcing regeneration
      return dayBook;
    }

    // Get all vouchers
    const vouchers = await Voucher.find({}).populate('customer');
    
    const dayBookData = {
      date: startOfDay,
      summary: {
        newLoans: {
          count: 0,
          totalAmount: 0,
          transactions: []
        },
        interestReceived: {
          count: 0,
          totalAmount: 0,
          transactions: []
        },
        closedLoans: {
          count: 0,
          totalAmount: 0,
          transactions: []
        }
      }
    };
    
    // Process each voucher
    for (const voucher of vouchers) {
      // 1. Check for new loans (created or disbursed on selected date)
      const disbursementDate = voucher.disbursementDate ? 
        new Date(voucher.disbursementDate).toISOString().split('T')[0] : null;
      const createdDate = voucher.createdAt ? 
        new Date(voucher.createdAt).toISOString().split('T')[0] : null;
      
      if (disbursementDate === dateString || createdDate === dateString) {
        const loanData = {
          voucherId: voucher._id,
          billNo: voucher.billNo,
          customerId: voucher.customer?.customerId || 'N/A',
          customerName: voucher.customer?.fullName || 'N/A',
          amount: parseFloat(voucher.finalLoanAmount || 0),
          jewelType: voucher.jewelType || 'gold',
          netWeight: voucher.netWeight || 0,
          interestRate: voucher.interestRate || 0,
          createdAt: voucher.disbursementDate || voucher.createdAt
        };
        
        dayBookData.summary.newLoans.transactions.push(loanData);
        dayBookData.summary.newLoans.totalAmount += loanData.amount;
        dayBookData.summary.newLoans.count++;
      }
      
      // 2. Check for interest payments on selected date
      if (voucher.paymentHistory && voucher.paymentHistory.length > 0) {
        voucher.paymentHistory.forEach((payment, index) => {
          const paymentDate = payment.date ? 
            new Date(payment.date).toISOString().split('T')[0] : null;
          
          if (paymentDate === dateString) {
            const interestData = {
              voucherId: voucher._id,
              billNo: voucher.billNo,
              customerId: voucher.customer?.customerId || 'N/A',
              customerName: voucher.customer?.fullName || 'N/A',
              amount: parseFloat(payment.amount || 0),
              months: payment.months || 1,
              paymentMethod: payment.paymentMethod || 'Cash',
              receiptNo: payment.receiptNo || `RCP-${voucher.billNo}-${index + 1}`,
              paymentDate: payment.date
            };
            
            dayBookData.summary.interestReceived.transactions.push(interestData);
            dayBookData.summary.interestReceived.totalAmount += interestData.amount;
            dayBookData.summary.interestReceived.count++;
          }
        });
      }
      
      // 3. Check for closed loans on selected date
      const closedDate = voucher.closedDate ? 
        new Date(voucher.closedDate).toISOString().split('T')[0] : null;
      
      if (voucher.status === 'closed' && closedDate === dateString) {
        const closedLoanData = {
          voucherId: voucher._id,
          billNo: voucher.billNo,
          customerId: voucher.customer?.customerId || 'N/A',
          customerName: voucher.customer?.fullName || 'N/A',
          originalAmount: parseFloat(voucher.finalLoanAmount || 0),
          interestPaid: parseFloat(voucher.totalInterestPaid || 0),
          totalSettled: parseFloat(voucher.finalAmountPaid || 
            (parseFloat(voucher.finalLoanAmount || 0) + parseFloat(voucher.totalInterestPaid || 0))),
          monthsPaid: voucher.monthsPaid || 0,
          closureDate: voucher.closedDate
        };
        
        dayBookData.summary.closedLoans.transactions.push(closedLoanData);
        dayBookData.summary.closedLoans.totalAmount += closedLoanData.totalSettled;
        dayBookData.summary.closedLoans.count++;
      }
    }
    
    // Calculate total activity
    dayBookData.totalActivity = 
      dayBookData.summary.newLoans.totalAmount + 
      dayBookData.summary.interestReceived.totalAmount + 
      dayBookData.summary.closedLoans.totalAmount;
    
    // Save or update the DayBook document
    if (dayBook) {
      // Update existing document
      dayBook.summary = dayBookData.summary;
      dayBook.totalActivity = dayBookData.totalActivity;
      dayBook.lastUpdated = new Date();
      await dayBook.save();
    } else {
      // Create new document
      dayBook = new this(dayBookData);
      await dayBook.save();
    }
    
    return dayBook;
  } catch (error) {
    console.error('Error generating day book data:', error);
    throw error;
  }
};

const DayBook = mongoose.model('DayBook', dayBookSchema);
export default DayBook;