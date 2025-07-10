const express = require("express");
const { verifyUser } = require("../middlewares/auth");
const {
  getAllJobPosts,
  deleteJobPost,
  getJobStatusCounts,
  getRecentJobPosts,
  getJobPostsByStatus,
  getAllJobPostsAdmin,
} = require("../AdmCtrl/jobCtrl");
const router = express.Router();

router.get("/", getAllJobPosts);
router.get("jobPostAdmin",getAllJobPostsAdmin);
router.delete("/:id",verifyUser, deleteJobPost);
router.get("/getCount",verifyUser, getJobStatusCounts);
router.get("/getRecentJobs", getRecentJobPosts);
router.get('/filter',verifyUser, getJobPostsByStatus);
module.exports = router;