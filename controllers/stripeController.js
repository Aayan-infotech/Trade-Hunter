const fs = require("fs");
const path = require("path");
const sendEmail = require("../services/invoicesMail");
const Transaction = require("../models/TransactionModelNew");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const SubscriptionType = require("../models/SubscriptionTypeModel");
const Provider = require("../models/providerModel");
const generateInvoicePDF = require("../utils/generateInvoicePDF");
const getStripe = require('../services/stripeService');
const mongoose = require("mongoose");
let stripe;

(async () => {
  try {
    stripe = await getStripe(); 
  } catch (err) {
    console.error("Stripe not ready:", err.message);
  }
})();
const startOfDay = (d) => { d.setHours(0, 0, 0, 0); return d; };
const monthsBetween = (start, end) => {
  const s = new Date(start), e = new Date(end);
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
};

exports.initiatePayment = async (req, res) => {
  try {
    const { Customer, Payment, userId, subscriptionPlanId } = req.body;

    const plan = await SubscriptionPlan.findById(subscriptionPlanId);
    if (!plan) return res.status(404).json({ message: "Subscription Plan not found" });

    const type = await SubscriptionType.findById(plan.type);
    const provider = await Provider.findById(userId);
    if (!type || !provider) return res.status(404).json({ message: "Invalid provider or subscription type" });

    const isRecurring = plan.validity === 365;

    // Validate total amount
    const totalAmountCents = Number(Payment.TotalAmount);
    if (isNaN(totalAmountCents) || totalAmountCents <= 0) {
      return res.status(400).json({ message: "Invalid or missing payment amount" });
    }

    if (!Customer || !Customer.Email) {
      return res.status(400).json({ message: "Missing customer details" });
    }

    const productName = plan.title || "Subscription Plan";

    if (isRecurring) {
      let stripeRecurringPriceId = plan.stripePriceId;

      // Create a product and price if not already created
      if (!stripeRecurringPriceId) {
        const product = await stripe.products.create({
          name: productName,
        });

        const price = await stripe.prices.create({
          unit_amount: totalAmountCents, // already in cents from frontend
          currency: Payment.CurrencyCode?.toLowerCase() || "aud",
          recurring: { interval: 'month' },
          product: product.id,
        });

        stripeRecurringPriceId = price.id;

        // Save it back to the plan so it can be reused later
        plan.stripePriceId = stripeRecurringPriceId;
        await plan.save();
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: Customer.Email,
        line_items: [
          {
            price: stripeRecurringPriceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          subscriptionPlanId,
          subscriptionType: type.type,
          autopayActive: true,
        },
        success_url: 'https://tradehunters.com.au/provider/payment/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://tradehunters.com.au/provider/payment/error',
      });

      return res.status(200).json({
        message: "Redirect to Stripe subscription checkout",
        url: session.url,
      });
    } else {
      // One-time payment logic
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: Customer.Email,
        line_items: [
          {
            price_data: {
              currency: Payment.CurrencyCode?.toLowerCase() || "aud",
              product_data: {
                name: productName,
              },
              unit_amount: totalAmountCents, // already in cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          subscriptionPlanId,
          subscriptionType: type.type,
          autopayActive: false,
        },
        success_url: 'https://tradehunters.com.au/provider/payment/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://tradehunters.com.au/provider/payment/error',
      });

      return res.status(200).json({
        message: "Redirect to Stripe one-time payment checkout",
        url: session.url,
      });
    }
  } catch (err) {
    console.error("Stripe Payment Error:", err);
    return res.status(500).json({
      message: "Stripe Payment Error",
      error: err.message,
    });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const { search } = req.query;
    let filter = {};

    if (search && search.trim()) {
      const matchingProviders = await Provider.find({
        businessName: { $regex: new RegExp(search.trim(), "i") }
      }).select("_id");
      const providerIds = matchingProviders.map(p => p._id);
      filter.userId = { $in: providerIds };
    }

    const totalCount = await Transaction.countDocuments(filter);

    const transactions = await Transaction.find(filter)
      .sort({ "transaction.transactionDate": -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "contactName email businessName")
      .populate("subscriptionPlanId", "planName kmRadius");

    return res.status(200).json({
      count: transactions.length,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      message: "Failed to fetch transactions",
      error: error.message,
    });
  }
};


exports.getTotalSubscriptionRevenue = async (req, res) => {
  try {
    const { month, financialYear } = req.query;
    let conditions = [];

    if (financialYear) {
      const [startYear, endYear] = financialYear.split("-").map(Number);
      const fyStart = new Date(`${startYear}-07-01T00:00:00.000Z`);
      const fyEnd = new Date(`${endYear}-06-30T23:59:59.999Z`);
      conditions.push({ createdAt: { $gte: fyStart, $lte: fyEnd } });
    }

    if (month) {
      let monthNum = Number(month);
      if (isNaN(monthNum)) {
        const monthMapping = {
          january: 1,
          february: 2,
          march: 3,
          april: 4,
          may: 5,
          june: 6,
          july: 7,
          august: 8,
          september: 9,
          october: 10,
          november: 11,
          december: 12,
        };
        monthNum = monthMapping[month.toLowerCase()];
      }
      conditions.push({ $expr: { $eq: [{ $month: "$createdAt" }, monthNum] } });
    }

    const matchConditions = conditions.length > 0 ? { $and: conditions } : {};

    const totalRevenue = await Transaction.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Total subscription revenue fetched",
      data: {
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0,
      },
    });
  } catch (error) {
    console.error("Error in getTotalSubscriptionRevenue:", error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Failed to fetch subscription revenue",
      data: null,
    });
  }
};

