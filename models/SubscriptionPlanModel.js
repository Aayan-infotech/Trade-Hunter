const mongoose = require("mongoose");

const SubscriptionPlanSchema = new mongoose.Schema({
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubscriptionType",
    required: true,
  }, 
  planName: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  validity: { type: Number, required: true }, 
  description: { type: String, required: false },
  kmRadius: { type: Number, default: null }, 
  status: { type: String, enum: ["active", "inactive" ,"upcoming"], default: "active" },
  leadCount: { type: Number, default: null }, 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);
