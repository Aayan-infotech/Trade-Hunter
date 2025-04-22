const cron = require("node-cron");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const Provider = require("../models/providerModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");

/*const updateSubscriptions = async () => {
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
      // console.log(`⚠️ Subscription expired: ${sub._id}`);

      // Provider update karein
      const provider = await Provider.findById(sub.userId);
      if (provider) {
        provider.subscriptionStatus = 0;
        provider.address.radius = 10000; // Default radius when expired
        provider.subscriptionPlan = null;
        await provider.save();
        console.log(
          `⚠️ Provider updated: ${provider._id} | Status: 0 | Radius: 10000`
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
        provider.subscriptionStatus = 1;
        provider.isGuestMode = false;
        provider.address.radius = (sub.kmRadius || 0) * 1000; // Convert km to meters
        await provider.save();
        // console.log(`✅ Updated Provider: ${provider._id} | Status: 1 | Radius: ${provider.address.radius}`);
      }
    }

    // console.log("✅ Subscription update job completed.");
  } catch (error) {
    console.error("❌ Error updating subscriptions:", error);
  }
}; */
// cron.schedule("0 */6 * * *", updateSubscriptions);
// cron.schedule("0 12 * * *", updateSubscriptions); //24h 
// console.log("⏳ Subscription update cron job scheduled.");


// 🔁 Function to check and update provider subscription based on lead count
// const checkAndUpdateProviderSubscription = async (provider) => {
//   try {
//     if (!provider.subscriptionPlanId) return;

//     const subscriptionPlan = await SubscriptionPlan.findById(provider.subscriptionPlanId);
//     if (!subscriptionPlan) return;

//     const leadLimit = subscriptionPlan.leadCount || 0;
//     const completedLeads = provider.leadCompleteCount || 0;

//     if (completedLeads >= leadLimit) {
//       // Mark as expired
//       provider.subscriptionStatus = 0;
//       provider.subscriptionPlan = null;
//       provider.subscriptionPlanId = null;
//       provider.address.radius = 10000;
//       await provider.save();
//       console.log(`🔴 Subscription expired due to lead limit for provider ${provider._id}`);
//     } else {
//       console.log(`🟢 Provider ${provider._id} is within lead limit.`);
//     }
//   } catch (err) {
//     console.error("❌ Error in checkAndUpdateProviderSubscription:", err);
//   }
// };

const checkAndUpdateProviderSubscription = async (provider) => {
  try {
    if (!provider.subscriptionPlanId) return;

    const subscriptionPlan = await SubscriptionPlan.findById(provider.subscriptionPlanId);
    if (!subscriptionPlan) return;

    const leadLimit = subscriptionPlan.leadCount || 0;
    const completedLeads = provider.leadCompleteCount || 0;

    if (completedLeads >= leadLimit) {
      // Mark as expired
      provider.subscriptionStatus = 0;
      provider.subscriptionPlan = null;
      provider.set("subscriptionPlanId", null); // ⬅ safer than direct null
      provider.address.radius = 10000;
      provider.markModified("address");         // ⬅ ensure update triggers
      await provider.save();
      console.log(`🔴 Subscription expired due to lead limit for provider ${provider._id}`);
    } else {
      console.log(`🟢 Provider ${provider._id} is within lead limit.`);
    }
  } catch (err) {
    console.error("❌ Error in checkAndUpdateProviderSubscription:", err);
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
      // console.log(`⚠️ Subscription expired: ${sub._id}`);

      // Provider update karein
      const provider = await Provider.findById(sub.userId);
      if (provider) {
        provider.subscriptionStatus = 0;
        provider.address.radius = 10000; // Default radius when expired
        provider.subscriptionPlan = null;
        await provider.save();
        console.log(
          `⚠️ Provider updated: ${provider._id} | Status: 0 | Radius: 10000`
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
        provider.subscriptionStatus = 1;
        provider.isGuestMode = false;
        provider.address.radius = (sub.kmRadius || 0) * 1000; // Convert km to meters
        await provider.save();
        // ✅ Check plan lead count
        await checkAndUpdateProviderSubscription(provider);
        // console.log(`✅ Updated Provider: ${provider._id} | Status: 1 | Radius: ${provider.address.radius}`);
      }
    }

    // console.log("✅ Subscription update job completed.");
  } catch (error) {
    console.error("❌ Error updating subscriptions:", error);
  }
}; 

// ⏰ Run every day at 12 PM
// cron.schedule("0 12 * * *", updateSubscriptions);
cron.schedule("*/2 * * * *", updateSubscriptions);


