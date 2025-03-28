const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/hunterModel");
const generateverificationOTP = require("../utils/VerifyOTP");
const sendEmail = require("../services/sendMail");
const jwt = require("jsonwebtoken");
const apiResponse = require("../utils/responsehandler");
const Provider = require("../models/providerModel");
const Hunter = require("../models/hunterModel");
const Address = require("../models/addressModel");

const signUp = async (req, res) => {
  try {
    const {
      businessName,
      name,
      email,
      phoneNo,
      addressType,
      addressLine,
      latitude,
      longitude,
      radius,
      password,
      ABN_Number,
      businessType,
      userType,
      isGuestMode,
    } = req.body;

    // Validate userType
    if (!["hunter", "provider"].includes(userType)) {
      return res.status(400).json({ status: 400, success: false, message: "Invalid user type." });
    }

    // Validate required fields based on userType
    const requiredFields =
      userType === "hunter"
        ? [name, email, phoneNo, latitude, longitude, radius, password, addressLine]
        : [name, businessName, email, phoneNo, latitude, longitude, radius, password, ABN_Number, businessType, addressLine];

    if (requiredFields.some((field) => !field)) {
      return res.status(400).json({ status: 400, success: false, message: `All ${userType} fields are required.` });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ status: 400, success: false, message: "Invalid email format." });
    }

    // Validate phone number
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNo)) {
      return res.status(400).json({ status: 400, success: false, message: "Invalid phone number. Must be 10 digits." });
    }

    // Validate password
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Password must be at least 8 characters long, including one letter, one number, and one special character.",
      });
    }

    // Check if the email is already in use
    const existingUser = await (
      userType === "hunter"
        ? User.findOne({ email, isDeleted: { $ne: true } })
        : Provider.findOne({ email, isDeleted: { $ne: true } })
    );

    if (existingUser) {
      if (!existingUser.emailVerified) {
        const verificationOTP = await generateverificationOTP(existingUser);
        await sendEmail(email, "Account Verification OTP", verificationOTP);
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Account exists. Please verify via OTP sent to your email.",
        });
      }
      return res.status(400).json({ status: 400, success: false, message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate address fields
    if (!latitude || !longitude || !radius || !addressLine) {
      return res.status(400).json({ status: 400, success: false, message: "All hunter address fields are required." });
    }

    // Construct address object
    const address = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      addressLine,
      radius: parseFloat(radius),
      addressType: addressType || (userType === "hunter" ? "home" : "office"),
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)], // GeoJSON format [longitude, latitude]
      },
    };

    // Create new user or provider
    const newUser =
      userType === "hunter"
        ? new User({
            name,
            email,
            phoneNo,
            password: hashedPassword,
            userType,
            insBy: req.headers["x-client-type"],
            images: req.fileLocations ? req.fileLocations[0] : undefined, // Optional image upload
            address,
          })
        : new Provider({
            businessName,
            contactName: name,
            email,
            phoneNo,
            ABN_Number,
            businessType,
            password: hashedPassword,
            userType,
            insBy: req.headers["x-client-type"],
            images: req.fileLocations ? req.fileLocations[0] : undefined, // Optional image upload
            address,
            isGuestMode,
          });

    // Send verification email
    const verificationOTP = await generateverificationOTP(newUser);
    await sendEmail(email, "Account Verification Link", verificationOTP);

    const answer = await newUser.save();

    // Create address document for hunter if applicable
    if (userType === "hunter") {
      await new Address({
        userId: answer._id,
        addressType,
        address: addressLine,
        location: address.location,
        radius,
        isSelected: 1,
      }).save();
    }

    

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Signup successful! Verification link sent to email.",
      user: answer,
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: `Server error: ${error.message}`,
    });
  }
};

