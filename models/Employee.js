import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true, default: "employee" },
  password: { type: String, required: true },
  photo: { type: String }, // path to uploaded image
}, { timestamps: true });

export default mongoose.model("Employee", employeeSchema);