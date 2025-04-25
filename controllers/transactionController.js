const Transaction = require('../models/TransactionModel');
const SubscriptionVoucherUser = require('../models/SubscriptionVoucherUserModel');
const SubscriptionPlan = require('../models/SubscriptionPlanModel');
const SubscriptionType = require('../models/SubscriptionTypeModel');
const Provider = require('../models/providerModel');

exports.createTransaction = async (req, res) => {
  try {
    const { userId, subscriptionPlanId, amount, paymentMethod, subscriptionTypeId } = req.body;

    const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId);
    if (!subscriptionPlan) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: 'Subscription Plan not found',
        data: null,
      });
    }

    const subscriptionType = await SubscriptionType.findById(subscriptionTypeId);
    if (!subscriptionType) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: 'Subscription Type not found',
        data: null,
      });
    }

    const paymentSuccess = true;
    if (!paymentSuccess) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: 'Payment failed',
        data: null,
      });
    }

    let newStartDate = new Date();

    const existingVoucher = await SubscriptionVoucherUser.findOne({
      userId,
      type: 'Voucher',
      status: { $in: ['active', 'expired'] },
    });

    if (existingVoucher?.status === 'active') {
      newStartDate = new Date(existingVoucher.endDate);
    }

    const existingSubscription = await SubscriptionVoucherUser.findOne({
      userId,
      type: 'Subscription',
      status: 'active',
    });

    if (existingSubscription && (!existingVoucher || existingVoucher.status !== 'active')) {
      newStartDate = new Date(existingSubscription.endDate);
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

    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + subscriptionPlan.validity);

    const newSubscription = new SubscriptionVoucherUser({
      userId,
      type: subscriptionType.type, 
      subscriptionPlanId,
      startDate: newStartDate,
      endDate: newEndDate,
      status: 'active',
      kmRadius: subscriptionPlan.kmRadius,
    });

    await newSubscription.save();

    await Provider.findByIdAndUpdate(userId, {
      subscriptionStatus: 1,
      isGuestMode: false,
      subscriptionType: subscriptionType.type,
      subscriptionPlanId: subscriptionPlanId,
      'address.radius': subscriptionPlan.kmRadius, 
    });
    

    return res.status(201).json({
      status: 201,
      success: true,
      message: 'Transaction successful and subscription activated',
      data: { transaction, newSubscription },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: 'Internal server error',
      data: error.message,
    });
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
        const subscribedUser = await SubscriptionVoucherUser.find({ userId }).populate('subscriptionPlanId');

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
            , subscribedUser
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


  
  
