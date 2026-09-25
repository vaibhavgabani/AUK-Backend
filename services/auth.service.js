import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, roles, passwordResetOtps } from '../db/schema.js';
import { signToken } from '../utils/jwt.js';
import { createAuditLog } from '../utils/audit.js';
import { sendOtpEmail } from './email.service.js';
import logger from '../utils/logger.js';

export async function authenticateUser({ email, password, targetRole }) {
  const normalizedEmail = email.toLowerCase().trim();

  const [userRecord] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      status: users.status,
      deletedAt: users.deletedAt,
      roleName: roles.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.email, normalizedEmail), isNull(users.deletedAt)));

  if (!userRecord || userRecord.status !== 'active') {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (userRecord.roleName !== targetRole) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(password, userRecord.passwordHash);
  if (!isPasswordValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userRecord.id));

  const token = signToken({
    userId: userRecord.id,
    role: userRecord.roleName,
  });

  return {
    token,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.roleName,
    },
  };
}

export async function requestPasswordReset(email) {
  const normalizedEmail = email.toLowerCase().trim();

  const [userRecord] = await db
    .select({
      id: users.id,
      email: users.email,
      roleId: users.roleId,
      status: users.status,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(and(eq(users.email, normalizedEmail), isNull(users.deletedAt)));

  if (userRecord && userRecord.status === 'active') {
    // Generate 6-digit numeric OTP (100000 to 999999)
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10-minute expiration

    const envAdminEmail = process.env.SEED_ADMIN_EMAIL || process.env.SMTP_USER;
    const isAdminUser = userRecord.roleId === 1 || (envAdminEmail && normalizedEmail === envAdminEmail.toLowerCase());

    // Send email ONLY for Admin accounts as requested ("note send email only at admin time not for manager")
    if (isAdminUser) {
      try {
        await sendOtpEmail({
          to: normalizedEmail,
          otp: rawOtp,
          expiresMinutes: 10,
        });

        // Invalidate previous active OTPs for this user
        await db
          .update(passwordResetOtps)
          .set({ usedAt: new Date() })
          .where(and(eq(passwordResetOtps.userId, userRecord.id), isNull(passwordResetOtps.usedAt)));

        // Persist ONLY the hashed OTP
        await db.insert(passwordResetOtps).values({
          userId: userRecord.id,
          otpHash,
          expiresAt,
        });
      } catch (err) {
        logger.error({ err }, 'Failed to send password reset OTP email');
      }
    }
  }

  // Account enumeration protection: Return generic success message
  return {
    message: 'If an account exists for that email, a verification OTP has been sent.',
  };
}

export async function resetPassword({ email, otp, newPassword }) {
  const normalizedEmail = email.toLowerCase().trim();

  const [userRecord] = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(and(eq(users.email, normalizedEmail), isNull(users.deletedAt)));

  if (!userRecord || userRecord.status !== 'active') {
    throw new Error('INVALID_OR_EXPIRED_OTP');
  }

  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  const [otpRecord] = await db
    .select()
    .from(passwordResetOtps)
    .where(and(eq(passwordResetOtps.userId, userRecord.id), eq(passwordResetOtps.otpHash, otpHash)));

  if (!otpRecord) {
    throw new Error('INVALID_OR_EXPIRED_OTP');
  }

  if (otpRecord.usedAt !== null) {
    throw new Error('OTP_ALREADY_USED');
  }

  if (new Date() > new Date(otpRecord.expiresAt)) {
    throw new Error('EXPIRED_OTP');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  const now = new Date();

  await db.transaction(async (tx) => {
    // 1. Atomically consume OTP (race safety)
    const [updatedOtp] = await tx
      .update(passwordResetOtps)
      .set({ usedAt: now })
      .where(and(eq(passwordResetOtps.id, otpRecord.id), isNull(passwordResetOtps.usedAt)))
      .returning();

    if (!updatedOtp) {
      throw new Error('OTP_ALREADY_USED');
    }

    // 2. Update user's passwordHash
    await tx
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: now })
      .where(eq(users.id, userRecord.id));

    // 3. Invalidate all other active OTPs for this user
    await tx
      .update(passwordResetOtps)
      .set({ usedAt: now })
      .where(and(eq(passwordResetOtps.userId, userRecord.id), isNull(passwordResetOtps.usedAt)));

    // 4. Record Audit Log
    await createAuditLog({
      userId: userRecord.id,
      action: 'update',
      entityType: 'UserPassword',
      entityId: userRecord.id,
      newValue: { passwordUpdated: true },
      client: tx,
    });
  });

  return { message: 'Password has been reset successfully' };
}
