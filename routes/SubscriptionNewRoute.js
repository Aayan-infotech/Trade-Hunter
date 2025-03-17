const express = require("express");
const router = express.Router();
const { createSubscriptionType,
    createSubscriptionPlan,
    getAllSubscriptionPlans,
    getSubscriptionPlanById,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    createSubscriptionUser,
    getAllSubscriptionUsers,
    getSubscriptionUserById,
    updateSubscriptionUser,
    deleteSubscriptionUser

 } = require("../controllers/SubscriptionNewController");

router.post("/subscription-type", createSubscriptionType);

// SubscriptionPlan
router.post("/subscription-plan", createSubscriptionPlan);
router.get("/subscription-plans", getAllSubscriptionPlans);
router.get("/subscription-plan/:id", getSubscriptionPlanById);
router.put("/subscription-plan/:id", updateSubscriptionPlan);
router.delete("/subscription-plan/:id", deleteSubscriptionPlan);

// subscription user
router.post("/subscription-user", createSubscriptionUser);
router.get("/subscription-users", getAllSubscriptionUsers);
router.get("/subscription-user/:id", getSubscriptionUserById);
router.put("/subscription-user/:id", updateSubscriptionUser);
router.delete("/subscription-user/:id", deleteSubscriptionUser);

module.exports = router;