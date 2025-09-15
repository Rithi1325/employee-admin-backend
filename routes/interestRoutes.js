// routes/interestRoutes.js
import express from "express";
import InterestRate from "../models/InterestRate.js";

const router = express.Router();

// @route   GET /api/interest
// @desc    Get all interest rates
router.get("/", async (req, res) => {
  try {
    const rates = await InterestRate.find().sort({ createdAt: -1 });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/interest
// @desc    Add new interest rate
router.post("/", async (req, res) => {
  try {
    const { metalType, minAmount, maxAmount, interest, date } = req.body;

    // Validate input
    if (
      !metalType ||
      minAmount === undefined ||
      maxAmount === undefined ||
      interest === undefined ||
      !date
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (parseFloat(minAmount) >= parseFloat(maxAmount)) {
      return res
        .status(400)
        .json({ message: "Maximum amount must be greater than minimum amount" });
    }

    const newRate = new InterestRate({
      metalType,
      minAmount: parseFloat(minAmount),
      maxAmount: parseFloat(maxAmount),
      interest: parseFloat(interest),
      date,
    });

    const savedRate = await newRate.save();
    res.status(201).json(savedRate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   DELETE /api/interest/:id
// @desc    Delete interest rate
router.delete("/:id", async (req, res) => {
  try {
    const rate = await InterestRate.findById(req.params.id);

    if (!rate) {
      return res.status(404).json({ message: "Interest rate not found" });
    }

    await rate.deleteOne();
    res.json({ message: "Interest rate deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
