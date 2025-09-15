// routes/dayBookRoutes.js
import express from 'express';
import { getDayBook } from '../controllers/dayBookController.js';

const router = express.Router();

router.get('/:date', getDayBook);

export default router;