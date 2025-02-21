
const mongoose = require('mongoose');
const User = require("../models/hunterModel"); // Ensure correct path
const Provider = require("../models/providerModel");

exports.getTotalCount= async (req, res) => {
  try {
    const huntersCount = await User.countDocuments();
    const providersCount = await Provider.countDocuments();
    const totalUsers = huntersCount + providersCount;

    return res.status(200).json({
      totalUsers,
      huntersCount,
      providersCount,
    });
  } catch (error) {
    console.error("Error retrieving user counts:", error);
    return res.status(500).json({ message: "Error retrieving user counts", error });
  }
};