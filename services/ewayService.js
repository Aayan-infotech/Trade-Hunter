// const axios = require('axios');
// const dotenv = require('dotenv');
// dotenv.config();

// const API_KEY      = process.env.EWAY_API_KEY ;
// const API_PASSWORD = process.env.EWAY_PASSWORD 
// const API_URL = 'https://api.sandbox.ewaypayments.com/Transaction';

// const getAuthHeader = () => {
//   const credentials = `${API_KEY.trim()}:${API_PASSWORD.trim()}`;
//   return `Basic ${Buffer.from(credentials).toString('base64')}`;
// };

// exports.createTransaction = async (paymentData) => {
//   try {
//     const response = await axios.post(API_URL, paymentData, {
//       headers: {
//         Authorization: getAuthHeader(),
//         'Content-Type': 'application/json',
//         'Accept': 'application/json',
//       },
//       timeout: 20000,
//     });

//     if (!response.data?.TransactionID) {
//       throw new Error('Invalid response from eWAY: Missing TransactionID');
//     }

//     return response.data;
//   } catch (error) {
//     return error.message
       
//   }
// };


const axios = require('axios');
const { getSecrets } = require('../utils/awsSecrets');

// Load secrets once
let API_KEY, API_PASSWORD, API_URL;

getSecrets().then((secrets) => {
  API_KEY = secrets.EWAY_API_KEY;
  API_PASSWORD = secrets.EWAY_PASSWORD;
  API_URL = secrets.EWAY_URL;
}).catch(err => {
  console.error("Failed to load AWS secrets:", err);
});

const getAuthHeader = () => {
  const credentials = `${API_KEY.trim()}:${API_PASSWORD.trim()}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
};

exports.createTransaction = async (paymentData) => {
  try {
    if (!API_URL || !API_KEY || !API_PASSWORD) {
      throw new Error("Secrets not loaded");
    }

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
    console.error("eWAY transaction error:", error);
    return { error: error.message };
  }
};

