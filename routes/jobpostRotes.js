const express = require("express");
const {
  createJobPost,
  getAllJobPosts,
  getJobPostById,
  updateJobPost,
  deleteJobPost,
} = require("../controllers/jobpostController");
const multer = require("multer");
const upload = multer();
const { uploadToS3 } = require("../common/multerConfig");
const { verifyUser } = require("../middlewares/auth");
const router = express.Router();

router.post(
  "/jobpost",
  verifyUser,
  // upload.array("documents"),
  // async (req, res, next) => {
  //   if (!req.files || req.files.length === 0) {
  //     return res.status(400).json({ error: "No files uploaded." });
  //   }
  //   next();
  // },
  // uploadToS3,
  createJobPost
);
router.get("/", getAllJobPosts);
router.get("/:id", verifyUser, getJobPostById);
router.put("/:id",updateJobPost);
router.delete("/:id", deleteJobPost);

module.exports = router;