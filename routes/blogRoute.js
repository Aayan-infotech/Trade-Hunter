const express = require("express");
const router = express.Router();

const {createBlog,getBlogs,getBlogById,updateBlog,deleteBlog} = require("../controllers/blogController");
const { uploadToS3 } = require("../common/multerConfig3");
const multer = require("multer");
const upload = multer();
const { verifyUser } = require("../middlewares/auth");


router.post("/postBlog", uploadToS3 ,createBlog);
router.get("/getAll", getBlogs);
router.get("/getById/:id", getBlogById);
router.put("/update/:id",verifyUser, uploadToS3, updateBlog);
router.delete("/delete/:id",verifyUser, deleteBlog);


module.exports = router;
