const cron = require("node-cron");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const Provider = require("../models/providerModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");

// 🔁 Function to check and update provider subscription based on lead count
const checkAndUpdateProviderSubscription = async (provider) => {
  try {
    // Exit if no subscriptionPlanId
    if (!provider.subscriptionPlanId) return;

    const subscriptionPlan = await SubscriptionPlan.findById(provider.subscriptionPlanId);
    if (!subscriptionPlan) return;

    const leadLimit = subscriptionPlan.leadCount || 0;
    const completedLeads = provider.leadCompleteCount || 0;

    if (leadLimit > 0 && completedLeads >= leadLimit) {
      // Expire the provider's subscription due to reaching lead limit
      provider.subscriptionStatus = 0;
      provider.subscriptionPlan = null;
      provider.subscriptionPlanId = null;
      provider.address.radius = 10000;

      await provider.save();

      console.log(`🔴 Subscription expired due to lead limit for provider ${provider._id}`);
    } else {
      console.log(`🟢 Provider ${provider._id} is within lead limit. ${completedLeads}/${leadLimit}`);
    }
  } catch (err) {
    console.error("❌ Error in checkAndUpdateProviderSubscription:", err);
  }
};

// 🔄 Cron job logic to update subscriptions
const updateSubscriptions = async () => {
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
        provider.subscriptionPlan = null;
        provider.subscriptionPlanId = null;
        provider.address.radius = 10000;

        await provider.save();
        console.log(`🔴 Subscription expired (by date) for provider ${provider._id}`);
      }
    }

    // Step 2: Update active subscriptions and check lead usage
    const activeSubscriptions = await SubscriptionVoucherUser.find({ status: "active" });

    for (const sub of activeSubscriptions) {
      const provider = await Provider.findById(sub.userId);
      if (provider) {
        provider.subscriptionStatus = 1;
        provider.isGuestMode = false;
        provider.address.radius = (sub.kmRadius || 0) * 1000;
        await provider.save();

        // ✅ Check plan lead count
        await checkAndUpdateProviderSubscription(provider);
      }
    }

  } catch (error) {
    console.error("❌ Error updating subscriptions:", error);
  }
};

// ⏰ Run every 5 minutes
cron.schedule("*/5 * * * *", updateSubscriptions);
