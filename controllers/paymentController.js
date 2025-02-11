const Payment = require("../models/paymentModel");
const Provider = require("../models/providerModel");
const User = require('../models/hunterModel');
const apiResponse = require("../utils/responsehandler");
const subscription = require("../models/subscriptionModel");

const createPayment = async (req, res) => {
  try {

    const userId = req.user.id;

    const {
      transactionId,
      transactionDate,
      transactionStatus,
      transactionAmount,
      transactionMode,
      SubscriptionId,
      SubscriptionAmount
    } = req.body;

    // Validate input
    if (
      !transactionId ||
      !transactionDate ||
      !transactionStatus ||
      !transactionAmount ||
      !transactionMode ||
      !SubscriptionId ||
      !SubscriptionAmount
    ) {
      return apiResponse.error(res, "All fields are required", 400);
    }

    const provider =  await Provider.findById(userId);

    // create payment
    const newPayment = new Payment({
      transactionId,
      transactionDate,
      transactionStatus,
      transactionAmount,
      transactionMode,
      SubscriptionId,
      SubscriptionAmount,
      userId
    });

    provider.subscriptionStatus = 1;
    await provider.save();
    await newPayment.save();
    return apiResponse.success(res, "Payment created successfully", newPayment);
  } catch (error) {
    return apiResponse.error(res, "Payment creation failed", 500);
  }
};

const getAllPayment = async (req, res) => {
  try {
    const payment = await Payment.find();
    return apiResponse.success(res, "All payments fetched successfully", payment);
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch payments", 500);
  }
};

const paymentByProviderId = async (req, res) => {
  try {
    const Payment = await Provider.findById(req.params.id);
    if (!Payment) {
      return apiResponse.error(res, "Payment details for this provider not found", 404);
    }
    return apiResponse.success(res, "Payment details fetched successfully", Payment);
  } catch (error) {
    return apiResponse.error(res, "Failed to fetch payment details", 500);
  }
};

module.exports = { createPayment, getAllPayment, paymentByProviderId };
