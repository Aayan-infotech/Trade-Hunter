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
    default: "mass",
  },
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isRead: {
    type: Boolean,
    default: false,
  },
  deletedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ], 
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

MassNotificationSchema.index({ userType: 1, createdAt: -1 });

module.exports = mongoose.model(
  "MassNotification",
  MassNotificationSchema
);
