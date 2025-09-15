import express from "express";
import { getDateTime, updateDateTime } from "../controllers/dateTimeController.js";

const router = express.Router();

// GET current system date & time setting
router.get("/", getDateTime);

// POST/PUT update system date & time setting
router.post("/", updateDateTime);

export default router;
