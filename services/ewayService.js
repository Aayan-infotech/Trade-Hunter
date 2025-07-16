require('dotenv').config();
const axios = require('axios');
const { getSecrets } = require("../utils/awsSecrets");

let secrets;
(async () => {
  try {
    secrets = await getSecrets();
    if (!secrets.EWAY_API_KEY || !secrets.EWAY_PASSWORD || !secrets.EWAY_URL) {
      console.error("Missing one of EWAY_API_KEY, EWAY_PASSWORD, or EWAY_URL from AWS Secrets Manager");
    }
  } catch (error) {
    console.error(" Failed to fetch secrets from AWS:", error);
  }
})();

const getAuthHeader = () => {
  const creds = `${secrets.EWAY_API_KEY.trim()}:${secrets.EWAY_PASSWORD.trim()}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
};

exports.createTransaction = async (paymentData) => {
  try {
    if (!secrets?.EWAY_URL) {
      throw new Error("eWAY API URL not set in secrets");
    }

    console.log(" eWAY request payload:", JSON.stringify(paymentData, null, 2));

    const response = await axios.post(secrets.EWAY_URL, paymentData, {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 20000,
    });

    console.log("eWAY raw response:", JSON.stringify(response.data, null, 2));

    if (!response.data?.TransactionID) {
      return { error: "Missing TransactionID", raw: response.data };
    }

    return response.data;
  } catch (err) {
    console.error(" eWAY transaction error:", err.response?.data || err.message);
    return { error: err.response?.data || err.message };
  }
};
