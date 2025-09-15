// models/Loan.js
import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema({
  installmentNo: {
    type: Number,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  emiAmount: {
    type: Number,
    required: true,
  },
  principalAmount: {
    type: Number,
    required: true,
  },
  interestAmount: {
    type: Number,
    required: true,
  },
  remainingBalance: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Paid", "Partial"],
    default: "Pending",
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
});

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
  },
  installmentNo: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  fineAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Received", "Pending"],
    default: "Received",
  },
  notes: {
    type: String,
    default: "",
  },
});

const loanSchema = new mongoose.Schema({
  loanId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  customerId: {
    type: String,
    required: true,
    ref: "Customer",
  },
  customerName: {
    type: String,
    required: true,
  },
  customerPhone: {
    type: String,
    required: true,
  },
  customerFatherSpouse: {
    type: String,
    default: "",
  },
  customerAltPhone: {
    type: String,
    default: "",
  },
  customerAddress: {
    type: String,
    required: true,
  },
  customerGovIdType: {
    type: String,
    default: "",
  },
  customerGovIdNumber: {
    type: String,
    default: "",
  },
  customerPhoto: {
    type: String,
    default: null,
  },
  loanAmount: {
    type: Number,
    required: true,
  },
  interestRate: {
    type: Number,
    required: true,
  },
  numberOfInstallments: {
    type: Number,
    required: true,
  },
  installmentFrequency: {
    type: String,
    enum: ["Daily", "Weekly", "Monthly"],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  installments: [installmentSchema],
  payments: [paymentSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  totalInterest: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Active", "Closed"],
    default: "Active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` before saving
loanSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Loan = mongoose.model("Loan", loanSchema);
export default Loan;
