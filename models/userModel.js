const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
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
    phoneNo: {
      type: Number,
      max: 10,
    },
    alternatePhoneNo: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v); // Ensures exactly 10 digits
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
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
    serviceType: {
      type: String,
    },
    userType: {
      type: String,
      required: true,
      enum: ["hunter", "provider"],
    },
    userStatus: {
      type: Boolean,
      default: false, // default to false until verification
    },
    emailVerified: {
      type: Boolean,
      default: false, // default to false until verification
    },
    documentStatus: {
      type: Boolean,
      default: false,
    },
    subscriptionStatus: {
      type: Boolean,
      default: false,
    },
    insBy: {
      type: String,
      enum: ["app", "web"],
    },
    insDate: {
      type: String,
    },
    insIp: {
      type: String,
    },
    verificationToken: {
      type: String,
    },
    verificationTokenExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
