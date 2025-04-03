const Transaction = require('../models/TransactionModel');
const SubscriptionUser = require('../models/SubscriptionVoucherUserModel');
const SubscriptionPlan = require('../models/SubscriptionPlanModel');
const SubscriptionVoucherUser = require('../models/SubscriptionVoucherUserModel');
const Provider = require('../models/providerModel'); 

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

        const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId);
        if (!subscriptionPlan) {
            return res.status(404).json({ status: 404, success: false, message: 'Subscription Plan not found', data: null });
        }
        const paymentSuccess = true;

        if (!paymentSuccess) {
            return res.status(400).json({ status: 400, success: false, message: 'Payment failed', data: null });
        }

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
                existingVoucher.status = 'expired';
                await existingVoucher.save();
            }
        }

        let existingSubscription = await SubscriptionVoucherUser.findOne({
            userId,
            type: "Subscription",
            status: 'active'
        });

        if (existingSubscription) {
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

        const transaction = new Transaction({
            userId,
            subscriptionPlanId,
            amount,
            transactionId: `TXN_${Date.now()}`,
            paymentMethod,
            status: 'completed',
        });
        await transaction.save();

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

        await Provider.findOneAndUpdate(
            { _id: userId }, 
            { $set: { subscriptionStatus: 1, isGuestMode: false } },
        );

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
        const transactions = await Transaction.find()
      .populate('userId')
      .populate('subscriptionPlanId');
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

exports.getTransactionsByUserId = async (req, res) => {
    try {
        const { userId } = req.userId;
        const transactions = await Transaction.find({ userId }).populate('subscriptionPlanId');

        if (!transactions.length) {
            return res.status(404).json({ status: 404, success: false, message: 'No transactions found for this user', data: [] });
        }

        res.status(200).json({ status: 200, success: true, message: '', data: transactions });
    } catch (error) {
        res.status(500).json({ status: 500, success: false, message: 'Server error', error: error.message });
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


exports.getTotalSubscriptionRevenue = async (req, res) => {
    try {
      const { month, financialYear } = req.query;
      let conditions = [];
  
      if (financialYear) {
        const [startYear, endYear] = financialYear.split('-').map(Number);
        const fyStart = new Date(`${startYear}-07-01T00:00:00.000Z`);
        const fyEnd = new Date(`${endYear}-06-30T23:59:59.999Z`);
        conditions.push({ createdAt: { $gte: fyStart, $lte: fyEnd } });
      }
  
      if (month) {
        let monthNum = Number(month);
        if (isNaN(monthNum)) {
          const monthMapping = {
            january: 1,
            february: 2,
            march: 3,
            april: 4,
            may: 5,
            june: 6,
            july: 7,
            august: 8,
            september: 9,
            october: 10,
            november: 11,
            december: 12,
          };
          monthNum = monthMapping[month.toLowerCase()];
        }
        conditions.push({ $expr: { $eq: [ { $month: "$createdAt" }, monthNum ] } });
      }
  
      const matchConditions = conditions.length > 0 ? { $and: conditions } : {};
  
      const totalRevenue = await Transaction.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);
  
      res.status(200).json({
        status: 200,
        success: true,
        message: "Total subscription revenue fetched",
        data: { totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0 },
      });
    } catch (error) {
      console.error("Error in getTotalSubscriptionRevenue:", error);
      res.status(500).json({
        status: 500,
        success: false,
        message: "Failed to fetch subscription revenue",
        data: null,
      });
    }
  };

  exports.getSubscriptionByUserId = async (req, res) => {
    try {
        const { userId } = req.user; 

        const transactions = await Transaction.find({ userId }).populate('subscriptionPlanId');

        if (!transactions.length) {
            return res.status(404).json({ 
                status: 404, 
                success: false, 
                message: 'No transactions found for this user', 
                data: [] 
            });
        }

        res.status(200).json({ 
            status: 200, 
            success: true, 
            message: '', 
            data: transactions 
        });
    } catch (error) {
        res.status(500).json({ 
            status: 500, 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};


  
  
