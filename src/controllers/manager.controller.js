import bcrypt from 'bcrypt';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, managerProfiles, roles } from '../../db/schema.js';
import { createManagerSchema } from '../validators/manager.validator.js';
import { createAuditLog } from '../utils/audit.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getManagers(req, res) {
  try {
    const list = await db
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

    return sendSuccess(res, { data: list });
  } catch (err) {
    console.error('Error in getManagers:', err.message);
    return sendError(res, 'Failed to fetch managers', 500);
  }
}

export async function createManager(req, res) {
  const validation = createManagerSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid manager input';
    return sendError(res, firstIssue, 400);
  }

  const { name, email, password, phone } = validation.data;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check email uniqueness
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), isNull(users.deletedAt)));

    if (existingUser) {
      return sendError(res, 'Email is already in use', 409);
    }

    // Get manager role ID
    const [managerRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'manager'));
    if (!managerRole) {
      return sendError(res, 'Manager role configuration missing', 500);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Database transaction for user + profile + audit log creation
    const result = await db.transaction(async (tx) => {
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
          createdByUserId: req.user.id,
        })
        .returning();

      await createAuditLog({
        userId: req.user.id,
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

    return sendSuccess(res, { data: result }, 201);
  } catch (err) {
    console.error('Error creating manager:', err.message);
    return sendError(res, 'Failed to create manager account', 500);
  }
}
