const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const generateverificationOTP = require("../utils/VerifyOTP");
const sendEmail = require("../services/sendMail");
const jwt = require("jsonwebtoken");
const apiResponse = require('../utils/responsehandler');

// register
const signUp = async (req, res) => {
  try {
    const {
      name,
      businessName,
      email,
      phoneNo,
      address,
      password,
      ABN_Number,
      businessType,
      serviceType,
      userType,
      userVerified = 0,
      documentStatus = 0,
      subscriptionStatus = 0,
      insDate,
    } = req.body;

    // Helper function to check for empty or whitespace strings
    const isEmptyOrSpaces = (str) => !str || str.trim() === "";

    if (!["hunter", "provider"].includes(userType)) {
      return apiResponse.error(res, "Invalid user type", 400);
    }

    // Validate required fields
    if (userType === "hunter") {
      if (
        isEmptyOrSpaces(name) ||
        isEmptyOrSpaces(email) ||
        isEmptyOrSpaces(phoneNo) ||
        isEmptyOrSpaces(address) ||
        isEmptyOrSpaces(password) ||
        isEmptyOrSpaces(userType)
      ) {
        return apiResponse.error(res, "All fields are required.", 400);
      }
    } else if (userType === "provider") {
      if (
        isEmptyOrSpaces(name) ||
        isEmptyOrSpaces(businessName) ||
        isEmptyOrSpaces(email) ||
        isEmptyOrSpaces(phoneNo) ||
        isEmptyOrSpaces(address) ||
        isEmptyOrSpaces(password) ||
        isEmptyOrSpaces(ABN_Number) ||
        isEmptyOrSpaces(businessType) ||
        isEmptyOrSpaces(serviceType) ||
        isEmptyOrSpaces(userType)
      ) {
        return apiResponse.error(res, "All fields are required.", 400);
      }

    } else {
      return apiResponse.error(res, "Invalid user type", 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiResponse.error(res, "Invalid email format.", 400);
    }

    // Validate phone number (adjust regex as per your format)
    const phoneRegex = /^[0-9]{10}$/; // Example: 10 digit numbers
    if (!phoneRegex.test(phoneNo)) {
      return apiResponse.error(res, "Invalid phone number. Must be 10 digits.", 400);
    }

    // Validate password (minimum 8 characters with at least one number and one special character)
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return apiResponse.error(
        res,
        "Password must be at least 8 characters long, include at least one letter, one number, and one special character.",
        400
      );
    }

    // Validate ABN_Number (adjust logic based on your format)

    if (userType == "provider" && !/^[0-9]{11}$/.test(ABN_Number)) {
      return apiResponse.error(res, "Invalid ABN Number. Must be 11 digits.", 400);
    }


    // Validate client type from headers
    const clientType = req.headers["x-client-type"];
    if (!clientType || !["web", "app"].includes(clientType)) {
      return apiResponse.error(res, "Invalid or missing client type.", 400);
    }

    // Check if the email is already in use
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.emailVerified) {
        const verificationOTP = await generateverificationOTP(existingUser);
        await sendEmail(email, "Account Verification OTP", verificationOTP);
        return apiResponse.success(
          res,
          "You already have an account. Please verify your account using the OTP sent to your registered email.",
          null, 400
        );
      }
      return apiResponse.error(res, "User already exists.", 400);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    if (!hashedPassword) {
      return apiResponse.error(res, "Registration failed.", 500);
    }

    // Create the new user
    const newUser = new User({
      name,
      businessName,
      email,
      phoneNo,
      address,
      password: hashedPassword, // Save hashed password
      ABN_Number,
      businessType,
      serviceType,
      userType,
      userVerified,
      documentStatus,
      subscriptionStatus,
      insBy: clientType,
      insDate,
      images: req.fileLocations[0],
    });

    const verificationOTP = await generateverificationOTP(newUser);

    await sendEmail(email, "Account Verification Link", verificationOTP);

    await newUser.save();

    return apiResponse.success(
      res,
      "Verification link is sent on the given email address.",
      { user: newUser },
      201
    );
  } catch (error) {
    console.error("Error during sign-up:", error);
    return apiResponse.error(res, "Internal server error", 500, { error: error.message });
  }
};


// login
const login = async (req, res) => {
  const { email, password, userType } = req.body;
  if (!["hunter", "provider"].includes(userType)) {
    return apiResponse.error(res, "Invalid user type", 400);
  }
  try {
    const user = await User.findOne({ email: email, userType: userType });

    if (!user) {
      return apiResponse.error(res, "Invalid credentials", 400);
    }

    if (!user.emailVerified) {
      const verificationOTP = await generateverificationOTP(user);
      await sendEmail(email, "Account Verification OTP", verificationOTP);
      return apiResponse.error(
        res,
        "You are not verified, Please verify your email.",
        401
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return apiResponse.error(res, "Invalid credentials", 400);
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    apiResponse.success(res, "Login successful", {
      token: token,
      user: user,
    });
  } catch (err) {
    console.error("Login error:", err);
    apiResponse.error(res, "Server error", 500);
  }
};


// verifyemail
const verifyEmail = async (req, res) => {
  const { email, OTP } = req.body;

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return apiResponse.error(res, "User not found, please sign up first", 400);
    }
    if (user.userVerified) {
      return apiResponse.success(res, "User already verified.", 401);
    }
    if (OTP === user.verificationOTP) {
      user.emailVerified = true;
      user.verificationOTP = null;
      user.verificationOTPExpires = null;
      await user.save();
      return apiResponse.success(res, "Email verified successfully", 201);
    }

    return apiResponse.success(res, "Invalid OTP.", 401);
  } catch (err) {
    console.error("Verify Email error:", err);
    return apiResponse.error(res, "Server error", 500);
  }
};


//reset password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return apiResponse.error(res, "User not found", 404);
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
    return apiResponse.success(res, "OTP sent to your email. Please check your inbox.");
  } catch (err) {
    return apiResponse.error(res, "Server error", 500);
  }
};


// verify otp
const verifyOtp = async (req, res) => {
  const { email, OTP } = req.body;

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return apiResponse.error(res, "User not found, please sign up first", 400);
    }

    if (OTP === user.verificationOTP) {
      user.emailVerified = 1;
      user.verificationOTP = null;
      user.verificationOTPExpires = null;
      await user.save();
      return apiResponse.success(res, "Email verified successfully", null, 201);
    }

    return apiResponse.error(res, "Invalid OTP", 401);
  } catch (err) {
    return apiResponse.error(res, "Server error", 500);
  }
};


// reset password with OTP
const resetPasswordWithOTP = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return apiResponse.error(res, "Invalid Email", 404);
    }

    // Update the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return apiResponse.success(res, "Password reset successfully", 200);
  } catch (err) {
    return apiResponse.error(res, "Server error", 500);
  }
};


// change password
const changePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  try {
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return apiResponse.error(res, "User not found", 404);
    }

    // Check if the old password matches
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return apiResponse.error(res, "Old password is incorrect", 400, null);
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return apiResponse.success(res, "Password changed successfully", null, 200);
  } catch (err) {
    return apiResponse.error(res, "Server error", 500);
  }
};


module.exports = {
  signUp,
  login,
  verifyEmail,
  verifyOtp,
  forgotPassword,
  resetPasswordWithOTP,
  changePassword
};