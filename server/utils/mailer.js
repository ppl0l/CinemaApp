const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info('Mailer: using Ethereal test account', {
      user: testAccount.user,
    });
  }

  return transporter;
}

async function sendPasswordResetEmail(to, resetToken) {
  const t = await getTransporter();
  const resetUrl = `${
    process.env.APP_URL || 'http://localhost:3000'
  }/reset-password?token=${resetToken}`;

  const info = await t.sendMail({
    from: process.env.MAIL_FROM || '"CineTrack" <no-reply@cinetrack.local>',
    to,
    subject: 'Восстановление доступа CineTrack',
    text: `Для сброса пароля перейдите по ссылке: ${resetUrl}`,
    html: `<p>Для сброса пароля перейдите по ссылке:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  logger.info('Password reset email sent', {
    to,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  });
}

module.exports = { sendPasswordResetEmail };
