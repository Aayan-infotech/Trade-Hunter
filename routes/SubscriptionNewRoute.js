const express = require("express");
const router = express.Router();
const { createSubscriptionType } = require("../controllers/SubscriptionNewController");

router.post("/subscription-type", createSubscriptionType);

module.exports = router;