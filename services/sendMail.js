// services/sendMail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter once using environment variables
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

/**
 * @param {string} recipient    
 * @param {string} subject     
 * @param {string} htmlMessage 
 * @param {Array<Object>} attachments 
 */
const sendEmail = async (recipient, subject, htmlMessage, attachments = []) => {
  try {
    const mailOptions = {
      from:    `"Trade Hunter" <${process.env.EMAIL_USER}>`,
      to:      recipient,
      subject,
      html:    htmlMessage,
      attachments,
    };

    // Verify transporter configuration
    await transporter.verify();
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Propagate original error for better debugging
    throw error;
  }
};

module.exports = sendEmail;