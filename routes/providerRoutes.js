const express = require('express');
const router = express.Router();
const fileController = require('../controllers/providerController');

// Route to handle file upload
router.put('/upload/:providerId', fileController.uploadFile);

module.exports = router;