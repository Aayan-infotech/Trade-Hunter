const express = require('express');
const router = express.Router();
const fileController = require('../controllers/providerController');

// Route to handle file upload
router.put('/upload/:providerId', fileController.uploadFile);
router.post('/getProviderLocation',fileController.getProviderByUserLocation);
router.post('/getServicesForGuestLocation',fileController.getServicesForGuestLocation); // for guest mode
router.post('/getJobByLocation',fileController.getJobByLocation); 
router.post('/getServicesForGuestLocation2',fileController.getServicesForGuestLocation2);      

module.exports = router;