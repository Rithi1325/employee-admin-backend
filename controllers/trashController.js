// controllers/trashController.js
import fs from "fs";
import Trash from "../models/Trash.js";
import TrashLog from "../models/TrashLog.js";

// ✅ Get all trash items
export const getTrash = async (req, res) => {
  try {
    const trashItems = await Trash.find().sort({ deletedAt: -1 });
    res.json(trashItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Restore item from trash
export const restoreFromTrash = async (req, res) => {
  try {
    const item = await Trash.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found in Trash" });

    let restoredItem;

    // Restore based on type
    switch (item.type) {
      case "customer": {
        const Customer = (await import("../models/Customer.js")).default;
        restoredItem = await Customer.create(item.data);
        break;
      }
      case "jewel": {
        const Jewel = (await import("../models/Jewel.js")).default;
        restoredItem = await Jewel.create(item.data);
        break;
      }
      case "employee": {
        const Employee = (await import("../models/Employee.js")).default;
        restoredItem = await Employee.create(item.data);
        break;
      }
      case "voucher": { // ✅ final: only voucher type
        const Voucher = (await import("../models/Voucher.js")).default;
        restoredItem = await Voucher.create(item.data);
        break;
      }
      default:
        return res.status(400).json({ message: "Invalid item type" });
    }

    // Log restore
    await TrashLog.create({
      action: "restore",
      type: item.type,
      data: item.data,
    });

    // Remove from trash
    await item.deleteOne();

    res.json({ message: "Item restored successfully", restoredItem });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Permanently delete item from trash
export const deleteFromTrash = async (req, res) => {
  try {
    const item = await Trash.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found in Trash" });

    // If it's a customer with a photo, delete the photo file
    if (item.type === "customer" && item.data.photo) {
      if (fs.existsSync(item.data.photo)) {
        fs.unlinkSync(item.data.photo);
      }
    }

    // Log delete
    await TrashLog.create({
      action: "delete",
      type: item.type,
      data: item.data,
    });

    await item.deleteOne();
    res.json({ message: "Item permanently deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Empty entire trash
export const emptyTrash = async (req, res) => {
  try {
    const trashItems = await Trash.find({});

    for (const item of trashItems) {
      // Delete customer photo file if exists
      if (item.type === "customer" && item.data.photo) {
        if (fs.existsSync(item.data.photo)) {
          fs.unlinkSync(item.data.photo);
        }
      }

      // Log delete for each item
      await TrashLog.create({
        action: "delete",
        type: item.type,
        data: item.data,
      });
    }

    // Delete all trash items
    await Trash.deleteMany({});

    res.json({ message: "Trash emptied successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get Trash Logs
export const getTrashLogs = async (req, res) => {
  try {
    const logs = await TrashLog.find().sort({ performedAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
