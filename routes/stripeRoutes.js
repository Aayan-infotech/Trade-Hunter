const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const { verifyUser } = require("../middlewares/auth");


// Routes
router.post('/pay', stripeController.initiatePayment);

router.get('/getAllTransactions', stripeController.getAllTransactions);
router.get('/totalRevenue', stripeController.getTotalSubscriptionRevenue);
router.get('/getSusbcriptionById', verifyUser, stripeController.getSubscriptionByUserId);
router.get("/session/:sessionId", stripeController.getStripeSessionDetails);
router.post('/cancelSubscription/:userId', stripeController.cancelStripeSubscription);
module.exports = router;
