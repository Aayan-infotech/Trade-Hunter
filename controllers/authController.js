const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/hunterModel");
const generateverificationOTP = require("../utils/VerifyOTP");
const sendEmail = require("../services/sendMail");
const sendInvoiceEmail = require("../services/sendInvoiceMail");
const jwt = require("jsonwebtoken");
const apiResponse = require("../utils/responsehandler");
const Provider = require("../models/providerModel");
const Hunter = require("../models/hunterModel");
const Address = require("../models/addressModel");
const DeviceToken = require('../models/devicetokenModel');

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

    if (!["hunter", "provider"].includes(userType)) {
      return res
        .status(400)
        .json({ status: 400, success: false, message: "Invalid user type." });
    }

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
            businessName,
            name,
            email,
            phoneNo,
            latitude,
            longitude,
            radius,
            password,
            ABN_Number,
            businessType,
            addressLine,
          ];

    if (requiredFields.some((field) => !field)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: `All ${userType} fields are required.`,
      });
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Name must contain only alphabets and spaces.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid email format.",
      });
    }

    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message:
          "Password must be at least 8 characters long, including one letter, one number, and one special character.",
      });
    }

    const phoneRegex = /^\+?[0-9]+$/;
    if (!phoneRegex.test(phoneNo)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message:
          "Phone number must contain only digits and may start with '+'.",
      });
    }

    if (userType === "hunter") {
      const emailExistsHunter = await User.findOne({
        email,
        isDeleted: { $ne: true },
      });
      if (emailExistsHunter) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Email already exists for Hunter.",
        });
      }
    } else {
      const emailExistProvider = await Provider.findOne({
        email,
        isDeleted: { $ne: true },
      });
      if (emailExistProvider) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Email already exists for Provider.",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const address = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      addressLine,
      radius: parseFloat(radius),
      addressType: addressType || (userType === "hunter" ? "home" : "office"),
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    };

    const newUser =
      userType === "hunter"
        ? new User({
            name,
            email,
            phoneNo,
            password: hashedPassword,
            userType,
            insBy: req.headers["x-client-type"],
            images: req.fileLocations ? req.fileLocations[0] : undefined,
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
            images: req.fileLocations ? req.fileLocations[0] : undefined,
            address,
            isGuestMode,
          });

    const verificationOTP = await generateverificationOTP(newUser);

    await sendEmail(
  email,
  "Account Verification OTP - Trade Hunters",
  `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; padding: 30px;">
    <div style="max-width: 550px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color: #004aad; color: #ffffff; padding: 20px; border-top-left-radius: 10px; border-top-right-radius: 10px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">🔐 Account Verification</h1>
        <p style="margin: 5px 0 0; font-size: 14px;">Trade Hunters</p>
      </div>
      
      <!-- Body -->
      <div style="padding: 25px 30px;">
        <p style="font-size: 16px;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 15px;">Thanks for joining Trade Hunters! To verify your account, please use the OTP below:</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f0f4f8; text-align: center; border-left: 5px solid #004aad; border-radius: 5px;">
          <h2 style="margin: 0; font-size: 24px; color: #e74c3c;">${verificationOTP}</h2>
          <p style="margin: 5px 0 0; font-size: 13px; color: #555;">Valid for 10 minutes</p>
        </div>
        
        <p style="font-size: 14px;">Please do not share this OTP with anyone for your security.</p>
        
        <br />
        <p style="font-size: 14px;">Warm regards,<br /><strong>Team Trade Hunters</strong></p>
        <p style="font-size: 11px; color: gray; text-align: center; margin-top: 30px;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    </div>
  </div>
  `
);


    const savedUser = await newUser.save();

    if (userType === "hunter") {
      await new Address({
        userId: savedUser._id,
        addressType: address.addressType,
        address: address.addressLine,
        location: address.location,
        radius: address.radius,
        isSelected: 1,
      }).save();
    }

    await sendInvoiceEmail(
  "tradehunters2025@gmail.com",
  `New ${userType} Signup - ${name}`,
  `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
      
      <!-- Header -->
      <div style="background-color: #004aad; color: white; padding: 20px 30px; text-align: center;">
        <h2 style="margin: 0;">👥 New User Signup Notification</h2>
        <p style="margin: 5px 0 0; font-size: 14px;">A new user has registered on the platform</p>
      </div>
      
      <!-- Body -->
      <div style="padding: 25px 30px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; font-weight: bold;">👤 Name:</td>
            <td style="padding: 10px;">${name}</td>
          </tr>
          <tr style="background-color: #f4f6f8;">
            <td style="padding: 10px; font-weight: bold;">📧 Email:</td>
            <td style="padding: 10px;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">📞 Phone:</td>
            <td style="padding: 10px;">${phoneNo}</td>
          </tr>
          <tr style="background-color: #f4f6f8;">
            <td style="padding: 10px; font-weight: bold;">🧾 Signed up as:</td>
            <td style="padding: 10px;">${userType}</td>
          </tr>
        </table>

        <p style="margin-top: 25px; font-size: 13px; color: gray; text-align: center;">
          THIS IS AN AUTOMATED MESSAGE. PLEASE DO NOT REPLY TO THIS EMAIL
        </p>

        <p style="margin-top: 30px; font-size: 14px;">Regards,<br /><strong>Trade Hunters</strong></p>
      </div>
    </div>
  </div>
  `
);


    return res.status(200).json({
      status: 200,
      success: true,
      message: "Signup successful! An OTP has been sent to your email.",
      user: savedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: `Server error: ${error.message}`,
    });
  }
};

