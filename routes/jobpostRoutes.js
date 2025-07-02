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
  updateJobPost,
  completionNotified,
} = require("../controllers/jobpostController");
const multer = require("multer");
const upload = multer();
const { uploadToS3files } = require("../common/multerconfig2");
const { verifyUser } = require("../middlewares/auth");
// const { checkSubscriptionOrVoucher } = require("../middlewares/checkSubscriptionOrVoucher");

const router = express.Router();

router.post(
  "/jobpost",
  verifyUser,
  // upload.array("documents"),
  uploadToS3files, 
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
// router.put("/job/accept/:jobId", verifyUser,checkSubscriptionOrVoucher,incrementJobAcceptCount);
router.put("/job/accept/:jobId", incrementJobAcceptCount);
router.put("/:id",verifyUser,uploadToS3files, updateJobPost);
router.put("/notifyCompletion/:jobId",verifyUser, completionNotified);


module.exports = router;
