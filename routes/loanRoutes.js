// routes/loanRoutes.js
import express from "express";
import {
  getAllLoans,
  getLoanById,
  createLoan,
  updateLoan,
  deleteLoan,
  processPayment,
  getLoanStats,
  getCollectionReport,
} from "../controllers/loanController.js";

const router = express.Router();

router.route("/").get(getAllLoans).post(createLoan);

router.route("/stats").get(getLoanStats);

router.route("/report").get(getCollectionReport);

router
  .route("/:id")
  .get(getLoanById)
  .put(updateLoan)
  .delete(deleteLoan);

router.route("/:id/payment").post(processPayment);

export default router;
