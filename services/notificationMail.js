const nodemailer = require('nodemailer');
const { getSecrets } = require('../utils/awsSecrets');

let secrets;

// Load secrets from AWS Secrets Manager
(async () => {
  try {
    secrets = await getSecrets();
    if (!secrets.MAIL_HOST || !secrets.EMAIL_USER_NOTIFICATION || !secrets.EMAIL_PASS_NOTIFICATION) {
      console.error("❌ Missing MAIL_HOST, EMAIL_USER_NOTIFICATION, or EMAIL_PASS_NOTIFICATION in AWS Secrets");
    }
  } catch (err) {
    console.error("❌ Failed to load notification email secrets from AWS:", err);
  }
})();

/**
 * @param {string} recipient    – the “to” address
 * @param {string} subject      – the e-mail subject line
 * @param {string} htmlMessage  – the HTML body
 * @param {Array<Object>} attachments – optional array of attachments
 */
const notificationEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    if (!secrets || !secrets.MAIL_HOST || !secrets.EMAIL_USER_NOTIFICATION || !secrets.EMAIL_PASS_NOTIFICATION) {
      throw new Error('Notification email secrets not loaded or incomplete');
    }

    const transporter = nodemailer.createTransport({
      host: secrets.MAIL_HOST,
      port: 587,
      secure: false,
      auth: {
        user: secrets.EMAIL_USER_NOTIFICATION,
        pass: secrets.EMAIL_PASS_NOTIFICATION,
      },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: '"Trade Hunters" <notifications.tradehunters@gmail.com>',
      to: recipient,
      subject: subject,
      html: htmlMessage,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Notification email sent:', info.response);
  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    throw new Error('Notification email sending failed');
  }
};

module.exports = notificationEmail;
