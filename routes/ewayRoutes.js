const express = require('express');
const router = express.Router();
const ewayController = require('../controllers/ewayController');

router.post('/pay', ewayController.initiatePayment);

module.exports = router;
