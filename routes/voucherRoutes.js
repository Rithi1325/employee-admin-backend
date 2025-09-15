// routes/voucherRoutes.js
import express from "express";
import {
  getVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from "../controllers/voucherController.js";
import Voucher from "../models/Voucher.js";

const router = express.Router();

// ----- Standard CRUD routes -----
router.get("/", getVouchers);
router.get("/:id", getVoucherById);
router.post("/", createVoucher);
router.put("/:id", updateVoucher);
router.delete("/:id", deleteVoucher);

// ----- Close a loan voucher -----
router.put("/:id/close", async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    if (voucher.status.toLowerCase() === "closed") {
      return res.status(400).json({ message: "Loan is already closed" });
    }

    // Calculate number of months since disbursement
    const disbursementDate = new Date(voucher.disbursementDate);
    const currentDate = new Date();
    const diffTime = currentDate - disbursementDate;
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));

    // Calculate interest
    const interestRate = parseFloat(voucher.interestRate || 0) / 100;
    const monthlyInterestAmount = parseFloat(voucher.finalLoanAmount || 0) * interestRate;

    const paymentHistory = voucher.paymentHistory || [];
    const paidInterest = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);

    const totalInterestDue = monthlyInterestAmount * diffMonths;
    const remainingInterestAmount = Math.max(0, totalInterestDue - paidInterest);

    // Final settlement
    const finalAmount = parseFloat(voucher.finalLoanAmount || 0) + remainingInterestAmount;

    // Update voucher
    voucher.status = "Closed";
    voucher.closedDate = new Date();
    voucher.monthsPaid = diffMonths;
    voucher.totalInterestPaid = paidInterest + remainingInterestAmount;
    voucher.finalAmountPaid = finalAmount;
    voucher.paymentMethod = req.body.paymentMethod || "Cash";

    const updatedVoucher = await voucher.save();
    res.status(200).json(updatedVoucher);
  } catch (err) {
    console.error("❌ Error closing voucher:", err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

export default router;
