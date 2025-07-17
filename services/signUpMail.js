const nodemailer = require('nodemailer');
const { getSecrets } = require('../utils/awsSecrets');

let cachedSecrets;

/**
 * @param {string} recipient    – the “to” address
 * @param {string} subject      – the e-mail subject line
 * @param {string} htmlMessage  – the HTML body
 * @param {Array<Object>} attachments – optional array of attachments
 */
const signUpEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    if (!cachedSecrets) {
      cachedSecrets = await getSecrets();
    }

    const mailHost = cachedSecrets.MAIL_HOST || process.env.MAIL_HOST;
    const emailUser = cachedSecrets.EMAIL_USER_SIGNUP || process.env.EMAIL_USER_SIGNUP;
    const emailPass = cachedSecrets.EMAIL_PASS_SIGNUP || process.env.EMAIL_PASS_SIGNUP;

    if (!mailHost || !emailUser || !emailPass) {
      throw new Error("❌ Missing MAIL_HOST, EMAIL_USER_SIGNUP, or EMAIL_PASS_SIGNUP");
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
      from: '"Trade Hunters" <signup.tradehunters@gmail.com>',
      to: recipient,
      subject,
      html: htmlMessage,
      attachments,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('📨 Signup Email sent:', info.response);
  } catch (error) {
    console.error('❌ Error sending signup email:', error.message);
    throw new Error('Signup email sending failed');
  }
};

module.exports = signUpEmail;
