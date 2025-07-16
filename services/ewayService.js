const axios = require('axios');
const { getSecrets } = require('../utils/awsSecrets'); // Your existing AWS secrets loader

let cachedSecrets;

const getAuthHeader = () => {
  const apiKey = cachedSecrets?.EWAY_API_KEY || process.env.EWAY_API_KEY;
  const password = cachedSecrets?.EWAY_PASSWORD || process.env.EWAY_PASSWORD;

  if (!apiKey || !password) {
    throw new Error("Missing EWAY credentials from secrets or env");
  }

  const creds = `${apiKey.trim()}:${password.trim()}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
};

exports.createTransaction = async (paymentData) => {
  try {
    if (!cachedSecrets) {
      cachedSecrets = await getSecrets(); // Load once
    }

    const ewayUrl = cachedSecrets?.EWAY_URL || process.env.EWAY_URL;

    if (!ewayUrl) {
      throw new Error("EWAY_URL not set in secrets or env");
    }

    console.log("➡️ eWAY request payload:", JSON.stringify(paymentData, null, 2));

    const response = await axios.post(ewayUrl, paymentData, {
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
