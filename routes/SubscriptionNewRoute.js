const express = require("express");
const router = express.Router();
const { createSubscriptionType,
    getAllSubscriptionTypes,
    createSubscriptionPlan,
    getAllSubscriptionPlans,
    getSubscriptionPlanById,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    createSubscriptionUser,
    getAllSubscriptionUsers,
    getSubscriptionUserById,
    updateSubscriptionUser,
    deleteSubscriptionUser,
    getAllSubscriptions,
    getSubscriptionById,
    createSubscription,
    updateSubscription,
    deleteSubscription

 } = require("../controllers/SubscriptionNewController");

router.post("/subscription-type", createSubscriptionType);
router.get("/subscription-type", getAllSubscriptionTypes);


// SubscriptionPlan
router.post("/subscription-plan", createSubscriptionPlan);
router.get("/subscription-plans", getAllSubscriptionPlans);
router.get("/subscription-plan/:id", getSubscriptionPlanById);
router.put("/subscription-plan/:id", updateSubscriptionPlan);
router.delete("/subscription-plan/:id", deleteSubscriptionPlan);

// subscription user
// router.post("/subscription-user", createSubscriptionUser);
// router.get("/subscription-users", getAllSubscriptionUsers);
// router.get("/subscription-user/:id", getSubscriptionUserById);
// router.put("/subscription-user/:id", updateSubscriptionUser);
// router.delete("/subscription-user/:id", deleteSubscriptionUser);

// Subscription 
router.get('/subscription-user', getAllSubscriptions);
router.get('/subscription-user/:id', getSubscriptionById);
router.post('/subscription-user', createSubscription);
router.put('/subscription-user/:id', updateSubscription);
router.delete('/subscription-user/:id', deleteSubscription);

module.exports = router;