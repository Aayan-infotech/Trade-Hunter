const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const Provider = require("../models/providerModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");

const updateSubscriptions = async () => {
  try {
    const subscriptionPlanId = provider.subscriptionPlanId;

    if (subscriptionPlanId) {
      // Convert subscriptionPlanId to ObjectId
      const objectId = new ObjectId(subscriptionPlanId);

      // Find the SubscriptionPlan using the ObjectId
      const subscriptionPlan = await SubscriptionPlan.findById(objectId);

      if (subscriptionPlan) {
        provider.subscriptionStatus = 1;  // Active
        await provider.save();
        console.log(`✅ Updated provider ${provider._id} with active subscription.`);
      } else {
        provider.subscriptionStatus = 0;  // Inactive
        await provider.save();
        // console.log(`✅ Updated Provider: ${provider._id} | Status: 1 | Radius: ${provider.address.radius}`);
      }
    }

    // console.log("✅ Subscription update job completed.");
  } catch (error) {
    console.error("❌ Error updating subscriptions:", error);
  }
}; 
cron.schedule("0 */6 * * *", updateSubscriptions);
// cron.schedule("0 12 * * *", updateSubscriptions); //24h 
// console.log("⏳ Subscription update cron job scheduled.");
