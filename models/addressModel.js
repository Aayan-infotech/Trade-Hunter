const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  addressType: {
    type: String,
    required: true,
    enum: ["home", "office", "others"],
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  radius: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Address", addressSchema);