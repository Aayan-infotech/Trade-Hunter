const nodemailer = require('nodemailer');
const { getSecrets } = require('../utils/awsSecrets');

let secrets;

// Load secrets from AWS
(async () => {
  try {
    secrets = await getSecrets();
    if (!secrets.MAIL_HOST || !secrets.EMAIL_USER_HELP || !secrets.EMAIL_PASS_HELP) {
      console.error("❌ Missing MAIL_HOST, EMAIL_USER_HELP, or EMAIL_PASS_HELP in AWS Secrets");
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
const helpEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    if (!secrets || !secrets.MAIL_HOST || !secrets.EMAIL_USER_HELP || !secrets.EMAIL_PASS_HELP) {
      throw new Error('Secrets not initialized or missing required email configuration');
    }

    const transporter = nodemailer.createTransport({
      host: secrets.MAIL_HOST,
      port: 587,
      secure: false,
      auth: {
        user: secrets.EMAIL_USER_HELP,
        pass: secrets.EMAIL_PASS_HELP,
      },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: '"Trade Hunters" <help.tradehunters@gmail.com>',
      to: recipient,
      subject: subject,
      html: htmlMessage,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent:', info.response);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Email sending failed');
  }
};

module.exports = helpEmail;
