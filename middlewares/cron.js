const cron = require("node-cron");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const Provider = require("../models/providerModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");

// 🔁 Function to check and update provider subscription based on lead count
const checkAndUpdateProviderSubscription = async (provider) => {
  try {
    if (!provider.subscriptionPlanId) {
      console.log(`⚠️ No subscriptionPlanId for provider ${provider._id}`);
      return;
    }

    console.log(`📦 Checking SubscriptionPlan for provider: ${provider._id}`);
    const subscriptionPlan = await SubscriptionPlan.findById(provider.subscriptionPlanId);

    if (!subscriptionPlan) {
      console.log(`❌ No SubscriptionPlan found for ID: ${provider.subscriptionPlanId}`);
      return;
    }

    const leadLimit = subscriptionPlan.leadCount || 0;
    const completedLeads = provider.leadCompleteCount || 0;

    console.log(`📊 Provider ${provider._id} | leadCompleteCount: ${completedLeads} | leadLimit: ${leadLimit}`);

    if (completedLeads >= leadLimit) {
      // Expire the subscription
      provider.subscriptionStatus = 0;
      provider.subscriptionPlan = null;
      provider.subscriptionPlanId = null;
      provider.address.radius = 10000;
      await provider.save();
      console.log(`🔴 Subscription expired due to lead limit for provider ${provider._id}`);
    } else {
      console.log(`🟢 Provider ${provider._id} is within lead limit.`);
    }
  } catch (err) {
    console.error("❌ Error in checkAndUpdateProviderSubscription:", err);
  }
};

// 🔄 Cron job logic to update subscriptions
const updateSubscriptions = async () => {
  console.log("🕒 Cron job triggered at:", new Date());

  try {
    const now = new Date();

    // Step 1: Expire subscriptions where endDate has passed
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
        provider.subscriptionPlan = null;
        provider.subscriptionPlanId = null;
        await provider.save();
        console.log(`🔴 Subscription expired (by date) for provider ${provider._id}`);
      }
    }

    // Step 2: Update active subscriptions & check lead limit
    const activeSubscriptions = await SubscriptionVoucherUser.find({
      status: "active",
    });

    for (const sub of activeSubscriptions) {
      const provider = await Provider.findById(sub.userId);
      if (provider) {
        provider.subscriptionStatus = 1;
        provider.isGuestMode = false;
        provider.address.radius = (sub.kmRadius || 0) * 1000;
        await provider.save();
        console.log(`✅ Updated provider ${provider._id} with active subscription.`);

        // Check lead count and update if necessary
        await checkAndUpdateProviderSubscription(provider);
      }
    }
  } catch (error) {
    console.error("❌ Error updating subscriptions:", error);
  }
};

// ⏰ Run every 5 minutes
cron.schedule("*/5 * * * *", updateSubscriptions);

console.log("⏳ Subscription update cron job scheduled every 5 minutes.");
