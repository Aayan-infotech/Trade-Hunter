const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true }, 
  services: { type: [String], default: [] } 
});

module.exports= mongoose.model("Service", serviceSchema);