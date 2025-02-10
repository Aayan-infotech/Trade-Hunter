const Provider = require("../models/providerModel");
const apiResponse = require("../utils/responsehandler");
const Subscription = require("../models/subscriptionModel");

const addSubscription = async (req, res) => {
  try {
    const { amount, title, description, type } = req.body;

    // Validate input
    if (!amount || !title || !description || !type) {
      return apiResponse.error(res, "All fields are required", 400);
    }

    //create subscription
    const newSubscription = new Subscription({
      amount,
      title,
      description,
      type,
    });
    await newSubscription.save();
    return apiResponse.success(res, "Subscription added successfully", newSubscription);
  } catch (error) {
    return apiResponse.error(res, "Subscription not added", 500);
  }
};

const getAllSubscription = async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    return apiResponse.success(res, "All subscription fetched", subscriptions);
  } catch (error) {
    return apiResponse.error(res, "Subscription not fetched", 500);
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return apiResponse.error(res, "Subscription not fetched", subscription);
    }
    return apiResponse.success(res, "Subscription fetched by Id", subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
    return apiResponse.error(res, "Subscription fetched error",500);
  }
};

module.exports = { addSubscription, getAllSubscription, getSubscriptionById };