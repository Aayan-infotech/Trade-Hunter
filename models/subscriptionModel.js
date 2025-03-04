const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ["advertising", "pay per lead", "subscription"],
    }
}, {timestamps: true}
);

module.exports = mongoose.model('Subscription', SubscriptionSchema);