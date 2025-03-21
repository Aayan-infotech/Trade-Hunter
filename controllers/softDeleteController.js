const Provider = require("../models/providerModel");
const Hunter = require("../models/hunterModel");

// Soft delete Provider
const softDeleteProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await Provider.findByIdAndUpdate(
      providerId,
      { isDeleted: true, accountStatus: "Suspend" },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.status(200).json({ message: "Provider soft deleted successfully", provider });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

// Soft delete Hunter
const softDeleteHunter = async (req, res) => {
  try {
    const { hunterId } = req.params;

    const hunter = await Hunter.findByIdAndUpdate(
      hunterId,
      { isDeleted: true, accountStatus: "Suspend" },
      { new: true }
    );

    if (!hunter) {
      return res.status(404).json({ message: "Hunter not found" });
    }

    res.status(200).json({ message: "Hunter soft deleted successfully", hunter });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

const deleteHunterPermanently = async (req, res) => {
  try {
    const { hunterId } = req.params;

    const hunter = await Hunter.findByIdAndDelete(hunterId);

    if (!hunter) {
      return res.status(404).json({ message: "Hunter not found" });
    }

    res.status(200).json({ message: "Hunter deleted permanently", hunter });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};


module.exports = { softDeleteProvider, softDeleteHunter, deleteHunterPermanently };
