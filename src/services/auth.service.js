import bcrypt from 'bcrypt';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, roles } from '../../db/schema.js';
import { signToken } from '../utils/jwt.js';

export async function authenticateUser({ email, password, targetRole }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Lookup user & role
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

  // Update last_login_at
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
