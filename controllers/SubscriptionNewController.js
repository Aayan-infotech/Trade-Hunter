const SubscriptionType = require("../models/SubscriptionTypeModel");
const SubscriptionPlan = require("../models/SubscriptionPlanModel");
const SubscriptionUser = require("../models/SubscriptionVoucherUserModel");


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


exports.createSubscriptionPlan = async (req, res) => {
  try {
    const { type, planName, amount, validity, description, kmRadius, status , leadCount} = req.body;

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
      leadCount,
      status
    });

    await newSubscriptionPlan.save();

    res.status(201).json({ status: 201, success: true, message: "Subscription Plan created successfully", data: newSubscriptionPlan });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};

exports.getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();

    const subscriptionTypes = await SubscriptionType.find();
    const typeMap = subscriptionTypes.reduce((acc, type) => {
      acc[type._id.toString()] = type.type;
      return acc;
    }, {});

    const formattedPlans = plans.map(plan => ({
      ...plan.toObject(),
      type: typeMap[plan.type.toString()] || "N/A"
    }));

    res.status(200).json({
      status: 200, success: true, message: "Search results retrieved successfully", data: formattedPlans
    });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: "Server error", error: error.message });
  }
};


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

exports.getAllSubscriptionUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const term = search.trim().toLowerCase();

    let allSubs = await SubscriptionUser.find({ type: { $ne: "Voucher" } }) 
      .populate("userId")
      .populate({
        path: "subscriptionPlanId",
        populate: { path: "type", model: "SubscriptionType" },
      })
      .exec();

    if (term) {
      allSubs = allSubs.filter((sub) => {
        const user = sub.userId;
        if (!user) return false;

        if (
          user.businessName &&
          user.businessName.toLowerCase().includes(term)
        ) {
          return true;
        }

        if (Array.isArray(user.businessType)) {
          return user.businessType.some((bt) =>
            bt.toLowerCase().includes(term)
          );
        }

        return false;
      });
    }

    allSubs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totalCount = allSubs.length;
    const paginated = allSubs.slice(skip, skip + Number(limit));

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Subscription users retrieved successfully",
      currentPage: Number(page),
      pageSize: Number(limit),
      totalCount,
      data: paginated,
    });
  } catch (error) {
    console.error("Error in getAllSubscriptionUsers:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};



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

exports.getRetentionRate = async (req, res) => {
  try {
    const currentDate = new Date();

    const startOfThisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

    const lastMonthCount = await SubscriptionUser.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    const newSubscribersThisMonth = await SubscriptionUser.countDocuments({
      createdAt: { $gte: startOfThisMonth }
    });

    const totalSubscribers = await SubscriptionUser.countDocuments();

    const retainedSubscribers = totalSubscribers - newSubscribersThisMonth;

    let retentionRate = 0;
    if (lastMonthCount > 0 && totalSubscribers > 0) {
      retentionRate = (retainedSubscribers / totalSubscribers) * 100;
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Retention rate calculated successfully",
      data: {
        lastMonthCount,
        newSubscribersThisMonth,
        totalSubscribers,
        retainedSubscribers,
        retentionRate,
      },
    });
  } catch (error) {
    console.error("Error calculating retention rate:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Error calculating retention rate",
      error: error.message,
    });
  }
};

exports.getSubscriptionPlansByTypeId = async (req, res) => {
  try {
    const { subscriptionTypeId } = req.params; 

    
    const plans = await SubscriptionPlan.find({ type: subscriptionTypeId });
    
    if (!plans || plans.length === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "No subscription plans found for the given subscription type ID",
        data: [],
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Subscription plans retrieved successfully",
      data: plans,
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

exports.getActiveUsersGroupedByPlan = async (req, res) => {
  try {
    const activeSubs = await SubscriptionUser.find({ status: "active" })
      .populate({
        path: "subscriptionPlanId",
        select: "planName",
        model: SubscriptionPlan,
      })
      .select("subscriptionPlanId userId status");

    const grouped = activeSubs.reduce((acc, sub) => {
      const plan = sub.subscriptionPlanId;
      if (!plan) return acc;

      const planId = plan._id.toString();
      if (!acc[planId]) {
        acc[planId] = {
          subscriptionPlanId: planId,
          planName: plan.planName,
          userIds: [],
        };
      }
      acc[planId].userIds.push(sub.userId);
      return acc;
    }, {});

    const result = Object.values(grouped)
      .map((entry) => ({
        ...entry,
        count: entry.userIds.length,
      }))
      .sort((a, b) => b.count - a.count); // 🔥 Sort descending by count

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Active users grouped by subscription plan retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("getActiveUsersGroupedByPlan error:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

