const express = require('express');
const router = express.Router();
const ewayController = require('../controllers/ewayController');
const { verifyUser } = require("../middlewares/auth");
const { getSecrets } = require('../utils/awsSecrets');

let API_KEY, API_PASSWORD, API_URL;
let secretsLoaded = false;

// Load secrets once at module init
getSecrets()
  .then((secrets) => {
    API_KEY = secrets.EWAY_API_KEY;
    API_PASSWORD = secrets.EWAY_PASSWORD;
    API_URL = secrets.EWAY_URL;
    secretsLoaded = true;

    if (!API_KEY || !API_PASSWORD || !API_URL) {
      throw new Error("One or more eWAY secrets are missing");
    }
  })
  .catch((err) => {
    console.error("❌ Failed to load AWS secrets for eWAY:", err.message);
  });

// Generate Authorization Header
const getAuthHeader = () => {
  const authString = `${API_KEY}:${API_PASSWORD}`;
  const base64Auth = Buffer.from(authString).toString('base64');
  return `Basic ${base64Auth}`;
};

// Routes
router.post('/pay', (req, res) => {
  if (!secretsLoaded) {
    return res.status(500).json({ error: "eWAY secrets not loaded yet" });
  }
  ewayController.initiatePayment(req, res, getAuthHeader(), API_URL);
});

router.get('/getAllTransactions', ewayController.getAllTransactions);
router.get('/totalRevenue', ewayController.getTotalSubscriptionRevenue);
router.get('/getSusbcriptionById', verifyUser, ewayController.getSubscriptionByUserId);

module.exports = router;
