import express from "express";
import Jewel from "../models/Jewel.js";
import Trash from "../models/Trash.js"; // ✅ now points to correct file

const router = express.Router();

// GET all jewels
router.get("/", async (req, res) => {
  try {
    const jewels = await Jewel.find({});
    res.json(jewels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET jewel by ID
router.get("/:id", async (req, res) => {
  try {
    const jewel = await Jewel.findById(req.params.id);
    if (!jewel) return res.status(404).json({ message: "Jewel not found" });
    res.json(jewel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new jewel
router.post("/", async (req, res) => {
  try {
    const { name, category, material } = req.body;
    const jewel = new Jewel({ name, category, material });
    const createdJewel = await jewel.save();
    res.status(201).json(createdJewel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update jewel
router.put("/:id", async (req, res) => {
  try {
    const { name, category, material } = req.body;
    const jewel = await Jewel.findById(req.params.id);
    if (!jewel) return res.status(404).json({ message: "Jewel not found" });

    jewel.name = name || jewel.name;
    jewel.category = category || jewel.category;
    jewel.material = material || jewel.material;

    const updatedJewel = await jewel.save();
    res.json(updatedJewel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE jewel → Move to Trash instead of hard delete
router.delete("/:id", async (req, res) => {
  try {
    const jewel = await Jewel.findById(req.params.id);
    if (!jewel) return res.status(404).json({ message: "Jewel not found" });

    // Save deleted jewel in Trash collection
    const trashEntry = new Trash({
      type: "jewel",
      data: jewel.toObject(),
    });

    await trashEntry.save();
    await jewel.deleteOne();

    res.json({ message: "Jewel moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
