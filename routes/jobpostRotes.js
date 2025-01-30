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
const { uploadToS3files } = require("../common/multerconfig2");
const { verifyUser } = require("../middlewares/auth");
const router = express.Router();

router.post(
  "/jobpost",
  verifyUser,
  upload.array("documents"),
  async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded." });
    }
    next();
  },
  uploadToS3files,
  createJobPost
);
router.get("/", verifyUser, getAllJobPosts);
router.get("/:id", verifyUser, getJobPostById);
router.put("/:id", updateJobPost);
router.delete("/:id", deleteJobPost);

module.exports = router;
