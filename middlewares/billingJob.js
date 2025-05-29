// billingJob.js

const cron = require('node-cron');
const mongoose = require('mongoose');
const ewayService = require('../services/ewayService'); // Assuming you have an ewayService to handle payments
const Recurrence = require('../models/RecurrenceModel');
const Transaction = require('../models/TransactionModelNew');
const SubscriptionVoucherUser = require('../models/SubscriptionVoucherUserModel');
const Provider = require('../models/providerModel');

/**
 * Helper: increment a date by 1 month at midnight
 */
function nextMonthMidnight(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function processDueRecurrences() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all active recurrences due today or earlier
  const recs = await Recurrence.find({
    status: 'active',
    nextDate: { $lte: today }
  });

  for (const r of recs) {
    try {
      console.log(`Processing recurrence ${r._id} for user ${r.userId}`);

      // 1) Charge via eWAY token
      const resp = await ewayService.chargeTokenCustomer(
        r.tokenCustomerID,
        r.amountCents,
        r.currencyCode
      );

      if (!resp.TransactionStatus) {
        throw new Error(`eWAY returned failure: ${JSON.stringify(resp)}`);
      }

      // 2) Record Transaction
      const amount = r.amountCents / 100;
      const txn = new Transaction({
        userId: r.userId,
        subscriptionPlanId: r.planId,
        status: 'completed',
        amount,
        currency: r.currencyCode,
        transaction: {
          transactionPrice: amount,
          transactionStatus: 'Success',
          transactionType: 'Recurring',
          authorisationCode: resp.AuthorisationCode,
          transactionDate: new Date(),
          transactionId: resp.TransactionID
        },
        payment: {
          paymentSource: 'eway',
          totalAmount: amount,
          countryCode: r.currencyCode
        },
        payer: {
          payerId: r.tokenCustomerID,
          payerName: '',      // not stored here
          payerEmail: ''      // not stored here
        }
      });
      await txn.save();

      // 3) Extend the user's subscription voucher by 30 days
      const voucher = await SubscriptionVoucherUser.findOne({
        userId: r.userId,
        status: 'active'
      }).sort({ endDate: -1 });

      if (voucher) {
        voucher.endDate = new Date(voucher.endDate.getTime() + 30*24*60*60*1000);
        await voucher.save();
      }

      // 4) Decrement cycles & reschedule or complete
      r.remainingCycles -= 1;
      if (r.remainingCycles > 0) {
        r.nextDate = nextMonthMidnight(r.nextDate);
      } else {
        r.status = 'completed';
      }
      await r.save();

      console.log(`Recurrence ${r._id} processed successfully.`);
    } catch (err) {
      console.error(`Error processing recurrence ${r._id}:`, err);
      // Optionally: mark as cancelled or notify user
      // r.status = 'cancelled';
      // await r.save();
    }
  }
}

// Schedule to run at 00:05 every day
cron.schedule('5 0 * * *', () => {
  console.log('Running billingJob at', new Date().toISOString());
  processDueRecurrences().catch(console.error);
});

console.log('Billing job scheduled.');
