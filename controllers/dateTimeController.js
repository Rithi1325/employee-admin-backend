// controllers/dateTimeController.js
import DateTime from "../models/DateTime.js";
import Customer from "../models/Customer.js";

// ---------------- Get current system datetime ----------------
export const getDateTime = async (req, res) => {
  try {
    // Fetch latest datetime setting
    let settings = await DateTime.findOne().sort({ createdAt: -1 });

    // If no settings exist, return fallback (real time)
    if (!settings) {
      return res.json({
        customDateTime: new Date().toISOString().slice(0, 16),
        useCustomDate: false,
      });
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching date settings", error });
  }
};

// ---------------- Update system datetime ----------------
export const updateDateTime = async (req, res) => {
  try {
    const { customDateTime, useCustomDate } = req.body;

    // Fetch existing settings
    let settings = await DateTime.findOne();

    if (settings) {
      settings.customDateTime = customDateTime;
      settings.useCustomDate = useCustomDate;
      await settings.save();
    } else {
      settings = await DateTime.create({ customDateTime, useCustomDate });
    }

    // Determine system date to apply
    const systemDate = useCustomDate ? new Date(customDateTime) : new Date();

    // Update all customer dates
    const updateResult = await Customer.updateMany({}, { dateAdded: systemDate });

    res.json({
      message: `DateTime settings updated successfully. ${updateResult.modifiedCount} customer records updated.`,
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating date settings", error });
  }
};
