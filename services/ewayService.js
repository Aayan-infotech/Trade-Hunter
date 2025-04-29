const axios = require('axios');

// Replace with your Eway API credentials
const API_KEY = 'C3AB9C5bfS+DBG9Rx9lZ2gZlXbX+ut8Xvni9NPznSIzTs6S7GUx4b+g2YPBTDnFjxRHzM8';
const API_PASSWORD = 'NLK7pIqc';
const API_URL = 'https://api.sandbox.ewaypayments.com/Transaction'; 

exports.createTransaction = async (paymentData) => {
  const auth = Buffer.from(`${API_KEY}:${API_PASSWORD}`).toString('base64');

  try {
    const response = await axios.post(API_URL, paymentData, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.Errors || error.message);
  }
};
