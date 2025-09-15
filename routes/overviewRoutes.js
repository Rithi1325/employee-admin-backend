// routes/overviewRoutes.js
import express from 'express';
const router = express.Router();
import { getOverviewData, getFilteredLoans, getReceivedPayments } from '../controllers/overviewController.js';

router.get('/data', getOverviewData);
router.get('/filtered', getFilteredLoans);
router.get('/payments', getReceivedPayments);

export default router;
