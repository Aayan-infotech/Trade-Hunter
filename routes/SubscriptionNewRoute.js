const express = require("express");
const router = express.Router();
const { createSubscriptionType,
    getAllSubscriptionTypes,
    deleteSubscriptionType,
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
    deleteSubscription,

 } = require("../controllers/SubscriptionNewController");



router.post("/subscription-type", createSubscriptionType);
router.get("/subscription-type", getAllSubscriptionTypes);
router.delete("/subscription-type/:id", deleteSubscriptionType);


// SubscriptionPlan
router.post("/subscription-plan", createSubscriptionPlan);
router.get("/subscription-plans", getAllSubscriptionPlans);
router.get("/subscription-plan/:id", getSubscriptionPlanById);
router.put("/subscription-plan/:id", updateSubscriptionPlan);
router.delete("/subscription-plan/:id", deleteSubscriptionPlan);

// subscription user
router.post("/subscription-user", createSubscriptionUser);
router.get("/subscription-users",getAllSubscriptionUsers);
router.get("/subscription-user/:id", getSubscriptionUserById);
router.put("/subscription-user/:id", updateSubscriptionUser);
router.delete("/subscription-user/:id", deleteSubscriptionUser);
 


// Subscription Routes
router.get('/subscriptions', getAllSubscriptions);
router.get('/subscription/:id', getSubscriptionById);
router.post('/subscription', createSubscription);
router.put('/subscription/:id', updateSubscription);
router.delete('/subscription/:id', deleteSubscription);

module.exports = router;