const express = require('express');
const { createDeviceToken, getAllDeviceTokens, getTokenByUserId } = require('../controllers/devicetokenController');
const { verifyUser } = require("../middlewares/auth");
const router = express.Router();

router.post('/save-token',verifyUser, createDeviceToken);
router.get('/getAllTokens', getAllDeviceTokens);
router.get('/getToken/:userId', getTokenByUserId);

module.exports = router;