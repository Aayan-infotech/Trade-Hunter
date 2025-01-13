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
const userSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: false,
    },
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
      type:String,
      required: false,
    },
    phoneNo: {
      type: Number,
      max: 10,
    },
    password: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    phoneNo: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v); // Ensures exactly 10 digits
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    ABN_Number: {
      type: String,
    },
    businessType: {
      type: String,
    },
    serviceType: [{ type: String }],
    userType: {
      type: String,
      required: true,
      enum: ["hunter", "provider"],
    },
    userStatus: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Number,
      default: 0,
      required: true,
    },
    documentStatus: {
      type: Number,
      default: 0,
      required: true,
    },
    subscriptionStatus: {
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
      default: false,
    },
    files: [fileSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
