const nodemailer = require('nodemailer');

const sendEmail = async (recipient, subject, message) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587, 
      secure: false,
      auth: {
        user: 'anurag777222111@gmail.com', // Your Gmail address
        pass: 'urgq fwgv rgla tvec', // Your App Password
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

    console.log(`Email sent to ${recipient}: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email sending failed');
  }
};

module.exports = sendEmail;
