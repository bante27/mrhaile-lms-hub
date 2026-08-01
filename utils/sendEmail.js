const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const mailUser = process.env.MAIL_USERNAME || process.env.EMAIL_USER || process.env.SMTP_USER || process.env.NODEMAILER_EMAIL;
  const mailPass = process.env.MAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.NODEMAILER_PASS;

  // Use Gmail service if mailUser contains gmail.com, otherwise use custom SMTP host/port
  let transporterConfig;
  if (mailUser && mailUser.includes('gmail.com')) {
    transporterConfig = {
      service: 'gmail',
      auth: {
        user: mailUser,
        pass: mailPass
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
    from: `"MrHaile Hub" <${mailUser || 'noreply@mrhaile.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
