const express = require("express");
const {createPayment,getAllPayment,paymentByProviderId,getTotalSubscriptionRevenue} = require("../controllers/paymentController");
const { verifyUser } = require("../middlewares/auth");
const router = express.Router();

router.post("/createPayment" , verifyUser,createPayment);
router.get("/getAllPayment" ,getAllPayment);
router.get("/paymentByprovider/:id" ,paymentByProviderId);
router.get("/totalRevenue", getTotalSubscriptionRevenue)

module.exports = router;