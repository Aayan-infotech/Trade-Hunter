const Payment = require("../models/paymentModel");
const Provider = require("../models/providerModel");
const Subscription = require("../models/subscriptionModel");
const apiResponse = require("../utils/responsehandler");

const createPayment = async (req, res) => {
  try {
    const providerId = req.user.userId;
    const {
      transactionId,
      transactionDate,
      transactionStatus,
      transactionAmount,
      transactionMode,
      SubscriptionId,
      SubscriptionAmount,
      type,
    } = req.body;

    if (
      !transactionId ||
      !transactionDate ||
      !transactionStatus ||
      !transactionAmount ||
      !transactionMode ||
      !SubscriptionId ||
      !SubscriptionAmount ||
      !type
    ) {
      return apiResponse.error(res, "All fields are required", 400);
    }

    const provider = await Provider.findById(providerId);
    if (!provider) {
      return apiResponse.error(res, "Provider not found", 404);
    }

    const newPayment = new Payment({
      transactionId,
      transactionDate,
      transactionStatus,
      transactionAmount,
      transactionMode,
      SubscriptionId,
      SubscriptionAmount,
      userId: providerId,
      type,
    });

    // Save the new Payment document first
    await newPayment.save();

    // Update provider's subscription status and set its "type" field to reference the Payment document
    provider.subscriptionStatus = 1;
    provider.type = newPayment._id; // This will allow you to populate the Payment document later
    await provider.save();

    return apiResponse.success(res, "Payment created successfully", newPayment);
  } catch (error) {
    console.error("Error in createPayment:", error);
    return apiResponse.error(res, "Payment creation failed", 500);
  }
};

const getAllPayment = async (req, res) => {
  try {
    const payments = await Payment.find().populate("userId", "contactName");
    console.log(payments);
    return apiResponse.success(
      res,
      "All payments fetched successfully",
      payments
    );
  } catch (error) {
    console.error("Error in getAllPayment:", error);
    return apiResponse.error(res, "Failed to fetch payments", 500);
  }
};

const paymentByProviderId = async (req, res) => {
  try {
    const providerId = req.params.id;
    const payments = await Payment.find({ userId: providerId }).populate("userId", "contactName");
    if (!payments || payments.length === 0) {
      return apiResponse.error(
        res,
        "Payment details for this provider not found",
        404
      );
    }
    return apiResponse.success(
      res,
      "Payment details fetched successfully",
      payments
    );
  } catch (error) {
    console.error("Error in paymentByProviderId:", error);
    return apiResponse.error(res, "Failed to fetch payment details", 500);
  }
};

const getTotalSubscriptionRevenue = async (req, res) => {
  try {
    const { month, financialYear } = req.query;
    let conditions = [];
    if (financialYear) {
      const [startYear, endYear] = financialYear.split('-').map(Number);
      const fyStart = new Date(`${startYear}-07-01T00:00:00.000Z`);
      const fyEnd = new Date(`${endYear}-06-30T23:59:59.999Z`);
      conditions.push({ transactionDate: { $gte: fyStart, $lte: fyEnd } });
    }

    if (month) {
      conditions.push({ $expr: { $eq: [ { $month: "$transactionDate" }, Number(month) ] } });
    }

    const matchConditions = conditions.length > 0 ? { $and: conditions } : {};

    const totalRevenue = await Payment.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$transactionAmount" },
        },
      },
    ]);

    return apiResponse.success(res, "Total subscription revenue fetched", {
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0,
    });
  } catch (error) {
    console.error("Error in getTotalSubscriptionRevenue:", error);
    return apiResponse.error(res, "Failed to fetch subscription revenue", 500);
  }
};


module.exports = {
  createPayment,
  getAllPayment,
  paymentByProviderId,
  getTotalSubscriptionRevenue,
};
