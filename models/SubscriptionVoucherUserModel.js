const mongoose = require('mongoose');

const SubscriptionVoucherUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  subscriptionPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan'
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher'
  },
  code: {
    type: String,
    required: function () {
      return this.voucherId ? true : false;
    }
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'upcoming'],
    default: 'active'
  },
  kmRadius: {
    type: Number,
    required: true,
    default: 160
  },
  autopayActive: {
    type: Boolean,
    default: false
  },
  subscriptionId: {
    type: String
  },
  paymentCount: {
    type: Number,
    default: 1 
  },
  retryCount: {
    type: Number,
    default: 0
  },
  nextPaymentDate: {
    type: Date
  },
  lastFailedAttempt: {
    type: Date
  },
  monthlyAmount: {
    type: Number,
    required: false 
  },
  installmentCount: {
    type: Number,
    default: 0
  },

  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  recurringCount: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SubscriptionVoucherUser', SubscriptionVoucherUserSchema);
