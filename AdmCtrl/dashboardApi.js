
const mongoose = require('mongoose');
const User = require("../models/hunterModel"); 
const Provider = require("../models/providerModel");

exports.getTotalCount = async (req, res) => {
  try {
    const huntersCount = await User.countDocuments();
    const providersCount = await Provider.countDocuments({ isGuestMode: false });
    const guestModeProvidersCount = await Provider.countDocuments({ isGuestMode: true });
    const totalUsers = huntersCount + providersCount + guestModeProvidersCount;

    return res.status(200).json({
      totalUsers,
      huntersCount,
      providers: providersCount,
      guestModeProviders: guestModeProvidersCount,
    });
  } catch (error) {
    console.error("Error retrieving user counts:", error);
    return res.status(500).json({ message: "Error retrieving user counts", error });
  }
};


exports.getActiveUsersCount = async (req, res) => {
  try {
    const activeHuntersCount = await User.countDocuments({ userStatus: "Active" });
    
    const activeProvidersCount = await Provider.countDocuments({ userStatus: "Active", isGuestMode: false });
    
    const totalActiveUsers = activeHuntersCount + activeProvidersCount;

    return res.status(200).json({
      totalActiveUsers
    });
  } catch (error) {
    console.error("Error retrieving active user counts:", error);
    return res.status(500).json({ message: "Error retrieving active user counts", error });
  }
};
