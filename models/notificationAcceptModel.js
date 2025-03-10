const mongoose = require('mongoose');

const notificationAccepts = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, 
  },
  hunterID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, 
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, 
  },
  text: {
    type: String,
    required: true,
    trim: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('notificationAccepts', notificationAccepts);
