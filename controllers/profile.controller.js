import { getProfile, updateProfile, changePassword } from '../services/profile.service.js';
import { sendError, sendSuccess } from '../utils/response.js';

/**
 * GET /api/auth/profile
 * Returns the full profile of the currently authenticated user.
 */
export async function getMyProfile(req, res, next) {
  try {
    const profile = await getProfile(req.user.id, req.user.role);
    return sendSuccess(res, { profile });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return sendError(res, 'User not found', 404);
    }
    return next(err);
  }
}

/**
 * PUT /api/auth/profile
 * Updates name and phone for the currently authenticated user.
 */
export async function updateMyProfile(req, res, next) {
  const { name, phone } = req.body || {};

  if (!name || !String(name).trim()) {
    return sendError(res, 'Name is required', 400);
  }

  try {
    const result = await updateProfile(req.user.id, req.user.role, { name, phone });
    return sendSuccess(res, result);
  } catch (err) {
    if (err.message === 'NAME_REQUIRED') {
      return sendError(res, 'Name is required', 400);
    }
    if (err.message === 'USER_NOT_FOUND') {
      return sendError(res, 'User not found', 404);
    }
    return next(err);
  }
}

/**
 * PUT /api/auth/change-password
 * Changes the password for the currently authenticated user.
 */
export async function changeMyPassword(req, res, next) {
  if (req.user.role === 'manager') {
    return sendError(res, 'Manager passwords can only be changed by an Administrator', 403);
  }

  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return sendError(res, 'Current password and new password are required', 400);
  }

  if (newPassword.length < 8) {
    return sendError(res, 'New password must be at least 8 characters', 400);
  }

  try {
    const result = await changePassword(req.user.id, { currentPassword, newPassword });
    return sendSuccess(res, result);
  } catch (err) {
    if (err.message === 'INVALID_CURRENT_PASSWORD') {
      return sendError(res, 'Current password is incorrect', 400);
    }
    if (err.message === 'USER_NOT_FOUND') {
      return sendError(res, 'User not found', 404);
    }
    return next(err);
  }
}
