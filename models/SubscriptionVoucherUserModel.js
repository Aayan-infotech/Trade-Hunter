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
    ref: 'SubscriptionPlan',
    required: false 
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher',
    required: false 
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
   tokenCustomerId: {
    type: String,
    required: true,
    trim: true,
    description: "eWAY TokenCustomerID (used for recurring charges)",
  },
  nextChargeDate: {
    type: Date,
    required: true,
    description: "The date when the next recurring charge should run",
    index: true,
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
