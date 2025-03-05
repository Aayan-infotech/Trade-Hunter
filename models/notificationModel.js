const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['hunter', 'provider'],
    required: true,
  },
  type: {
    type: String,
    enum: ['alert', 'reminder', 'promotion'],
    required: false,
  },
  text: {
    type: String,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
