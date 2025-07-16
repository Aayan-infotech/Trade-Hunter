// const express = require('express');
// const router = express.Router();
// const ewayController = require('../controllers/ewayController');
// const { verifyUser } = require("../middlewares/auth");
// const { getSecrets } = require('../utils/awsSecrets');

// const API_KEY = process.env.EWAY_API_KEY;
// const API_PASSWORD = process.env.EWAY_PASSWORD;
// const API_URL = process.env.EWAY_URL;

// const getAuthHeader = () => {
//   const authString = `${API_KEY}:${API_PASSWORD}`;
//   const base64Auth = Buffer.from(authString).toString('base64');
//   return `Basic ${base64Auth}`;
// };

// router.post('/pay', (req, res) => ewayController.initiatePayment(req, res, getAuthHeader(), API_URL));
// router.get('/getAllTransactions', ewayController.getAllTransactions);
// router.get('/totalRevenue', ewayController.getTotalSubscriptionRevenue);

// router.get('/getSusbcriptionById' ,verifyUser,  ewayController.getSubscriptionByUserId);
// module.exports = router;


require('dotenv').config();
const express = require('express');
const router = express.Router();
const ewayController = require('../controllers/ewayController');
const { verifyUser } = require("../middlewares/auth");
const { getSecrets } = require('../utils/awsSecrets');
const secrets = await getSecrets();

// Load secrets on startup
let API_KEY, API_PASSWORD, API_URL;

getSecrets().then((secrets) => {
  API_KEY = secrets.EWAY_API_KEY;
  API_PASSWORD = secrets.EWAY_PASSWORD;
  API_URL = secrets.EWAY_URL;
}).catch(err => {
  console.error("Failed to load AWS secrets:", err);
});

// Generate auth header
const getAuthHeader = () => {
  const authString = `${API_KEY}:${API_PASSWORD}`;
  const base64Auth = Buffer.from(authString).toString('base64');
  return `Basic ${base64Auth}`;
};

router.post('/pay', (req, res) => {
  if (!API_KEY || !API_PASSWORD || !API_URL) {
    return res.status(500).json({ error: "Secrets not loaded" });
  }
  ewayController.initiatePayment(req, res, getAuthHeader(), API_URL);
});

router.get('/getAllTransactions', ewayController.getAllTransactions);
router.get('/totalRevenue', ewayController.getTotalSubscriptionRevenue);
router.get('/getSusbcriptionById', verifyUser, ewayController.getSubscriptionByUserId);


module.exports = router;
