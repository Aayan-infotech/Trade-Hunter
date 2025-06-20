require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * @param {string} recipient    – the “to” address
 * @param {string} subject      – the e-mail subject line
 * @param {string} htmlMessage  – the HTML body
 * @param {Array<Object>} attachments – optional array of attachments
 */
const helpEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER_HELP,
        pass: process.env.EMAIL_USER_HELP,
      },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from:    '"Trade Hunters" <help.tradehunters@gmail.com>',
      to:      recipient,
      subject: subject,
      html:    htmlMessage,
      attachments,     
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email sending failed');
  }
};

module.exports = helpEmail;