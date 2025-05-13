const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY      = process.env.EWAY_API_KEY      || 'C3AB9C5bfS+DBG9Rx9lZ2gZlXbX+ut8Xvni9NPznSIzTs6S7GUx4b+g2YPBTDnFjxRHzM8';
const API_PASSWORD = process.env.EWAY_PASSWORD 
const API_URL = 'https://api.sandbox.ewaypayments.com/Transaction';

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
      timeout: 20000,
    });

    if (!response.data?.TransactionID) {
      throw new Error('Invalid response from eWAY: Missing TransactionID');
    }

    return response.data;
  } catch (error) {
    return error.message
       
  }
};
