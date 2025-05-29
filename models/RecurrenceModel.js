// models/RecurrenceModel.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

const RecurrenceSchema = new Schema({
  userId:          { type: Schema.Types.ObjectId, ref: "Provider", required: true, index: true },
  planId:          { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
  tokenCustomerID: { type: String, required: true },
  interval:        { type: String, enum: ["monthly"], default: "monthly" },
  nextDate:        { type: Date, required: true },
  remainingCycles: { type: Number, required: true },
  amountCents:     { type: Number, required: true },
  currencyCode:    { type: String, required: true },
  status:          { type: String, enum: ["active","cancelled","completed"], default: "active" },
}, { timestamps: true });

module.exports = mongoose.model("Recurrence", RecurrenceSchema);
