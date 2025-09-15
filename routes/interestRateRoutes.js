// routes/interestRateRoutes.js - Fixed Version
import express from "express";
import InterestRate from "../models/InterestRate.js";
const router = express.Router();

// @desc    Get all interest rates
// @route   GET /api/interest-rates
router.get("/", async (req, res) => {
  try {
    const rates = await InterestRate.find().sort({ createdAt: -1 }); // Changed from date to createdAt
    res.json(rates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add new interest rate
// @route   POST /api/interest-rates
router.post("/", async (req, res) => {
  try {
    const { metalType, minAmount, maxAmount, interest } = req.body;
    
    // Convert string inputs to numbers
    const minAmountNum = parseFloat(minAmount);
    const maxAmountNum = parseFloat(maxAmount);
    const interestNum = parseFloat(interest);
    
    // Validate inputs
    if (!metalType || isNaN(minAmountNum) || isNaN(maxAmountNum) || isNaN(interestNum)) {
      return res.status(400).json({ 
        message: "All fields are required and amounts must be valid numbers" 
      });
    }
    
    // Validate min < max
    if (minAmountNum >= maxAmountNum) {
      return res.status(400).json({ 
        message: "Maximum amount must be greater than minimum amount" 
      });
    }
    
    // Validate interest rate range
    if (interestNum <= 0 || interestNum > 100) {
      return res.status(400).json({ 
        message: "Interest rate must be between 0 and 100" 
      });
    }
    
    // Check for overlapping ranges
    const existingRate = await InterestRate.findOne({
      metalType,
      $or: [
        { $and: [{ minAmount: { $lte: minAmountNum } }, { maxAmount: { $gte: minAmountNum } }] },
        { $and: [{ minAmount: { $lte: maxAmountNum } }, { maxAmount: { $gte: maxAmountNum } }] },
        { $and: [{ minAmount: { $gte: minAmountNum } }, { maxAmount: { $lte: maxAmountNum } }] },
      ],
    });
    
    if (existingRate) {
      return res.status(400).json({
        message: "This amount range overlaps with an existing interest rate",
      });
    }
    
    // Format date + time (keep as string for display)
    const now = new Date();
    const formattedDate = now.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    
    const newRate = new InterestRate({
      metalType,
      minAmount: minAmountNum,  // Store as number
      maxAmount: maxAmountNum,  // Store as number
      interest: interestNum,    // Store as number
      date: formattedDate,
    });
    
    const savedRate = await newRate.save();
    res.status(201).json(savedRate);
  } catch (error) {
    console.error("Error creating interest rate:", error);
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update interest rate
// @route   PUT /api/interest-rates/:id
router.put("/:id", async (req, res) => {
  try {
    const { metalType, minAmount, maxAmount, interest } = req.body;
    
    // Convert string inputs to numbers
    const minAmountNum = parseFloat(minAmount);
    const maxAmountNum = parseFloat(maxAmount);
    const interestNum = parseFloat(interest);
    
    // Validate inputs
    if (!metalType || isNaN(minAmountNum) || isNaN(maxAmountNum) || isNaN(interestNum)) {
      return res.status(400).json({ 
        message: "All fields are required and amounts must be valid numbers" 
      });
    }
    
    // Validate min < max
    if (minAmountNum >= maxAmountNum) {
      return res.status(400).json({ 
        message: "Maximum amount must be greater than minimum amount" 
      });
    }
    
    // Validate interest rate range
    if (interestNum <= 0 || interestNum > 100) {
      return res.status(400).json({ 
        message: "Interest rate must be between 0 and 100" 
      });
    }
    
    // Check for overlapping ranges (excluding the current rate being updated)
    const existingRate = await InterestRate.findOne({
      _id: { $ne: req.params.id },
      metalType,
      $or: [
        { $and: [{ minAmount: { $lte: minAmountNum } }, { maxAmount: { $gte: minAmountNum } }] },
        { $and: [{ minAmount: { $lte: maxAmountNum } }, { maxAmount: { $gte: maxAmountNum } }] },
        { $and: [{ minAmount: { $gte: minAmountNum } }, { maxAmount: { $lte: maxAmountNum } }] },
      ],
    });
    
    if (existingRate) {
      return res.status(400).json({
        message: "This amount range overlaps with an existing interest rate",
      });
    }
    
    // Find the rate to update
    const rate = await InterestRate.findById(req.params.id);
    if (!rate) {
      return res.status(404).json({ message: "Interest rate not found" });
    }
    
    // Format date + time
    const now = new Date();
    const formattedDate = now.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    
    // Update the rate
    rate.metalType = metalType;
    rate.minAmount = minAmountNum;  // Store as number
    rate.maxAmount = maxAmountNum;  // Store as number  
    rate.interest = interestNum;    // Store as number
    rate.date = formattedDate;
    
    const updatedRate = await rate.save();
    res.json(updatedRate);
  } catch (error) {
    console.error("Error updating interest rate:", error);
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete interest rate
// @route   DELETE /api/interest-rates/:id
router.delete("/:id", async (req, res) => {
  try {
    const rate = await InterestRate.findById(req.params.id);
    if (!rate) {
      return res.status(404).json({ message: "Interest rate not found" });
    }
    
    await InterestRate.findByIdAndDelete(req.params.id);
    res.json({ message: "Interest rate deleted successfully" });
  } catch (error) {
    console.error("Error deleting interest rate:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;