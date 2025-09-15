// controllers/customerController.js
import fs from "fs";
import path from "path";
import Customer from "../models/Customer.js";
import Trash from "../models/Trash.js";
import DateTime from "../models/DateTime.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- Helper: Get System Date ----------------
const getSystemDate = async () => {
  try {
    const dateTimeSetting = await DateTime.findOne().sort({ createdAt: -1 });
    if (dateTimeSetting && dateTimeSetting.useCustomDate) {
      return new Date(dateTimeSetting.customDateTime);
    }
    return new Date(); // Default to real time
  } catch (error) {
    console.error("Error getting system date:", error);
    return new Date(); // Fallback to real time
  }
};

// ---------------- Helper: Generate Customer ID ----------------
const generateCustomerId = async () => {
  const now = await getSystemDate();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const yearMonth = `${year}${month}`;

  const lastCustomer = await Customer.findOne({
    customerId: { $regex: `^${yearMonth}` },
  }).sort({ customerId: -1 });

  let sequence = 1;
  if (lastCustomer) {
    const lastSequence = parseInt(lastCustomer.customerId.slice(-3));
    sequence = lastSequence + 1;
  }

  const sequenceNumber = String(sequence).padStart(3, "0");
  return `${yearMonth}${sequenceNumber}`;
};

// ---------------- Controllers ----------------

// @desc    Get all customers
// @route   GET /api/customers
export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({});
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a customer
// @route   POST /api/customers
export const createCustomer = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      fatherSpouse,
      altPhoneNumber,
      address,
      govIdType,
      govIdNumber,
    } = req.body;

    const customerId = await generateCustomerId();
    const systemDate = await getSystemDate();

    const photo = req.file ? `/uploads/${req.file.filename}` : "";

    const customer = await Customer.create({
      customerId,
      fullName,
      phoneNumber,
      fatherSpouse,
      altPhoneNumber,
      address,
      govIdType,
      govIdNumber,
      photo,
      dateAdded: systemDate,
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a customer
// @route   PUT /api/customers/:id
export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const {
      fullName,
      phoneNumber,
      fatherSpouse,
      altPhoneNumber,
      address,
      govIdType,
      govIdNumber,
    } = req.body;

    let photo = customer.photo;

    if (req.file) {
      // Delete old photo if exists
      if (customer.photo) {
        const oldPhotoPath = path.join(__dirname, "..", customer.photo);
        if (fs.existsSync(oldPhotoPath)) fs.unlinkSync(oldPhotoPath);
      }
      photo = `/uploads/${req.file.filename}`;
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        fullName,
        phoneNumber,
        fatherSpouse,
        altPhoneNumber,
        address,
        govIdType,
        govIdNumber,
        photo,
      },
      { new: true }
    );

    res.status(200).json(updatedCustomer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Soft delete customer (move to Trash)
// @route   DELETE /api/customers/:id
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    // Move customer data to Trash
    await Trash.create({
      type: "customer",
      data: customer.toObject(),
    });

    await customer.deleteOne();

    res.status(200).json({ message: "Customer moved to Trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
