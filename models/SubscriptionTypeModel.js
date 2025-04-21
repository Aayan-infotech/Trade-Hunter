const mongoose = require("mongoose");

const SubscriptionTypeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports =
  mongoose.models.SubscriptionType ||
  mongoose.model("SubscriptionType", SubscriptionTypeSchema);
