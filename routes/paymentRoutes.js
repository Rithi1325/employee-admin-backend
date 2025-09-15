// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const {
  getPayments,
  getPaymentsByVoucherId,
  createPayment,
  deletePayment
} = require("../controllers/paymentController.js");

// Get all payments
router.get("/", getPayments);

// Get payments by voucher ID
router.get("/voucher/:voucherId", getPaymentsByVoucherId);

// Create new payment
router.post("/", createPayment);

// Delete payment
router.delete("/:id", deletePayment);

module.exports = router;