exports.getSubscriptionByUserId = async (req, res) => {
  try {
    const { userId } = req.user;

    const transactions = await Transaction.find({ userId })
      .populate("subscriptionPlanId", "planName kmRadius validity")
      .lean();

    const subscriptions = await SubscriptionVoucherUser.find({ userId })
      .select("subscriptionPlanId startDate endDate status")
      .lean();

    const txByPlan = {};
    for (const t of transactions) {
      const planId =
        t.subscriptionPlanId && t.subscriptionPlanId._id
          ? t.subscriptionPlanId._id.toString()
          : "none";

      txByPlan[planId] = txByPlan[planId] || [];
      txByPlan[planId].push(t);
    }

    const vchByPlan = {};
    for (const v of subscriptions) {
      const planId = v.subscriptionPlanId
        ? v.subscriptionPlanId.toString()
        : "none";

      vchByPlan[planId] = vchByPlan[planId] || [];
      vchByPlan[planId].push(v);
    }

    for (const planId of Object.keys(txByPlan)) {
      txByPlan[planId].sort(
        (a, b) =>
          new Date(a.transaction?.transactionDate || 0) -
          new Date(b.transaction?.transactionDate || 0)
      );
      vchByPlan[planId]?.sort(
        (a, b) => new Date(a.startDate) - new Date(b.startDate)
      );
    }

    const combined = [];
    for (const planId of Object.keys(txByPlan)) {
      const txns = txByPlan[planId];
      const vchs = vchByPlan[planId] || [];

      for (let i = 0; i < txns.length; i++) {
        const txn = txns[i];
        const v = vchs[i] || vchs[vchs.length - 1] || null;

        combined.push({
          ...txn,
          subscriptionStartDate: v?.startDate ?? null,
          subscriptionEndDate: v?.endDate ?? null,
          subscriptionStatus: v?.status ?? null,
        });
      }
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Data fetched successfully",
      data: combined,
    });
  } catch (err) {
    console.error("Error in getSubscriptionByUserId:", err);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};




