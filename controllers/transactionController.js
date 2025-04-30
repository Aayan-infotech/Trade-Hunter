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
    let newStatus = 'active';      

    const existingVoucher = await SubscriptionVoucherUser.findOne({
      userId,
      type: 'Voucher',
      status: { $in: ['active', 'expired'] },
    });

    if (existingVoucher?.status === 'active') {
      newStartDate = new Date(existingVoucher.endDate);
    }

    const existingActiveSubscription = await SubscriptionVoucherUser.findOne({
      userId,
      status: 'active',
    });

    if (existingActiveSubscription) {
      newStartDate = new Date(existingActiveSubscription.endDate);
      newStatus = 'upcoming';
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
      status: newStatus,
      kmRadius: subscriptionPlan.kmRadius,
    });
    await newSubscription.save();

    if (newStatus === 'active') {
      await Provider.findByIdAndUpdate(userId, {
        subscriptionStatus: 1,
        isGuestMode: false,
        subscriptionType: subscriptionType.type,
        subscriptionPlanId: subscriptionPlanId,
        'address.radius': subscriptionPlan.kmRadius * 1000,
      });
    }

    return res.status(201).json({
      status: 201,
      success: true,
      message: `Transaction successful and ${newStatus} subscription created`,
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



  exports.getSubscriptionByUserId = async (req, res) => {
    try {
      const { userId } = req.user;
  
      // Get all transactions of the user
      const transactions = await Transaction.find({ userId }).populate('subscriptionPlanId');
  
      // Get all subscriptions with relevant info
      const subscriptions = await SubscriptionVoucherUser.find({ userId }).select('startDate endDate status subscriptionPlanId');
  
      // Combine both
      const combinedData = transactions.map((txn) => {
        const matchedSubscription = subscriptions.find((sub) =>
          String(sub.subscriptionPlanId) === String(txn.subscriptionPlanId._id)
        );
  
        return {
          ...txn.toObject(),
          startDate: matchedSubscription?.startDate || null,
          endDate: matchedSubscription?.endDate || null,
          status: matchedSubscription?.status || null,
        };
      });
  
      return res.status(200).json({
        status: 200,
        success: true,
        message: 'Data fetched successfully',
        data: combinedData,
      });
    } catch (error) {
      return res.status(500).json({
        status: 500,
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  };
  
  
  
  

  
  
