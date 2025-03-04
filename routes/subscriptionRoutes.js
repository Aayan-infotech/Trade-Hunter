const express = require("express");
const {addSubscription, getAllSubscription, getSubscriptionById,
    deleteSubscription,
    updateSubscription,
    getRetentionRate
} = require("../controllers/subscriptionController");
const router = express.Router()

router.post("/addSubscription", addSubscription)
router.get("/getAllSubscription", getAllSubscription)
router.get("/getSubscriptionById/:id", getSubscriptionById)
router.put("/update/:id", updateSubscription);
router.delete("/delete/:id", deleteSubscription);
router.get("/retentionRate", getRetentionRate)

module.exports=router