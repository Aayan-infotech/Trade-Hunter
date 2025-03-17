const mongoose = require("mongoose");

const SubscriptionType = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SubscriptionType', SubscriptionType);
