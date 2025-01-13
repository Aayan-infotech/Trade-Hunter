const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
});

locationSchema.index({ location: "2dsphere" }); // Create geospatial index

module.exports = mongoose.model("Location", locationSchema);