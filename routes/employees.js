import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { auth, authorizeAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// @desc    Get all employees (non-admin users)
// @route   GET /api/employees
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    // Admin can see all users, employees can only see themselves
    const filter = req.user.role === "admin" ? {} : { _id: req.user.id };
    
    const employees = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("-password");
      
    res.status(200).json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (admin)
router.post("/", auth, authorizeAdmin, async (req, res) => {
  try {
    const { name, email, password, role, position } = req.body;
    
    // Check if employee exists
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, msg: "Employee already exists" });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const employee = new User({
      name,
      email,
      role: role || "employee",
      position: position || "",
      password: hashedPassword,
    });
    
    await employee.save();
    res.status(201).json({
      success: true,
      msg: "Employee created successfully",
      data: { 
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        position: employee.position,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (admin)
router.delete("/:id", auth, authorizeAdmin, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, msg: "Cannot delete your own account" });
    }
    
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, msg: "Employee not found" });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, msg: "Employee removed" });
  } catch (err) {
    console.error("Error in delete route:", err);
    res.status(500).json({ success: false, msg: "Server error while deleting employee" });
  }
});

export default router;