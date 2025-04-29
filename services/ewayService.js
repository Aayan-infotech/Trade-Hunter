const axios = require('axios');

// eWAY API Credentials (ensure these are correct)
const API_KEY = 'C3AB9C5bfS+DBG9Rx9lZ2gZlXbX+ut8Xvni9NPznSIzTs6S7GUx4b+g2YPBTDnFjxRHzM8';
const API_PASSWORD = 'a94hsJf1';
const API_URL = 'https://api.sandbox.eway.com.au/Transaction'; // Ensure sandbox URL is being used

// Create reusable auth header
const getAuthHeader = () => {
  const credentials = `${API_KEY.trim()}:${API_PASSWORD.trim()}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

exports.createTransaction = async (paymentData) => {
  try {
    const response = await axios.post(API_URL, paymentData, {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 20000, // Increased timeout to 20 seconds
    });

    // Check for valid response with TransactionID
    if (!response.data?.TransactionID) {
      throw new Error('Invalid response from eWAY: Missing TransactionID');
    }

    return response.data;
  } catch (error) {
    // Enhanced error logging with additional information
    console.error('Error details:', {
      message: error.message,
      request: {
        url: error.config?.url,
        headers: error.config?.headers,
        data: error.config?.data,
      },
      response: {
        status: error.response?.status, // HTTP status code
        data: error.response?.data, // Full response body from eWAY
      },
      stack: error.stack, // Detailed stack trace for debugging
    });

    // If DNS error (ENOTFOUND), log the error and throw a more specific error message
    if (error.code === 'ENOTFOUND') {
      throw new Error('Network issue: Unable to reach eWAY API. Please check your internet connection or DNS settings.');
    }

    // Throw a more detailed error message
    const errorMessage =
      error.response?.data?.Message ||
      error.response?.data?.Errors ||
      'Eway API request failed';

    throw new Error(errorMessage);
  }
};
