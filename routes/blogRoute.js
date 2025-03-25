const express = require("express");
const router = express.Router();

const {createBlog,getBlogs,getBlogById,updateBlog,deleteBlog} = require("../controllers/blogController");
const { uploadToS3 } = require("../common/multerConfig3");
const multer = require("multer");
const upload = multer();


router.post("/postBlog", uploadToS3 ,createBlog);
router.get("/getAll", getBlogs);
router.get("/getById/:id", getBlogById);
router.put("/update/:id", uploadToS3, updateBlog);
router.delete("/delete/:id", deleteBlog);


module.exports = router;
