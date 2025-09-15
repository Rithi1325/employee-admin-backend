import express from "express";
const router = express.Router();
const {
  getAuctionTransfers,
  createAuctionTransfer,
  getAuctionTransferById,
  deleteAuctionTransfer
} = require("../controllers/auctionTransferController.js");

// Get all auction transfers
router.get("/", getAuctionTransfers);

// Create new auction transfer
router.post("/", createAuctionTransfer);

// Get auction transfer by ID
router.get("/:id", getAuctionTransferById);

// Delete auction transfer
router.delete("/:id", deleteAuctionTransfer);


// Save auction transfer
router.post("/", async (req, res) => {
  try {
    const transfer = new AuctionTransfer(req.body);
    await transfer.save();
    res.status(201).json({ message: "Auction transfer saved", transfer });
  } catch (error) {
    console.error("Error saving transfer:", error);
    res.status(500).json({ error: "Failed to save auction transfer" });
  }
});

// Get all transfers
router.get("/", async (req, res) => {
  try {
    const transfers = await AuctionTransfer.find().sort({ transferDate: -1 });
    res.json(transfers);
  } catch (error) {
    console.error("Error fetching transfers:", error);
    res.status(500).json({ error: "Failed to fetch transfers" });
  }
});

module.exports = router;