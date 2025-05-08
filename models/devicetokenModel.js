const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const devicetokenSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true
    },
    deviceToken: {
        type: String,
        required: false, 
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
