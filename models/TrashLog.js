import mongoose from "mongoose";

const trashLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ["restore", "delete"],
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
  performedAt: {
    type: Date,
    default: Date.now,
  },
});

const TrashLog = mongoose.model("TrashLog", trashLogSchema);
export default TrashLog;
