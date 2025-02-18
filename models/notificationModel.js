const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['hunter', 'Provider'],
    required: true,
  },
  type: {
    type: String,
    enum: ['alert', 'reminder', 'promotion'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
