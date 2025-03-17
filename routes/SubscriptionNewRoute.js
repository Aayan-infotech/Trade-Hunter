const express = require("express");
const router = express.Router();
const { createSubscriptionType,
    createSubscriptionPlan,
    getAllSubscriptionPlans,
    getSubscriptionPlanById,
    updateSubscriptionPlan,
    deleteSubscriptionPlan

 } = require("../controllers/SubscriptionNewController");

router.post("/subscription-type", createSubscriptionType);

router.post("/subscription-plan", createSubscriptionPlan);
router.get("/subscription-plans", getAllSubscriptionPlans);
router.get("/subscription-plan/:id", getSubscriptionPlanById);
router.put("/subscription-plan/:id", updateSubscriptionPlan);
router.delete("/subscription-plan/:id", deleteSubscriptionPlan);

module.exports = router;