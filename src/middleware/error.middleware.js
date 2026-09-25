import { sendError } from '../utils/response.js';

/**
 * Global error handling middleware enforcing standard error JSON output:
 * { "error": "message" }
 */
export function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return sendError(res, message, status);
}
