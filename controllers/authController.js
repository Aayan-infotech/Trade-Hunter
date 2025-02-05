const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const generateverificationOTP = require("../utils/VerifyOTP");
const sendEmail = require("../services/sendMail");
const jwt = require("jsonwebtoken");
const apiResponse = require("../utils/responsehandler");
const Provider = require("../models/providerModel");
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
      serviceType,
      userType,
    } = req.body;

    console.log(req.body);

    // Validate userType
    if (!["hunter", "provider"].includes(userType)) {
      return res.status(400).json({ message: "Invalid user type." });
    }

    // Validate required fields based on userType
    const requiredFields =
      userType === "hunter"
        ? [
            name,
            email,
            phoneNo,
            latitude,
            longitude,
            radius,
            password,
            addressLine,
          ]
        : [
            name,
            businessName,
            email,
            phoneNo,
            latitude,
            longitude,
            radius,
            password,
            ABN_Number,
            businessType,
            serviceType,
            addressLine,
          ];

    if (requiredFields.some((field) => !field)) {
      return res
        .status(400)
        .json({ message: `All ${userType} fields are required.` });
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
          "Password must be at least 8 characters long, including one letter, one number, and one special character.",
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
          message: "Account exists. Please verify via OTP sent to your email.",
        });
      }
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate address fields
    if (!latitude || !longitude || !radius || !addressLine) {
      return res
        .status(400)
        .json({ message: "All hunter fields are required." });
    }

    // Construct address
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
            images: req.fileLocations?.[0],
            address,
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
            images: req.fileLocations?.[0],
            address,
          });

    // Send verification email
    const verificationOTP = await generateverificationOTP(newUser);
    await sendEmail(email, "Account Verification Link", verificationOTP);

    const answer = await newUser.save();

    // Create address for hunter
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

    return res
      .status(201)
      .json({ message: "Verification link sent to email.", user: newUser });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
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

    

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return apiResponse.error(res, "Invalid credentials", 400);
    }

    

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userid: user._id, email: user.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    if (!user.emailVerified) {
      const verificationOTP = await generateverificationOTP(user);
      await sendEmail(email, "Account Verification OTP", verificationOTP);
      return apiResponse.success(res, "You are not verified, Please verify your email");
    }

    if (userType === "provider" && user.subscriptionStatus !== 1) {
      return apiResponse.success(res, "You have not subscribed to the service", {
        token: token,
        user: user,
      });
    }



    return apiResponse.success(res, "Login successful", {
      token: token,
      user: user,
    });
  } catch (err) {
    console.log(err.message);
    return apiResponse.error(res, "Server error", 500);
  }
};

const verifyEmail = async (req, res) => {
  const { email, OTP, userType } = req.body;

  let user;

  try {
    // Determine which collection to query based on userType
    if (userType === "hunter") {
      user = await User.findOne({ email, userType });
    } else {
      user = await Provider.findOne({ email, userType });
    }

    if (!user) {
      return apiResponse.error(res, "User not found, please sign up first", 400);
    }

    if (user.emailVerified) {
      return apiResponse.success(res, "User already verified.", {});
    }

    if (OTP !== user.verificationOTP) {
      return apiResponse.error(res, "Invalid OTP.", 401);
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET, // Ensure you have a secure secret in .env
      { expiresIn: "7d" }
    );

    // Update the user fields to reflect email verification
    user.emailVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    user.token = token;
    await user.save();

    return apiResponse.success(res, "Email verified successfully", { token, user });

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
  const { oldPassword, newPassword } = req.body;

  try {
    let user;
    user = await User.findById(req.params.id);
    if (!user) {
      user = await Provider.findById(req.params.id);
    }

    if (!user) {
      return apiResponse.error(res, "Invalid User", 404);
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
