

const cron = require("node-cron");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const Provider = require("../models/providerModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");

const updateLeadBasedSubscriptionStatus = async () => {
  try {
    const providers = await Provider.find({
      subscriptionPlanId: { $ne: null },
    });

    for (const provider of providers) {
      const subscriptionPlan = await SubscriptionPlan.findById(
        provider.subscriptionPlanId
      );

      if (!subscriptionPlan) continue;

      const { leadCount } = subscriptionPlan;
      const { leadCompleteCount } = provider;

      if (leadCompleteCount >= leadCount) {
        providers.subscriptionStatus = 0;
        provider.subscriptionPlanId = null;
        provider.leadCompleteCount = null;
        provider.subscriptionType = null;
        provider.address.radius = 10000;
      } else {
        provider.isGuestMode = false;
        provider.address.radius = (subscriptionPlan.kmRadius || 0) * 1000;
      }

      await provider.save();
    }
    console.log(" Provider subscriptions updated based on lead count.");
  } catch (error) {
    console.error(" Error in updateLeadBasedSubscriptionStatus:", error);
  }
};

const updateSubscriptions = async () => {
  try {
    const now = new Date();

    // Step 1: Expired subscriptions ka status "expired" karein
    const expiredSubscriptions = await SubscriptionVoucherUser.find({
      endDate: { $lt: now },
      status: "active",
    });

    for (const sub of expiredSubscriptions) {
      sub.status = "expired";
      await sub.save();
      const provider = await Provider.findById(sub.userId);
      if (provider) {
        provider.subscriptionStatus = 0;
        provider.address.radius = 10000;
        provider.subscriptionPlanId = null;
        await provider.save();
        console.log(
          ` Provider updated: ${provider._id} | Status: 0 | Radius: 10000`
        );
      }
    }

    // Step 2: Active subscriptions ko update karein
    const activeSubscriptions = await SubscriptionVoucherUser.find({
      status: "active",
    });

    for (const sub of activeSubscriptions) {
      const provider = await Provider.findById(sub.userId);
      if (provider) {
        provider.subscriptionStatus = 0;
        provider.isGuestMode = false;
        provider.address.radius = (sub.kmRadius || 0) * 1000; 
        await provider.save();
      }
    }
    await updateLeadBasedSubscriptionStatus();
  } catch (error) {
    console.error(" Error updating subscriptions:", error);
  }
};

cron.schedule("0 12 * * *", updateSubscriptions); 


/*const cron = require("node-cron");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const Provider = require("../models/providerModel");

const updateSubscriptions = async () => {
    try {
      const now = new Date();
  
      // Step 1: Expired subscriptions ka status "expired" karein
      const expiredSubscriptions = await SubscriptionVoucherUser.find({ endDate: { $lt: now }, status: "active" });
  
      for (const sub of expiredSubscriptions) {
        sub.status = "expired";
        await sub.save();
        console.log(`⚠️ Subscription expired: ${sub._id}`);
  
        // Provider update karein
        const provider = await Provider.findById(sub.userId);
        if (provider) {
          provider.subscriptionStatus = 0;
          provider.address.radius = 10000; // Default radius when expired
          await provider.save();
          console.log(`⚠️ Provider updated: ${provider._id} | Status: 0 | Radius: 10000`);
        }
      }
  
      // Step 2: Active subscriptions ko update karein
      const activeSubscriptions = await SubscriptionVoucherUser.find({ status: "active" });
  
      for (const sub of activeSubscriptions) {
        const provider = await Provider.findById(sub.userId);
        if (provider) {
          provider.subscriptionStatus = 1;
          provider.isGuestMode = false;
          provider.address.radius = (sub.kmRadius || 0) * 1000; // Convert km to meters
          await provider.save();
          console.log(`✅ Updated Provider: ${provider._id} | Status: 1 | Radius: ${provider.address.radius}`);
        }
      }
  
      console.log("✅ Subscription update job completed.");
    } catch (error) {
      console.error("❌ Error updating subscriptions:", error);
    }
  }; */