exports.getStripeSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Missing sessionId" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    const metadata = session.metadata || {};
    const userId = metadata.userId;
    const subscriptionPlanId = metadata.subscriptionPlanId;
    const subscriptionType = metadata.subscriptionType || "Subscription";
    const autopayActive = metadata.autopayActive === "true";

    const plan = await SubscriptionPlan.findById(subscriptionPlanId);
    const provider = await Provider.findById(userId);
    if (!plan || !provider) {
      return res.status(404).json({ success: false, message: "Plan or provider not found" });
    }

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

   
    const existingActive = await SubscriptionVoucherUser.findOne({
      userId,
      status: "active"
    }).sort({ startDate: -1 });

    let newStartDate, newStatus;
    if (existingActive && existingActive.type !== "Subscription") {
      existingActive.status = "expired";
      existingActive.endDate = todayMidnight;
      existingActive.autopayActive = false;      
      await existingActive.save();
      newStartDate = todayMidnight;
      newStatus = "active";
    } else {
      const latestSub = await SubscriptionVoucherUser.findOne({
        userId,
        status: { $in: ["active", "upcoming"] }
      }).sort({ endDate: -1 });

      if (latestSub) {
        newStartDate = new Date(latestSub.endDate);
        newStartDate.setHours(0, 0, 0, 0);
        newStatus = "upcoming";
      } else {
        newStartDate = todayMidnight;
        newStatus = "active";
      }
    }

    const isRecurring = plan.validity === 365;
    let endDate;
    let recurringCount = 0;
    let maxRecurringCount = 1;

    if (isRecurring) {
      endDate = new Date(newStartDate);
      endDate.setMonth(endDate.getMonth() + 1);
      recurringCount = 1;
      maxRecurringCount = 12;
    } else {
      endDate = new Date(newStartDate);
      endDate.setDate(endDate.getDate() + (plan.validity || 30));
    }

    const txId = session.payment_intent || session.id;
    const amountPaid = session.amount_total;
    const currency = session.currency;

    // Stripe Subscription ID logic
    let stripeSubscriptionId = session.subscription || null;

    if (isRecurring && !stripeSubscriptionId && session.customer) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: session.customer,
          status: "all",
          limit: 1,
        });
        if (subscriptions.data.length > 0) {
          stripeSubscriptionId = subscriptions.data[0].id;
        }
      } catch (err) {
        console.error("Failed to fetch Stripe subscription from customer:", err.message);
      }
    }

    const newSub = await SubscriptionVoucherUser.create({
      userId,
      subscriptionPlanId,
      type: subscriptionType,
      transactionId: txId,
      amountPaid,
      currency,
      startDate: newStartDate,
      endDate,
      status: newStatus,
      autopayActive,
      recurringCount,
      maxRecurringCount,
      stripeSubscriptionId,
      paymentMethod: "stripe"
    });

    const tx = await Transaction.create({
      userId,
      subscriptionPlanId,
      paymentId: txId,
      amount: amountPaid,
      currency,
      status: "completed",
      paymentGateway: "Stripe",
      metadata: session,
      subscriptionVoucherUserId: newSub._id
    });

    await Provider.findByIdAndUpdate(userId, {
      subscriptionStatus: 1,
      currentSubscription: newSub._id,
      isGuestMode: false,
      subscriptionPlanId: subscriptionPlanId
    });

    const amountCharged = amountPaid / 100;
    const shortTxId = txId.slice(-6);

    const invoiceBuffer = await generateInvoicePDF({
      provider,
      subscriptionPlan: plan,
      subscriptionType,
      transactionId: txId,
      invoiceDate: new Date(),
      amountCharged
    });

    let emailSent = false;
    try {
      await sendEmail(
        provider.email,
        `Your Invoice #${shortTxId} - Trade Hunters`,
        `<p>Hi ${provider.name || "Customer"},</p><p>Thank you for your payment of <strong>$${amountCharged.toFixed(2)}</strong>.</p><p>Invoice #${shortTxId} attached.</p>`,
        [
          {
            filename: `invoice_${shortTxId}.pdf`,
            content: invoiceBuffer,
            contentType: "application/pdf"
          }
        ]
      );
      emailSent = true;
    } catch (err) {
      console.error("Email sending failed:", err);
    }

    return res.status(200).json({
      success: true,
      message: "Subscription recorded successfully",
      subscription: newSub,
      emailSent
    });

  } catch (err) {
    console.error("getStripeSessionDetails error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message
    });
  }
};


exports.cancelStripeSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId in request params"
      });
    }

    const activeSub = await SubscriptionVoucherUser.findOne({
      userId: new mongoose.Types.ObjectId(userId), 
      status: "active"
    }).sort({ startDate: -1 });

    if (!activeSub) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found to cancel"
      });
    }

    activeSub.autopayActive = false;
    await activeSub.save();

    await Provider.findByIdAndUpdate(userId, {
      subscriptionStatus: 0
    });

    return res.status(200).json({
      success: true,
      message: "Autopay disabled. Subscription will expire at end of current period.",
      subscription: activeSub
    });

  } catch (err) {
    console.error("Error cancelling subscription:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while cancelling subscription",
      error: err.message
    });
  }
};
