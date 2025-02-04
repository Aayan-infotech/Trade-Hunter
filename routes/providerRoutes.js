const express = require('express');
const router = express.Router();
const fileController = require('../controllers/providerController');

// Route to handle file upload
router.put('/upload/:providerId', fileController.uploadFile);
router.post('/getProviderLocation',fileController.getProviderByUserLocation);
router.post('/getJobsForGuest',fileController.getJobsForGuest); // for guest mode
router.post('/getJobs',fileController.getJobs); 
router.post('/getServicesForGuestLocation2',fileController.getServicesForGuestLocation2);      

module.exports = router;