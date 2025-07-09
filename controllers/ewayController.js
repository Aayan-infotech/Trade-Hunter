const fs = require("fs");
const path = require("path");
const sendEmail = require("../services/invoicesMail");
const ewayService = require("../services/ewayService");
const Transaction = require("../models/TransactionModelNew");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const SubscriptionType = require("../models/SubscriptionTypeModel");
const Provider = require("../models/providerModel");
const generateInvoicePDF = require("../utils/generateInvoicePDF");

const startOfDay = (d) => { d.setHours(0, 0, 0, 0); return d; };
const monthsBetween = (start, end) => {
  const s = new Date(start), e = new Date(end);
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
};


exports.initiatePayment = async (req, res) => {
  try {
    const requiredCustomerFields = ["FirstName", "LastName", "Email", "CardDetails"];
    const requiredCardFields = ["Name", "Number", "ExpiryMonth", "ExpiryYear", "CVN"];
    const requiredPaymentFields = ["TotalAmount", "CurrencyCode"];
    const { Customer, Payment, userId, subscriptionPlanId } = req.body;

    // Validate presence
    if (!Customer || !Payment) {
      return res.status(400).json({ message: "Missing Customer or Payment object" });
    }
    const missingCustomer = requiredCustomerFields.filter(f => !Customer[f]);
    const missingCard = requiredCardFields.filter(f => !Customer.CardDetails?.[f]);
    const missingPayment = requiredPaymentFields.filter(f => !Payment[f]);
    if (missingCustomer.length || missingCard.length || missingPayment.length) {
      return res.status(400).json({
        message: "Missing required fields",
        missingFields: { Customer: missingCustomer, CardDetails: missingCard, Payment: missingPayment }
      });
    }

    // Fetch data
    const provider = await Provider.findById(userId).lean();
    const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId).lean();
    const subscriptionType = subscriptionPlan
      ? await SubscriptionType.findById(subscriptionPlan.type).lean()
      : null;
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    if (!subscriptionPlan) return res.status(404).json({ message: "Subscription Plan not found" });
    if (!subscriptionType) return res.status(404).json({ message: "Subscription Type not found" });

    // Perform initial eWAY payment
    const paymentData = {
      Customer: {
        FirstName: Customer.FirstName,
        LastName: Customer.LastName,
        Email: Customer.Email,
        CardDetails: {
          Name: Customer.CardDetails.Name,
          Number: Customer.CardDetails.Number.replace(/\s/g, ""),
          ExpiryMonth: Customer.CardDetails.ExpiryMonth.padStart(2, "0"),
          ExpiryYear: Customer.CardDetails.ExpiryYear.length === 2
            ? `20${Customer.CardDetails.ExpiryYear}`
            : Customer.CardDetails.ExpiryYear,
          CVN: Customer.CardDetails.CVN
        }
      },
      Payment: {
        TotalAmount: Payment.TotalAmount,
        CurrencyCode: Payment.CurrencyCode
      },
      TransactionType: "MOTO",
      Capture: true,
      CreateTokenCustomer: subscriptionPlan.validity === 365, // <-- ADD THIS LINE
    };
    const ewayResponse = await ewayService.createTransaction(paymentData);
    const txId = ewayResponse.TransactionID;
    if (!txId || typeof txId !== "string" && typeof txId !== "number") {
      return res.status(400).json({
        message: "Invalid or missing TransactionID from eWAY response.",
        details: ewayResponse,
      });
    }

    const tokenCustomerId = ewayResponse.Customer?.TokenCustomerID;

    // Calculate amounts
    const amountCharged = (Payment.TotalAmount || 0) / 100;
    const subTotal = +(amountCharged / 1.1).toFixed(2);
    const gst = +(amountCharged - subTotal).toFixed(2);

    // Save transaction record
    const txn = new Transaction({
      userId,
      subscriptionPlanId,
      status: ewayResponse.TransactionStatus ? "completed" : "failed",
      amount: amountCharged,
      currency: Payment.CurrencyCode,
      transaction: {
        transactionPrice: amountCharged,
        transactionStatus: ewayResponse.TransactionStatus ? "Success" : "Failed",
        transactionType: ewayResponse.TransactionType,
        authorisationCode: ewayResponse.AuthorisationCode,
        transactionDate: new Date(),
        transactionId: txId
      },
      payment: { paymentSource: "eway", totalAmount: amountCharged, countryCode: Payment.CurrencyCode },
      payer: {
        payerId: tokenCustomerId || "",
        payerName: Customer.CardDetails.Name,
        payerEmail: Customer.Email
      }
    });
    await txn.save();

    // Determine subscription dates
    const setToMidnight = d => { d.setHours(0, 0, 0, 0); return d; };
    const todayMidnight = setToMidnight(new Date());
    const existingActive = await SubscriptionVoucherUser.findOne({ userId, status: "active" }).sort({ startDate: -1 });
    let newStartDate, newStatus;
    if (existingActive && existingActive.type !== "Subscription") {
      existingActive.status = "expired";
      existingActive.endDate = todayMidnight;
      await existingActive.save();
      newStartDate = todayMidnight;
      newStatus = "active";
    } else {
      const latestSub = await SubscriptionVoucherUser.findOne({ userId, status: { $in: ["active", "upcoming"] } }).sort({ endDate: -1 });
      if (latestSub) {
        newStartDate = setToMidnight(new Date(latestSub.endDate));
        newStatus = "upcoming";
      } else {
        newStartDate = todayMidnight;
        newStatus = "active";
      }
    }
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + subscriptionPlan.validity);

    if (!tokenCustomerId && subscriptionPlan.validity === 365) {
      return res.status(400).json({
        message: "Recurring TokenCustomerID missing from eWAY for yearly plan.",
        details: ewayResponse
      });
    }

    // Create subscription voucher entry
    const newSubscription = new SubscriptionVoucherUser({
      userId,
      type: subscriptionType.type,
      subscriptionPlanId,
      startDate: newStartDate,
      endDate: newEndDate,
      status: newStatus,
      kmRadius: subscriptionPlan.kmRadius,
      autopayActive: subscriptionPlan.validity === 365,
      ewayCustomerToken: subscriptionPlan.validity === 365 ? tokenCustomerId : undefined,
      nextPaymentDate: subscriptionPlan.validity === 365 ? newEndDate : undefined
    });
    await newSubscription.save();

    if (newStatus === "active") {
      await Provider.findByIdAndUpdate(userId, {
        subscriptionStatus: 1,
        isGuestMode: false,
        subscriptionType: subscriptionType.type,
        subscriptionPlanId,
        "address.radius": subscriptionPlan.kmRadius * 1000
      });
    }

    // Generate PDF & send email
    const invoiceBuffer = await generateInvoicePDF({
      provider,
      subscriptionPlan,
      subscriptionType,
      transactionId: txId,
      invoiceDate: new Date(),
      amountCharged
    });
    let emailSent = false;
    try {
      await sendEmail(
        Customer.Email,
        `Your Invoice #${txId} - Trade Hunters`,
        `<p>Hi ${Customer.FirstName},</p><p>Thank you for your payment of <strong>$${amountCharged.toFixed(2)}</strong>.</p><p>Invoice #${txId} attached.</p>`,
        [{ filename: `invoice_${txId}.pdf`, content: invoiceBuffer, contentType: "application/pdf" }]
      );
      emailSent = true;
    } catch (err) {
      console.error("Email sending failed:", err);
    }

    return res.status(200).json({
      message: "Payment processed successfully",
      userId,
      subscriptionPlanId,
      subscriptionType: subscriptionType.type,
      transactionId: txId,
      status: ewayResponse.TransactionStatus,
      amountCharged: `$${amountCharged.toFixed(2)}`,
      subTotal: `$${subTotal.toFixed(2)}`,
      gst: `$${gst.toFixed(2)}`,
      autopayActive: newSubscription.autopayActive,
      pdfGenerated: !!invoiceBuffer,
      emailSent,
      gatewayResponse: ewayResponse
    });
  } catch (error) {
    console.error("Payment Processing Error:", error);
    const details = error.response?.data;
    return res.status(500).json({
      message: "Payment initiation failed",
      error: error.message,
      details,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
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

exports.cancelSubscription = async (req, res) => {
  try {
    const sub = await SubscriptionVoucherUser.findById(req.params.id);
    const plan = await SubscriptionPlan.findById(sub?.subscriptionPlanId);

    if (
      !sub ||
      !plan ||
      !["Advertising", "Subscription"].includes(sub.type) ||
      plan.validity !== 365 ||
      !sub.autopayActive
    ) {
      return res.status(400).json({ message: "Not cancellable. Must be yearly active subscription of valid type." });
    }

    const provider = await Provider.findById(sub.userId);
    const type = await SubscriptionType.findById(plan.type);

    const today = startOfDay(new Date());
    const monthsRemaining = monthsBetween(today, sub.endDate);
    const fullYearAmount = plan.amount; // already yearly
    const proratedAmount = (monthsRemaining * fullYearAmount) / 12;
    const roundedCents = Math.round(proratedAmount * 100);

    const chargeResult = await ewayService.createTransaction({
      Customer: { TokenCustomerID: sub.ewayCustomerToken },
      Payment: {
        TotalAmount: roundedCents,
        CurrencyCode: plan.currency || "AUD"
      },
      TransactionType: "Recurring",
      Capture: true
    });

    if (!chargeResult.TransactionID || !chargeResult.TransactionStatus) {
      return res.status(500).json({
        message: "eWAY charge failed",
        gatewayResponse: chargeResult
      });
    }

    const txn = new Transaction({
      userId: sub.userId,
      subscriptionPlanId: plan._id,
      status: "completed",
      amount: proratedAmount,
      currency: plan.currency,
      transaction: {
        transactionPrice: proratedAmount,
        transactionStatus: "Success",
        transactionType: "Recurring",
        authorisationCode: chargeResult.AuthorisationCode,
        transactionId: chargeResult.TransactionID,
        transactionDate: new Date()
      },
      payment: {
        paymentSource: "eway",
        totalAmount: proratedAmount,
        countryCode: plan.currency
      },
      payer: {
        payerId: sub.ewayCustomerToken,
        payerName: provider.name || "Unknown",
        payerEmail: provider.email || ""
      }
    });
    await txn.save();

    // Expire subscription
    sub.autopayActive = false;
    sub.endDate = today;
    sub.status = "expired";
    await sub.save();

    // Email invoice
    const invoiceBuffer = await generateInvoicePDF({
      provider,
      subscriptionPlan: plan,
      subscriptionType: type,
      transactionId: chargeResult.TransactionID,
      invoiceDate: new Date(),
      amountCharged: proratedAmount
    });

    try {
      await sendEmail(
        provider.email,
        `Trade Hunters Subscription Cancelled - Invoice #${chargeResult.TransactionID}`,
        `<p>Your subscription was cancelled. A final prorated amount of <strong>$${proratedAmount.toFixed(2)}</strong> has been charged.</p>`,
        [{ filename: `invoice_${chargeResult.TransactionID}.pdf`, content: invoiceBuffer }]
      );
    } catch (err) {
      console.error("Email failed:", err.message);
    }

    return res.json({
      message: "Subscription cancelled, prorated charge successful",
      transactionId: chargeResult.TransactionID,
      amountCharged: `$${proratedAmount.toFixed(2)}`,
      invoiceSent: true
    });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    res.status(500).json({ message: "Internal error", error: err.message });
  }
};

