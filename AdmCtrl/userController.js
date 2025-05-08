const mongoose = require('mongoose');
const User = require("../models/hunterModel");
const JobPost = require('../models/jobpostModel');  
const Provider = require("../models/providerModel");  
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving users", error });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving user", error });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
};

exports.getUsersByType = async (req, res) => {
  try {
    const { type } = req.params; 
    const limit = parseInt(req.params.pagelimit) || 10; 
    const page = Math.max(1, parseInt(req.query.page) || 1); 
    const search = req.query.search || ""; 
    const userStatusFilter = req.query.userStatus; 

    if (!type) {
      return res.status(400).json({ message: "User type is required" });
    }

    const lowerUserType = type.toLowerCase(); 

    let query = {
      userType: lowerUserType,
      $or: [
        { name: { $regex: `.*${search}.*`, $options: "i" } },
        { email: { $regex: `.*${search}.*`, $options: "i" } },
        { "address.addressLine": { $regex: `.*${search}.*`, $options: "i" } },
      ],
    };

    if (userStatusFilter) {
      query.userStatus = userStatusFilter;
    }


    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).json({ message: "Error retrieving users", error });
  }
};

exports.getJobPostsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }

    const jobPosts = await JobPost.find({ user: userId })
      .populate({
        path: "provider",
        select: "contactName email"
      });

    if (!jobPosts || jobPosts.length === 0) {
      return res.status(404).json({ message: "No job posts found for this user" });
    }

    return res.status(200).json({ data: jobPosts });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
