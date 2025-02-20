const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: { type: [String], default: [] } 
});

module.exports= mongoose.model("Service", serviceSchema);