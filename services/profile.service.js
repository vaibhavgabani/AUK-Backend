import bcrypt from 'bcrypt';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, adminProfiles, managerProfiles } from '../db/schema.js';
import { createAuditLog } from '../utils/audit.js';

/**
 * Get full profile for any authenticated user (admin or manager).
 */
export async function getProfile(userId, role) {
  const [userRow] = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));

  if (!userRow) throw new Error('USER_NOT_FOUND');

  let profileRow = null;
  if (role === 'admin') {
    const rows = await db
      .select({ name: adminProfiles.name, phone: adminProfiles.phone })
      .from(adminProfiles)
      .where(eq(adminProfiles.userId, userId));
    profileRow = rows[0] || null;
  } else if (role === 'manager') {
    const rows = await db
      .select({ name: managerProfiles.name, phone: managerProfiles.phone })
      .from(managerProfiles)
      .where(and(eq(managerProfiles.userId, userId), isNull(managerProfiles.deletedAt)));
    profileRow = rows[0] || null;
  }

  return {
    id: userRow.id,
    email: userRow.email,
    role,
    name: profileRow?.name || '',
    phone: profileRow?.phone || '',
    status: userRow.status,
    lastLoginAt: userRow.lastLoginAt,
    createdAt: userRow.createdAt,
  };
}

/**
 * Update profile name and phone for any authenticated user.
 */
export async function updateProfile(userId, role, { name, phone }) {
  const now = new Date();
  const trimmedName = name?.trim() || '';
  const trimmedPhone = phone?.trim() || null;

  if (!trimmedName) throw new Error('NAME_REQUIRED');

  if (role === 'admin') {
    const existing = await db
      .select({ id: adminProfiles.id })
      .from(adminProfiles)
      .where(eq(adminProfiles.userId, userId));

    if (existing.length > 0) {
      await db
        .update(adminProfiles)
        .set({ name: trimmedName, phone: trimmedPhone, updatedAt: now })
        .where(eq(adminProfiles.userId, userId));
    } else {
      await db.insert(adminProfiles).values({
        userId,
        name: trimmedName,
        phone: trimmedPhone,
      });
    }
  } else if (role === 'manager') {
    const existing = await db
      .select({ id: managerProfiles.id })
      .from(managerProfiles)
      .where(and(eq(managerProfiles.userId, userId), isNull(managerProfiles.deletedAt)));

    if (existing.length > 0) {
      await db
        .update(managerProfiles)
        .set({ name: trimmedName, phone: trimmedPhone, updatedAt: now })
        .where(and(eq(managerProfiles.userId, userId), isNull(managerProfiles.deletedAt)));
    }
    // Note: Managers are created by admin so we don't insert — only update existing
  }

  // Audit log
  await createAuditLog({
    userId,
    action: 'update',
    entityType: 'UserProfile',
    entityId: userId,
    newValue: { name: trimmedName, phone: trimmedPhone },
  });

  return { message: 'Profile updated successfully' };
}

/**
 * Change password for any authenticated user after verifying current password.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const [userRow] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));

  if (!userRow) throw new Error('USER_NOT_FOUND');

  const isValid = await bcrypt.compare(currentPassword, userRow.passwordHash);
  if (!isValid) throw new Error('INVALID_CURRENT_PASSWORD');

  const newHash = await bcrypt.hash(newPassword, 10);
  const now = new Date();

  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: now })
    .where(eq(users.id, userId));

  await createAuditLog({
    userId,
    action: 'update',
    entityType: 'UserPassword',
    entityId: userId,
    newValue: { passwordUpdated: true },
  });

  return { message: 'Password changed successfully' };
}