const login = async (req, res) => {
  const { email, password, userType } = req.body;

  if (!["hunter", "provider"].includes(userType)) {
    return res.status(400).json({ status: 400, message: "Invalid user type." });
  }
  try {
    let user;

    if (userType == "hunter") {
      user = await User.findOne({ email, userType, isDeleted: { $ne: true } });
    } else {
      user = await Provider.findOne({ email, userType, isDeleted: { $ne: true } });
    }
    if (!user) {
      return res.status(400).json({ status: 400, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 400, message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "24h" });
    const refreshToken = jwt.sign({ userId: user._id, email: user.email }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    if (req.body.UID) {
      user.UID = req.body.UID;
    }

    user.refreshToken = refreshToken;
    user.token = token;

    await user.save();

    if (!user.emailVerified) {
      const verificationOTP = await generateverificationOTP(user);
      await sendEmail(email, "Account Verification OTP", verificationOTP);
      return res.status(200).json({ status: 200, message: "You are not verified, Please verify your email" });
    }

    if (userType === "provider" && user.subscriptionStatus !== 1) {
      return res.status(200).json({
        status: 200,
        message: "You have not subscribed to the service",
        data: { token: token, user: user }
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Login successful",
      data: { token: token, user: user }
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error", error: err.message });
  }
};

const logout = async (req, res) => {
  try {
    const { userType } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        status: 401,
        message: "Unauthorized access. User not found."
      });
    }

    let user;
    if (userType === "hunter") {
      user = await User.findById(req.user.userId);
    } else if (userType === "provider") {
      user = await Provider.findById(req.user.userId);
    }

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "User not found."
      });
    }

    // Remove refresh token from database
    user.refreshToken = "";
    await user.save();

    return res.status(200).json({
      status: 200,
      message: "Logout successful."
    });
  } catch (error) {
    return res.status(500).json({ status: 500, message: "Server error", error: error.message });
  }
};

const verifyEmail = async (req, res) => {
  const { email, verificationOTP, userType } = req.body;
  let user;

  try {
    // Determine which collection to query based on userType
    if (userType === "hunter") {
      user = await User.findOne({ email, userType });
    } else {
      user = await Provider.findOne({ email, userType });
    }

    if (!user) {
      return res.status(400).json({ status: 400, message: "User not found, please sign up first" });
    }

    if (user.emailVerified) {
      return res.status(200).json({ status: 200, message: "User already verified.", data: {} });
    }

    if (verificationOTP !== user.verificationOTP) {
      return res.status(401).json({ status: 401, message: "Invalid OTP." });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Update the user fields to reflect email verification
    user.emailVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    user.token = token;
    await user.save();

    return res.status(200).json({ status: 200, message: "Email verified successfully", data: { token, user } });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error", error: err.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    let user;

    // Check if the email exists in the User model
    user = await User.findOne({ email });
    if (!user) {
      // If not found in User, check in Provider model
      user = await Provider.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }

    // Generate OTP
    const otp = await generateverificationOTP(user);

    // Send OTP to user's email
    await sendEmail(
      email,
      "Password Reset OTP",
      `Your OTP for password reset is: ${otp}. It is valid for 15 minutes.`
    );

    // Respond with success message
    return res.status(200).json({
      status: 200,
      message: "OTP sent to your email. Please check your inbox."
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error", error: err.message });
  }
};

const verifyOtp = async (req, res) => {
  const { email, verificationOTP } = req.body;

  try {
    let user;

    // Check if the email exists in the User model
    user = await User.findOne({ email });
    if (!user) {
      // If not found in User, check in Provider model
      user = await Provider.findOne({ email });
    }

    if (!user) {
      return res.status(400).json({ status: 400, message: "User not found, please sign up first" });
    }

    if (verificationOTP === user.verificationOTP) {
      user.emailVerified = true;
      user.verificationOTP = null;
      user.verificationOTPExpires = null;
      await user.save();
      return res.status(201).json({ status: 201, message: "Email verified successfully" });
    }

    return res.status(401).json({ status: 401, message: "Invalid OTP" });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error", error: err.message });
  }
};

const resetPasswordWithOTP = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    let user;

    // Check if the email exists in the User model
    user = await User.findOne({ email });
    if (!user) {
      // If not found in User, check in Provider model
      user = await Provider.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ status: 404, message: "Invalid Email" });
    }

    // Update the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ status: 200, message: "Password reset successfully" });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error", error: err.message });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    let user;
    user = await User.findById(req.params.id);
    if (!user) {
      user = await Provider.findById(req.params.id);
    }

    if (!user) {
      return res.status(404).json({ status: 404, message: "Invalid User" });
    }

    // Check if the old password matches
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 400, message: "Old password is incorrect" });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({ status: 200, message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ status: 500, message: "Server error", error: err.message });
  }
};

const getProviderProfile = async (req, res) => {
  try {
    const id = req.user.userId;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 400, message: "Invalid provider ID" });
    }

    const provider = await Provider.findById(id);

    if (!provider) {
      return res.status(404).json({ status: 404, message: "Provider not found" });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      data: provider,
    });
  } catch (error) {
    return res.status(500).json({ status: 500, message: "Server error", error: error.message });
  }
};

