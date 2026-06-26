const nodemailer = require('nodemailer');

// تنظیمات SMTP (از هاست یا سرویس ایمیل)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@cinemalive.runflare.run',
      to,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
}

module.exports = { sendEmail, transporter };
