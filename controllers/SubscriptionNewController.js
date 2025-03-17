const SubscriptionType = require("../models/SubscriptionTypeModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");

// Controller function to create a new subscription type
exports.createSubscriptionType = async (req, res) => {
  try {
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Type is required" });
    }

    const newSubscriptionType = new SubscriptionType({ type });
    await newSubscriptionType.save();

    res.status(201).json({ message: "Subscription Type created successfully", data: newSubscriptionType });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// SubscriptionPlan
// Controller function to create a new subscription plan
exports.createSubscriptionPlan = async (req, res) => {
  try {
    const { type, planName, amount, validity, description, kmRedieson, status } = req.body;

    if (!type || !planName || !amount || !validity) {
      return res.status(400).json({ status: 400, success: false, message: "Required fields are missing" });
    }

    const newSubscriptionPlan = new SubscriptionPlan({
      type,
      planName,
      amount,
      validity,
      description,
      kmRedieson,
      status
    });

    await newSubscriptionPlan.save();

    res.status(201).json({ status: 201, success: true, message: "Subscription Plan created successfully", data: newSubscriptionPlan });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};

// Controller function to get all subscription plans
exports.getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.status(200).json({ status: 200, success: true, message: "Search results retrieved successfully", data: plans });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};

// Controller function to get a single subscription plan by ID
exports.getSubscriptionPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ status: 404, success: false, message: "Subscription Plan not found" });
    }
    res.status(200).json({ status: 200, success: true, message: "Subscription Plan retrieved successfully", data: plan });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};

// Controller function to update a subscription plan
exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPlan) {
      return res.status(404).json({ status: 404, success: false, message: "Subscription Plan not found" });
    }
    res.status(200).json({ status: 200, success: true, message: "Subscription Plan updated successfully", data: updatedPlan });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};

// Controller function to delete a subscription plan
exports.deleteSubscriptionPlan = async (req, res) => {
  try {
    const deletedPlan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!deletedPlan) {
      return res.status(404).json({ status: 404, success: false, message: "Subscription Plan not found" });
    }
    res.status(200).json({ status: 200, success: true, message: "Subscription Plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};