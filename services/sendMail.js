const nodemailer = require('nodemailer');
const { getSecrets } = require('../utils/awsSecrets');

let secrets;

// Load secrets from AWS Secrets Manager
(async () => {
  try {
    secrets = await getSecrets();
    if (!secrets.MAIL_HOST || !secrets.EMAIL_USER || !secrets.EMAIL_PASS) {
      console.error("❌ Missing MAIL_HOST, EMAIL_USER, or EMAIL_PASS in AWS Secrets");
    }
  } catch (err) {
    console.error("❌ Failed to load email secrets from AWS:", err);
  }
})();

/**
 * @param {string} recipient    – the “to” address
 * @param {string} subject      – the e-mail subject line
 * @param {string} htmlMessage  – the HTML body
 * @param {Array<Object>} attachments – optional array of attachments
 */
const sendEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    if (!secrets || !secrets.MAIL_HOST || !secrets.EMAIL_USER || !secrets.EMAIL_PASS) {
      throw new Error('General email secrets not loaded or incomplete');
    }

    const transporter = nodemailer.createTransport({
      host: secrets.MAIL_HOST,
      port: 587,
      secure: false,
      auth: {
        user: secrets.EMAIL_USER,
        pass: secrets.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: '"Trade Hunters" <verification@tradehunters.com.au>',
      to: recipient,
      subject: subject,
      html: htmlMessage,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 General email sent:', info.response);
  } catch (error) {
    console.error('❌ Error sending general email:', error);
    throw new Error('General email sending failed');
  }
};

module.exports = sendEmail;
