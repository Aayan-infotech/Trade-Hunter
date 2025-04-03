const express = require("express");
const {
  getAllJobPosts,
  updateJobPost,
  deleteJobPost,
  getJobStatusCounts,
  getRecentJobPosts,
  getJobPostsByStatus,
} = require("../AdmCtrl/jobCtrl");
const router = express.Router();

router.get("/", getAllJobPosts);
router.put("/:id", updateJobPost);
router.delete("/:id", deleteJobPost);
router.get("/getCount", getJobStatusCounts);
router.get("/getRecentJobs", getRecentJobPosts);
router.get('/filter', getJobPostsByStatus);
module.exports = router;