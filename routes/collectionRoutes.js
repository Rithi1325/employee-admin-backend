// routes/collectionRoutes.js
import express from 'express';
import {
  getAllLoans,
  getLoanForCollection,
  markInstallmentPaid,
  updateLoanStatus,
  syncCollectionsFromLoans,
  getCollectionDashboard
} from '../controllers/collectionController.js';

const router = express.Router();

// GET /api/collections - Get all loans for collection with optional search and pagination
router.get('/', getAllLoans);

// GET /api/collections/dashboard - Get collection dashboard stats
router.get('/dashboard', getCollectionDashboard);

// POST /api/collections/sync - Sync collections from SavedLoanDetail
router.post('/sync', syncCollectionsFromLoans);

// GET /api/collections/:loanId - Get single loan details for collection
router.get('/:loanId', getLoanForCollection);

// PUT /api/collections/:loanId/installments/:installmentNo/pay - Mark an installment as paid
router.put('/:loanId/installments/:installmentNo/pay', markInstallmentPaid);

// PUT /api/collections/:loanId/status - Update loan status (e.g., to 'Closed')
router.put('/:loanId/status', updateLoanStatus);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Collection route error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.path,
  });
});

export default router;