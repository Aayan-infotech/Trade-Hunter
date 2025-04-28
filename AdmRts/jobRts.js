const express = require("express");
const { verifyUser } = require("../middlewares/auth");
const {
  getAllJobPosts,
  deleteJobPost,
  getJobStatusCounts,
  getRecentJobPosts,
  getJobPostsByStatus,
} = require("../AdmCtrl/jobCtrl");
const router = express.Router();

router.get("/", getAllJobPosts);

router.delete("/:id",verifyUser, deleteJobPost);
router.get("/getCount",verifyUser, getJobStatusCounts);
router.get("/getRecentJobs", getRecentJobPosts);
router.get('/filter',verifyUser, getJobPostsByStatus);
module.exports = router;