const login = async (req, res) => {
  const { email, password, userType, UID } = req.body;

  // Step 1: Validate userType
  if (!["hunter", "provider"].includes(userType)) {
    return res.status(400).json({
      status: 400,
      message: "Invalid user type.",
    });
  }

  try {
    // Step 2: Find user by type
    let user;
    if (userType === "hunter") {
      user = await User.findOne({ email, userType  });
    } else {
      user = await Provider.findOne({ email, userType });
    }

    if (!user) {
      return res.status(400).json({
        status: 400,
        message: "Invalid credentials",
      });
    }

    // Step 3: Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: 400,
        message: "Invalid credentials",
      });
    }

    // Step 4: Generate tokens
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    const refreshToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Step 5: Save tokens & UID if present
    if (UID) {
      user.UID = UID;
    }

    user.refreshToken = refreshToken;
    user.token = token;

    await user.save();

    // Step 6: Check verification
    if (!user.emailVerified) {
      const verificationOTP = await generateverificationOTP(user);
      await sendEmail(email, "Account Verification OTP", verificationOTP);

      return res.status(200).json({
        status: 200,
        message: "You are not verified. Please verify your email.",
      });
    }

    // Step 7: Check account statuses
    if (user.userStatus === "Suspended") {
      return res.status(400).json({
        status: 400,
        message: "Your account is suspended. Please contact the support team.",
      });
    }

    if (user.accountStatus === "Suspend") {
      return res.status(400).json({
        status: 400,
        message: "You have deleted your account. Please contact the support team to restore.",
      });
    }

    if (userType === "provider" && user.subscriptionPlanId == null) {
      return res.status(200).json({
        status: 200,

        message: "you havee not subscribed to the service",
        data: { token: token, user: user },

      });
    }

    // Step 8: Return success response
    return res.status(200).json({
      status: 200,
      message: "Login successful",
      data: { token, user },
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      message: "Server error",
      error: err.message,
    });
  }
};


const logout = async (req, res) => {
  try {
    const { userType } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        status: 401,
        message: "Unauthorized access. User not found.",
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
        message: "User not found.",
      });
    }

    user.refreshToken = "";
    await user.save();
     // Find and update deviceToken if userId matches
    await DeviceToken.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { deviceToken: "" } }
    );

    return res.status(200).json({
      status: 200,
      message: "Logout successful.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: 500, message: "Server error", error: error.message });
  }
};

