const Payment = require("../models/paymentModel");
const Provider = require("../models/providerModel");
const Subscription = require("../models/subscriptionModel");
const apiResponse = require("../utils/responsehandler");

const createPayment = async (req, res) => {
  try {
    // The provider id is assumed to be in req.user.userId
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

    provider.subscriptionStatus = 1; 
    await provider.save();
    await newPayment.save();

    return apiResponse.success(res, "Payment created successfully", newPayment);
  } catch (error) {
    console.error("Error in createPayment:", error);
    return apiResponse.error(res, "Payment creation failed", 500);
  }
};

const getAllPayment = async (req, res) => {
  try {
    // Populate userId with the provider's contactName field (adjust if you use a different key)
    const payments = await Payment.find().populate("userId", "contactName");
    console.log(payments)
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
    // Populate userId with the provider's contactName field
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
    const totalRevenue = await Payment.aggregate([
      // {
      //   $match: { type: "subscription" },
      // },
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
