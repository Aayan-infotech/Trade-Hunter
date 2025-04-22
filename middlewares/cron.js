const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const Provider = require("../models/providerModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");

const checkAndUpdateProviderSubscription = async (provider) => {
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
        console.log(`❌ No SubscriptionPlan found for ID: ${subscriptionPlanId}`);
      }
    } else {
      provider.subscriptionStatus = 0;  // Inactive
      await provider.save();
      console.log(`⚠️ No subscriptionPlanId for provider ${provider._id}`);
    }
  } catch (err) {
    console.error("Error in checkAndUpdateProviderSubscription:", err);
  }
};

// Cron job function to update subscriptions for all providers
const updateSubscriptions = async () => {
  try {
    console.log(`🕒 Cron job triggered at: ${new Date().toISOString()}`);

    // Fetch all providers with active subscription status
    const providers = await Provider.find({ subscriptionStatus: 1 });

    // Iterate through all providers and check/update subscriptions
    for (const provider of providers) {
      await checkAndUpdateProviderSubscription(provider);
    }
  } catch (err) {
    console.error("Error in updateSubscriptions:", err);
  }
};

// Schedule the cron job to run every 5 minutes
const cronJob = require("node-cron");
cronJob.schedule("*/5 * * * *", async () => {
  await updateSubscriptions();
});

console.log("✅ Cron job scheduled every 5 minutes.");
