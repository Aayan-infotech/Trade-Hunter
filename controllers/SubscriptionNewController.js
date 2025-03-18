const SubscriptionType = require("../models/SubscriptionTypeModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const SubscriptionUser = require("../models/SubscriptionUserModel");


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

exports.getAllSubscriptionTypes = async (req, res) => {
  try {
    const subscriptionTypes = await SubscriptionType.find();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Subscription types retrieved successfully",
      data: subscriptionTypes,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.deleteSubscriptionType = async (req, res) => {
  try {
      const deletedSubscriptionType = await SubscriptionType.findByIdAndDelete(req.params.id);
      if (!deletedSubscriptionType) {
          return res.status(404).json({ status: 404, success: false, message: 'Subscription Type not found', data: null });
      }
      res.status(200).json({ status: 200, success: true, message: 'Subscription Type deleted successfully', data: null });
  } catch (error) {
      res.status(500).json({ status: 500, success: false, message: 'Internal server error', data: null });
  }
};


// SubscriptionPlan
// Controller function to create a new subscription plan
exports.createSubscriptionPlan = async (req, res) => {
  try {
    const { type, planName, amount, validity, description, kmRadius, status } = req.body;

    if (!type || !planName || !amount || !validity) {
      return res.status(400).json({ status: 400, success: false, message: "Required fields are missing" });
    }

    const newSubscriptionPlan = new SubscriptionPlan({
      type,
      planName,
      amount,
      validity,
      description,
      kmRadius,
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

    // Fetch all Subscription Types to map their IDs to names
    const subscriptionTypes = await SubscriptionType.find();
    const typeMap = subscriptionTypes.reduce((acc, type) => {
      acc[type._id.toString()] = type.type; 
      return acc;
    }, {});

    // Replace type ID with name
    const formattedPlans = plans.map(plan => ({
      ...plan.toObject(),
      type: typeMap[plan.type.toString()] || "N/A" 
    }));

    res.status(200).json({ 
      status: 200, success: true, message: "Search results retrieved successfully",data: formattedPlans});
  } catch (error) {
    res.status(500).json({status: 500,success: false, message: "Server error", error: error.message });
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


// subscription user api

// Controller function to create a new subscription user
exports.createSubscriptionUser = async (req, res) => {
  try {
    const { userId, subscriptionPlanId, startDate, endDate, status, kmRadius } = req.body;

    if (!userId || !subscriptionPlanId || !startDate || !endDate) {
      return res.status(400).json({ status: 400, success: false, message: "Required fields are missing" });
    }

    const newSubscriptionUser = new SubscriptionUser({
      userId,
      subscriptionPlanId,
      startDate,
      endDate,
      status,
      kmRadius
    });
    
    await newSubscriptionUser.save();

    res.status(201).json({ status: 201, success: true, message: "Subscription User created successfully", data: newSubscriptionUser });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};

// Controller function to get all subscription users
exports.getAllSubscriptionUsers = async (req, res) => {
  try {
    const users = await SubscriptionUser.find().populate("userId subscriptionPlanId");
    res.status(200).json({ status: 200, success: true, message: "Subscription users retrieved successfully", data: users });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};

// Controller function to get a single subscription user by ID
exports.getSubscriptionUserById = async (req, res) => {
  try {
    const user = await SubscriptionUser.findById(req.params.id).populate("userId subscriptionPlanId");
    if (!user) {
      return res.status(404).json({ status: 404, success: false, message: "Subscription User not found" });
    }
    res.status(200).json({ status: 200, success: true, message: "Subscription User retrieved successfully", data: user });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};

// Controller function to update a subscription user
exports.updateSubscriptionUser = async (req, res) => {
  try {
    const updatedUser = await SubscriptionUser.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ status: 404, success: false, message: "Subscription User not found" });
    }
    res.status(200).json({ status: 200, success: true, message: "Subscription User updated successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};

// Controller function to delete a subscription user
exports.deleteSubscriptionUser = async (req, res) => {
  try {
    const deletedUser = await SubscriptionUser.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ status: 404, success: false, message: "Subscription User not found" });
    }
    res.status(200).json({ status: 200, success: true, message: "Subscription User deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};




// SubscriptionUser

exports.getAllSubscriptions = async (req, res) => {
  try {
      const subscriptions = await SubscriptionUser.find();
      res.status(200).json({ success: true, message: 'Subscriptions fetched successfully', data: subscriptions });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

exports.getSubscriptionById = async (req, res) => {
  try {
      const subscription = await SubscriptionUser.findById(req.params.id);
      if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
      res.status(200).json({ success: true, message: 'Subscription fetched successfully', data: subscription });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

exports.createSubscription = async (req, res) => {
  try {
      const { userId, subscriptionPlanId, startDate, endDate, kmRadius } = req.body;
      const subscriptionUser = new SubscriptionUser({ userId, subscriptionPlanId, startDate, endDate, status: 'active', kmRadius });
      await subscriptionUser.save();
      res.status(201).json({ success: true, message: 'Subscription created successfully', data: subscriptionUser });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
      const subscription = await SubscriptionUser.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });
      res.status(200).json({ success: true, message: 'Subscription updated successfully', data: subscription });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
      await SubscriptionUser.findByIdAndDelete(req.params.id);
      res.status(200).json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
