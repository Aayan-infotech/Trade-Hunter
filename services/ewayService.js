
require('dotenv').config();
const axios = require('axios');

const { EWAY_API_KEY, EWAY_PASSWORD, EWAY_URL } = process.env;

if (!EWAY_API_KEY || !EWAY_PASSWORD || !EWAY_URL) {
  console.error("❌ Missing one of EWAY_API_KEY, EWAY_PASSWORD, or EWAY_URL in .env");
}

const getAuthHeader = () => {
  const creds = `${EWAY_API_KEY.trim()}:${EWAY_PASSWORD.trim()}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
};

exports.createTransaction = async (paymentData) => {
  try {
    if (!EWAY_URL) {
      throw new Error("eWAY API URL not set");
    }

    console.log("➡️ eWAY request payload:", JSON.stringify(paymentData, null, 2));

    const response = await axios.post(EWAY_URL, paymentData, {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 20000,
    });

    console.log("⬅️ eWAY raw response:", JSON.stringify(response.data, null, 2));

    if (!response.data?.TransactionID) {
      return { error: "Missing TransactionID", raw: response.data };
    }

    return response.data;
  } catch (err) {
    console.error("❌ eWAY transaction error:", err.response?.data || err.message);
    return { error: err.response?.data || err.message };
  }
};