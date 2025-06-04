
require("dotenv").config();
const mongoose = require("mongoose");
const ewayService = require("../services/ewayService");
const Transaction = require("../models/TransactionModelNew");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const Provider = require("../models/providerModel");

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected for recurring-charge script"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

(async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueSubscriptions = await SubscriptionVoucherUser.find({
      status: "active",
      nextChargeDate: { $lte: today },
    }).lean();

    console.log(`Found ${dueSubscriptions.length} subscription(s) due for billing.`);

    for (const sub of dueSubscriptions) {
      const subscriptionPlan = await SubscriptionPlan.findById(sub.subscriptionPlanId).lean();
      if (!subscriptionPlan) {
        console.warn(`Skipping subscription ${sub._id}: Plan not found`);
        continue;
      }

      const totalCents = Math.round(subscriptionPlan.amount * 100);
      const chargePayload = {
        Customer: {
          TokenCustomerID: sub.tokenCustomerId,
        },
        Payment: {
          TotalAmount: totalCents,
          CurrencyCode: subscriptionPlan.currency || "AUD",
        },
        TransactionType: "Recurring",
        Capture: true,
      };

      let ewayResult;
      try {
        ewayResult = await ewayService.createTransaction(chargePayload);
      } catch (err) {
        console.error(`Charge failed for subscription ${sub._id}:`, err);
        continue;
      }

      if (!ewayResult.TransactionID) {
        console.error(
          `eWAY returned no TransactionID for subscription ${sub._id}`,
          ewayResult
        );
        continue;
      }

      const amountCharged = subscriptionPlan.amount; 
      const tx = new Transaction({
        userId: sub.userId,
        subscriptionPlanId: sub.subscriptionPlanId,
        status: ewayResult.TransactionStatus ? "completed" : "failed",
        amount: amountCharged,
        currency: subscriptionPlan.currency || "AUD",
        transaction: {
          transactionPrice: amountCharged,
          transactionStatus: ewayResult.TransactionStatus ? "Success" : "Failed",
          transactionType: ewayResult.TransactionType,
          authorisationCode: ewayResult.AuthorisationCode,
          transactionDate: new Date(),
          transactionId: ewayResult.TransactionID,
        },
        payment: {
          paymentSource: "eway",
          totalAmount: amountCharged,
          countryCode: subscriptionPlan.currency || "AUD",
        },
        payer: {
          payerId: sub.tokenCustomerId,
          payerName: "",     
          payerEmail: "",    
        },
      });
      await tx.save();
      console.log(`Saved recurring charge Transaction (${ewayResult.TransactionID})`);

      const nextDate = new Date(sub.nextChargeDate);
      nextDate.setDate(nextDate.getDate() + subscriptionPlan.validity);
      if (nextDate > sub.endDate) {
        await SubscriptionVoucherUser.findByIdAndUpdate(sub._id, {
          status: "expired",
          nextChargeDate: null,
        });
        console.log(`Subscription ${sub._id} expired (endDate reached)`);
      } else {
        await SubscriptionVoucherUser.findByIdAndUpdate(sub._id, {
          nextChargeDate: nextDate,
        });
        console.log(
          `Subscription ${sub._id} nextChargeDate set to ${nextDate.toDateString()}`
        );
      }

      if (nextDate > sub.endDate) {
        await Provider.findByIdAndUpdate(sub.userId, {
          subscriptionStatus: 0,
          isGuestMode: true,
          subscriptionType: null,
          subscriptionPlanId: null,
        });
      }
    }

    console.log("Recurring charge script completed.");
    process.exit(0);
  } catch (err) {
    console.error("Recurring-charge script error:", err);
    process.exit(1);
  }
})();
