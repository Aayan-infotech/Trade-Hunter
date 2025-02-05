const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isSelected: {
    type: Number,
    default: 0,
    required: true,
  },
  addressType: {
    type: String,
    required: true,
    enum: ["home", "office", "others"],
    default: "home",
  },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  radius: {
    type: Number,
    required: false,
    default: 10, // Default radius in km
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create 2dsphere index for geospatial queries
addressSchema.index({ location: '2dsphere' });

module.exports = mongoose.model("Address", addressSchema);
