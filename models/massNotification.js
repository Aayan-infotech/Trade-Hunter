const mongoose = require("mongoose");

const MassNotificationSchema = new mongoose.Schema({
  userType: {
    type: String,
    enum: ["hunter", "provider"],
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
  type: {
    type: String,
    default: 'mass'
  },
  readBy: [{ type: mongoose.Schema.Types.ObjectId }],
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("MassNotification", MassNotificationSchema);
