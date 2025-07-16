const SubscriptionVoucherUser = require('../models/SubscriptionVoucherUserModel');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
import { getSecrets } from "../utils/awsSecrets";
const secrets = await getSecrets();

const checkSubscriptionOrVoucher = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authorization token required' });
        }

        const decoded = jwt.verify(token.split(' ')[1], secrets.JWT_SECRET);
        const userId = decoded.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const record = await SubscriptionVoucherUser.findOne({ userId }).sort({ endDate: -1 });

        if (!record) {
            return res.status(404).json({ success: false, message: 'No active subscription or voucher found' });
        }

        if (record.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'User ID mismatch' });
        }

        const currentDate = new Date();
        if (currentDate > record.endDate || record.status !== 'active') {
            return res.status(403).json({ success: false, message: `Subscription/Voucher expired`, status: false, endDate: record.endDate });
        }
        
        req.subscriptionOrVoucher = record; 
        next();
    } catch (error) {
        console.error('Error in checkSubscriptionOrVoucher middleware:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


module.exports = {
    checkSubscriptionOrVoucher
  };
