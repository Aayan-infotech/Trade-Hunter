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
  businessType: {
    type: String,
    required: true,
  },
  services: {
    type: String,
    required: true,
  },
  timeframe: {
    from: {
      type: Number,
      required: true
    },
    to: {
      type: Number,
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
    enum: ['Pending', 'Accepted', 'Completed' ],
    default: 'Pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('JobPost', JobPostSchema);