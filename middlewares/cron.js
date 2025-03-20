const cron = require("node-cron");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const Provider = require("../models/providerModel");

const updateSubscriptions = async () => {
  try {
    const now = new Date();

    // Step 1: Active subscriptions ko update karein
    const activeSubscriptions = await SubscriptionVoucherUser.find({ status: "active" });

    for (const sub of activeSubscriptions) {
      const provider = await Provider.findById(sub.userId);
      if (provider) {
        provider.subscriptionStatus = 1;
        provider.address.radius = (sub.kmRadius || 0) * 1000; // Convert km to meters
        await provider.save();
      }
    }

    // Step 2: Expired subscriptions ko update karein
    const expiredSubscriptions = await SubscriptionVoucherUser.find({ endDate: { $lt: now } });

    for (const sub of expiredSubscriptions) {
      sub.status = "expired";
      await sub.save();

      const provider = await Provider.findById(sub.userId);
      if (provider) {
        provider.subscriptionStatus = 0;
        provider.address.radius = 10000; // Default radius when expired
        await provider.save();
      }
    }

    console.log("✅ Subscription update job completed.");
  } catch (error) {
    console.error("❌ Error updating subscriptions:", error);
  }
};

// Har 6 ghante par chalega (0 */6 * * *)
cron.schedule("0 */6 * * *", updateSubscriptions);
// cron.schedule("*/5 * * * *", updateSubscriptions);

console.log("⏳ Subscription update cron job scheduled.");
