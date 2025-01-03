const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const generateverificationOTP = require("../utils/VerifyLink");
const sendEmail = require("../services/sendMail");

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
      insBy,
      insDate,
      insIp,
    } = req.body;
    var ip = req.ip|| req.socket.remoteAddress;
    // Check if the user already exists by email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.userVerified) {
       const verificationOTP=await generateverificationOTP(existingUser)
       const sentmail=await sendEmail(email,"Account Verification OTP",verificationOTP)
        return res.status(400).json({verificationOTP,
            message:
              "You already have a account,Please Verify your account using the verification OTP send on the registered email.",
          });
      }
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
      insBy,
      insDate,
      insIp:ip,
    });
    const verificationOTP=await generateverificationOTP(newUser)
    console.log(verificationOTP,"email sent")
    const sentmail=await sendEmail(email,"Account Verification Link",verificationOTP)

    await newUser.save();
    res
      .status(201)
      .json({ verificationOTP,message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error("Error during sign-up:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email });
    if (!user.userVerified) {
      return res.status(401).json({
        message:
          "You are not verified, Please verify with the given link on email",
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
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signUp, login };
