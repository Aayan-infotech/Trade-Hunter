const express = require("express");
const {
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
} = require("../controllers/authController");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { uploadToS3 } = require("../common/multerConfig");
const { refreshToken } = require("../middlewares/auth");
const { verifyUser } = require("../middlewares/auth");

router.post("/signup", 
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
router.post("/login", login);
router.post("/logout",  logout);
router.post("/verify-email", verifyEmail);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password-with-otp", resetPasswordWithOTP);
router.post("/changePassword/:id", changePassword);
router.post("/refreshtoken", refreshToken);
router.get("/getProviderProfile", verifyUser, getProviderProfile);
router.get("/getHunterProfile", verifyUser, getHunterProfile);


module.exports = router;