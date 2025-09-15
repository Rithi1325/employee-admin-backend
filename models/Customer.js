// models/Customer.js
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    // Unique customer identifier
    customerId: { type: String, required: true, unique: true },

    // Basic info
    fullName: { 
      type: String, 
      required: [true, "Please add a name"] 
    },
    email: { 
      type: String, 
      unique: true,
      sparse: true, // allows multiple docs without email
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    phoneNumber: { 
      type: String, 
      required: [true, "Please add a phone number"] 
    },
    altPhoneNumber: { type: String },
    fatherSpouse: { type: String },

    // Address
    address: { 
      type: String, 
      required: [true, "Please add an address"] 
    },

    // Government ID
    govIdType: { type: String, required: true },
    govIdNumber: { type: String, required: true },

    // Media
    photo: { type: String },

    // Status & date
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    dateAdded: { type: Date, default: Date.now },

    // Soft delete fields
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
