const nodemailer = require('nodemailer');

/**
 * Sends an email using Nodemailer.
 * Configured with environment variables, falls back to test account or logs if unconfigured.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    let transporter;

    const smtpUser = process.env.SMTP_USER && process.env.SMTP_USER !== 'your-email@gmail.com' ? process.env.SMTP_USER.trim() : null;
    const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : null;

    if (process.env.SMTP_HOST && smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      // Fallback test account (Ethereal) for development when no SMTP credentials provided
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"BoardSync Team" <noreply@boardsync.com>',
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Message ID: ${info.messageId} to ${to}`);
    
    // If using Ethereal test account, print preview URL for verification
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email Preview URL]: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;
