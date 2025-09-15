import mongoose from "mongoose";

const jewelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Item name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"],
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    enum: ["RING", "EARRINGS", "NECKLACE", "CHAIN", "BRACELET", "ANKLET"],
    uppercase: true,
  },
  material: {
    type: String,
    required: [true, "Material is required"],
    enum: ["Gold", "Silver"],
  },
  itemId: {
    type: String,
    unique: true,
    sparse: true,
  },
}, { timestamps: true });

// Generate itemId before saving
jewelSchema.pre("save", function (next) {
  if (!this.itemId) {
    this.itemId = `${this.material.substring(0, 1)}-${this.category.substring(0, 3)}-${Date.now().toString(36)}`;
  }
  next();
});

const Jewel = mongoose.model("Jewel", jewelSchema);
export default Jewel;
