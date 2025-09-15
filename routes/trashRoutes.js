// routes/trashRoutes.js
import express from "express";
import {
  getTrash,
  restoreFromTrash,
  deleteFromTrash,
  emptyTrash,
  getTrashLogs,
} from "../controllers/trashController.js";

const router = express.Router();

// ✅ Trash operations
router.get("/", getTrash);                  // Get all trash items
router.put("/restore/:id", restoreFromTrash); // Restore item by ID
router.delete("/:id", deleteFromTrash);       // Permanently delete item by ID
router.delete("/empty", emptyTrash);          // Empty all trash

// ✅ Logs
router.get("/logs", getTrashLogs);            // Get trash logs

export default router;
