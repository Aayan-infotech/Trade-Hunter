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

// Add this to your routes
router.get('/verify-eway', async (req, res) => {
  try {
    // Test with a minimal valid transaction
    const testPayload = {
      Payment: {
        TotalAmount: 100, // $1.00 AUD
        CurrencyCode: "AUD"
      },
      TransactionType: "Purchase",
      Customer: {
        FirstName: "Test",
        LastName: "User",
        CardDetails: {
          Name: "Test User",
          Number: "4444333322221111", // Test card number
          ExpiryMonth: "12",
          ExpiryYear: "2025",
          CVN: "123"
        }
      }
    };

    const response = await axios.post(API_URL, testPayload, {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    res.json({
      message: 'Credentials are valid',
      transactionId: response.data.TransactionID,
      status: response.data.TransactionStatus
    });
  } catch (error) {
    console.error('Verification failed:', error.response?.data || error.message);

    res.status(401).json({
      message: 'Credential verification failed',
      error: error.response?.data?.Errors || error.message,
      details: {
        apiKey: API_KEY,
        password: API_PASSWORD.replace(/./g, '*'), // Mask password
        base64Auth: getAuthHeader()
      }
    });
  }
});

module.exports = router;
