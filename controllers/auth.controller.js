import { authenticateUser, requestPasswordReset, resetPassword as performPasswordReset } from '../services/auth.service.js';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator.js';
import { setAuthCookie, clearAuthCookie } from '../utils/jwt.js';
import { sendError, sendSuccess } from '../utils/response.js';

async function handleLogin(req, res, next, targetRole) {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 'Invalid email or password', 400);
  }

  try {
    const { token, user } = await authenticateUser({
      email: validation.data.email,
      password: validation.data.password,
      targetRole,
    });

    setAuthCookie(res, token);

    return sendSuccess(res, {
      message: `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} login successful`,
      user,
    });
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return sendError(res, 'Invalid email or password', 401);
    }
    return next(err);
  }
}

export async function adminLogin(req, res, next) {
  return handleLogin(req, res, next, 'admin');
}

export async function managerLogin(req, res, next) {
  return handleLogin(req, res, next, 'manager');
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

export async function forgotPassword(req, res, next) {
  const validation = forgotPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid email format';
    return sendError(res, firstIssue, 400);
  }

  try {
    const result = await requestPasswordReset(validation.data.email);
    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req, res, next) {
  const validation = resetPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || 'Invalid input data';
    return sendError(res, firstIssue, 400);
  }

  try {
    const result = await performPasswordReset(validation.data);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.message === 'INVALID_OR_EXPIRED_OTP' || err.message === 'EXPIRED_OTP') {
      return sendError(res, 'Invalid or expired verification OTP', 400);
    }
    if (err.message === 'OTP_ALREADY_USED') {
      return sendError(res, 'Verification OTP has already been used', 400);
    }
    return next(err);
  }
}
