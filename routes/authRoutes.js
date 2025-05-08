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
  resendOTP,
  updateUserById,
  getNewSignups
} = require("../controllers/authController");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const updateStorage = multer.memoryStorage();

const updateUpload = multer({
  storage: updateStorage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

const { uploadToS3 } = require("../common/multerConfig");
const { refreshToken } = require("../middlewares/auth");
const { verifyUser } = require("../middlewares/auth");
router.post(
  "/signup", 
  upload.single("images"),  
  uploadToS3,             
  signUp               
);
router.post("/login", login);
router.post("/logout", verifyUser, logout);
router.post("/verify-email", verifyEmail);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password-with-otp", resetPasswordWithOTP);
router.post("/changePassword/:id", changePassword);
router.post("/refreshtoken", refreshToken);
router.get("/getProviderProfile", verifyUser, getProviderProfile);
router.get("/getHunterProfile", verifyUser, getHunterProfile);
router.get("/recentSignups", getNewSignups);
router.post('/resendOtp',resendOTP );
module.exports = router;
   