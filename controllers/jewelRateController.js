// controllers/jewelRateController.js
import JewelRate from "../models/jewelRate.js";

// @desc    Get all jewel rates, sorted by latest date
// @route   GET /api/jewel-rates
// @access  Private
export const getJewelRates = async (req, res) => {
  try {
    const jewelRates = await JewelRate.find().sort({ updatedAt: -1 });
    res.json(jewelRates);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get latest jewel rate by metal type
// @route   GET /api/jewel-rates/:metalType
// @access  Private
export const getJewelRateByType = async (req, res) => {
  try {
    const jewelRate = await JewelRate.findOne({ metalType: req.params.metalType });
    if (!jewelRate) {
      return res.status(404).json({ message: "Jewel rate not found" });
    }
    res.json(jewelRate);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Create or update a jewel rate
// @route   POST /api/jewel-rates
// @access  Private (Admin)
export const createOrUpdateJewelRate = async (req, res) => {
  try {
    const { metalType, rate, date } = req.body;
    
    // Validation
    if (!metalType || !rate) {
      return res.status(400).json({ message: "Metal type and rate are required" });
    }

    if (!['gold', 'silver'].includes(metalType.toLowerCase())) {
      return res.status(400).json({ message: "Metal type must be either 'gold' or 'silver'" });
    }

    if (isNaN(rate) || rate <= 0) {
      return res.status(400).json({ message: "Rate must be a positive number" });
    }

    // Parse date if provided, otherwise use current date
    let dateToSave = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        dateToSave = parsedDate;
      }
    }

    const updatedRate = await JewelRate.findOneAndUpdate(
      { metalType: metalType.toLowerCase() },
      { 
        rate: parseFloat(rate), 
        date: dateToSave 
      },
      { 
        new: true, 
        upsert: true, // creates if not exists
        runValidators: true // ensure validation runs on update
      }
    );

    console.log(`Jewel rate updated: ${metalType} - ₹${rate}/gram at ${dateToSave}`);
    res.status(200).json(updatedRate);
  } catch (err) {
    console.error(err.message);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ message: "Metal type already exists" });
    }
    
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Delete a jewel rate
// @route   DELETE /api/jewel-rates/:metalType
// @access  Private (Admin)
export const deleteJewelRate = async (req, res) => {
  try {
    const jewelRate = await JewelRate.findOneAndDelete({ 
      metalType: req.params.metalType.toLowerCase() 
    });
    
    if (!jewelRate) {
      return res.status(404).json({ message: "Jewel rate not found" });
    }
    
    res.json({ message: "Jewel rate deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
};