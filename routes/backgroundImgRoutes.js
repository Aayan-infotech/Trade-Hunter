// routes/backgroundImgRoutes.js
const express = require("express");
const multer = require("multer");
const backgroundImgController = require("../controllers/backgroundImgController");
const { uploadToS3 } = require("../common/multerConfig");
const { verifyUser } = require("../middlewares/auth");

const router = express.Router();

// Multer setup for file handling
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Define Routes
router.post("/upload",verifyUser, upload.single("backgroundImg"), uploadToS3, backgroundImgController.uploadBackgroundImg);
router.get("/:userId",verifyUser, backgroundImgController.getBackgroundImg);

module.exports = router;