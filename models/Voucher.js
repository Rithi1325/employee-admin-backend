// models/Voucher.js
import mongoose from "mongoose";

// Payment Schema
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  months: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Jewelry Item Schema
const jewelryItemSchema = new mongoose.Schema({
  sno: { type: Number }, // optional serial number
  category: { type: String, required: true },
  name: { type: String, required: true },
  remarks: { type: String, default: "" },
  stone: { type: String, default: "" },
  count: { type: Number, default: 1 },
  purity: { type: String, default: "" },
});

// Voucher Schema
const voucherSchema = new mongoose.Schema(
  {
    billNo: { type: String, unique: true, required: true },

    // Customer Reference
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },

    // Loan & Jewelry Details
    jewelType: { type: String, enum: ["gold", "silver"], required: true },
    grossWeight: { type: Number, required: true },
    deductionWeight: { type: Number, default: 0 },
    netWeight: { type: Number, required: true },
    loanAmount: { type: Number, required: true },
    finalLoanAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    interestAmount: { type: Number, required: true },
    overallLoanAmount: { type: Number, required: true },
    loanType: { type: String, default: "Personal Loan" },
    processingFees: { type: Number, default: 0 },

    // Dates
    disbursementDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    closedDate: { type: Date },

    // Status & Tracking
    status: { type: String, enum: ["Active", "Closed", "Pending"], default: "Active" },
    monthsPaid: { type: Number, default: 0 },
    totalInterestPaid: { type: Number, default: 0 },
    finalAmountPaid: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "Cash" },

    // Payment History
    paymentHistory: [paymentSchema],

    // Jewelry Items
    jewelryItems: [jewelryItemSchema],

    // Notes & Soft Delete
    notes: { type: String },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const Voucher = mongoose.model("Voucher", voucherSchema);
export default Voucher;
