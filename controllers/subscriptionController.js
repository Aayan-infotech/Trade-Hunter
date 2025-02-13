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
      return apiResponse.error(res, "Subscription not found", 404);
    }
    return apiResponse.success(res, "Subscription fetched by Id", subscription);
  } catch (error) {
    return apiResponse.error(res, "Subscription fetch error", 500);
  }
};

const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, title, description, type } = req.body;


    const subscription = await Subscription.findById(id)
      ;
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Susbscription not founf",
      })
    }
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      id,
      { amount, title, description, type },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully.",
      data: updatedSubscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};


const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id)
      ;
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    await subscription.findByIdAndDelete(id)
      ;

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

module.exports = { addSubscription, getAllSubscription, getSubscriptionById, updateSubscription, deleteSubscription };