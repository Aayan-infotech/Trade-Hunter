

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
      if (provider.subscriptionType !== "Pay Per Lead") continue;

      const subscriptionPlan = await SubscriptionPlan.findById(provider.subscriptionPlanId);
      if (!subscriptionPlan) continue;

      const { leadCount } = subscriptionPlan;
      const { leadCompleteCount } = provider;

      if (leadCompleteCount >= leadCount) {
        provider.subscriptionStatus = 0;
        provider.subscriptionPlanId = null;
        provider.leadCompleteCount = null;
        provider.subscriptionType = null;
        provider.address.radius = 10000;
        console.log(` Lead limit reached for provider: ${provider._id}`);
      } else {
        provider.isGuestMode = false;
        provider.address.radius = (subscriptionPlan.kmRadius || 0) * 1000;
        console.log(` Lead-based subscription active for provider: ${provider._id}`);
      }

      await provider.save();
    }

    console.log(" Lead-based subscription check completed.");
  } catch (error) {
    console.error(" Error in updateLeadBasedSubscriptionStatus:", error);
  }
};

const updateSubscriptions = async () => {
  try {
    const now = new Date();

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

// cron.schedule("0 12 * * *", updateSubscriptions); 
cron.schedule('*/5 * * * *', updateSubscriptions)



const checkAndUpdateSubscriptions = async () => {
  try {
    const now = new Date();

    // Step 1: Check for subscriptions that have started and need to be updated
    const startedSubscriptions = await SubscriptionVoucherUser.find({
      startDate: { $lte: now },
      status: "upcoming",
    });

    for (const sub of startedSubscriptions) {
      sub.status = "active";
      await sub.save();

      const provider = await Provider.findById(sub.userId);
      if (provider) {
        provider.subscriptionStatus = 1; 
        provider.subscriptionType = sub.type; 
        provider.subscriptionPlanId = sub.subscriptionPlanId; 
        const subscriptionPlan = await SubscriptionPlan.findById(sub.subscriptionPlanId);
        if (subscriptionPlan) {
          provider.address.radius = subscriptionPlan.kmRadius * 1000; 
        }
        await provider.save();

        console.log(`Subscription updated for provider: ${provider._id} | Status: Active`);
      }
    }

    console.log("Subscription status update completed.");
  } catch (error) {
    console.error("Error in checkAndUpdateSubscriptions:", error);
  }
};

cron.schedule('*/5 * * * *', checkAndUpdateSubscriptions)


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
