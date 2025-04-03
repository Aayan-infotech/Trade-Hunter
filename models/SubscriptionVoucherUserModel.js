// const mongoose = require('mongoose');

// const SubscriptionUserSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Provider',
//     required: true
//   },
//   subscriptionPlanId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'SubscriptionPlan',
//     required: true
//   },
//   startDate: {
//     type: Date,
//     required: true,
//     default: Date.now
//   },
//   endDate: {
//     type: Date,
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['active', 'expired', 'cancelled'],
//     default: 'active'
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   kmRadius: {
//     type: Number,
//     required: false,
//     default: null // Default value
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model('SubscriptionUser', SubscriptionUserSchema);




const mongoose = require('mongoose');

const SubscriptionVoucherUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  type: {
    type: String,
    enum: ['Voucher', 'Subscription'], 
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
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  kmRadius: {
    type: Number,
    required: true,
    default: 10
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
