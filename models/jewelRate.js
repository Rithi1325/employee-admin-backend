// models/JewelRate.js
import mongoose from "mongoose";

const jewelRateSchema = new mongoose.Schema({
  metalType: { 
    type: String, 
    required: true, 
    enum: ["gold", "silver"], // only allow these two metals
    unique: true // Ensure only one document per metalType
  },
  rate: { 
    type: Number, 
    required: true 
  },
  date: { 
    type: Date, 
    default: Date.now // automatically sets current date if not provided
  },
}, {
  timestamps: true // This will add createdAt and updatedAt fields
});

// Create a unique index on metalType to prevent duplicates
jewelRateSchema.index({ metalType: 1 }, { unique: true });

const JewelRate = mongoose.model("JewelRate", jewelRateSchema);

export default JewelRate;