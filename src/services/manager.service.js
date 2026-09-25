import bcrypt from 'bcrypt';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, managerProfiles, roles } from '../../db/schema.js';
import { createAuditLog } from '../utils/audit.js';

export async function fetchAllManagers() {
  return await db
    .select({
      id: managerProfiles.id,
      userId: users.id,
      name: managerProfiles.name,
      phone: managerProfiles.phone,
      email: users.email,
      status: users.status,
      createdAt: managerProfiles.createdAt,
    })
    .from(managerProfiles)
    .innerJoin(users, eq(managerProfiles.userId, users.id))
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(isNull(users.deletedAt), isNull(managerProfiles.deletedAt)));
}

export async function createManagerAccount({ name, email, password, phone, adminUserId }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check email uniqueness
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, normalizedEmail), isNull(users.deletedAt)));

  if (existingUser) {
    throw new Error('EMAIL_EXISTS');
  }

  const [managerRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'manager'));
  if (!managerRole) {
    throw new Error('ROLE_MISSING');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        roleId: managerRole.id,
        email: normalizedEmail,
        passwordHash,
        status: 'active',
      })
      .returning();

    const [newProfile] = await tx
      .insert(managerProfiles)
      .values({
        userId: newUser.id,
        name,
        phone: phone || null,
        createdByUserId: adminUserId,
      })
      .returning();

    await createAuditLog({
      userId: adminUserId,
      action: 'create',
      entityType: 'ManagerProfile',
      entityId: newProfile.id,
      newValue: {
        id: newProfile.id,
        userId: newUser.id,
        name: newProfile.name,
        email: newUser.email,
        phone: newProfile.phone,
      },
      client: tx,
    });

    return {
      id: newProfile.id,
      userId: newUser.id,
      name: newProfile.name,
      email: newUser.email,
      phone: newProfile.phone,
      createdAt: newProfile.createdAt,
    };
  });
}
