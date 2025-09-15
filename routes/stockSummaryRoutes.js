import express from 'express';
import {
  getStockSummary,
  getVoucherById,
  updateVoucherStatus,
  getDashboardStats,
  updateOverdueStatus,
  createOrUpdateStockSummary,
  deleteStockSummary
} from '../controllers/stockSummaryController.js';

const router = express.Router();

// GET /api/stock-summary - Get all loans with filtering and pagination from stock summary
router.get('/', getStockSummary);

// POST /api/stock-summary/sync - Create or update stock summary with latest data from daybooks/vouchers
router.post('/sync', createOrUpdateStockSummary);

// GET /api/stock-summary/dashboard - Get dashboard statistics
router.get('/dashboard', getDashboardStats);

// POST /api/stock-summary/update-overdue - Update overdue status for all loans
router.post('/update-overdue', updateOverdueStatus);

// DELETE /api/stock-summary/reset - Delete all stock summary data (for cleanup/reset)
router.delete('/reset', deleteStockSummary);

// GET /api/stock-summary/:id - Get specific loan details
router.get('/:id', getVoucherById);

// PUT /api/stock-summary/:id/status - Update loan status
router.put('/:id/status', updateVoucherStatus);

export default router;