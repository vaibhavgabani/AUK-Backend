import { sendError } from '../utils/response.js';

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
