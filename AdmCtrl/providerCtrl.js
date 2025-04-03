const Provider = require("../models/providerModel"); 

exports.getAllProviders = async (req, res) => {
  try {
    const { search = "", userStatus } = req.query;

    let query = {
      isGuestMode: false,
      $or: [
        { contactName: { $regex: `.*${search}.*`, $options: "i" } },
        { email: { $regex: `.*${search}.*`, $options: "i" } },
        { "address.addressLine": { $regex: `.*${search}.*`, $options: "i" } },
      ],
    };

    const validStatuses = ["Active", "Suspended", "Pending"];
    if (userStatus && validStatuses.includes(userStatus)) {
      query.userStatus = userStatus;
    }

    // Fetch all providers without pagination
    const providers = await Provider.find(query)
      .sort({ createdAt: -1 })
      .populate("assignedJobs");

    const totalProviders = providers.length;

    res.status(200).json({
      success: true,
      data: providers,
      metadata: {
        total: totalProviders,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// Delete a Provider
exports.deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProvider = await Provider.findByIdAndDelete(id);

    if (!deletedProvider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    res.status(200).json({ success: true, message: "Provider deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// Update a Provider
exports.updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

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
        { email: { $regex: `.*${search}.*`, $options: "i" } },
        { "address.addressLine": { $regex: `.*${search}.*`, $options: "i" } },
      ],
    };

    const validStatuses = ["Active", "Suspended", "Pending"];
    if (userStatus && validStatuses.includes(userStatus)) {
      query.userStatus = userStatus;
    }

    // Apply sorting first, then pagination
    const providers = await Provider.find(query)
      .sort({ createdAt: -1 }) // Sort by creation date descending (latest first)
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



