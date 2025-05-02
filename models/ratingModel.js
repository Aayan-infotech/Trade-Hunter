const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({


  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hunter",
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Provider",
    required: true
  },
  jobId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobPost",
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  review: {
    type: String,
    required: true
  },
});

module.exports = mongoose.model("Rating", ratingSchema);
