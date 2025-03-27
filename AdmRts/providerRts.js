const express = require("express");
const router = express.Router();
const providerController = require("../AdmCtrl/providerCtrl");

const multer = require("multer");
const upload = multer();
const { uploadToS3 } = require("../common/multerConfig");
const providers = require('../controllers/providerController');

router.get("/", providerController.getAllProviders);
router.delete("/:id", providerController.deleteProvider);
router.put("/delete/:id", providerController.updateProvider);
router.get("/GuestMode", providerController.getAllProvidersGuestMode);

router.put('/updateById/:id',upload.single("images"), uploadToS3, providers.updateProviderById);

module.exports = router;
