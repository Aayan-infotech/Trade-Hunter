const nodemailer = require('nodemailer');
const { getSecrets } = require('../utils/awsSecrets');

let cachedSecrets;

/**
 * @param {string} recipient    – the “to” address
 * @param {string} subject      – the e-mail subject line
 * @param {string} htmlMessage  – the HTML body
 * @param {Array<Object>} attachments – optional array of attachments
 */
const invoicesEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    if (!cachedSecrets) {
      cachedSecrets = await getSecrets();
    }

    const mailHost = cachedSecrets.MAIL_HOST || process.env.MAIL_HOST;
    const emailUser = cachedSecrets.EMAIL_USER_INVOICE || process.env.EMAIL_USER_INVOICE;
    const emailPass = cachedSecrets.EMAIL_PASS_INVOICE || process.env.EMAIL_PASS_INVOICE;

    if (!mailHost || !emailUser || !emailPass) {
      throw new Error("❌ Missing EMAIL_USER_INVOICE, EMAIL_PASS_INVOICE, or MAIL_HOST");
    }

    const transporter = nodemailer.createTransport({
      host: mailHost,
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: `"Trade Hunters" <${emailUser}>`,
      to: recipient,
      subject,
      html: htmlMessage,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📨 Invoice Email sent:', info.response);
  } catch (error) {
    console.error('❌ Error sending invoice email:', error.message);
    throw new Error('Email sending failed');
  }
};

module.exports = invoicesEmail;
