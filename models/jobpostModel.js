  const mongoose = require('mongoose');

  const JobPostSchema = new mongoose.Schema({
    title: {
      type: String,
      required: true,
      trim: true
    },
    jobLocation: {
      location: {
        type: { type: String, enum: ['Point'], required: true },
        coordinates: { type: [Number], required: true }, // [longitude, latitude]
      },
      jobAddressLine: { type: String, required: true, trim: true },
      jobRadius: { type: Number, required: true },
      _id: false,
    },  

    estimatedBudget: {
      type: Number,
      required: true
    },
    businessType: {
      type: [String],
      required: true,
    },
    // services: {
    //   type: String,
    //   required: true,
    // },
    date: {
      type: Date,
      required: true
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
    user: { type: mongoose.Schema.Types.ObjectId, ref: "hunter", required: true },
    jobStatus: {
      type: String,
      enum: ['Pending','Assigned','InProgress','Completed'],
      default: 'Pending' 
    },
    jobAssigned:{
      type: String,
      enum: ['Cancel', 'ReAssign','Assigned'],
      default:'Assigned'
    },
  }, { timestamps: true });

  // Create 2dsphere index for geospatial queries
  JobPostSchema.index({ "jobLocation.location": "2dsphere" });

  module.exports = mongoose.model('JobPost', JobPostSchema);