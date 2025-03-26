const express = require('express');
const router = express.Router();
const fileController = require('../controllers/providerController');
const { uploadToS3 } = require("../common/multerConfig3");
const { verifyUser } = require("../middlewares/auth");
const multer = require("multer");
const upload = multer();
// Route to handle file upload
router.get('/byBusinessType', fileController.getProvidersByBusinessType)

router.post('/upload/:providerId',uploadToS3, fileController.uploadFile);
router.post('/getProviderLocation',fileController.getProviderByUserLocation);
router.post('/getJobsForGuest',fileController.getJobsForGuest); 
router.post('/getJobs',fileController.getJobs); 
router.post('/getNearbyJobs',fileController.getNearbyJobs);
router.post('/getNearbyJobsForGuest',fileController.getNearbyJobsForGuest);
router.post('/getServicesForGuestLocation2',fileController.getServicesForGuestLocation2);      
router.get('/getJobByIdForGuest/:jobId',fileController.getJobByIdForGuest);
router.put('/updateById/:id', upload.single(), fileController.updateProviderById);
router.get('/:providerId', fileController.getProviderProfile);
router.post('/acceptCount/:providerId', fileController.jobAcceptCount);
router.post('/completedCount/:providerId', fileController.jobCompleteCount)
router.get('/completionRate/:providerId', fileController.completionRate);
router.delete('/delete/:fileId',verifyUser, fileController.deleteFile);
router.put("/update/:id",upload.single("images"),fileController.updateProvider);
router.post("/about/:id",fileController.upsertAbout);
router.get("/about/:id",fileController.getAbout);

module.exports = router;
