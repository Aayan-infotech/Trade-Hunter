const express = require("express");
const router = express.Router();
const providerController = require("../AdmCtrl/providerCtrl");

router.get("/", providerController.getAllProviders);
router.delete("/:id", providerController.deleteProvider);
router.put("/:id", providerController.updateProvider);
router.get("/GuestMode", providerController.getAllProvidersGuestMode);

module.exports = router;
