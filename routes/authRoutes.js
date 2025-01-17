const express = require("express");
const {
  signUp,
  login,
  verifyEmail,
  verifyOtp,
  forgotPassword,
  resetPasswordWithOTP,
  changePassword,
} = require("../controllers/authController");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { uploadToS3 } = require("../common/multerConfig");

router.post("/signup", upload.single("images"),
  async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    next();
  },
  uploadToS3,
  signUp
);

router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password-with-otp", resetPasswordWithOTP);
router.post("/changePassword", changePassword);

module.exports = router;
