// services/sendMail.js
const nodemailer = require('nodemailer');

/**
 * @param {string} recipient    – the “to” address
 * @param {string} subject      – the e-mail subject line
 * @param {string} htmlMessage  – the HTML body
 * @param {Array<Object>} attachments – optional array of attachments
 */
const sendEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'development.aayaninfotech@gmail.com',
        pass: 'defe qhhm kgmu ztkf',
      },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from:    '"Trade Hunter" <development.aayaninfotech@gmail.com>',
      to:      recipient,
      subject: subject,
      html:    htmlMessage,
      attachments,          // ← include attachments here
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email sending failed');
  }
};

module.exports = sendEmail;