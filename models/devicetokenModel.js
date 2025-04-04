const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const devicetokenSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    deviceToken: {
        type: String,
        required: true
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
