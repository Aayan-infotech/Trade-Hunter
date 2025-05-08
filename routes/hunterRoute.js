const express = require('express');
const router = express.Router();
const hunterController = require('../controllers/hunterController');
const { verifyUser } = require("../middlewares/auth");
const multer = require("multer");
const upload = multer();
const { uploadToS3 } = require("../common/multerConfig");

router.post('/getNearbyServiceProviders',verifyUser ,hunterController.getNearbyServiceProviders);
router.put('/updateById/:id', verifyUser, upload.single("images"), uploadToS3, hunterController.updateHunterById);
router.patch('/updateRadius', verifyUser, hunterController.updateRadius);
router.post('/send-job-email', hunterController.sendJobNotificationEmail);

module.exports = router;