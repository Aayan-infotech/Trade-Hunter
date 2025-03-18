const Transaction = require('../models/TransactionModel');
const SubscriptionUser = require('../models/SubscriptionUserModel');
const SubscriptionPlan = require('../models/SubscriptionPlanModel');

exports.createTransaction = async (req, res) => {
    try {
        const { userId, subscriptionPlanId, amount, paymentMethod } = req.body;

        const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId);
        if (!subscriptionPlan) {
            return res.status(404).json({ message: 'Subscription Plan not found' });
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

        const subscriptionUser = new SubscriptionUser({
            userId,
            subscriptionPlanId,
            startDate,
            endDate,
            status: 'active',
            kmRadius: subscriptionPlan.kmRadius,
        });
        await subscriptionUser.save();

        res.status(201).json({ message: 'Transaction successful and subscription created', transaction, subscriptionUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
