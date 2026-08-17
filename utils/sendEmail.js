const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const mailUser = process.env.MAIL_USERNAME || process.env.EMAIL_USER || process.env.SMTP_USER || process.env.NODEMAILER_EMAIL;
  const mailPass = process.env.MAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.NODEMAILER_PASS;

  console.log(`Preparing to send email to ${options.email} using user ${mailUser || 'none'}`);

  // Use Gmail host/port if mailUser contains gmail.com, otherwise use custom SMTP host/port
  let transporterConfig;
  if (mailUser && mailUser.includes('gmail.com')) {
    transporterConfig = {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: mailUser,
        pass: mailPass
      },
      tls: {
        rejectUnauthorized: false
      }
    };
  } else {
    transporterConfig = {
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: process.env.SMTP_PORT || 2525,
      auth: {
        user: mailUser || '',
        pass: mailPass || ''
      }
    };
  }

  const transporter = nodemailer.createTransport(transporterConfig);

  const mailOptions = {
    from: `"MrHaile Hub" <${mailUser}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully:', info.messageId);
  return info;
};

module.exports = sendEmail;
