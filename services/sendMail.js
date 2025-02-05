const nodemailer = require('nodemailer');

const sendEmail = async (recipient, subject, message) => {
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
        rejectUnauthorized: false, // Allow self-signed certificates (optional for development)
      },
    });

    const mailOptions = {
      from: 'Trade Hunter',
      to: recipient, // Recipient's email address
      subject: subject, // Subject line
      text: message, // Plain text body
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error('Email sending failed');
  }
};

module.exports = sendEmail;