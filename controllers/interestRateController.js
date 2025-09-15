// controllers/interestRateController.js
import InterestRate from '../models/InterestRate.js';

// @desc    Get all interest rates
// @route   GET /api/interest-rates
// @access  Private
export const getInterestRates = async (req, res) => {
  try {
    const rates = await InterestRate.find().sort({ metalType: 1, minAmount: 1 });
    res.json(rates);
  } catch (err) {
    console.error('Error fetching interest rates:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get interest rates by metal type
// @route   GET /api/interest-rates/:metalType
// @access  Private
export const getInterestRatesByType = async (req, res) => {
  try {
    const rates = await InterestRate.find({ metalType: req.params.metalType })
                                    .sort({ minAmount: 1 });
    res.json(rates);
  } catch (err) {
    console.error('Error fetching interest rates by type:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new interest rate
// @route   POST /api/interest-rates
// @access  Private (Admin)
export const createInterestRate = async (req, res) => {
  try {
    const { metalType, minAmount, maxAmount, interest, date } = req.body;

    // Validate input
    if (!metalType || minAmount === undefined || maxAmount === undefined || interest === undefined) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (parseFloat(minAmount) >= parseFloat(maxAmount)) {
      return res.status(400).json({ message: 'Maximum amount must be greater than minimum amount' });
    }

    const newRate = new InterestRate({
      metalType,
      minAmount: parseFloat(minAmount),
      maxAmount: parseFloat(maxAmount),
      interest: parseFloat(interest),
      date: date || Date.now(),
    });

    const savedRate = await newRate.save();
    res.status(201).json(savedRate);
  } catch (err) {
    console.error('Error creating interest rate:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete an interest rate by ID
// @route   DELETE /api/interest-rates/:id
// @access  Private (Admin)
export const deleteInterestRate = async (req, res) => {
  try {
    const rate = await InterestRate.findById(req.params.id);

    if (!rate) {
      return res.status(404).json({ message: 'Interest rate not found' });
    }

    await rate.deleteOne();
    res.json({ message: 'Interest rate deleted successfully' });
  } catch (err) {
    console.error('Error deleting interest rate:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};
