const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const generateverificationOTP = require("../utils/VerifyOTP");
const sendEmail = require("../services/sendMail");
const jwt = require("jsonwebtoken");
const apiResponse = require("../utils/responsehandler");
const Provider = require("../models/providerModel");
const Address = require("../models/addressModel");

// register
const signUp = async (req, res) => {
  try {
    const {
      businessName,
      name,
      email,
      phoneNo,
      addressType,
      addressText,
      latitude,
      longitude,
      radius,
      password,
      ABN_Number,
      businessType,
      serviceType,
      userType,
      insDate,
    } = req.body;

    console.log(req.body);
    // Validate userType
    if (!["hunter", "provider"].includes(userType)) {
      return res.status(400).json({ message: "Invalid user type" });
    }

    const address = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      addressText: addressText,
      radius: parseFloat(radius),
    };

    // Validate required fields based on userType
    if (userType === "hunter") {
      if (
        !name ||
        !email ||
        !phoneNo ||
        !address ||
        !latitude ||
        !longitude ||
        !radius ||
        !password
      ) {
        return res
          .status(400)
          .json({ message: "All hunter fields are required." });
      }
    } else if (userType === "provider") {
      if (
        !name ||
        !businessName ||
        !email ||
        !phoneNo ||
        !address ||
        !addressText ||
        !latitude ||
        !longitude ||
        !radius ||
        !password ||
        !ABN_Number ||
        !businessType ||
        !serviceType
      ) {
        return res
          .status(400)
          .json({ message: "All provider fields are required." });
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Validate phone number
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNo)) {
      return res
        .status(400)
        .json({ message: "Invalid phone number. Must be 10 digits." });
    }

    // Validate password
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long, include at least one letter, one number, and one special character.",
      });
    }

    // Check if the email is already in use
    const existingUser = await (userType === "hunter"
      ? User.findOne({ email })
      : Provider.findOne({ email }));

    if (existingUser) {
      if (!existingUser.emailVerified) {
        const verificationOTP = await generateverificationOTP(existingUser);
        await sendEmail(email, "Account Verification OTP", verificationOTP);
        return res.status(400).json({
          message:
            "You already have an account. Please verify your account using the OTP sent to your registered email.",
        });
      }
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user or provider
    const newUser =
      userType === "hunter"
        ? new User({
            name,
            email,
            phoneNo,
            password: hashedPassword,
            userType,
            insBy: req.headers["x-client-type"],
            insDate,
            images: req.fileLocations?.[0],
          })
        : new Provider({
            businessName,
            contactName: name,
            email,
            phoneNo,
            ABN_Number,
            businessType,
            serviceType,
            password: hashedPassword,
            userType,
            insBy: req.headers["x-client-type"],
            insDate,
            images: req.fileLocations?.[0],
            address,
          });

    const verificationOTP = await generateverificationOTP(newUser);
    await sendEmail(email, "Account Verification Link", verificationOTP);
    const answer = await newUser.save();

    if (userType == "hunter") {
      // Create the address
      const newAddress = new Address({
        userId: answer._id,
        addressType,
        address:addressText,
        latitude,
        longitude,
        radius,
        isSelected: 1,
      });

      await newAddress.save();
    }

    return res.status(201).json({
      message: "Verification link is sent on the given email address.",
      user: newUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// login
const login = async (req, res) => {
  const { email, password, userType } = req.body;
  if (!["hunter", "provider"].includes(userType)) {
    return apiResponse.error(res, "Invalid user type", 400);
  }
  try {
    let user;

    if (userType == "hunter") {
      user = await User.findOne({ email: email, userType: userType });
    } else {
      user = await Provider.findOne({ email: email, userType: userType });
    }
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
    apiResponse.error(res, "Server error", 500);
  }
};

// verifyemail
const verifyEmail = async (req, res) => {
  const { email, OTP } = req.body;

  let user;

  // Determine which collection to query based on userType
  if (req.body.userType === "hunter") {
    user = await User.findOne({ email: email, userType: req.body.userType });
  } else {
    user = await Provider.findOne({
      email: email,
      userType: req.body.userType,
    });
  }

  if (!user) {
    return apiResponse.error(res, "User not found, please sign up first", 400);
  }

  try {
    if (user.emailVerified) {
      return apiResponse.success(res, "User already verified.", 401);
    }

    if (OTP === user.verificationOTP) {
      // Update the user fields to reflect email verification
      user.emailVerified = true;
      user.verificationOTP = null;
      user.verificationOTPExpires = null;
      await user.save();
      return apiResponse.success(res, "Email verified successfully", 200);
    }

    return apiResponse.error(res, "Invalid OTP.", 401);
  } catch (err) {
    console.error("Verification error:", err.message);
    return apiResponse.error(res, "Server error", 500);
  }
};

//reset password
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
    return apiResponse.success(
      res,
      "OTP sent to your email. Please check your inbox."
    );
  } catch (err) {
    console.error("Forgot Password Error:", err.message);
    return apiResponse.error(res, "Server error", 500);
  }
};

// verify otp
const verifyOtp = async (req, res) => {
  const { email, OTP } = req.body;

  try {
    let user;

    // Check if the email exists in the User model
    user = await User.findOne({ email });
    if (!user) {
      // If not found in User, check in Provider model
      user = await Provider.findOne({ email });
    }

    if (!user) {
      return apiResponse.error(
        res,
        "User not found, please sign up first",
        400
      );
    }

    if (OTP === user.verificationOTP) {
      user.emailVerified = true; // Use `true` for consistency
      user.verificationOTP = null;
      user.verificationOTPExpires = null;
      await user.save();
      return apiResponse.success(res, "Email verified successfully", null, 201);
    }

    return apiResponse.error(res, "Invalid OTP", 401);
  } catch (err) {
    console.error("Verify OTP Error:", err.message);
    return apiResponse.error(res, "Server error", 500);
  }
};

// reset password with OTP
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
      return apiResponse.error(res, "Invalid Email", 404);
    }

    // Update the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return apiResponse.success(res, "Password reset successfully", 200);
  } catch (err) {
    console.error("Reset Password Error:", err.message);
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
  changePassword,
};