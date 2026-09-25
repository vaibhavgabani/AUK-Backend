import logger from '../utils/logger.js';
import { sendError } from '../utils/response.js';

/**
 * Global Express Error Handling Middleware.
 * Captures uncaught exceptions passed via next(err) from controllers/services.
 * Logs full diagnostic context (stack, request_id, route, user_id) to stdout JSON.
 * Returns clean, safe HTTP responses to the client without exposing internal stack traces.
 */
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log full diagnostic context to structured operational logger
  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      request_id: req.id || req.headers['x-request-id'] || 'unknown',
      method: req.method,
      route: req.originalUrl || req.url,
      status_code: status,
      user_id: req.user?.id,
      role: req.user?.role,
    },
    `Unhandled API Error: ${err.message}`
  );

  // In production, mask 500 internal server error messages to avoid leaking DB/system internals
  const clientMessage =
    status >= 500 && isProduction
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  return sendError(res, clientMessage, status);
}

export default errorHandler;
