
const mongoose = require("mongoose");

const MassNotificationSchema = new mongoose.Schema({
  userType: {
    type: String,
    enum: ["hunter", "provider"],
    required: true,
  },
  title:{
    type:String,
    required:true,
  },
  body: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("MassNotification", MassNotificationSchema);
