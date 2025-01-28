const mongoose = require("mongoose");

// File Schema
const fileSchema = new mongoose.Schema({
  filename: String,
  path: String,
  size: Number,
  description: String,
  uploadedAt: { type: Date, default: Date.now },
});

// provider Schema
const providerSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: false,
    },
    contactName: {
      type: String,
      required: true,
    },
    address: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      addressText: { type: String, required: true, trim: true },
      radius: { type: Number, required: true },
      _id: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
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
    ABN_Number: {
      type: String,
      required: true,
    },
    businessType: {
      type: String,
      required: true,
    },
    businessType: [{ type: String }],
    userType: {
      type: String,
      required: true,
      default: "provider",
    },
    password: {
      type: String,
      required: true,
    },
    images: {
      type: String,
      required: false,
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
    refreshToken:{
      type: String,
    },
    files: [fileSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("provider", providerSchema);