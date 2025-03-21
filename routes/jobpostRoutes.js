const express = require("express");
const {
  createJobPost,
  getAllJobPosts,
  getJobPostById,
  updateJobPost,
  deleteJobPost,
  getAllPendingJobPosts,
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
  incrementJobAcceptCount
} = require("../controllers/jobpostController");
const multer = require("multer");
const upload = multer();
const { uploadToS3files } = require("../common/multerconfig2");
const { verifyUser } = require("../middlewares/auth");
const { bulkSave } = require("../models/jobpostModel");
const router = express.Router();

// router.post(
//   "/jobpost",
//   verifyUser,
//   upload.array("documents"),
//   async (req, res, next) => {
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ error: "No files uploaded." });
//     }
//     next();
//   },
//   // uploadToS3files,
//   createJobPost
// );

router.post(
  "/jobpost",
  verifyUser,
  upload.array("documents"),
  async (req, res, next) => {
    next(); // Remove file check to allow optional uploads
  },
  createJobPost
);


router.get("/", getAllJobPosts);
router.get("/jobpost-details/:id", verifyUser, getJobPostById);
router.put("/:id", updateJobPost);
router.delete("/:id",verifyUser, deleteJobPost);
router.get("/getAllPendingJobPosts", getAllPendingJobPosts);
router.get("/getJobPostByUserId", verifyUser ,getJobPostByUserId);
router.post("/changeJobStatus/:jobId", verifyUser, changeJobStatus);
router.get("/myAcceptedJobs",verifyUser, myAcceptedJobs);
router.get("/business-type-count", getJobCountByBusinessType);
router.get("/getJobTrends"  ,getJobPostingTrends);
router.get("/getTopBusinessCount", getTopBusinessTypes);
router.get("/topLocation", getTopDemandedCities);
router.post("/acceptJob/:jobId", verifyUser, jobProviderAccept);
router.get("/businessTypes",businessTypes);
router.get("/jobsByBusinessType", jobsByBusinessType);
router.put("/job/accept/:jobId", incrementJobAcceptCount);

module.exports = router;