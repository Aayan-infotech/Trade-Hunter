const nodemailer = require('nodemailer');
const { getSecrets } = require('../utils/awsSecrets');

let secrets;

// Load secrets from AWS Secrets Manager
(async () => {
  try {
    secrets = await getSecrets();
    if (!secrets.MAIL_HOST || !secrets.EMAIL_USER_OTP || !secrets.EMAIL_PASS_OTP) {
      console.error("❌ Missing MAIL_HOST, EMAIL_USER_OTP, or EMAIL_PASS_OTP in AWS Secrets");
    }
  } catch (err) {
    console.error("❌ Failed to load OTP email secrets from AWS:", err);
  }
})();

/**
 * @param {string} recipient    – the “to” address
 * @param {string} subject      – the e-mail subject line
 * @param {string} htmlMessage  – the HTML body
 * @param {Array<Object>} attachments – optional array of attachments
 */
const otpEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    if (!secrets || !secrets.MAIL_HOST || !secrets.EMAIL_USER_OTP || !secrets.EMAIL_PASS_OTP) {
      throw new Error('OTP email secrets not loaded or incomplete');
    }

    const transporter = nodemailer.createTransport({
      host: secrets.MAIL_HOST,
      port: 587,
      secure: false,
      auth: {
        user: secrets.EMAIL_USER_OTP,
        pass: secrets.EMAIL_PASS_OTP,
      },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: '"Trade Hunters" <otp.tradehunters@gmail.com>',
      to: recipient,
      subject: subject,
      html: htmlMessage,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 OTP email sent:', info.response);
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('OTP email sending failed');
  }
};

module.exports = otpEmail;
