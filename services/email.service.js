import nodemailer from 'nodemailer';

let testTransporterMock = null;

/**
 * Hook for test suites to mock/stub Nodemailer transporter.
 */
export function setTestTransporterMock(mock) {
  testTransporterMock = mock;
}

export function getTransporter() {
  if (testTransporterMock) {
    return testTransporterMock;
  }

  const host = process.env.SMTP_HOST || 'localhost';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: user && pass ? { user, pass } : undefined,
  });
}

/**
 * Sends a 6-digit OTP verification code via Nodemailer.
 */
export async function sendOtpEmail({ to, otp, expiresMinutes = 10 }) {
  const transporter = getTransporter();

  const from = process.env.SMTP_FROM || 'EventRoster Operations <no-reply@eventroster.co.uk>';

  const mailOptions = {
    from,
    to,
    subject: 'Password Reset Verification Code',
    text: `Your password reset verification code is: ${otp}\n\nThis code is valid for ${expiresMinutes} minutes. If you did not request a password reset, please ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #03045e;">Password Reset Request</h2>
        <p>You requested a password reset for your EventRoster operations account.</p>
        <div style="background-color: #caf0f8; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <p style="font-size: 14px; color: #0077b6; margin: 0 0 8px 0;">Your 6-Digit Verification Code:</p>
          <h1 style="font-size: 32px; letter-spacing: 6px; color: #03045e; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 13px; color: #666;">This code is valid for ${expiresMinutes} minutes. If you did not request a password reset, please ignore this email.</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}
