// routes/financialYearRoutes.js
import express from 'express';
import FinancialYear from '../models/FinancialYear.js';

const router = express.Router();

// @desc    Get current financial year
// @route   GET /api/financial-year/current
// @access  Public
router.get('/current', async (req, res) => {
  try {
    // Find the active financial year
    const currentFinancialYear = await FinancialYear.findOne({ isActive: true });

    if (!currentFinancialYear) {
      // If no active financial year, get the latest one
      const latestFinancialYear = await FinancialYear.findOne().sort({ createdAt: -1 });
      
      if (!latestFinancialYear) {
        return res.status(404).json({ message: 'No financial year found' });
      }
      
      return res.json(latestFinancialYear);
    }

    res.json(currentFinancialYear);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Create a financial year
// @route   POST /api/financial-year
// @access  Private (Admin)
router.post('/', async (req, res) => {
  try {
    const { year, startDate, endDate, isActive } = req.body;

    // Check if financial year already exists
    const existingYear = await FinancialYear.findOne({ year });
    if (existingYear) {
      return res.status(400).json({ message: 'Financial year already exists' });
    }

    // If setting as active, deactivate all others
    if (isActive) {
      await FinancialYear.updateMany({}, { isActive: false });
    }

    const financialYear = new FinancialYear({
      year,
      startDate,
      endDate,
      isActive: isActive || false
    });

    const createdYear = await financialYear.save();
    res.status(201).json(createdYear);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all financial years
// @route   GET /api/financial-year
// @access  Private (Admin)
router.get('/', async (req, res) => {
  try {
    const financialYears = await FinancialYear.find({}).sort({ startDate: -1 });
    res.json(financialYears);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Update a financial year
// @route   PUT /api/financial-year/:id
// @access  Private (Admin)
router.put('/:id', async (req, res) => {
  try {
    const { year, startDate, endDate, isActive } = req.body;

    // If setting as active, deactivate all others
    if (isActive) {
      await FinancialYear.updateMany({}, { isActive: false });
    }

    const financialYear = await FinancialYear.findByIdAndUpdate(
      req.params.id,
      { year, startDate, endDate, isActive },
      { new: true, runValidators: true }
    );

    if (!financialYear) {
      return res.status(404).json({ message: 'Financial year not found' });
    }

    res.json(financialYear);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Delete a financial year
// @route   DELETE /api/financial-year/:id
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const financialYear = await FinancialYear.findById(req.params.id);

    if (!financialYear) {
      return res.status(404).json({ message: 'Financial year not found' });
    }

    await financialYear.remove();
    res.json({ message: 'Financial year removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;