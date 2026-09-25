import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, passwordResetOtps, managerProfiles } from '../db/schema.js';
import { request } from './helpers/api.js';
import { getUniqueEmail, trackCreatedUser } from './helpers/testData.js';
import { setTestTransporterMock } from '../services/email.service.js';

describe('OTP Password Reset Suite (Nodemailer)', () => {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@anshil.co.uk').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminSecret123!';

  // In-memory capture of Nodemailer sent emails for automated test verification
  let sentMails = [];

  beforeEach(() => {
    sentMails = [];
    setTestTransporterMock({
      sendMail: async (mailOptions) => {
        sentMails.push(mailOptions);
        return { messageId: 'test_mail_123' };
      },
    });
  });

  test('POST /api/auth/forgot-password — returns generic response and calls Nodemailer with 6-digit OTP for active admin', async () => {
    const res = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: adminEmail },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(
      res.data.message,
      'If an account exists for that email, a verification OTP has been sent.'
    );
    assert.equal(res.data.debugToken, undefined, 'Raw OTP/debugToken MUST NOT be returned in API response');

    // Verify Nodemailer was invoked
    assert.equal(sentMails.length, 1, 'Nodemailer should be called once');
    assert.equal(sentMails[0].to, adminEmail);

    // Extract 6-digit OTP from email
    const match = sentMails[0].text.match(/(\d{6})/);
    assert.ok(match, 'Email text must contain a 6-digit numeric OTP');
    const rawOtp = match[1];
    assert.equal(rawOtp.length, 6);

    // Security check: Raw OTP must NOT be stored in database
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const [storedByRaw] = await db
      .select()
      .from(passwordResetOtps)
      .where(eq(passwordResetOtps.otpHash, rawOtp));
    assert.equal(storedByRaw, undefined, 'Raw OTP MUST NOT be stored in database');

    const [storedByHash] = await db
      .select()
      .from(passwordResetOtps)
      .where(eq(passwordResetOtps.otpHash, otpHash));
    assert.ok(storedByHash, 'SHA-256 OTP hash must be stored in database');
    assert.equal(storedByHash.usedAt, null, 'OTP should initially be unconsumed');
  });

  test('POST /api/auth/forgot-password — returns generic response and calls Nodemailer for active manager', async () => {
    const managerEmail = getUniqueEmail('active_mgr');
    const hash = await bcrypt.hash('ManagerPass123!', 10);

    const [user] = await db
      .insert(users)
      .values({ roleId: 2, email: managerEmail, passwordHash: hash, status: 'active' })
      .returning();
    trackCreatedUser(user.id);

    const res = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: managerEmail },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.message, 'If an account exists for that email, a verification OTP has been sent.');

    assert.equal(sentMails.length, 1);
    assert.equal(sentMails[0].to, managerEmail);
  });

  test('POST /api/auth/forgot-password — account enumeration protection for nonexistent email', async () => {
    const fakeEmail = getUniqueEmail('nonexistent');
    const res = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: fakeEmail },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.message, 'If an account exists for that email, a verification OTP has been sent.');
    assert.equal(sentMails.length, 0, 'Nodemailer should NOT send email for nonexistent user');
  });

  test('POST /api/auth/forgot-password — account enumeration protection for deleted account', async () => {
    const deletedEmail = getUniqueEmail('deleted_usr');
    const hash = await bcrypt.hash('TempPass123!', 10);

    const [user] = await db
      .insert(users)
      .values({
        roleId: 2,
        email: deletedEmail,
        passwordHash: hash,
        status: 'active',
        deletedAt: new Date(),
      })
      .returning();
    trackCreatedUser(user.id);

    const res = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: deletedEmail },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.message, 'If an account exists for that email, a verification OTP has been sent.');
    assert.equal(sentMails.length, 0, 'Nodemailer should NOT send email for deleted user');
  });

  test('POST /api/auth/forgot-password — account enumeration protection for inactive account', async () => {
    const inactiveEmail = getUniqueEmail('inactive_usr');
    const hash = await bcrypt.hash('TempPass123!', 10);

    const [user] = await db
      .insert(users)
      .values({
        roleId: 2,
        email: inactiveEmail,
        passwordHash: hash,
        status: 'inactive',
      })
      .returning();
    trackCreatedUser(user.id);

    const res = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: inactiveEmail },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.message, 'If an account exists for that email, a verification OTP has been sent.');
    assert.equal(sentMails.length, 0, 'Nodemailer should NOT send email for inactive user');
  });

  test('POST /api/auth/forgot-password — handles Nodemailer failure gracefully without persisting OTP', async () => {
    // Stub transport to throw an error (simulating SMTP error)
    setTestTransporterMock({
      sendMail: async () => {
        throw new Error('SMTP Connection Failed');
      },
    });

    const res = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: adminEmail },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.message, 'If an account exists for that email, a verification OTP has been sent.');
  });

  test('POST /api/auth/forgot-password — new OTP request invalidates older active OTPs', async () => {
    // Request 1
    await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: adminEmail },
    });
    const otp1 = sentMails[0].text.match(/(\d{6})/)[1];
    const hash1 = crypto.createHash('sha256').update(otp1).digest('hex');

    // Request 2
    await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: adminEmail },
    });
    const otp2 = sentMails[1].text.match(/(\d{6})/)[1];

    // Older OTP in DB should be consumed/invalidated (usedAt !== null)
    const [record1] = await db
      .select()
      .from(passwordResetOtps)
      .where(eq(passwordResetOtps.otpHash, hash1));
    assert.ok(record1.usedAt !== null, 'Older active OTP must be invalidated when a new OTP is requested');

    // Attempt reset with older OTP should fail
    const resetRes = await request('/auth/reset-password', {
      method: 'POST',
      body: { email: adminEmail, otp: otp1, newPassword: 'NewAdminPass123!' },
    });
    assert.equal(resetRes.status, 400);
    assert.equal(resetRes.data.error, 'Invalid or expired verification OTP');
  });

  test('POST /api/auth/reset-password — fails with invalid or non-numeric OTP', async () => {
    const res = await request('/auth/reset-password', {
      method: 'POST',
      body: { email: adminEmail, otp: '999999', newPassword: 'NewPassword123!' },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Invalid or expired verification OTP');
  });

  test('POST /api/auth/reset-password — fails when email does not match OTP', async () => {
    await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: adminEmail },
    });
    const otp = sentMails[0].text.match(/(\d{6})/)[1];

    const wrongEmail = getUniqueEmail('wrong_recipient');
    const res = await request('/auth/reset-password', {
      method: 'POST',
      body: { email: wrongEmail, otp, newPassword: 'NewPassword123!' },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Invalid or expired verification OTP');
  });

  test('POST /api/auth/reset-password — fails with expired OTP', async () => {
    const mgrEmail = getUniqueEmail('expired_otp_mgr');
    const hash = await bcrypt.hash('OldPass123!', 10);

    const [user] = await db
      .insert(users)
      .values({ roleId: 2, email: mgrEmail, passwordHash: hash, status: 'active' })
      .returning();
    trackCreatedUser(user.id);

    const expiredOtp = '654321';
    const expiredOtpHash = crypto.createHash('sha256').update(expiredOtp).digest('hex');

    await db.insert(passwordResetOtps).values({
      userId: user.id,
      otpHash: expiredOtpHash,
      expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    });

    const res = await request('/auth/reset-password', {
      method: 'POST',
      body: { email: mgrEmail, otp: expiredOtp, newPassword: 'NewPass123!' },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Invalid or expired verification OTP');
  });

  test('POST /api/auth/reset-password — manager account password reset end-to-end', async () => {
    const managerEmail = getUniqueEmail('mgr_otp_reset');
    const oldPassword = 'OldManagerPassword123!';
    const newPassword = 'NewManagerPassword123!';

    const initialHash = await bcrypt.hash(oldPassword, 10);
    const [user] = await db
      .insert(users)
      .values({ roleId: 2, email: managerEmail, passwordHash: initialHash, status: 'active' })
      .returning();
    trackCreatedUser(user.id);

    await db.insert(managerProfiles).values({
      userId: user.id,
      name: 'Manager OTP Reset Test',
      createdByUserId: 1,
    });

    // 1. Request OTP
    const forgotRes = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: managerEmail },
    });
    assert.equal(forgotRes.status, 200);
    assert.equal(sentMails.length, 1);
    const otp = sentMails[0].text.match(/(\d{6})/)[1];

    // 2. Reset password with OTP
    const resetRes = await request('/auth/reset-password', {
      method: 'POST',
      body: { email: managerEmail, otp, newPassword },
    });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.data.message, 'Password has been reset successfully');

    // 3. Verify old password fails
    const oldLogin = await request('/auth/manager/login', {
      method: 'POST',
      body: { email: managerEmail, password: oldPassword },
    });
    assert.equal(oldLogin.status, 401);

    // 4. Verify new password succeeds
    const newLogin = await request('/auth/manager/login', {
      method: 'POST',
      body: { email: managerEmail, password: newPassword },
    });
    assert.equal(newLogin.status, 200);
    assert.equal(newLogin.data.user.email, managerEmail.toLowerCase());

    // 5. Verify same OTP cannot be reused
    const reuseRes = await request('/auth/reset-password', {
      method: 'POST',
      body: { email: managerEmail, otp, newPassword: 'AnotherPassword123!' },
    });
    assert.equal(reuseRes.status, 400);
    assert.equal(reuseRes.data.error, 'Invalid or expired verification OTP');
  });

  test('POST /api/auth/reset-password — admin account password reset end-to-end', async () => {
    const email = adminEmail;
    const oldPassword = adminPassword;
    const tempNewPassword = 'TempAdminPassword999!';

    // 1. Request OTP
    const forgotRes = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
    assert.equal(forgotRes.status, 200);
    const otp = sentMails[0].text.match(/(\d{6})/)[1];

    // 2. Reset admin password
    const resetRes = await request('/auth/reset-password', {
      method: 'POST',
      body: { email, otp, newPassword: tempNewPassword },
    });
    assert.equal(resetRes.status, 200);

    // 3. Verify login with temp new password
    const loginTemp = await request('/auth/admin/login', {
      method: 'POST',
      body: { email, password: tempNewPassword },
    });
    assert.equal(loginTemp.status, 200);

    // 4. Restore original admin password
    await request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
    const restoreOtp = sentMails[1].text.match(/(\d{6})/)[1];

    const restoreReset = await request('/auth/reset-password', {
      method: 'POST',
      body: { email, otp: restoreOtp, newPassword: oldPassword },
    });
    assert.equal(restoreReset.status, 200);

    // 5. Verify original admin login works again
    const loginOriginal = await request('/auth/admin/login', {
      method: 'POST',
      body: { email, password: oldPassword },
    });
    assert.equal(loginOriginal.status, 200);
  });
});
