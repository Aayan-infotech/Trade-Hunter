const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const Provider = require("../models/providerModel");
const getStripe = require("../services/stripeService");

async function checkAndExpireYearlySubscriptions() {
  try {
    const stripe = await getStripe();

    const yearlySubs = await SubscriptionVoucherUser.find({
      cancelAtPeriodEnd: true,
      autopayActive: true,
      status: "active"
    }).populate('subscriptionPlanId');

    for (const sub of yearlySubs) {
      if (!sub.subscriptionId) continue;
      const plan = sub.subscriptionPlanId;

      if (!plan || plan.validity !== 365) continue;

      try {
        const invoices = await stripe.invoices.list({
          subscription: sub.subscriptionId,
          limit: 100
        });

        const paidCount = invoices.data.filter(inv => inv.paid).length;

        if (sub.recurringCount < paidCount) {
          sub.recurringCount = paidCount;
          await sub.save();
        }

        if (paidCount >= 12) {
          await stripe.subscriptions.del(sub.subscriptionId);

          sub.autopayActive = false;
          sub.status = "expired";
          await sub.save();

          await Provider.findByIdAndUpdate(sub.userId, {
            subscriptionStatus: 0
          });

          console.log(`Subscription ${sub._id}: yearly subscription ended after 12 payments.`);
        }
      } catch (err) {
        console.error(`Failed to process subscription ${sub._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Error during yearly subscriptions polling:", err.message);
  }
}

module.exports = checkAndExpireYearlySubscriptions;
