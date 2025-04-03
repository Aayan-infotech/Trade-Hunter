const express = require("express");
const {
  createJobPost,
  getJobPostById,
  deleteJobPost,
  getJobPostByUserId,
  changeJobStatus,
  myAcceptedJobs,
  getJobCountByBusinessType,
  getJobPostingTrends,
  getTopBusinessTypes,
  getTopDemandedCities,
  jobProviderAccept,
  businessTypes,
  jobsByBusinessType,
  incrementJobAcceptCount,
} = require("../controllers/jobpostController");
const multer = require("multer");
const upload = multer();
const { uploadToS3files } = require("../common/multerconfig2");
const { verifyUser } = require("../middlewares/auth");
const router = express.Router();

// Updated route: using uploadToS3files middleware
router.post(
  "/jobpost",
  verifyUser,
  upload.array("documents"),
  uploadToS3files, // This middleware processes files and sets req.fileLocations
  createJobPost
);

router.get("/jobpost-details/:id", verifyUser, getJobPostById);
router.delete("/:id", verifyUser, deleteJobPost);
router.get("/getJobPostByUserId", verifyUser, getJobPostByUserId);
router.post("/changeJobStatus/:jobId", verifyUser, changeJobStatus);
router.get("/myAcceptedJobs", verifyUser, myAcceptedJobs);
router.get("/business-type-count", getJobCountByBusinessType);
router.get("/getJobTrends", getJobPostingTrends);
router.get("/getTopBusinessCount", getTopBusinessTypes);
router.get("/topLocation", getTopDemandedCities);
router.post("/acceptJob/:jobId", verifyUser, jobProviderAccept);
router.get("/businessTypes", businessTypes);
router.get("/jobsByBusinessType", jobsByBusinessType);
router.put("/job/accept/:jobId", incrementJobAcceptCount);

module.exports = router;
