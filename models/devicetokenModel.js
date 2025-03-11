const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const devicetokenSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    token: {
        type: String,
        required: true
    },
});
module.exports = mongoose.model('DeviceToken', devicetokenSchema);