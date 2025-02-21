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
  getJobStatusCounts,
  getRecentJobPosts
} = require("../AdmCtrl/jobCtrl");
const multer = require("multer");
const upload = multer();
const { uploadToS3files } = require("../common/multerconfig2");
const router = express.Router();

router.post(
  "/jobpost",
  upload.array("documents"),
  async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded." });
    }
    next();
  },
  // uploadToS3files,
  createJobPost
);
router.get("/", getAllJobPosts);
router.get("/jobpost-details/:id", getJobPostById);
router.put("/:id", updateJobPost);
router.delete("/:id", deleteJobPost);
router.get("/getAllPendingJobPosts", getAllPendingJobPosts);
router.get("/getJobPostByUserId", getJobPostByUserId);
router.post("/changeJobStatus/:jobId",  changeJobStatus);
router.get("/myAcceptedJobs", myAcceptedJobs);
router.get("/getCount", getJobStatusCounts);
router.get("/getRecentJobs", getRecentJobPosts);
module.exports = router;