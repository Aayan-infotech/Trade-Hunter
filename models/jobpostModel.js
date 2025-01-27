const mongoose = require('mongoose');

const JobPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  location: {
      joblatitude: { type: Number, required: true },
      joblongitude: { type: Number, required: true },
      jobaddress: { type: String, required: true, trim: true },
      jobradius: { type: Number, required: true },
      _id:false,
  },

  estimatedBudget: {
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
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  jobStatus: {
    type: String,
    enum: ['pending', 'accepted', 'completed' ],
    default: 'pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('JobPost', JobPostSchema);