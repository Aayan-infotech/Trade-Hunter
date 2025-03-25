const Voucher = require('../models/voucherModels');
const SubscriptionVoucherUser = require('../models/SubscriptionVoucherUserModel');
const Provider = require('../models/providerModel'); 


// Apply a voucher
// exports.applyVoucher = async (req, res) => {
//     try {
//         const { code } = req.body;
//         const voucher = await Voucher.findOne({ code });

//         if (!voucher) {
//             return res.status(404).json({ status: 404, success: false, message: "Voucher not found", data: null });
//         }

//         if (!voucher.isValid()) {
//             return res.status(400).json({ status: 400, success: false, message: "Voucher is not valid or expired", data: null });
//         }

//         voucher.usedCount += 1;
//         if (voucher.usedCount >= voucher.usageLimit) {
//             voucher.isActive = false;
//         }

//         await voucher.save();
//         return res.status(200).json({ status: 200, success: true, message: "Voucher applied successfully", data: voucher });
//     } catch (error) {
//         return res.status(500).json({ status: 500, success: false, message: "Server error", data: error.message });
//     }
// };



// Matches the userId first.
// Checks if the user has an active Subscription.
// If the Subscription is still valid, it prevents applying the Voucher.
// If the Subscription has expired, it allows applying the Voucher.

exports.applyVoucher = async (req, res) => {
    try {
        const { code, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ status: 400, success: false, message: "User ID is required", data: null });
        }

        // Find the voucher by code
        const voucher = await Voucher.findOne({ code });
        if (!voucher) {
            return res.status(404).json({ status: 404, success: false, message: "Voucher not found", data: null });
        }

        // if (!voucher.isValid()) {
        //     return res.status(400).json({ status: 400, success: false, message: "Voucher is not valid or expired", data: null });
        // }

        // Check if user has an active subscription
        const activeSubscription = await SubscriptionVoucherUser.findOne({
            userId,
            type: "Subscription",
            status: "active"
        });

        if (activeSubscription) {
            const currentDate = new Date();
            if (activeSubscription.startDate <= currentDate && activeSubscription.endDate >= currentDate) {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: "User has an active subscription. Cannot apply voucher.",
                    data: null
                });
            }
        }

        // Check if the user has already used this voucher
        const existingUsage = await SubscriptionVoucherUser.findOne({ userId, voucherId: voucher._id });
        if (existingUsage) {
            return res.status(400).json({ status: 400, success: false, message: "Voucher already used by this user", data: null });
        }

        // Increase usage count
        voucher.usedCount += 1;

        // Deactivate if limit reached
        if (voucher.usedCount >= voucher.usageLimit) {
            voucher.isActive = false;
        }

        await voucher.save();

        // Store voucher usage in SubscriptionVoucherUser
        const newVoucherUsage = new SubscriptionVoucherUser({
            userId,
            type: "Voucher",
            voucherId: voucher._id,
            code: voucher.code,
            startDate: voucher.startDate,
            endDate: voucher.endDate,
            status: 'active'
        });
        await newVoucherUsage.save();
        // Update Provider subscriptionStatus and isGuestMode
        await Provider.findOneAndUpdate(
            { _id: userId }, // Assuming userId is the provider's ID
            { $set: { subscriptionStatus: 1, isGuestMode: false } },
            // { new: true }
        );

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Voucher applied successfully",
            data: { voucher, newVoucherUsage }
        });
    } catch (error) {
        return res.status(500).json({ status: 500, success: false, message: "Server error", data: error.message });
    }
};

// Create a new voucher
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

// Get all vouchers
exports.getVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find();
        return res.status(200).json({ status: 200, success: true, message: "Vouchers retrieved successfully", data: vouchers });
    } catch (error) {
        return res.status(500).json({ status: 500, success: false, message: "Server error", data: error.message });
    }
};

// Delete a voucher
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


//update voucher 

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
