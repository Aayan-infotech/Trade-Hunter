const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pushNotificationSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,  
        },
        receiverId:{
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        notificationType: { 
            type: String,
            enum: ['job_alert', 'voucher_update', 'job_accept', 'system_alert'], 
            required: false
        }
    },
    { timestamps: true }

);

module.exports = mongoose.model('PushNotification', pushNotificationSchema);