const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
  type: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  planName: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  validity: {
    type: Number, // in days
    required: true
  },
  description: {
    type: String,
    required: false
  },
  kmRadius: {
    type: Number,
    default: null // Default value
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  leadCount: {
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

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
