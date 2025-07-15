const moment = require("moment");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const Transaction = require("../models/TransactionModelNew");

exports.getCustomersDueToday = async () => {
  const today = moment().startOf('day').toDate();
  return SubscriptionVoucherUser.find({
    autopayActive: true,
    nextPaymentDate: { $lte: today },
    status: 'active',
    ewayCustomerToken: { $exists: true, $ne: null }
  }).populate("subscriptionPlanId userId");
};

exports.markPaid = async ({ userId, subscriptionPlanId, amount, rebillCustomerID, transactionId }) => {
  const today = new Date();
  const nextDate = new Date(today);
  nextDate.setMonth(nextDate.getMonth() + 1);

  await SubscriptionVoucherUser.findOneAndUpdate(
    { userId, subscriptionPlanId, autopayActive: true },
    { nextPaymentDate: nextDate },
    { new: true }
  );

  // Create transaction log
  await new Transaction({
    userId,
    subscriptionPlanId,
    status: "completed",
    amount: amount / 100,
    transaction: {
      transactionPrice: amount / 100,
      transactionStatus: "Success",
      transactionType: "Recurring",
      transactionId,
      transactionDate: today
    },
    payer: {
      payerId: rebillCustomerID
    },
    payment: {
      paymentSource: "eway-soap",
      totalAmount: amount / 100,
      countryCode: "AUD"
    }
  }).save();
};

exports.logFailure = async ({ userId, subscriptionPlanId, amount, rebillCustomerID, reason }) => {
  await new Transaction({
    userId,
    subscriptionPlanId,
    status: "failed",
    amount: amount / 100,
    transaction: {
      transactionPrice: amount / 100,
      transactionStatus: "Failed",
      transactionType: "Recurring",
      transactionDate: new Date()
    },
    payer: {
      payerId: rebillCustomerID
    },
    payment: {
      paymentSource: "eway-soap",
      totalAmount: amount / 100,
      countryCode: "AUD"
    }
  }).save();
};
