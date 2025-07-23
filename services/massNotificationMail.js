require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * @param {string} recipients    – the “to” address(es)
 * @param {string} subject       – the e-mail subject line
 * @param {string} htmlMessage   – the HTML body
 * @param {Array<Object>} attachments – optional array of attachments
 */
const massNotifcationEmail = async (recipients, subject, htmlMessage, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MASS_SMTPHOST,
      port: process.env.MASS_SMTPPORT,
      secure: false, 
      auth: {
        user: process.env.MASS_SMTPUSERNAME,
        pass: process.env.MASS_SMTPPASSWORD,
      },
      tls: { rejectUnauthorized: false },
    });
    const mailOptions = {
      from: `"Trade Hunters" <${process.env.MASS_SMTPFROM}>`,
      to: recipients,
      subject: "Trade Hunters",
      html: htmlMessage,
      attachments: attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email sending failed');
  }
};

module.exports = massNotifcationEmail;