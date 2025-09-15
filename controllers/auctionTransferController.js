// controllers/auctionTransferController.js
const AuctionTransfer = require('../models/AuctionTransfer');
const Voucher = require('../models/Voucher');

// Get all auction transfers
exports.getAuctionTransfers = async (req, res) => {
  try {
    const transfers = await AuctionTransfer.find().sort({ transferDate: -1 });
    res.json(transfers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create new auction transfer
exports.createAuctionTransfer = async (req, res) => {
  try {
    const newTransfer = new AuctionTransfer(req.body);
    const transfer = await newTransfer.save();
    res.status(201).json(transfer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get auction transfer by ID
exports.getAuctionTransferById = async (req, res) => {
  try {
    const transfer = await AuctionTransfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }
    res.json(transfer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete auction transfer
exports.deleteAuctionTransfer = async (req, res) => {
  try {
    const transfer = await AuctionTransfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ message: 'Transfer not found' });
    }
    
    await transfer.remove();
    res.json({ message: 'Transfer removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};