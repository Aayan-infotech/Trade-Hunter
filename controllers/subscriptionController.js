const Provider = require("../models/providerModel");
const apiResponse = require("../utils/responsehandler");
const Subscription = require("../models/subscriptionModel");

const addSubscription = async (req, res) => {
  try {
    const { amount, title, description, type } = req.body;

    // Validate input
    if (!amount || !title || !description || type) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    //create subscription
    const newSubscription = new Subscription({
      amount,
      title,
      description,
      type,
    });
    await newSubscription.save();
    res.status(201).json(newSubscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllSubscription = async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    console.log(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: "Subscrption not found!" });
    }
    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addSubscription, getAllSubscription, getSubscriptionById };
