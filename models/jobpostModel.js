const mongoose = require('mongoose');

const JobPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, required: true, trim: true },
    },
    // required: true,
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
    required: true,
    enum: ['Cleaning', 'Plumbing', 'Electrician', 'Gardening', 'Others']
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
  documents: {
    type: [String],
    required: false,
  },
  requirements: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('JobPost', JobPostSchema);