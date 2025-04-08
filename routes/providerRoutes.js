const express = require('express');
const router = express.Router();
const fileController = require('../controllers/providerController');
const { uploadToS3 } = require("../common/multerConfig3");
const { verifyUser } = require("../middlewares/auth");
const multer = require("multer");
const upload = multer();
// Route to handle file upload
router.post('/getNearbyJobs', verifyUser,fileController.getNearbyJobs);
router.post('/byBusinessType',verifyUser, fileController.getProvidersByBusinessType)
router.post('/upload/:providerId',verifyUser, uploadToS3, fileController.uploadFile);
router.post('/getProviderLocation', verifyUser, fileController.getProviderByUserLocation);
router.post('/getNearbyJobs',verifyUser, fileController.getNearbyJobs);
router.post('/getNearbyJobsForGuest', verifyUser,fileController.getNearbyJobsForGuest);   
router.get('/getJobByIdForGuest/:jobId', verifyUser, fileController.getJobByIdForGuest);
router.put('/updateById/:id',verifyUser, upload.single(), fileController.updateProviderById);
router.get('/:providerId',verifyUser, fileController.getProviderProfile);
router.post('/acceptCount/:providerId',verifyUser, fileController.jobAcceptCount);
router.post('/completedCount/:providerId',verifyUser, fileController.jobCompleteCount)
router.get('/completionRate/:providerId',verifyUser, fileController.completionRate);
router.delete('/delete/:fileId',verifyUser, fileController.deleteFile);
router.post("/about/:id",verifyUser, fileController.upsertAbout);
router.get("/about/:id",verifyUser,fileController.getAbout);

module.exports = router;
