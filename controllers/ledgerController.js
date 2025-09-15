import Voucher from '../models/Voucher.js';
import Customer from '../models/Customer.js';
import Ledger from '../models/Ledger.js';

// Controller to get ledger data and store in ledger collection
export const getLedger = async (req, res) => {
  try {
    console.log('=== LEDGER API CALLED ===');
    console.log('Request query:', req.query);
    
    const { date } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0); // Start of day
    console.log('Query Date:', queryDate);

    // FORCE REGENERATE - Delete existing ledger data for this date first
    try {
      const deletedCount = await Ledger.deleteMany({ queryDate });
      console.log(`Deleted ${deletedCount.deletedCount} existing ledger entries for regeneration`);
    } catch (deleteError) {
      console.error('Error deleting existing ledger entries:', deleteError);
    }

    // Test database connection
    try {
      const dbName = await Voucher.db.db.databaseName;
      console.log('Connected to database:', dbName);
    } catch (dbError) {
      console.error('Database connection issue:', dbError);
      throw new Error('Database connection failed');
    }

    console.log(`Generating fresh ledger data for ${queryDate.toDateString()}...`);
    
    // Check voucher count with detailed logging
    let voucherCount = 0;
    try {
      voucherCount = await Voucher.countDocuments();
      console.log('Total vouchers in database:', voucherCount);
    } catch (voucherCountError) {
      console.error('Error counting vouchers:', voucherCountError);
      throw new Error('Failed to access voucher collection');
    }
    
    // If no vouchers exist, return empty data
    if (voucherCount === 0) {
      console.log('No vouchers found. Returning empty ledger data.');
      return res.status(200).json({
        success: true,
        allLoans: [],
        activeLoans: [],
        overdueLoans: [],
        closedLoans: [],
        customers: [],
        debug: {
          queryDate: queryDate.toISOString(),
          totalEntries: 0,
          categoryCounts: {
            all: 0,
            active: 0,
            overdue: 0,
            closed: 0
          },
          message: 'No voucher data available'
        }
      });
    }

    // Fetch ALL vouchers and populate customer data
    let vouchers = [];
    try {
      vouchers = await Voucher.find({})
        .populate('customer', 'customerId fullName phoneNumber photo')
        .lean();
      
      console.log('Found vouchers:', vouchers.length);
      console.log('First voucher sample:', vouchers[0] ? {
        billNo: vouchers[0].billNo,
        status: vouchers[0].status,
        disbursementDate: vouchers[0].disbursementDate,
        dueDate: vouchers[0].dueDate,
        customer: vouchers[0].customer ? 'Has customer' : 'No customer'
      } : 'No vouchers');
    } catch (voucherFetchError) {
      console.error('Error fetching vouchers:', voucherFetchError);
      throw new Error('Failed to fetch voucher data');
    }

    // Filter out vouchers without proper customer data
    const vouchersWithValidCustomers = vouchers.filter(voucher => {
      if (!voucher.customer || !voucher.customer._id) {
        console.log(`Skipping voucher ${voucher.billNo} - no valid customer reference`);
        return false;
      }
      return true;
    });
    
    console.log(`Vouchers with valid customers: ${vouchersWithValidCustomers.length} out of ${vouchers.length}`);

    // For debugging - include ALL vouchers with valid customers (no date filtering)
    console.log('Processing all vouchers with valid customers...');

    // Create ledger entries for each valid voucher
    const ledgerEntries = [];
    
    for (const voucher of vouchersWithValidCustomers) {
      try {
        const customer = voucher.customer;
        
        // Customer data
        const customerId = customer._id;
        const customerName = customer.fullName || 'Unknown Customer';
        const customerCode = customer.customerId || 'UNKNOWN';
        const customerPhone = customer.phoneNumber || '0000000000';
        const customerPhoto = customer.photo || null;
        
        // Calculate amounts first
        const finalLoanAmount = Number(voucher.finalLoanAmount || voucher.loanAmount || 0);
        const repaidAmount = Number(voucher.finalAmountPaid || voucher.totalInterestPaid || 0);
        const balanceAmount = Math.max(0, finalLoanAmount - repaidAmount);

        // Status logic - handle all Voucher model statuses
        const originalStatus = (voucher.status || 'Active').toString();
        let normalizedStatus = 'active'; // Default
        
        if (originalStatus.toLowerCase() === 'closed') {
          normalizedStatus = 'closed';
        } else if (originalStatus.toLowerCase() === 'active' || originalStatus.toLowerCase() === 'pending') {
          // Check if overdue
          const dueDate = new Date(voucher.dueDate);
          const currentDate = new Date();
          currentDate.setHours(23, 59, 59, 999); // End of current day
          
          if (dueDate < currentDate && balanceAmount > 0) {
            normalizedStatus = 'overdue';
          } else if (balanceAmount <= 0) {
            normalizedStatus = 'closed';
          } else {
            normalizedStatus = 'active';
          }
        }
        
        // Determine category
        let category = normalizedStatus;
        if (category === 'partial') category = 'active'; // Map partial to active
        
        // Calculate days overdue
        let daysOverdue = 0;
        if (normalizedStatus === 'overdue') {
          const dueDate = new Date(voucher.dueDate);
          const currentDate = new Date();
          const timeDiff = currentDate.getTime() - dueDate.getTime();
          daysOverdue = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
        }

        // Calculate payment progress
        const paymentProgress = finalLoanAmount > 0 ? Math.min(100, Math.round((repaidAmount / finalLoanAmount) * 100)) : 0;

        // Calculate loan duration
        const disbursementDate = new Date(voucher.disbursementDate);
        const dueDate = new Date(voucher.dueDate);
        const loanDurationMs = dueDate.getTime() - disbursementDate.getTime();
        const loanDuration = Math.ceil(loanDurationMs / (1000 * 3600 * 24));

        const ledgerEntry = {
          queryDate,
          voucherId: voucher._id,
          customerId: customerId,
          billNo: voucher.billNo || 'N/A',
          customerCode: customerCode,
          customerName: customerName,
          customerPhone: customerPhone,
          customerPhoto: customerPhoto,
          jewelType: voucher.jewelType || 'gold',
          grossWeight: Number(voucher.grossWeight || 0),
          netWeight: Number(voucher.netWeight || 0),
          jewelryItems: Array.isArray(voucher.jewelryItems) ? voucher.jewelryItems : [],
          finalLoanAmount: finalLoanAmount,
          interestRate: Number(voucher.interestRate || 0),
          interestAmount: Number(voucher.interestAmount || 0),
          totalAmount: Number(voucher.overallLoanAmount || finalLoanAmount),
          repaidAmount: repaidAmount,
          balanceAmount: balanceAmount,
          disbursementDate: voucher.disbursementDate || new Date(),
          dueDate: voucher.dueDate || new Date(),
          lastPaymentDate: voucher.lastPaymentDate || null,
          status: normalizedStatus,
          daysOverdue: daysOverdue,
          loanDuration: loanDuration,
          paymentProgress: paymentProgress,
          monthsPaid: Number(voucher.monthsPaid || 0),
          closedDate: voucher.closedDate || null,
          category
        };

        ledgerEntries.push(ledgerEntry);
        
        console.log(`✓ Processed voucher ${voucher.billNo}:`, {
          customer: customerName,
          originalStatus: originalStatus,
          normalizedStatus: normalizedStatus,
          finalLoanAmount: finalLoanAmount,
          repaidAmount: repaidAmount,
          balanceAmount: balanceAmount,
          category: category,
          daysOverdue: daysOverdue
        });
        
      } catch (entryError) {
        console.error(`✗ Error processing voucher ${voucher.billNo}:`, entryError);
        continue;
      }
    }

    console.log(`Total ledger entries created: ${ledgerEntries.length}`);

    // Insert ALL ledger entries into database
    if (ledgerEntries.length > 0) {
      try {
        const insertResult = await Ledger.insertMany(ledgerEntries);
        console.log(`SUCCESS! Inserted ${insertResult.length} ledger entries for ${queryDate.toDateString()}`);
      } catch (insertError) {
        console.error('Insert error details:', insertError);
        throw new Error(`Failed to insert ledger entries: ${insertError.message}`);
      }
    } else {
      console.log('No ledger entries to insert');
      return res.status(200).json({
        success: true,
        allLoans: [],
        activeLoans: [],
        overdueLoans: [],
        closedLoans: [],
        customers: [],
        debug: {
          queryDate: queryDate.toISOString(),
          totalEntries: 0,
          categoryCounts: { all: 0, active: 0, overdue: 0, closed: 0 },
          message: 'No valid vouchers with customer data found'
        }
      });
    }

    // Fetch the fresh ledger data
    const allLedgerEntries = await Ledger.find({ queryDate }).lean();
    console.log(`Retrieved ${allLedgerEntries.length} ledger entries from DB`);

    // Categorize loans from ledger data
    const allLoans = allLedgerEntries.map(entry => ({
      id: entry.voucherId,
      customerId: entry.customerCode,
      customerName: entry.customerName,
      customerPhone: entry.customerPhone,
      customerPhoto: entry.customerPhoto,
      billNo: entry.billNo,
      jewelType: entry.jewelType,
      grossWeight: entry.grossWeight,
      netWeight: entry.netWeight,
      jewelryItems: entry.jewelryItems,
      finalLoanAmount: entry.finalLoanAmount,
      interestRate: entry.interestRate,
      interestAmount: entry.interestAmount,
      totalAmount: entry.totalAmount,
      repaidAmount: entry.repaidAmount,
      balanceAmount: entry.balanceAmount,
      disbursementDate: entry.disbursementDate,
      dueDate: entry.dueDate,
      lastPaymentDate: entry.lastPaymentDate,
      status: entry.status,
      daysOverdue: entry.daysOverdue,
      loanDuration: entry.loanDuration,
      paymentProgress: entry.paymentProgress,
      monthsPaid: entry.monthsPaid,
      closedDate: entry.closedDate
    }));

    const activeLoans = allLoans.filter(loan => loan.status === 'active');
    const overdueLoans = allLoans.filter(loan => loan.status === 'overdue');
    const closedLoans = allLoans.filter(loan => loan.status === 'closed');

    console.log('Final categorization:', {
      total: allLoans.length,
      active: activeLoans.length,
      overdue: overdueLoans.length,
      closed: closedLoans.length
    });

    // Fetch customers
    let customers = [];
    try {
      const customerIds = [...new Set(allLedgerEntries.map(entry => entry.customerId))];
      if (customerIds.length > 0) {
        customers = await Customer.find({ _id: { $in: customerIds } }).lean();
      }
    } catch (customerError) {
      console.error('Error fetching customers:', customerError);
    }

    const responseData = {
      success: true,
      allLoans,
      activeLoans,
      overdueLoans,
      closedLoans,
      customers,
      debug: {
        queryDate: queryDate.toISOString(),
        totalEntries: allLedgerEntries.length,
        categoryCounts: {
          all: allLoans.length,
          active: activeLoans.length,
          overdue: overdueLoans.length,
          closed: closedLoans.length
        },
        vouchersProcessed: ledgerEntries.length,
        vouchersWithValidCustomers: vouchersWithValidCustomers.length,
        totalVouchersInDB: voucherCount
      }
    };

    console.log('=== RESPONSE SUMMARY ===');
    console.log('All Loans:', allLoans.length);
    console.log('Active Loans:', activeLoans.length);
    console.log('Overdue Loans:', overdueLoans.length);
    console.log('Closed Loans:', closedLoans.length);

    res.status(200).json(responseData);

  } catch (err) {
    console.error('=== CRITICAL ERROR in getLedger ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ledger data',
      error: err.message,
      debug: {
        timestamp: new Date().toISOString(),
        query: req.query
      }
    });
  }
};