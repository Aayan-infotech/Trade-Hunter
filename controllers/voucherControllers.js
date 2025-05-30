const Voucher = require('../models/voucherModels');
const SubscriptionVoucherUser = require('../models/SubscriptionVoucherUserModel');
const Provider = require('../models/providerModel');

exports.applyVoucher = async (req, res) => {
  try {
    const { code, userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "User ID is required",
        data: null,
      });
    }

    const voucher = await Voucher.findOne({ code });
    if (!voucher) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Voucher not found",
        data: null,
      });
    }

    const now = new Date();
    const activeSub = await SubscriptionVoucherUser.findOne({
      userId,
      type: "Subscription",
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    if (activeSub) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "User has an active subscription. Cannot apply voucher.",
        data: null,
      });
    }

    const used = await SubscriptionVoucherUser.findOne({
      userId,
      voucherId: voucher._id,
    });
    if (used) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Voucher already used by this user",
        data: null,
      });
    }

    voucher.usedCount = (voucher.usedCount || 0) + 1;
    if (voucher.usedCount >= voucher.usageLimit) {
      voucher.isActive = false;
    }
    await voucher.save();

    let startDate = new Date();
    let endDate;
    if (code === 'SIGNUPBONUS') {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
    } else {
      endDate = voucher.endDate;
    }

    const newVoucherUsage = new SubscriptionVoucherUser({
      userId,
      type: "Voucher",
      voucherId: voucher._id,
      code: voucher.code,
      startDate,
      endDate,
      status: "active",
    });
    await newVoucherUsage.save();

    const updatedProvider = await Provider.findByIdAndUpdate(
      userId,
      {
        $set: {
          subscriptionStatus: 1,
          isGuestMode: false,
          'address.radius': 160000,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProvider) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Provider not found",
        data: null,
      });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Voucher applied successfully",
      data: {
        voucher,
        newVoucherUsage,
        updatedProvider,
      },
    });
  } catch (error) {
    console.error("Error in applyVoucher:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      data: error.message,
    });
  }
};


  

exports.createVoucher = async (req, res) => {
    try {
        const { code, startDate, endDate, usageLimit } = req.body;
        const existingVoucher = await Voucher.findOne({ code });

        if (existingVoucher) {
            return res.status(400).json({ status: 400, success: false, message: "Voucher code already exists", data: null });
        }

        const newVoucher = new Voucher({ code, startDate, endDate, usageLimit });
        await newVoucher.save();
        return res.status(201).json({ status: 201, success: true, message: "Voucher created successfully", data: newVoucher });
    } catch (error) {
        return res.status(500).json({ status: 500, success: false, message: "Server error", data: error.message });
    }
};

exports.getVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({ code: { $ne: 'SIGNUPBONUS' } });
    return res.status(200).json({
      status: 200,
      success: true,
      message: "Vouchers retrieved successfully",
      data: vouchers,
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      data: error.message,
    });
  }
};

exports.deleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedVoucher = await Voucher.findByIdAndDelete(id);

        if (!deletedVoucher) {
            return res.status(404).json({ status: 404, success: false, message: "Voucher not found", data: null });
        }

        return res.status(200).json({ status: 200, success: true, message: "Voucher deleted successfully", data: deletedVoucher });
    } catch (error) {
        return res.status(500).json({ status: 500, success: false, message: "Server error", data: error.message });
    }
};



exports.updateVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, startDate, endDate, usageLimit } = req.body;

        const voucher = await Voucher.findById(id);
        if (!voucher) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: "Voucher not found",
                data: null,
            });
        }

        if (code && code !== voucher.code) {
            const existingVoucher = await Voucher.findOne({ code });
            if (existingVoucher) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "Voucher code already exists",
                    data: null,
                });
            }
            voucher.code = code;
        }

        voucher.startDate = startDate || voucher.startDate;
        voucher.endDate = endDate || voucher.endDate;
        voucher.usageLimit = usageLimit || voucher.usageLimit;

        await voucher.save();

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Voucher updated successfully",
            data: voucher,
        });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Server error",
            data: error.message,
        });
    }
};

exports.getVoucherSubscriptionByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "User ID is required",
        data: null
      });
    }

    const userVoucherSubscriptions = await SubscriptionVoucherUser.find({
      userId,
      type: 'Voucher'        
    });

    if (!userVoucherSubscriptions || userVoucherSubscriptions.length === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "No voucher subscriptions found for this user",
        data: []
      });
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Voucher subscriptions retrieved successfully",
      data: userVoucherSubscriptions
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      data: error.message
    });
  }
};
