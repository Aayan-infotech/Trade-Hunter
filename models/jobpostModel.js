const mongoose = require('mongoose');

const JobPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  jobLocation: {
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true }, 
    },
    city: { type: String, required: true },
    jobAddressLine: { type: String, required: true, trim: true },
    jobRadius: { type: Number, required: true },
    _id: false,
  },
  estimatedBudget: {
    type: Number,
    required: false,
  },
  businessType: {
    type: [String],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  timeframe: {
    from: {
      type: Number,
      required: false,
    },
    to: {
      type: Number,
      required: false,
    },
  },
  documents: {
    type: [String],
    required: false,
  },
  requirements: {
    type: String,
    required: true,
    trim: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "hunter", required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "Provider", default: null },
  jobStatus: {
    type: String,
    enum: ['Pending', 'Assigned', 'Completed', 'Deleted'],
    default: 'Pending',
  },
  jobAssigned: {
    type: String,
    enum: ['Cancel', 'ReAssign', 'Assigned'],
    default: 'Assigned',
  },
  jobAcceptCount: {
    type: [{
      providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider', 
      }
    }],
    default: []
  },
  completionNotified: {
    type: Boolean,
    default: false,
  },
  completionDate: {
    type: Date,
    default: null,
  },
  

  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "hunter", default: null },
}, { timestamps: true });

JobPostSchema.index({ "jobLocation.location": "2dsphere" });




module.exports = mongoose.model('JobPost', JobPostSchema);
