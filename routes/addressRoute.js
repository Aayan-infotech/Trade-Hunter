const express = require("express");
const {
  createAddress,
  getAddresses,
  getAddressbyUserId,
  updateAddress,
  deleteAddress,
} = require("../controllers/addressController");
const { verifyUser } = require("../middlewares/auth");
const router = express.Router();
const multer = require("multer");
const upload = multer();

router.post("/addresses", verifyUser, createAddress);
router.get("/addresses", getAddresses);
router.get("/addresses-by-id", verifyUser, getAddressbyUserId);
router.put("/update-addresses/:id",  updateAddress);
router.delete("/delete-addresses/:id", deleteAddress);

module.exports = router;