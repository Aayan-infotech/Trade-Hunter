const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middlewares/auth");
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
    getRetentionRate,
    getSubscriptionPlansByTypeId,
    getActiveUsersGroupedByPlan
 } = require("../controllers/SubscriptionNewController");



router.post("/subscription-type",verifyUser, createSubscriptionType);
router.get("/subscription-type",verifyUser, getAllSubscriptionTypes);
router.delete("/subscription-type/:id",verifyUser, deleteSubscriptionType);


router.post("/subscription-plan", verifyUser, createSubscriptionPlan);
router.get("/subscription-plans",verifyUser, getAllSubscriptionPlans);
router.get("/subscription-plan/:id",verifyUser ,getSubscriptionPlanById);
router.put("/subscription-plan/:id",verifyUser, updateSubscriptionPlan);
router.delete("/subscription-plan/:id",verifyUser, deleteSubscriptionPlan);

router.post("/subscription-user", verifyUser,createSubscriptionUser);
router.get("/subscription-users", verifyUser , getAllSubscriptionUsers);
router.get("/subscription-user/:id",verifyUser, getSubscriptionUserById);
router.put("/subscription-user/:id",verifyUser, updateSubscriptionUser);
router.delete("/subscription-user/:id",verifyUser, deleteSubscriptionUser);
 

router.get('/subscriptions',verifyUser, getAllSubscriptions);
router.get('/subscription/:id',verifyUser, getSubscriptionById);
router.post('/subscription',verifyUser, createSubscription);
router.put('/subscription/:id',verifyUser, updateSubscription);
router.delete('/subscription/:id',verifyUser, deleteSubscription);
router.get("/retentionRate",verifyUser, getRetentionRate);

router.get('/subscriptionPlansByType/:subscriptionTypeId', getSubscriptionPlansByTypeId);
router.get('/usersByPlan', getActiveUsersGroupedByPlan);

module.exports = router;