const express = require('express');
const router = express.Router();
const hunterController = require('../controllers/hunterController');
const { verifyUser } = require("../middlewares/auth");
const multer = require("multer");
const upload = multer();

// Route to handle file upload
router.post('/getNearbyServiceProviders',hunterController.getNearbyServiceProviders);
router.put('/updateById/:id',upload.none(), hunterController.updateHunterById);
router.patch('/updateRadius', verifyUser, hunterController.updateRadius);

module.exports = router;