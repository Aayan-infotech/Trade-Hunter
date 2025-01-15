// models/JobPost.js

const mongoose = require('mongoose');

const JobPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  estimatedBudget: {
    type: Number,
    required: true
  },
  radius: {
    type: Number,
    required: true
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['Cleaning', 'Plumbing', 'Electrician', 'Gardening', 'Others']
  },
  service: {
    type: String,
    required: true
  },
  timeframe: {
    from: {
      type: Date,
      required: true
    },
    to: {
      type: Date,
      required: true
    }
  },
  document: {
    type: String, // This will store the S3 bucket URL for the uploaded document
    required: false
  },
  requirements: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('JobPost', JobPostSchema);
