const crypto = require("crypto");

const generateVerificationOTP = async (user) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.verificationOTP = otp;
  user.verificationOTPExpires = Date.now() + 10 * 60 * 1000; 

  await user.save();

  return otp;
};

module.exports = generateVerificationOTP;
