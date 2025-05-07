const Transaction = require("../models/TransactionModelNew");
const ewayService = require("../services/ewayService");
const SubscriptionVoucherUser = require("../models/SubscriptionVoucherUserModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const SubscriptionType = require("../models/SubscriptionTypeModel");
const Provider = require("../models/providerModel");

exports.initiatePayment = async (req, res) => {
  try {
    const requiredCustomerFields = ["FirstName", "LastName", "Email", "CardDetails"];
    const requiredCardFields = ["Name", "Number", "ExpiryMonth", "ExpiryYear", "CVN"];
    const requiredPaymentFields = ["TotalAmount", "CurrencyCode"];

    const { Customer, Payment, userId, subscriptionPlanId } = req.body;

    if (!Customer || !Payment) {
      return res.status(400).json({ message: "Missing Customer or Payment object" });
    }

    const missingCustomer = requiredCustomerFields.filter((f) => !Customer[f]);
    const missingCard = requiredCardFields.filter((f) => !Customer.CardDetails?.[f]);
    const missingPayment = requiredPaymentFields.filter((f) => !Payment[f]);

    if (missingCustomer.length || missingCard.length || missingPayment.length) {
      return res.status(400).json({
        message: "Missing required fields",
        missingFields: {
          Customer: missingCustomer,
          CardDetails: missingCard,
          Payment: missingPayment,
        },
      });
    }

    const paymentData = {
      Customer: {
        FirstName: Customer.FirstName,
        LastName: Customer.LastName,
        Email: Customer.Email,
        CardDetails: {
          Name: Customer.CardDetails.Name,
          Number: Customer.CardDetails.Number.replace(/\s/g, ""),
          ExpiryMonth: Customer.CardDetails.ExpiryMonth.padStart(2, "0"),
          ExpiryYear:
            Customer.CardDetails.ExpiryYear.length === 2
              ? `20${Customer.CardDetails.ExpiryYear}`
              : Customer.CardDetails.ExpiryYear,
          CVN: Customer.CardDetails.CVN,
        },
      },
      Payment: {
        TotalAmount: Payment.TotalAmount,
        CurrencyCode: Payment.CurrencyCode,
      },
      TransactionType: "MOTO",
      Capture: true,
    };

    const ewayResponse = await ewayService.createTransaction(paymentData);
    const txId = ewayResponse.TransactionID;

    if (!txId) {
      return res.status(400).json({
        message: "Failed to process payment: Missing TransactionID",
        error: "TransactionID not found in response",
        details: ewayResponse,
      });
    }

    const amountCharged = (Payment.TotalAmount || 0) / 100;

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
        transactionId: txId,
      },
      payment: {
        paymentSource: "eway",
        totalAmount: amountCharged,
        countryCode: Payment.CurrencyCode,
      },
      payer: {
        payerId: ewayResponse.Customer.TokenCustomerID || "",
        payerName: ewayResponse.Customer.CardDetails.Name,
        payerEmail: ewayResponse.Customer.Email,
      },
    });

    await txn.save();

    const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId);
    if (!subscriptionPlan) {
      return res.status(404).json({ message: "Subscription Plan not found" });
    }

    const subscriptionType = await SubscriptionType.findById(subscriptionPlan.type);
    if (!subscriptionType) {
      return res.status(404).json({ message: "Subscription Type not found" });
    }

    if (!ewayResponse.TransactionStatus) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Payment failed",
        data: null,
      });
    }

    let newStartDate = new Date();
    let newStatus = "active";

    const latestSub = await SubscriptionVoucherUser.findOne({
      userId,
      type: subscriptionType.type,
      status: { $in: ["active", "upcoming"] },
    }).sort({ endDate: -1 });

    if (latestSub) {
      newStartDate = new Date(latestSub.endDate);
      newStatus = "upcoming";
    }

    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + subscriptionPlan.validity);

    const newSubscription = new SubscriptionVoucherUser({
      userId,
      type: subscriptionType.type,
      subscriptionPlanId,
      startDate: newStartDate,
      endDate: newEndDate,
      status: newStatus,
      kmRadius: subscriptionPlan.kmRadius,
    });

    await newSubscription.save();

    if (newStatus === "active") {
      await Provider.findByIdAndUpdate(userId, {
        subscriptionStatus: 1,
        isGuestMode: false,
        subscriptionType: subscriptionType.type,
        subscriptionPlanId,
        "address.radius": subscriptionPlan.kmRadius * 1000,
      });
    }

    return res.status(200).json({
      message: "Payment processed successfully",
      userId,
      subscriptionPlanId,
      subscriptionType: subscriptionType.type,
      transactionId: txId,
      status: ewayResponse.TransactionStatus,
      responseCode: ewayResponse.ResponseCode,
      amountCharged: `${amountCharged}$`,
      gatewayResponse: ewayResponse,
    });

  } catch (error) {
    console.error("Payment Processing Error:", error);

    if (error.response?.data) {
      return res.status(500).json({
        message: "Payment initiation failed",
        error: error.message,
        details: error.response.data,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }

    return res.status(500).json({
      message: "Payment initiation failed",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};




exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction
      .find()
      .sort({ 'transaction.transactionDate': -1 }).populate("userId","contactName email ").populate("subscriptionPlanId","planName kmRadius ");

    return res.status(200).json({
      count: transactions.length,
      transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      message: 'Failed to fetch transactions',
      error:   error.message
    });
  }
};


exports.getTotalSubscriptionRevenue = async (req, res) => {
    try {
      const { month, financialYear } = req.query;
      let conditions = [];
  
      if (financialYear) {
        const [startYear, endYear] = financialYear.split('-').map(Number);
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
        conditions.push({ $expr: { $eq: [ { $month: "$createdAt" }, monthNum ] } });
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
        data: { totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0 },
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
        .populate("subscriptionPlanId", "planName kmRadius")
        .lean();
  
      const subscriptions = await SubscriptionVoucherUser.find({ userId })
        .select("subscriptionPlanId startDate endDate status")
        .lean();
  
      const combinedData = transactions.map((txn) => {
        const planIdFromTxn = txn.subscriptionPlanId
          ? txn.subscriptionPlanId._id?.toString() || txn.subscriptionPlanId.toString()
          : null;
  
        const txnDate = new Date(txn.transaction.transactionDate);
  
        const matchingVouchers = subscriptions.filter(
          (sub) => sub.subscriptionPlanId.toString() === planIdFromTxn
        );
  
        // Try to find the closest voucher starting at or just after the txn
        let matchedVoucher = matchingVouchers
          .filter((sub) => new Date(sub.startDate) >= txnDate)
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
  
        // Fallback: get latest past voucher
        if (!matchedVoucher) {
          matchedVoucher = matchingVouchers
            .filter((sub) => new Date(sub.startDate) <= txnDate)
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
        }
  
        return {
          ...txn,
          subscriptionStartDate: matchedVoucher?.startDate || null,
          subscriptionEndDate: matchedVoucher?.endDate || null,
          subscriptionStatus: matchedVoucher?.status || null,
        };
      });
  
      return res.status(200).json({
        status: 200,
        success: true,
        message: "Data fetched successfully",
        data: combinedData,
      });
    } catch (error) {
      console.error("Error in getSubscriptionByUserId:", error);
      return res.status(500).json({
        status: 500,
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };
  
  
  