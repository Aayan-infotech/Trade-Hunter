const express = require('express');
const router = express.Router();
const fileController = require('../controllers/providerController');

// Route to handle file upload
router.put('/upload/:providerId', fileController.uploadFile);
router.post('/getProviderLocation',fileController.getProviderByUserLocation);
router.post('/getallProviderLocation',fileController.getProviderByLocation);

module.exports = router;