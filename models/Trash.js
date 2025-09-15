// models/Trash.js
import mongoose from "mongoose";

const trashSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "customer",
      "jewel",
      "employee",
      "voucher",       // ✅ final: only "voucher"
      "loan",
      "interestRate",
      "financialYear",
    ],
  },
  data: {
    type: Object,
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  },
});

const Trash = mongoose.model("Trash", trashSchema);
export default Trash;
