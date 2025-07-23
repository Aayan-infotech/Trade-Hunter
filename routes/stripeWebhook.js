const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const SubscriptionVoucherUser = require('../models/SubscriptionVoucherUserModel');
const Transaction = require('../models/TransactionModelNew');
const SubscriptionPlan = require('../models/SubscriptionPlanModel');
const SubscriptionType = require('../models/SubscriptionTypeModel');
const Provider = require('../models/providerModel');
const generateInvoicePDF = require('../utils/generateInvoicePDF');
const sendEmail = require('../services/invoicesMail');
const mongoose = require('mongoose');

router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.log('⚠️ Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;

      const subscriptionId = invoice.subscription;
      const amountPaid = invoice.amount_paid; 
      const currency = invoice.currency;
      const paymentIntentId = invoice.payment_intent;
      const invoiceNumber = invoice.number;
      const billingPeriodStart = new Date(invoice.period_start * 1000);
      const billingPeriodEnd = new Date(invoice.period_end * 1000);

      try {
        const sub = await SubscriptionVoucherUser.findOne({ subscriptionId });

        if (!sub) {
          console.log(`Subscription not found for Stripe subscription ID: ${subscriptionId}`);
          return res.status(404).send('Subscription not found');
        }

        const existingTx = await Transaction.findOne({ paymentId: paymentIntentId });
        if (existingTx) {
          return res.status(200).send('Already processed');
        }

        sub.recurringCount = (sub.recurringCount || 0) + 1;

        sub.endDate = billingPeriodEnd;
        await sub.save();

        const plan = await SubscriptionPlan.findById(sub.subscriptionPlanId);
        const subscriptionType = await SubscriptionType.findById(plan?.type);
        const provider = await Provider.findById(sub.userId);

        const tx = await Transaction.create({
          userId: sub.userId,
          subscriptionPlanId: sub.subscriptionPlanId,
          paymentId: paymentIntentId,
          amount: amountPaid,
          currency,
          status: 'completed',
          paymentGateway: 'Stripe',
          metadata: invoice,
          subscriptionVoucherUserId: sub._id,
          invoiceNumber,
        });

        const invoiceBuffer = await generateInvoicePDF({
          provider,
          subscriptionPlan: plan,
          subscriptionType,
          transactionId: paymentIntentId,
          invoiceDate: new Date(),
          amountCharged: amountPaid / 100,
        });

        await sendEmail(
          provider.email,
          `Your Invoice #${invoiceNumber} - Trade Hunters`,
          `<p>Hi ${provider.name || 'Customer'},</p><p>Thank you for your payment of <strong>$${(amountPaid / 100).toFixed(2)}</strong>.</p><p>Invoice #${invoiceNumber} attached.</p>`,
          [
            {
              filename: `invoice_${invoiceNumber}.pdf`,
              content: invoiceBuffer,
              contentType: 'application/pdf',
            },
          ]
        );

        if (sub.cancelAtPeriodEnd && sub.recurringCount >= 12) {
          await stripe.subscriptions.del(subscriptionId);
          sub.autopayActive = false;
          sub.status = 'expired';
          await sub.save();

          await Provider.findByIdAndUpdate(sub.userId, { subscriptionStatus: 0 });
          console.log(`Subscription ${sub._id} expired after 12 recurring payments.`);
        }

        res.status(200).send('Invoice processed');
      } catch (err) {
        console.error('Error handling invoice.paid webhook:', err);
        res.status(500).send('Internal Server Error');
      }

    } else {
      res.status(200).send('Event received');
    }
  }
);

module.exports = router;
