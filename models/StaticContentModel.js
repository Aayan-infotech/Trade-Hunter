const mongoose = require('mongoose');

const StaticContentSchema = new mongoose.Schema({
  section: {
    type: String,
    enum: ['About Us', 'Terms & Conditions', 'Privacy Policy'],
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StaticContent', StaticContentSchema);
