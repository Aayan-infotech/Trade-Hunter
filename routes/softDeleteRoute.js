const express = require("express");
const router = express.Router();
const { softDeleteProvider, softDeleteHunter,deleteHunterPermanently } = require("../controllers/softDeleteController");

router.delete("/provider/:providerId", softDeleteProvider);

router.delete("/hunter/:hunterId", softDeleteHunter);
router.delete("delete/:hunterId", deleteHunterPermanently)
module.exports = router;
