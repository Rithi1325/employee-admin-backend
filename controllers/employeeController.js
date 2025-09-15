import Employee from "../models/Employee.js";
import bcrypt from "bcryptjs";

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (admin)
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 }).select("-password");
    res.status(200).json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

// @desc    Get single employee by ID
// @route   GET /api/employees/:id
// @access  Private (admin)
export const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select("-password");
    if (!employee) return res.status(404).json({ success: false, msg: "Employee not found" });
    res.status(200).json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (admin)
export const createEmployee = async (req, res) => {
  try {
    const { name, email, password, role, position } = req.body;

    // Check if employee exists
    const existing = await Employee.findOne({ email });
    if (existing) return res.status(400).json({ success: false, msg: "Employee already exists" });

    // Hash password if provided
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const employee = new Employee({
      name,
      email,
      role: role || "employee",
      position: position || "",
      password: hashedPassword,
      photo: req.file ? req.file.filename : undefined,
    });

    await employee.save();
    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (admin)
export const updateEmployee = async (req, res) => {
  try {
    const { name, email, password, role, position } = req.body;
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, msg: "Employee not found" });

    // Update fields
    employee.name = name || employee.name;
    employee.email = email || employee.email;
    employee.role = role || employee.role;
    employee.position = position || employee.position;

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(password, salt);
    }

    // Update photo if uploaded
    if (req.file) employee.photo = req.file.filename;

    await employee.save();
    res.status(200).json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (admin)
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, msg: "Employee not found" });

    await employee.remove();
    res.status(200).json({ success: true, msg: "Employee removed" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};
