import Jewel from "../models/jewel.js";
import mongoose from "mongoose";

// Optional category colors
const getCategoryColor = (jewelType) => {
  const colors = {
    gold: "bg-yellow-100 text-yellow-800",
    silver: "bg-gray-100 text-gray-800",
    diamond: "bg-blue-100 text-blue-800",
  };
  return colors[jewelType] || "bg-gray-100 text-gray-800";
};

// GET /api/jewels
export const getJewels = async (req, res) => {
  try {
    const jewels = await Jewel.find().sort({ dateAdded: -1 });
    res.json(jewels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jewels/:id (_id or itemId)
export const getJewelById = async (req, res) => {
  try {
    const id = req.params.id;
    let jewel;

    if (mongoose.Types.ObjectId.isValid(id)) {
      jewel = await Jewel.findById(id);
    }

    if (!jewel) {
      jewel = await Jewel.findOne({ itemId: id });
    }

    if (!jewel) return res.status(404).json({ message: "Jewel not found" });

    res.json(jewel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/jewels
export const createJewel = async (req, res) => {
  try {
    const { itemName, jewelType, weight, price } = req.body;

    // Accept frontend variations
    if (!itemName || !jewelType || !weight || !price) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const color = getCategoryColor(jewelType.toLowerCase());

    const newJewel = new Jewel({
      itemName: itemName.trim(),
      jewelType: jewelType.toLowerCase(),
      weight,
      price,
      categoryColor: color,
    });

    const saved = await newJewel.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Failed to create jewel:", err.message);
    res.status(400).json({ message: "Failed to create jewel", error: err.message });
  }
};

// PUT /api/jewels/:id
export const updateJewel = async (req, res) => {
  try {
    const { itemName, jewelType, weight, price } = req.body;
    const id = req.params.id;

    let jewel = await Jewel.findById(id);
    if (!jewel) jewel = await Jewel.findOne({ itemId: id });
    if (!jewel) return res.status(404).json({ message: "Jewel not found" });

    if (itemName) jewel.itemName = itemName.trim();
    if (jewelType) {
      jewel.jewelType = jewelType.toLowerCase();
      jewel.categoryColor = getCategoryColor(jewel.jewelType);
    }
    if (weight) jewel.weight = weight;
    if (price) jewel.price = price;

    const updated = await jewel.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/jewels/:id
export const deleteJewel = async (req, res) => {
  try {
    const id = req.params.id;
    let jewel = await Jewel.findById(id);
    if (!jewel) jewel = await Jewel.findOne({ itemId: id });
    if (!jewel) return res.status(404).json({ message: "Jewel not found" });

    await Jewel.deleteOne({ _id: jewel._id });
    res.json({ message: "Jewel deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
