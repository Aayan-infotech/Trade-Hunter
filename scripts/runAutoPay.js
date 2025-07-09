// scripts/runAutopay.js

const mongoose = require("mongoose");
const ewayService = require("../services/ewayService");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const Provider = require("../models/providerModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const SubscriptionType = require("../models/SubscriptionTypeModel");
const Transaction = require("../models/TransactionModelNew");
const sendEmail = require("../services/invoicesMail");
const generateInvoicePDF = require("../utils/generateInvoicePdF"); // reusable PDF function


const runAutopay = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueSubs = await SubscriptionVoucherUser.find({
    autopayActive: true,
    nextPaymentDate: today,
  });

  console.log(`Found ${dueSubs.length} subscriptions due for autopay`);

  for (const sub of dueSubs) {
    try {
      const provider = await Provider.findById(sub.userId);
      const plan = await SubscriptionPlan.findById(sub.subscriptionPlanId);
      const type = await SubscriptionType.findById(plan.type);

      if (!provider || !plan || !type || !sub.ewayCustomerToken) continue;

      // Prepare payment
      const amount = plan.amount * 100; // eWAY accepts cents
      const paymentData = {
        Customer: {
          TokenCustomerID: sub.ewayCustomerToken,
        },
        Payment: {
          TotalAmount: amount,
          CurrencyCode: "AUD",
        },
        TransactionType: "Recurring",
        Capture: true,
      };

      const ewayResponse = await ewayService.createTransaction(paymentData);

      if (!ewayResponse.TransactionStatus) {
        console.error(`Payment failed for user ${sub.userId}`);
        continue;
      }

      const amountCharged = amount / 100;
      const subTotal = +(amountCharged / 1.1).toFixed(2);
      const gst = +(amountCharged - subTotal).toFixed(2);

      // Save Transaction
      const tx = await Transaction.create({
        userId: sub.userId,
        subscriptionPlanId: sub.subscriptionPlanId,
        status: "completed",
        amount: amountCharged,
        currency: "AUD",
        transaction: {
          transactionPrice: amountCharged,
          transactionStatus: "Success",
          transactionType: "Recurring",
          authorisationCode: ewayResponse.AuthorisationCode,
          transactionDate: new Date(),
          transactionId: ewayResponse.TransactionID,
        },
        payment: {
          paymentSource: "eway",
          totalAmount: amountCharged,
          countryCode: "AUD",
        },
        payer: {
          payerId: ewayResponse.Customer.TokenCustomerID,
          payerName: provider.businessName,
          payerEmail: provider.email,
        },
      });

      // Extend subscription
      const newStartDate = new Date(sub.endDate);
      newStartDate.setHours(0, 0, 0, 0);
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newEndDate.getDate() + plan.validity);

      sub.startDate = newStartDate;
      sub.endDate = newEndDate;
      sub.nextPaymentDate = newEndDate;
      await sub.save();

      // Generate and email invoice
      const invoiceBuffer = await generateInvoicePDF({
        provider,
        subscriptionPlan: plan,
        subscriptionType: type,
        txId: ewayResponse.TransactionID,
        amountCharged,
        subTotal,
        gst,
      });

      await sendEmail(
        provider.email,
        `Trade Hunters: Recurring Invoice #${ewayResponse.TransactionID}`,
        `<p>Your subscription has been renewed successfully. Invoice attached.</p>`,
        [{
          filename: `invoice_${ewayResponse.TransactionID}.pdf`,
          content: invoiceBuffer,
          contentType: "application/pdf",
        }]
      );

      console.log(`Autopay success for user: ${sub.userId}`);

    } catch (err) {
      console.error("Autopay error:", err.message);
    }
  }

  mongoose.connection.close();
};

runAutopay();