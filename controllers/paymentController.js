const Payment = require("../models/paymentModel");
const Provider = require("../models/providerModel");
const User = require('../models/userModel');
const apiResponse = require("../utils/responsehandler");
const subscription = require("../models/subscriptionModel");

const createPayment = async (req, res) => {
  try {

    const userId = req.user.userId;

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
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
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
    res.status(201).json(newPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllPayment = async (req, res) => {
  try {
    const payment = await Payment.find();
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const paymentByProviderId = async (req, res) => {
  try {
    const Payment = await Payment.findById(req.params.id);
    if (!Payment) {
      return apiResponse.error(
        res,
        "Payment details for this provider is not found!"
      );
    }
    return apiResponse.success(res, "Payment fetched!", Payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createPayment, getAllPayment, paymentByProviderId };