const mongoose = require("mongoose");
const Address = require("./addressModel"); 

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
    password: {
      type: String,
      required: true,
    },
    addresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address", 
      },
    ],
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
      type: Boolean,
      default: false,
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
      default: false,
    },
    files: [fileSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);