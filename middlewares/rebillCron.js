const cron = require("node-cron");
const {
  getCustomersDueToday,
  markPaid,
  logFailure,
} = require("../utils/rebillUtils");
const soapService = require("../services/ewaySoapService");

const runRebillPayments = async () => {
  try {
    console.log(`[${new Date().toISOString()}] 🕒 Running Rebill Cron Job...`);

    const customers = await getCustomersDueToday();

    if (!customers.length) {
      console.log("✅ No customers due for rebill today.");
      return;
    }

    for (const customer of customers) {
      const userId = customer.userId._id;
      const subscriptionPlanId = customer.subscriptionPlanId._id;
      const rebillCustomerID = customer.ewayCustomerToken;
      const amount = Math.round(customer.subscriptionPlanId.amount / 12);

      try {
        const result = await soapService.triggerInitialRebillPayment({
          rebillCustomerID,
          amount,
        });

        if (result.success) {
          await markPaid({
            userId,
            subscriptionPlanId,
            amount,
            rebillCustomerID,
            transactionId: result.transactionId,
          });
          console.log(`✅ Rebill successful for customer ${rebillCustomerID}`);
        } else {
          await logFailure({
            userId,
            subscriptionPlanId,
            amount,
            rebillCustomerID,
            reason: result.error,
          });
          console.warn(`⚠️ Rebill failed for customer ${rebillCustomerID}: ${result.error}`);
        }
      } catch (err) {
        console.error(`❌ Error processing rebill for ${rebillCustomerID}:`, err);
        await logFailure({
          userId,
          subscriptionPlanId,
          amount,
          rebillCustomerID,
          reason: err.message || "Unknown error",
        });
      }
    }
  } catch (err) {
    console.error("❌ Rebill Cron Job Error:", err);
  }
};

// Schedule: runs at 4 AM daily (you can adjust this)
cron.schedule("0 4 * * *", () => {
  runRebillPayments();
});

module.exports = runRebillPayments;