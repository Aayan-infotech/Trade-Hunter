const User = require("../models/userModel");

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


// get users based on userType and pagination
// exports.getUsersByType = async (req, res) => {
//   try {
//     const { hunte } = req.params; // Extract userType from route params
//     const limit = parseInt(req.params.limit) || 10; // Default limit is 10

//     // Normalize userType to lowercase for consistent comparison
//     const userType = hunte.toLowerCase();

//     if (!userType || (userType !== "provider" && userType !== "hunter")) {
//       return res.status(400).json({ message: "Invalid or missing userType" });
//     }

//     const query = { userType };

//     const users = await User.find(query)
//       .limit(limit)
//       .select("name email userType"); // Selecting specific fields

//     res.status(200).json({
//       limit,
//       total: users.length,
//       users,
//     });
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     res.status(500).json({ message: "Error retrieving users", error });
//   }
// };


exports.getUsersByType = async (req, res) => {
  try {
    const { hunte } = req.params; // Extract userType from params
    const limit = parseInt(req.params.limit) || 10; // Extract limit from params
    const page = parseInt(req.query.page) || 1; // Extract page number from query
    const search = req.query.search || ""; // Extract search query from query

    // Validate userType
    const userType = hunte.toLowerCase();
    if (!["provider", "hunter"].includes(userType)) {
      return res.status(400).json({ message: "Invalid or missing userType" });
    }

    // Construct query with search
    const query = {
      userType,
      $or: [
        { name: { $regex: search, $options: "i" } }, // Search by name (case-insensitive)
        { email: { $regex: search, $options: "i" } }, // Search by email (case-insensitive)
      ],
    };

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
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error retrieving users", error });
  }
};

