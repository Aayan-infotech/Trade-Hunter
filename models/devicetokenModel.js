const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const devicetokenSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true // Ensure only one token per user
    },
    deviceToken: {
        type: String,
        required: false, // Can be null but shouldn't be empty
    },
    deviceType: {
        type: String,
        enum: ['android', 'ios'], 
        required: true
    },
    userType: {
        type: String,
        enum: ["hunter", "provider"],
        required: true,
    }
});

module.exports = mongoose.model('DeviceToken', devicetokenSchema);