const getHunterProfile = async (req, res) => {
  try {
    const id = req.user.userId;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 400, message: "Invalid provider ID" });
    }

    const hunter = await Hunter.findById(id);
    if (!hunter) {
      return res.status(404).json({ status: 404, message: "Hunter not found" });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      data: hunter,
    });
  } catch (error) {
    return res.status(500).json({ status: 500, message: "Server error", error: error.message });
  }
};

const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    if (updateData.address && typeof updateData.address === "string") {
      try {
        updateData.address = JSON.parse(updateData.address);
      } catch (error) {
        // Optionally handle parsing error here if needed
      }
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 400, message: "Invalid ID format" });
    }

    const { userType } = updateData;
    if (!userType || !["hunter", "provider"].includes(userType)) {
      return res.status(400).json({ status: 400, message: "Invalid or missing user type." });
    }

    if (userType === "provider" && updateData.name) {
      updateData.contactName = updateData.name;
      delete updateData.name;
    }

    const Model = userType === "hunter" ? Hunter : Provider;
    const existingUser = await Model.findById(id);
    if (!existingUser) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    if (
      updateData.address ||
      updateData.addressLine ||
      updateData.latitude ||
      updateData.longitude ||
      updateData.radius ||
      updateData.addressType
    ) {
      const existingAddress = existingUser.address ? existingUser.address.toObject() : {};

      const newAddress = {
        ...existingAddress,
        addressLine:
          updateData.address && updateData.address.addressLine
            ? updateData.address.addressLine
            : updateData.addressLine || existingAddress.addressLine,
        latitude:
          updateData.address && updateData.address.latitude
            ? updateData.address.latitude
            : updateData.latitude || existingAddress.latitude,
        longitude:
          updateData.address && updateData.address.longitude
            ? updateData.address.longitude
            : updateData.longitude || existingAddress.longitude,
        radius:
          updateData.address && updateData.address.radius
            ? updateData.address.radius
            : updateData.radius || existingAddress.radius,
        addressType:
          updateData.address && updateData.address.addressType
            ? updateData.address.addressType
            : updateData.addressType || existingAddress.addressType || (userType === "hunter" ? "home" : "office"),
      };

      if (newAddress.latitude) newAddress.latitude = parseFloat(newAddress.latitude);
      if (newAddress.longitude) newAddress.longitude = parseFloat(newAddress.longitude);
      if (newAddress.radius) newAddress.radius = parseFloat(newAddress.radius);

      if (newAddress.latitude && newAddress.longitude) {
        newAddress.location = {
          type: "Point",
          coordinates: [newAddress.longitude, newAddress.latitude],
        };
      }

      updateData.address = newAddress;

      delete updateData.addressLine;
      delete updateData.latitude;
      delete updateData.longitude;
      delete updateData.radius;
      delete updateData.addressType;
    }

    Object.keys(updateData).forEach((field) => {
      existingUser[field] = updateData[field];
    });

    if (updateData.address) {
      existingUser.markModified("address");
    }

    const updatedUser = await existingUser.save();

    if (userType === "hunter" && updateData.address) {
      await Address.findOneAndUpdate(
        { userId: id },
        { $set: updateData.address },
        { new: true, runValidators: true }
      );
    }

    return res.status(200).json({
      status: 200,
      message: "User updated successfully",
      updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ status: 500, message: "Server error", error: error.message });
  }
};

const getNewSignups = async (req, res) => {
  try {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const newHuntersCount = await Hunter.countDocuments({ createdAt: { $gte: tenDaysAgo } });
    const newProvidersCount = await Provider.countDocuments({ createdAt: { $gte: tenDaysAgo } });
    const totalNewSignups = newHuntersCount + newProvidersCount;

    return res.status(200).json({
      status: 200,
      totalNewSignups,
    });
  } catch (error) {
    console.error("Error retrieving new signups for the last 10 days:", error);
    return res.status(500).json({
      status: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  signUp,
  login,
  logout,
  verifyEmail,
  verifyOtp,
  forgotPassword,
  resetPasswordWithOTP,
  changePassword,
  getProviderProfile,
  getHunterProfile,
  updateUserById,
  getNewSignups,
};
