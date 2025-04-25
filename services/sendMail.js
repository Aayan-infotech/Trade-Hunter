const nodemailer = require('nodemailer');

const sendEmail = async (recipient, subject, htmlMessage) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587, 
      secure: false,
      auth: {
        user: 'development.aayaninfotech@gmail.com', // Your Gmail address
        pass: 'defe qhhm kgmu ztkf', // Your App Password
      },
      tls: {
        rejectUnauthorized: false, // Optional for development
      },
    });

    const mailOptions = {
      from: '"Trade Hunter" <development.aayaninfotech@gmail.com>',
      to: recipient,
      subject: subject,
      html: htmlMessage, // ✅ Send as HTML, not plain text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response); // Optional logging
  } catch (error) {
    console.error('Error sending email:', error); // Optional debugging
    throw new Error('Email sending failed');
  }
};

module.exports = sendEmail;
