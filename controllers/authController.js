const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const generateverificationOTP = require("../utils/VerifyOTP");
const sendEmail = require("../services/sendMail");
const jwt = require("jsonwebtoken")

const signUp = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNo,
      alternatePhoneNo,
      address,
      password,
      ABN_Number,
      businessType,
      serviceType,
      userType,
      userVerified = false,
      documentStatus = false,
      subscriptionStatus = false,
      insDate,
    } = req.body;


    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }


    const ip = req.ip || req.socket.remoteAddress;
    const clientType = req.headers["x-client-type"];
    if (!clientType || !["web", "app"].includes(clientType)) {
      return res.status(400).json({ message: "Invalid or missing client type." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.emailVerified) {
        const verificationOTP = await generateverificationOTP(existingUser);
        await sendEmail(
          email,
          "Account Verification OTP",
          verificationOTP
        );
        return res.status(400).json({
          verificationOTP,
          message:
            "You already have an account. Please verify your account using the OTP sent to your registered email.",
        });
      }
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword, "Hashed Password");

    if (!hashedPassword) {
      return res.status(500).json({ message: "Password hashing failed." });
    }

    // Create the new user
    const newUser = new User({
      name,
      email,
      phoneNo,
      alternatePhoneNo,
      address,
      password: hashedPassword, // Save hashed password
      ABN_Number,
      businessType,
      serviceType,
      userType,
      userVerified,
      documentStatus,
      subscriptionStatus,
      insBy:clientType,
      insDate,
      insIp: ip,
    });

    const verificationOTP = await generateverificationOTP(newUser);

    await sendEmail(email, "Account Verification Link", verificationOTP);

    // Save the user in the database
    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error during sign-up:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const verifyEmail = async (req, res) => {
  const { email, OTP } = req.body;

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "User not found please sign up first" });
    }
    if (user.userVerified) {
      return res.status(401).json({
        success: true,
        message: "User Already Verified.",
      });
    }
    if (OTP === user.verificationOTP) {
      (user.emailVerified = true), (user.verificationOTP = null);
      user.verificationOTPExpires = null;
      await user.save();
      return res.status(201).json({
        success: true,
        message: "Email Verified successfully",
      });
    }

    return res.status(401).json({
      success: true,
      message: "User Already Verified.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email });
    if (!user.emailVerified) {
      const verificationOTP = await generateverificationOTP(user);
      const sentmail = await sendEmail(
        email,
        "Account Verification OTP",
        verificationOTP
      );
      return res.status(401).json({
        message: "You are not verified, Please verify Your email",
      });
    }
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token: token,
      user: {
        email: user.email,
        name: user.name,
        userType:user.userType
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signUp, verifyEmail, login };
