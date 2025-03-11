const express = require('express');
const { createDeviceToken, getAllDeviceTokens, getTokenByUserId } = require('../controllers/devicetokenController');

const router = express.Router();

router.post('/device-token', createDeviceToken);
router.get('/getAllTokens', getAllDeviceTokens);
router.get('/getToken/:userId', getTokenByUserId);

module.exports = router;