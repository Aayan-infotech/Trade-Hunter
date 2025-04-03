const express = require("express");
const router = express.Router();

const { uploadProviderImages,getProviderPhotoByUserId,deleteFileById} = require("../controllers/providerPhotoController");
const { uploadToS3 } = require("../common/multerConfig3");


router.post("/upload", uploadToS3, uploadProviderImages);
router.get("/:userId", getProviderPhotoByUserId);
router.delete("/:fileId", deleteFileById);
module.exports = router;
