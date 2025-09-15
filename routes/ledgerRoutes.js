import express from 'express';
import { getLedger } from '../controllers/ledgerController.js';

const router = express.Router();

// Get ledger data for a specific date
router.get('/', getLedger);

export default router;