const Transaction = require('../models/TransactionModel');
const SubscriptionUser = require('../models/SubscriptionVoucherUserModel');
const SubscriptionPlan = require('../models/SubscriptionPlanModel');
const SubscriptionVoucherUser = require('../models/SubscriptionVoucherUserModel');



// exports.createTransaction = async (req, res) => {
//     try {
//         const { userId, subscriptionPlanId, amount, paymentMethod } = req.body;

//         // Check if the subscription plan exists
//         const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId);
//         if (!subscriptionPlan) {
//             return res.status(404).json({ status: 404, success: false, message: 'Subscription Plan not found', data: null });
//         }

//         // Simulating payment success (No real bank API used)
//         const paymentSuccess = true;

//         if (!paymentSuccess) {
//             return res.status(400).json({ status: 400, success: false, message: 'Payment failed', data: null });
//         }

//         // Create transaction
//         const transaction = new Transaction({
//             userId,
//             subscriptionPlanId,
//             amount,
//             transactionId: `TXN_${Date.now()}`,
//             paymentMethod,
//             status: 'completed',
//         });
//         await transaction.save();

//         // Auto-create subscription for user upon successful payment
//         const startDate = new Date();
//         const endDate = new Date();
//         endDate.setDate(startDate.getDate() + subscriptionPlan.validity);

//         const subscriptionUser = new SubscriptionUser({
//             userId,
//             subscriptionPlanId,
//             startDate,
//             endDate,
//             status: 'active',
//             kmRadius: subscriptionPlan.kmRadius,
//         });
//         await subscriptionUser.save();

//         res.status(201).json({ status: 201, success: true, message: 'Transaction successful and subscription activated', data: { transaction, subscriptionUser } });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ status: 500, success: false, message: 'Internal server error', data: null });
//     }
// };



//     Checks if the user has an active Voucher; if yes, prevents purchasing a new one.
//      If the user's Voucher has expired, it marks it as expired and allows the purchase of a Subscription.
//      If the user has an active Subscription, it updates the existing Subscription instead of creating a new one

exports.createTransaction = async (req, res) => {
    try {
        const { userId, subscriptionPlanId, amount, paymentMethod } = req.body;

        // Check if the subscription plan exists
        const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId);
        if (!subscriptionPlan) {
            return res.status(404).json({ status: 404, success: false, message: 'Subscription Plan not found', data: null });
        }

        // Simulating payment success (No real bank API used)
        const paymentSuccess = true;

        if (!paymentSuccess) {
            return res.status(400).json({ status: 400, success: false, message: 'Payment failed', data: null });
        }

        // Check if user has an active or expired Voucher-type SubscriptionVoucherUser
        let existingVoucher = await SubscriptionVoucherUser.findOne({
            userId,
            type: "Voucher",
            status: { $in: ['active', 'expired'] }
        });

        if (existingVoucher) {
            if (existingVoucher.status === 'active') {
                return res.status(400).json({
                    status: 400,
                    success: false,
                    message: 'User already has an active Voucher subscription',
                    data: null
                });
            } else if (existingVoucher.status === 'expired') {
                // If Voucher is expired, proceed to purchase Subscription
                existingVoucher.status = 'expired';
                await existingVoucher.save();
            }
        }

        // Check if the user has an active Subscription
        let existingSubscription = await SubscriptionVoucherUser.findOne({
            userId,
            type: "Subscription",
            status: 'active'
        });

        if (existingSubscription) {
            // Update the existing active subscription with new details
            existingSubscription.subscriptionPlanId = subscriptionPlanId;
            existingSubscription.startDate = new Date();
            existingSubscription.endDate = new Date();
            existingSubscription.endDate.setDate(existingSubscription.startDate.getDate() + subscriptionPlan.validity);
            existingSubscription.kmRadius = subscriptionPlan.kmRadius;
            await existingSubscription.save();

            return res.status(200).json({
                status: 200,
                success: true,
                message: 'Existing subscription updated successfully',
                data: { existingSubscription }
            });
        }

        // Create new transaction
        const transaction = new Transaction({
            userId,
            subscriptionPlanId,
            amount,
            transactionId: `TXN_${Date.now()}`,
            paymentMethod,
            status: 'completed',
        });
        await transaction.save();

        // Auto-create new subscription for user
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + subscriptionPlan.validity);

        const newSubscription = new SubscriptionVoucherUser({
            userId,
            type: "Subscription",
            subscriptionPlanId,
            startDate,
            endDate,
            status: 'active',
            kmRadius: subscriptionPlan.kmRadius,
        });
        await newSubscription.save();

        res.status(201).json({
            status: 201,
            success: true,
            message: 'Transaction successful and subscription activated',
            data: { transaction, newSubscription }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 500, success: false, message: 'Internal server error', data: null });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.status(200).json({ status: 200, success: true, message: 'Transactions fetched successfully', data: transactions });
    } catch (error) {
        res.status(500).json({ status: 500, success: false, message: 'Internal server error', data: null });
    }
};

exports.getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ status: 404, success: false, message: 'Transaction not found', data: null });
        res.status(200).json({ status: 200, success: true, message: 'Transaction fetched successfully', data: transaction });
    } catch (error) {
        res.status(500).json({ status: 500, success: false, message: 'Internal server error', data: null });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        await Transaction.findByIdAndDelete(req.params.id);
        res.status(200).json({ status: 200, success: true, message: 'Transaction deleted successfully', data: null });
    } catch (error) {
        res.status(500).json({ status: 500, success: false, message: 'Internal server error', data: null });
    }
};
