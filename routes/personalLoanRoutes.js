import express from 'express';
import {
  createPersonalLoan,
  getPersonalLoans,
  getPersonalLoanById,
  updatePersonalLoan,
  deletePersonalLoan,
  markInstallmentPaid,
  getLoanStatistics
} from '../controllers/personalLoanController.js';

const router = express.Router();

// Middleware for logging requests
router.use((req, res, next) => {
  console.log(`Personal Loan API: ${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    timestamp: new Date().toISOString()
  });
  next();
});

// Routes for Personal Loans

// POST /api/personal-loans - Create a new personal loan
router.post('/', createPersonalLoan);

// GET /api/personal-loans - Get all personal loans with filters and pagination
router.get('/', getPersonalLoans);

// GET /api/personal-loans/statistics - Get loan statistics
router.get('/statistics', getLoanStatistics);

// GET /api/personal-loans/:id - Get personal loan by ID or loanId
router.get('/:id', getPersonalLoanById);

// PUT /api/personal-loans/:id - Update personal loan
router.put('/:id', updatePersonalLoan);

// DELETE /api/personal-loans/:id - Delete personal loan
router.delete('/:id', deletePersonalLoan);

// POST /api/personal-loans/:id/pay-installment - Mark installment as paid
router.post('/:id/pay-installment', markInstallmentPaid);

// Error handling middleware for this router
router.use((err, req, res, next) => {
  console.error('Personal Loan Route Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  res.status(err.status || 500).json({
    success: false,
    message: 'Personal loan operation failed',
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

export default router;