const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  // Use port 587 for TLS (better for university networks than 465)
  const port = 587;
  return nodemailer.createTransport({
    host,
    port,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: true,
    debug: true
  });
}

async function sendOTPEmail(toEmail, otp) {
  const hasConfig = process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasConfig) {
    return { sent: false };
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: 'Your password reset OTP – Advisor',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #2c3e50;">Password Reset Request</h2>
          <p>Your one-time password (OTP) for resetting your password is:</p>
          <div style="background: #f4f7f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="letter-spacing: 5px; color: #e74c3c; margin: 0;">${otp}</h1>
          </div>
          <p>This code expires in 10 minutes. Do not share it with anyone.</p>
          <p>If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #7f8c8d;">&copy; 2024 Advisor Elite Trading. All rights reserved.</p>
        </div>
      `
    });
    return { sent: true };
  } catch (err) {
    console.error('Send OTP email error:', err.message || err);
    return { sent: false };
  }
}

async function sendWelcomeEmail(toEmail, userName) {
  const hasConfig = process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasConfig) {
    console.warn('SMTP configuration missing, skipping welcome email');
    return { sent: false };
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: 'Welcome to Advisor – Your Elite Trading Companion!',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 40px 20px; text-align: center; border-bottom: 1px solid #334155;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px;">ADVISOR</h1>
            <p style="margin-top: 10px; font-size: 16px; color: #94a3b8;">Elite Trading Terminal</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <h2 style="margin-bottom: 20px; font-size: 24px; color: #f8fafc;">Welcome, ${userName}!</h2>
            <p style="line-height: 1.6; color: #cbd5e1; font-size: 16px;">
              Thank you for joining <strong>Advisor</strong>. You've officially stepped into the next generation of stock market analysis and trading intelligence.
            </p>
            
            <div style="margin: 30px 0; background: rgba(56, 189, 248, 0.1); border-left: 4px solid #38bdf8; padding: 20px; border-radius: 4px;">
              <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #38bdf8;">What's Next?</h3>
              <ul style="padding-left: 20px; margin: 0; color: #cbd5e1; line-height: 1.6;">
                <li>Explore real-time market data</li>
                <li>Analyze stocks with AI-driven insights</li>
                <li>Monitor your portfolio performance</li>
                <li>Set smart alerts for market movements</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 40px;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/home" style="background: #38bdf8; color: #0f172a; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; transition: all 0.3s ease;">
                Go to Dashboard
              </a>
            </div>
          </div>
          
          <div style="padding: 20px 30px; background: #1e293b; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #334155;">
            <p style="margin: 0;">
              If you have any questions, feel free to reply to this email. Our support team is here to help!
            </p>
            <p style="margin: 10px 0 0 0;">
              &copy; 2024 Advisor Elite. Built for professional traders.
            </p>
          </div>
        </div>
      `
    });
    return { sent: true };
  } catch (err) {
    console.error('Send Welcome email error:', err.message || err);
    return { sent: false };
  }
}

module.exports = { sendOTPEmail, sendWelcomeEmail };

