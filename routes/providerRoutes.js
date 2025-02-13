const express = require('express');
const router = express.Router();
const fileController = require('../controllers/providerController');

// Route to handle file upload
router.put('/upload/:providerId', fileController.uploadFile);
router.post('/getProviderLocation',fileController.getProviderByUserLocation);
router.post('/getJobsForGuest',fileController.getJobsForGuest); 
router.post('/getJobs',fileController.getJobs); 
router.post('/getNearbyJobs',fileController.getNearbyJobs);
router.post('/getNearbyJobsForGuest',fileController.getNearbyJobsForGuest);
router.post('/getServicesForGuestLocation2',fileController.getServicesForGuestLocation2);      
router.get('/getJobByIdForGuest/:jobId',fileController.getJobByIdForGuest);

module.exports = router;