const verifyEmail = async (req, res) => {
  const { email, verificationOTP, userType } = req.body;
  let user;

  try {
    if (userType === "hunter") {
      user = await User.findOne({ email, userType });
    } else {
      user = await Provider.findOne({ email, userType });
    }

    if (!user) {
      return res
        .status(400)
        .json({ status: 400, message: "User not found, please sign up first" });
    }

    if (user.emailVerified) {
      return res
        .status(200)
        .json({ status: 200, message: "User already verified.", data: {} });
    }

    if (verificationOTP !== user.verificationOTP) {
      return res.status(401).json({ status: 401, message: "Invalid OTP." });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    user.emailVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    user.token = token;
    await user.save();

    return res.status(200).json({
      status: 200,
      message: "Email verified successfully",
      data: { token, user },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ status: 500, message: "Server error", error: err.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    let user;
    user = await User.findOne({ email });
    if (!user) {
      user = await Provider.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }

    const otp = await generateverificationOTP(user);
    await sendEmail(
  email,
  "Reset Password OTP - Trade Hunters",
  `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; padding: 30px;">
    <div style="max-width: 550px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color: #004aad; color: white; padding: 20px 30px; text-align: center; border-top-left-radius: 10px; border-top-right-radius: 10px;">
        <h2 style="margin: 0;">🔒 Reset Your Password</h2>
      </div>

      <!-- Body -->
      <div style="padding: 25px 30px;">
        <p style="font-size: 16px;">Hello,</p>
        <p style="font-size: 15px;">We received a request to reset your password on <strong>Trade Hunters</strong>. Use the OTP below to proceed:</p>

        <div style="margin: 20px 0; padding: 15px; background-color: #f0f4f8; text-align: center; border-left: 5px solid #004aad; border-radius: 5px;">
          <h2 style="margin: 0; font-size: 24px; color: #e74c3c;">${otp}</h2>
          <p style="margin: 5px 0 0; font-size: 13px; color: #555;">Valid for 10 minutes</p>
        </div>

        <p style="font-size: 14px;">⚠️ Please do not share this OTP with anyone for your account's security.</p>
        <p style="font-size: 14px;">If you did not request this, please ignore this email or contact support.</p>

        <br />
        <p style="font-size: 14px;">Regards,<br /><strong>Team Trade Hunters</strong></p>
        
        <p style="font-size: 11px; color: gray; text-align: center; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
  `
);


    return res.status(200).json({
      status: 200,
      message: "OTP sent to your email. Please check your inbox.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ status: 500, message: "Server error", error: err.message });
  }
};

const verifyOtp = async (req, res) => {
  const { email, verificationOTP } = req.body;

  try {
    let user;
    user = await User.findOne({ email });
    if (!user) {
      user = await Provider.findOne({ email });
    }

    if (!user) {
      return res
        .status(400)
        .json({ status: 400, message: "User not found, please sign up first" });
    }

    if (verificationOTP === user.verificationOTP) {
      user.emailVerified = true;
      user.verificationOTP = null;
      user.verificationOTPExpires = null;
      await user.save();
      return res
        .status(201)
        .json({ status: 201, message: "Email verified successfully" });
    }

    return res.status(401).json({ status: 401, message: "Invalid OTP" });
  } catch (err) {
    return res
      .status(500)
      .json({ status: 500, message: "Server error", error: err.message });
  }
};

const resetPasswordWithOTP = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message:
          "Password must be at least 8 characters long, including one letter, one number, and one special character.",
      });
    }

    let user = await User.findOne({ email });
    if (!user) user = await Provider.findOne({ email });

    if (!user) {
      return res.status(404).json({ status: 404, message: "Invalid Email" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res
      .status(200)
      .json({ status: 200, message: "Password reset successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ status: 500, message: "Server error", error: err.message });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        status: 400,
        success: false,
        message:
          "Password must be at least 8 characters long, including one letter, one number, and one special character.",
      });
    }

    let user = await User.findById(req.params.id);
    if (!user) user = await Provider.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ status: 404, message: "Invalid User" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ status: 400, message: "Old password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res
      .status(200)
      .json({ status: 200, message: "Password changed successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ status: 500, message: "Server error", error: err.message });
  }
};

const getProviderProfile = async (req, res) => {
  try {
    const id = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: 400, message: "Invalid provider ID" });
    }

    const provider = await Provider.findById(id);

    if (!provider) {
      return res
        .status(404)
        .json({ status: 404, message: "Provider not found" });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      data: provider,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: 500, message: "Server error", error: error.message });
  }
};

const getHunterProfile = async (req, res) => {
  try {
    const id = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: 400, message: "Invalid Hunter ID" });
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
    return res
      .status(500)
      .json({ status: 500, message: "Server error", error: error.message });
  }
};

const getNewSignups = async (req, res) => {
  try {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const newHuntersCount = await Hunter.countDocuments({
      createdAt: { $gte: tenDaysAgo },
    });
    const newProvidersCount = await Provider.countDocuments({
      createdAt: { $gte: tenDaysAgo },
    });
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

const resendOTP = async (req, res) => {
  const { email, userType } = req.body;

  if (!email || !userType) {
    return res
      .status(400)
      .json({ status: 400, message: "Email and userType are required" });
  }

  if (!["hunter", "provider"].includes(userType)) {
    return res.status(400).json({ status: 400, message: "Invalid user type." });
  }

  try {
    let user;
    if (userType === "hunter") {
      user = await User.findOne({ email, userType, isDeleted: { $ne: true } });
    } else {
      user = await Provider.findOne({
        email,
        userType,
        isDeleted: { $ne: true },
      });
    }

    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }

    const verificationOTP = await generateverificationOTP(user);

    await sendEmail(
  email,
  "Resend OTP - Trade Hunters",
  `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; padding: 30px;">
    <div style="max-width: 550px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color: #004aad; color: white; padding: 20px 30px; text-align: center; border-top-left-radius: 10px; border-top-right-radius: 10px;">
        <h2 style="margin: 0;">📩 New OTP Request</h2>
      </div>

      <!-- Body -->
      <div style="padding: 25px 30px;">
        <p style="font-size: 16px;">Hello ${user.name || user.contactName},</p>
        <p style="font-size: 15px;">You requested a new OTP to verify your email. Please use the OTP below to complete the process:</p>

        <div style="margin: 20px 0; padding: 15px; background-color: #f0f4f8; text-align: center; border-left: 5px solid #004aad; border-radius: 5px;">
          <h2 style="margin: 0; font-size: 24px; color: #e74c3c;">${verificationOTP}</h2>
          <p style="margin: 5px 0 0; font-size: 13px; color: #555;">Valid for 10 minutes</p>
        </div>

        <p style="font-size: 14px;">⚠️ Please do not share this OTP with anyone for your account's security.</p>
        <br />
        <p style="font-size: 14px;">Cheers,<br /><strong>Team Trade Hunters</strong></p>

        <p style="font-size: 11px; color: gray; text-align: center; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
  `
);

    return res
      .status(200)
      .json({ status: 200, message: "OTP resent successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ status: 500, message: "Server error", error: err.message });
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
  getNewSignups,
  resendOTP,
};
