const express = require("express");
const router = express.Router();

const { uploadProviderImages,getProviderPhotoByUserId,deleteFileById} = require("../controllers/providerPhotoController");
const { uploadToS3 } = require("../common/multerConfig3");
const { verifyUser } = require("../middlewares/auth");


router.post("/upload", verifyUser, uploadToS3, uploadProviderImages);
router.get("/:userId",verifyUser, getProviderPhotoByUserId);
router.delete("/:fileId",verifyUser,  deleteFileById);
module.exports = router;
