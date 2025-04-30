const express = require('express');
const axios = require('axios');
const router = express.Router();
const ewayController = require('../controllers/ewayController');

// Replace with actual API keys
const API_KEY = 'C3AB9C5bfS+DBG9Rx9lZ2gZlXbX+ut8Xvni9NPznSIzTs6S7GUx4b+g2YPBTDnFjxRHzM8';
const API_PASSWORD = 'a94hsJf1';
const API_URL = 'https://api.sandbox.ewaypayments.com/Transaction'; // Make sure this is the correct endpoint

// Define the getAuthHeader function
const getAuthHeader = () => {
  const authString = `${API_KEY}:${API_PASSWORD}`;
  const base64Auth = Buffer.from(authString).toString('base64');
  return `Basic ${base64Auth}`;
};

router.post('/pay', ewayController.initiatePayment);
router.get('/getAllTransactions', ewayController.getAllTransactions);
router.get('/totalRevenue', ewayController.getTotalSubscriptionRevenue);


module.exports = router;
