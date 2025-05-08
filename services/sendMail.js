const nodemailer = require('nodemailer');

const sendEmail = async (recipient, subject, htmlMessage) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587, 
      secure: false,
      auth: {
        user: 'development.aayaninfotech@gmail.com', 
        pass: 'defe qhhm kgmu ztkf',
      },
      tls: {
        rejectUnauthorized: false, 
      },
    });

    const mailOptions = {
      from: '"Trade Hunter" <development.aayaninfotech@gmail.com>',
      to: recipient,
      subject: subject,
      html: htmlMessage, 
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response); 
  } catch (error) {
    console.error('Error sending email:', error); 
    throw new Error('Email sending failed');
  }
};

module.exports = sendEmail;
