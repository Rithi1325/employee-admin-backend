import express from 'express';
import {
  getSavedLoans,
  getSavedLoanById,
  createSavedLoan,
  updateSavedLoan,
  deleteSavedLoan,
  markInstallmentPaid,
  getLoanStats,
  bulkUpdateLoans,
  searchLoans
} from '../controllers/savedLoanDetailController.js';

const router = express.Router();

// Routes

// GET /api/saved-loans - Get all saved loans with filtering and pagination
router.get('/', getSavedLoans);

// GET /api/saved-loans/stats - Get loan statistics
router.get('/stats', getLoanStats);

// GET /api/saved-loans/search - Search loans
router.get('/search', searchLoans);

// GET /api/saved-loans/:loanId - Get a specific loan by ID
router.get('/:loanId', getSavedLoanById);

// POST /api/saved-loans - Create a new saved loan
router.post('/', createSavedLoan);

// PUT /api/saved-loans/:loanId - Update a specific loan
router.put('/:loanId', updateSavedLoan);

// DELETE /api/saved-loans/:loanId - Delete a specific loan
router.delete('/:loanId', deleteSavedLoan);

// PUT /api/saved-loans/:loanId/installments/:installmentNo/pay - Mark installment as paid
router.put('/:loanId/installments/:installmentNo/pay', markInstallmentPaid);

// PUT /api/saved-loans/bulk-update - Bulk update multiple loans
router.put('/bulk-update', bulkUpdateLoans);

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('SavedLoanDetail route error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

export default router;