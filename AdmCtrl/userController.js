const mongoose = require('mongoose');
const User = require("../models/hunterModel");
const JobPost = require('../models/jobpostModel');  // Ensure correct path
const Provider = require("../models/providerModel");  // Ensure correct path
// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving users", error });
  }
};

// Get user by ID
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

// Update user
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

// Delete user
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


// exports.getUsersByType = async (req, res) => {
//   try {
//     const { hunte } = req.params; // Extract userType from params
//     const limit = parseInt(req.params.limit) || 10; // Extract limit from params
//     const page = parseInt(req.query.page) || 1; // Extract page number from query
//     const search = req.query.search || ""; // Extract search query from query

//     // Validate userType
//     const userType = hunte.toLowerCase();
//     if (!["provider", "hunter"].includes(userType)) {
//       return res.status(400).json({ message: "Invalid or missing userType" });
//     }

//     // Construct query with search
//     const query = {
//       userType,
//       $or: [
//         { name: { $regex: search, $options: "i" } }, // Search by name (case-insensitive)
//         { email: { $regex: search, $options: "i" } }, // Search by email (case-insensitive)
//       ],
//     };

//     // Fetch users with pagination
//     const users = await User.find(query)
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .select("name email phoneNo userType userStatus emailVerified documentStatus subscriptionStatus");

//     // Count total users for pagination metadata
//     const totalUsers = await User.countDocuments(query);

//     res.status(200).json({
//       page,
//       limit,
//       totalUsers,
//       totalPages: Math.ceil(totalUsers / limit),
//       users,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error retrieving users", error });
//   }
// };

exports.getUsersByType = async (req, res) => {
  try {
    const { hunte } = req.params; // Extract userType from params
    const limit = parseInt(req.params.limit) || 10; // Extract limit from params
    const page = parseInt(req.query.page) || 1; // Extract page number from query
    const search = req.query.search || ""; // Extract search query from query
    const userStatusFilter = req.query.userStatus; // Extract userStatus filter from query

    const userType = hunte.toLowerCase(); // Convert userType to lowercase

    // Construct base query with search filters
    let query = {
      userType,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    // Apply userStatus filter if provided
    if (userStatusFilter) {
      query.userStatus = userStatusFilter;
    }

    // Fetch users with pagination
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("name email phoneNo userType userStatus emailVerified documentStatus subscriptionStatus");

    // Count total users for pagination metadata
    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving users", error });
  }
};



// GET Job Posts By User Id
exports.getJobPostsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if userId is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    // Fetch job posts by user (ensure type matches database)
    const jobPosts = await JobPost.find({ user: userId }); // No conversion if user is stored as a string
    // If user is stored as ObjectId, uncomment the following line:
    // const jobPosts = await JobPost.find({ user: mongoose.Types.ObjectId(userId) });

    if (!jobPosts || jobPosts.length === 0) {
      return res.status(404).json({ message: 'No job posts found for this user' });
    }

    // Send matching job posts
    return res.status(200).json({ data: jobPosts });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};