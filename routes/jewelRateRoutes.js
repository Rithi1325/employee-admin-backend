// routes/jewelRateRoutes.js
import express from "express";
import {
  getJewelRates,
  getJewelRateByType,
  createOrUpdateJewelRate,
  deleteJewelRate,
} from "../controllers/jewelRateController.js";

const router = express.Router();

router.get("/", getJewelRates);
router.get("/:metalType", getJewelRateByType);
router.post("/", createOrUpdateJewelRate);
router.delete("/:metalType", deleteJewelRate);

export default router;