import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, roles } from '../db/schema.js';
import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { requireRole } from './role.middleware.js';

export async function authenticateToken(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return sendError(res, 'Authentication required', 401);
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return sendError(res, 'Invalid or expired token', 401);
    }

    if (!decoded || !decoded.userId) {
      return sendError(res, 'Invalid token payload', 401);
    }

    const [userRecord] = await db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
        deletedAt: users.deletedAt,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.id, decoded.userId), isNull(users.deletedAt)));

    if (!userRecord || userRecord.status !== 'active') {
      return sendError(res, 'Invalid or inactive account', 401);
    }

    req.user = {
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.roleName,
    };

    return next();
  } catch (err) {
    console.error('Authentication middleware error:', err);
    return sendError(res, 'Internal authentication error', 500);
  }
}

export { requireRole };
