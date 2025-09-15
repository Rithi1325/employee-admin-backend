// backend/models/AuctionTransfer.js
import mongoose from "mongoose";

const AuctionTransferSchema = new mongoose.Schema({
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
  billNo: String,
  customer: {
    fullName: String,
    phoneNumber: String,
    customerId: String,
    address: String,
  },
  jewelType: String,
  netWeight: Number,
  originalLoanAmount: Number,
  totalOwedAmount: Number,
  monthsOverdue: Number,
  additionalInterest: Number,
  transferDate: { type: Date, default: Date.now },
  status: { type: String, default: "Transferred to Auction" },
  jewelryItems: Array,
});

export default mongoose.model("AuctionTransfer", AuctionTransferSchema);
