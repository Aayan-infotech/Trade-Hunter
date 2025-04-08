const express = require("express");
const router = express.Router();
const { softDeleteProvider, softDeleteHunter,deleteHunterPermanently } = require("../controllers/softDeleteController");
const { verifyUser } = require("../middlewares/auth");

router.delete("/provider/:providerId",verifyUser, softDeleteProvider);

router.delete("/hunter/:hunterId",verifyUser, softDeleteHunter);
router.delete("/delete/:hunterId",verifyUser, deleteHunterPermanently)
module.exports = router;
