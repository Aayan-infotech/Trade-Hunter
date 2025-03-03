const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
    {
        transactionId: {
            type: Number,
            required: true,
        },
        transactionDate: {
            type: Date,
            required: true,
        },
        transactionStatus: {
            type: String,
            required: true,
            enum: ["Successful", "Pending", "Cancel"],
        },
        transactionAmount: {
            type: Number,
            required: true,
        },
        transactionMode: {
            type: String,
            required: true,
        },
        SubscriptionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Subscription", 
        },
        SubscriptionAmount: {
            type: Number,
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Provider", 
        },
        type: {
            type: String,
            required: true,
            enum: ["advertising", "pay per lead", "subscription"],
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);