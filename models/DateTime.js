// models/DateTime.js
import mongoose from "mongoose";

const dateTimeSchema = new mongoose.Schema(
  {
    customDateTime: {
      type: String, // Store in ISO format (e.g. 2025-08-12T17:35)
      required: true,
    },
    useCustomDate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const DateTime = mongoose.model("DateTime", dateTimeSchema);

export default DateTime;
