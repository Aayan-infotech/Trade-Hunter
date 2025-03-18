const mongoose = require('mongoose');

const voucherUserSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider', 
        required: true
    },
    voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voucher',
        required: true
    },
    kmRadius: {
        type: Number,
        required: false
    },
    code: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('VoucherUser', voucherUserSchema);
