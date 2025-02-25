const express = require("express");
const router = express.Router();
const { softDeleteProvider, softDeleteHunter } = require("../controllers/softDeleteController");

router.delete("/provider/:providerId", softDeleteProvider);

router.delete("/hunter/:hunterId", softDeleteHunter);
module.exports = router;
