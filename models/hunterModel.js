const mongoose = require("mongoose");

// File Schema
const fileSchema = new mongoose.Schema({
  filename: String,
  path: String,
  size: Number,
  description: String,
  uploadedAt: { type: Date, default: Date.now },
});


// User Schema
const hunterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    images: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNo: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    userType: {
      type: String,
      required: true,
      enum: ["hunter"],
    },

    userStatus: {
      type: String,
      enum: ['Active', 'Suspended', 'Pending'],
      default: 'Active'
    },
    emailVerified: {
      type: Number,
      default: 0,
      required: true,
    },
    insBy: {
      type: String,
      enum: ["app", "web"],
    },
    insDate: {
      type: Date,
      default: Date.now(),
    },
    insIp: {
      type: String,
    },
    verificationOTP: {
      type: String,
    },
    verificationOTPExpires: {
      type: Date,
    },
    termsAndCondition: {
      type: Boolean,
      default: true,
    },
    accountStatus: {
      type: String,
      enum: ['Suspend', 'Deactivate', 'Reactivate'],
      default: 'Reactivate'
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    address: {
      location: {
        type: { type: String, enum: ['Point'], required: false },
        coordinates: { type: [Number], required: false }, // [longitude, latitude]
      },
      addressLine: { type: String, required: false, trim: true },
      radius: { type: Number, required: false },
      _id: false,
    },
    refreshToken: {
      type: String,
    },
    token: {
      type: String,
    },
    UID: {
      type: String,
      // unique: true,
      default: null,
    },    
    files: [fileSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("hunter", hunterSchema);