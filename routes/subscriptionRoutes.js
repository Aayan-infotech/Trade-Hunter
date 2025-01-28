const express = require("express");
const {addSubscription, getAllSubscription, getSubscriptionById} = require("../controllers/subscriptionController");
const router = express.Router()

router.post("/addSubscription", addSubscription)
router.get("/getAllSubscription", getAllSubscription)
router.get("/getSubscriptionById/:id", getSubscriptionById)

module.exports=router