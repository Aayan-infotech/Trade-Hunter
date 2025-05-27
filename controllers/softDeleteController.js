const Provider = require("../models/providerModel");
const Hunter = require("../models/hunterModel");
const JobPost = require("../models/jobpostModel");

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
    const jobDeleteResult = await JobPost.deleteMany({
      user: hunterId,
      jobStatus: "Pending"
    });

    res.status(200).json({
      message: "Hunter and their pending job posts deleted successfully",
      hunter,
      deletedJobPostsCount: jobDeleteResult.deletedCount
    });

  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
      error: err.message
    });
  }
};




module.exports = { softDeleteProvider, softDeleteHunter, deleteHunterPermanently };
