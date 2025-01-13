const express = require("express");
const {
  signUp,
  verifyEmail,
  login,
  forgotPassword,
  resetPasswordWithOTP,
} = require("../controllers/authController");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { uploadToS3 } = require("../common/multerConfig");

// router.post("/signup",signUp)
// router.post("/verify-email", uploadToS3, verifyEmail);
// router.post("/login", login);
// router.post("/forgot-password", forgotPassword);
// router.post("/reset-password-with-otp", resetPasswordWithOTP);

router.post(
  "/signup",
  upload.single("images"),
  async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    next();
  },
  uploadToS3,
  signUp
);

module.exports = router;
