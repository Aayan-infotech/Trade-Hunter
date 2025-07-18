const getStripe = require('../services/stripeService');
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const Transaction = require("../models/TransactionModelNew");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const SubscriptionType = require("../models/SubscriptionTypeModel");
const Provider = require("../models/providerModel");
const generateInvoicePDF = require("../utils/generateInvoicePDF");
const sendEmail = require("../services/invoicesMail");

module.exports = async function runStripeRecurringBillingCron() {
  try {
    const stripe =await getStripe();
    console.log("Running Stripe recurring billing cron...");

    const subscriptions = await SubscriptionVoucherUser.find({
      autopayActive: true,
      status: "active",
      installmentCount: { $lt: 12 },
      stripeCustomerId: { $exists: true, $ne: null }
    });

    const today = new Date();

    for (const sub of subscriptions) {
      const lastCharged = sub.lastChargedDate || sub.startDate;
      const nextChargeDate = new Date(lastCharged);
      nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);

      if (today < nextChargeDate) continue;

      const provider = await Provider.findById(sub.userId);
      if (!provider) continue;

      const amount = sub.monthlyAmount;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: "AUD",
          customer: sub.stripeCustomerId,
          confirm: true,
          off_session: true,
          automatic_payment_methods: { enabled: true }
        });

        const transaction = await Transaction.create({
          userId: sub.userId,
          subscriptionPlanId: sub.subscriptionPlanId,
          amount,
          currency: "AUD",
          status: "completed",
          paymentMethod: "Stripe",
          transactionId: paymentIntent.id,
          invoiceNumber: `INV-${Date.now()}`
        });

        // Success handling
        sub.installmentCount += 1;
        sub.lastChargedDate = today;
        sub.retryCount = 0; // reset retry
        await sub.save();

        const subscriptionPlan = await SubscriptionPlan.findById(sub.subscriptionPlanId);
        const subscriptionType = await SubscriptionType.findById(subscriptionPlan?.subscriptionTypeId);

        const invoiceBuffer = await generateInvoicePDF({
          provider,
          subscriptionPlan,
          subscriptionType,
          transactionId: transaction.transactionId,
          invoiceDate: today,
          amountCharged: amount
        });

        await sendEmail(
          provider.email,
          `Invoice #${transaction.transactionId} - Trade Hunters`,
          `<p>Hi ${provider.name},</p><p>Thank you for your monthly payment of $${amount.toFixed(2)}.</p>`,
          [{ filename: `invoice_${transaction.transactionId}.pdf`, content: invoiceBuffer }]
        );

        console.log(`Charged ${provider.name} $${amount} (Installment #${sub.installmentCount})`);

        // Auto-disable autopay after 12 successful payments
        if (sub.installmentCount >= 12) {
          sub.autopayActive = false;
          provider.subscriptionStatus = 0;
          await provider.save();
          await sub.save();
        }

      } catch (err) {
        console.error(` Payment failed for ${provider.name}:`, err.message);

        // Retry logic
        sub.retryCount = (sub.retryCount || 0) + 1;
        sub.lastFailedAttempt = today;

        if (sub.retryCount >= 5) {
          sub.autopayActive = false;
          provider.subscriptionStatus = 0;
          await provider.save();
          console.log(`Auto-disabled autopay for ${provider.name} after 5 failed retries.`);
        }

        await sub.save();
      }
    }

    console.log("Stripe recurring billing cron completed.");
  } catch (err) {
    console.error("Cron failed:", err.message);
  }
};
