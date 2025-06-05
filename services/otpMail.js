// services/sendMail.js
const nodemailer = require('nodemailer');

/**
 * @param {string} recipient    – the “to” address
 * @param {string} subject      – the e-mail subject line
 * @param {string} htmlMessage  – the HTML body
 * @param {Array<Object>} attachments – optional array of attachments
 */
const otpEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'otp.tradehunters@gmail.com',
        pass: 'bzfi lafd ozio usif',
      },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from:    '"Trade Hunters" <verification@tradehunters.com.au>',
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

module.exports = otpEmail;