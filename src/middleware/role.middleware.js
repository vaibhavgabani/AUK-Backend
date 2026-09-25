import { sendError } from '../utils/response.js';

/**
 * Reusable Role Authorization Middleware
 * Enforces allowed roles (e.g. requireRole('admin'), requireRole('manager'))
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Forbidden: Insufficient permissions', 403);
    }

    return next();
  };
}
