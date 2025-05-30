const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const fileSchema = new mongoose.Schema({
  filename: String,
  path: String,
  size: Number,
  description: String,
  uploadedAt: { type: Date, default: Date.now },
});

const providerSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: false },
    contactName: { type: String, required: true },
    address: {
      location: {
        type: { type: String, enum: ["Point"], required: true },
        coordinates: { type: [Number], required: true },
      },
      addressLine: { type: String, required: true, trim: true },
      radius: { type: Number, required: true },
      _id: false,
    },
    email: { type: String, required: true, unique: true },
    phoneNo: {
      type: String,
      required: true,
    },
    ABN_Number: { type: String, required: true },
    businessType: { type: [String], required: true },
    userType: { type: String, required: true, default: "provider" },
    password: { type: String, required: true },
    images: { type: String, required: false },
    userStatus: {
      type: String,
      enum: ["Active", "Suspended", "Pending"],
      default: "Active",
    },
    emailVerified: { type: Number, default: 0, required: true },
    documentStatus: { type: Number, default: 0, required: true },
    isDeleted: { type: Boolean, default: false },
    subscriptionStatus: { type: Number, default: 0, required: true },
    adminVerified: {
      type: String,
      enum: ["Verified", "Not-Verified"],
      default: "Verified",
    },
    insBy: { type: String, enum: ["app", "web"] },
    insDate: { type: Date, default: Date.now },
    insIp: { type: String },
    verificationOTP: { type: String },
    verificationOTPExpires: { type: Date },
    termsAndCondition: { type: Boolean, default: true },
    accountStatus: {
      type: String,
      enum: ["Suspend", "Deactivate", "Reactivate"],
      default: "Reactivate",
    },
    refreshToken: { type: String },
    token: { type: String },
    isGuestMode: { type: Boolean, default: true, required: false },
    jobAcceptCount: { type: Number, default: 0, required: false },
    subscriptionType: {
      type: String,
      ref: "SubscriptionPlan",
      default: null,
    },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },
    
    jobCompleteCount: { type: Number, default: 0, required: false },
    leadCompleteCount: { type: Number, default: 0, required: false },
    UID: { type: String, default: null },
    assignedJobs: [{ type: ObjectId, ref: "JobPost", default: [] }],
    files: [fileSchema],
    about: { type: String, required: false, trim: true },
    isNotificationEnable: { type: Boolean, default: true },
    ewayTokenCustomerId: { type: String, default: null },
  },
  { timestamps: true }
);

providerSchema.index({ "address.location": "2dsphere" });

module.exports = mongoose.model("Provider", providerSchema);
