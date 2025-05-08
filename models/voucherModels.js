const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: 1 ,
        required:true
    },
    usedCount: {
        type: Number,
        default: 0,
        required:false
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

voucherSchema.methods.isValid = function () {
    const now = new Date();
    return this.isActive && this.usedCount < this.usageLimit && now >= this.startDate && now <= this.endDate;
};
  
module.exports = mongoose.model('Voucher', voucherSchema);
