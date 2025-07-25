const Provider = require("../models/providerModel"); 
const mongoose = require("mongoose");
const pushNotification = require("../models/pushNotificationModel");

exports.getAllProviders = async (req, res) => {
  try {
    const { search = "", userStatus } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let query = {
      isGuestMode: false,
      $or: [
        { contactName: { $regex: `.*${search}.*`, $options: "i" } },
        {businessName: { $regex: `.*${search}.*`, $options: "i" } },
        { email: { $regex: `.*${search}.*`, $options: "i" } },
        { "address.addressLine": { $regex: `.*${search}.*`, $options: "i" } },
      ],
    };

    const validStatuses = ["Active", "Suspended", "Pending"];
    if (userStatus && validStatuses.includes(userStatus)) {
      query.userStatus = userStatus;
    }

    const totalProviders = await Provider.countDocuments(query);

    const providers = await Provider.find(query)
      .sort({ createdAt: -1 })  
      .skip(skip)
      .limit(limit)
      .populate("assignedJobs")
      .populate("subscriptionPlanId")

    res.status(200).json({
      success: true,
      data: providers,
      metadata: {
        total: totalProviders,
        currentPage: page,
        totalPages: Math.ceil(totalProviders / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

exports.getAllProviders2 = async (req, res) => {
  try {
    const { search = "", userStatus } = req.query;

    let query = {
      isGuestMode: false,
      $or: [
        { contactName: { $regex: `.*${search}.*`, $options: "i" } },
        { businessName: { $regex: `.*${search}.*`, $options: "i" } },
        { email: { $regex: `.*${search}.*`, $options: "i" } },
        { "address.addressLine": { $regex: `.*${search}.*`, $options: "i" } },
      ],
    };

    const validStatuses = ["Active", "Suspended", "Pending"];
    if (userStatus && validStatuses.includes(userStatus)) {
      query.userStatus = userStatus;
    }

    const providers = await Provider.find(query)
      .sort({ createdAt: -1 })
      .populate("assignedJobs");

    res.status(200).json({
      success: true,
      data: providers,
      metadata: {
        total: providers.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};




exports.deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid provider ID" });
    }

    const deletedProvider = await Provider.findByIdAndDelete(id);

    if (!deletedProvider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    await pushNotification.deleteMany({
      $or: [
        { userId: id },
        { receiverId: id }
      ]
    });

    res.status(200).json({ success: true, message: "Provider and related notifications deleted successfully" });
  } catch (error) {
    console.error("Delete provider error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

exports.updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    if (updatedData.phoneNo !== undefined) {
      const phoneRegex = /^\+?[0-9]+$/;
      if (!phoneRegex.test(updatedData.phoneNo)) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Phone number must contain only digits and may start with '+'.",
          data: [],
        });
      }
    }

    if (updatedData.businessType) {
      updatedData.$set = { businessType: updatedData.businessType };
      delete updatedData.businessType;
    }

    const updatedProvider = await Provider.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProvider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    res.status(200).json({
      success: true,
      message: "Provider updated successfully",
      data: updatedProvider,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};


exports.getAllProvidersGuestMode = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "", userStatus, isGuestMode = false } = req.query;

    let query = {
      isGuestMode: true,
      $or: [
        { contactName: { $regex: `.*${search}.*`, $options: "i" } },
        { businessName: { $regex: `.*${search}.*`, $options: "i" } },
        { email: { $regex: `.*${search}.*`, $options: "i" } },
        { "address.addressLine": { $regex: `.*${search}.*`, $options: "i" } },
      ],
    };

    const validStatuses = ["Active", "Suspended", "Pending"];
    if (userStatus && validStatuses.includes(userStatus)) {
      query.userStatus = userStatus;
    }

    const providers = await Provider.find(query)
      .sort({ createdAt: -1 }) 
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const totalProviders = await Provider.countDocuments(query);

    res.status(200).json({
      success: true,
      data: providers,
      metadata: {
        total: totalProviders,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalProviders / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};



