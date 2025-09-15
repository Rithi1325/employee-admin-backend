// controllers/voucherController.js
import Voucher from "../models/Voucher.js";
import Trash from "../models/Trash.js";
import mongoose from "mongoose";

// Helper: Validate MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Get all vouchers
// @route   GET /api/vouchers
// @access  Private
export const getVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find()
      .populate("customer", "customerId fullName phoneNumber")
      .sort({ createdAt: -1 });
    res.status(200).json(vouchers);
  } catch (err) {
    console.error("❌ Error fetching vouchers:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get voucher by ID
// @route   GET /api/vouchers/:id
// @access  Private
export const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid voucher ID" });
    }

    const voucher = await Voucher.findById(id).populate(
      "customer",
      "customerId fullName phoneNumber fatherSpouse altPhoneNumber govIdType govIdNumber address"
    );

    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    res.status(200).json(voucher);
  } catch (err) {
    console.error("❌ Error fetching voucher by ID:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Create a new voucher
// @route   POST /api/vouchers
// @access  Private
export const createVoucher = async (req, res) => {
  try {
    const { billNo } = req.body;

    // Check if bill number already exists
    const existingVoucher = await Voucher.findOne({ billNo });
    if (existingVoucher) {
      return res.status(400).json({ message: "Bill number already exists" });
    }

    const newVoucher = new Voucher(req.body);
    const savedVoucher = await newVoucher.save();

    // Populate customer for response
    const populatedVoucher = await Voucher.findById(savedVoucher._id).populate(
      "customer",
      "customerId fullName phoneNumber"
    );

    res.status(201).json(populatedVoucher);
  } catch (err) {
    console.error("❌ Error creating voucher:", err.message);
    res.status(500).json({ message: "Error creating voucher", error: err.message });
  }
};

// @desc    Update a voucher
// @route   PUT /api/vouchers/:id
// @access  Private
export const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid voucher ID" });
    }

    let voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    // Check if bill number changed and already exists
    if (req.body.billNo && req.body.billNo !== voucher.billNo) {
      const existingVoucher = await Voucher.findOne({ billNo: req.body.billNo });
      if (existingVoucher) {
        return res.status(400).json({ message: "Bill number already exists" });
      }
    }

    // Update voucher
    voucher = await Voucher.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    ).populate("customer", "customerId fullName phoneNumber");

    res.status(200).json(voucher);
  } catch (err) {
    console.error("❌ Error updating voucher:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Delete a voucher (soft delete -> move to Trash)
// @route   DELETE /api/vouchers/:id
// @access  Private
export const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid voucher ID" });
    }

    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    // Move voucher to Trash
    const trashItem = new Trash({
      type: "voucher", // ✅ Final: correct type
      data: voucher.toObject(),
      deletedAt: new Date(),
    });

    await trashItem.save();

    // Remove from main collection
    await voucher.deleteOne();

    res.status(200).json({ message: "Voucher moved to trash successfully" });
  } catch (err) {
    console.error("❌ Error deleting voucher:", err.message);
    res.status(500).json({ message: "Server Error" });
  }
};
