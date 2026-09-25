import bcrypt from 'bcrypt';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, roles } from '../../db/schema.js';
import { loginSchema } from '../validators/auth.validator.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/jwt.js';
import { sendError, sendSuccess } from '../utils/response.js';

async function processLogin(req, res, targetRole) {
  // 1. Zod Validation
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 'Invalid email or password', 400);
  }

  const { email, password } = validation.data;

  try {
    // 2. Lookup user & role, enforcing soft deletion & active status
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
      .where(and(eq(users.email, email.toLowerCase().trim()), isNull(users.deletedAt)));

    // Generic response if user not found, soft deleted, or inactive
    if (!userRecord || userRecord.status !== 'active') {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Role check
    if (userRecord.roleName !== targetRole) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // 3. Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, userRecord.passwordHash);
    if (!isPasswordValid) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // 4. Update last_login_at
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userRecord.id));

    // 5. Create signed JWT
    const token = signToken({
      userId: userRecord.id,
      role: userRecord.roleName,
    });

    // 6. Set httpOnly cookie
    setAuthCookie(res, token);

    // 7. Return safe JSON response
    return sendSuccess(res, {
      message: `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} login successful`,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.roleName,
      },
    });
  } catch (err) {
    console.error('Login process error:', err.message);
    return sendError(res, 'An error occurred during authentication', 500);
  }
}

export async function adminLogin(req, res) {
  return processLogin(req, res, 'admin');
}

export async function managerLogin(req, res) {
  return processLogin(req, res, 'manager');
}

export async function logout(req, res) {
  clearAuthCookie(res);
  return sendSuccess(res, { message: 'Logged out successfully' });
}

export async function getMe(req, res) {
  return sendSuccess(res, {
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    },
  });
}
