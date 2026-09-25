/**
 * Standard error response helper adhering strictly to { "error": "message" } format.
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} status - HTTP status code (default 400)
 */
export function sendError(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

/**
 * Standard success response helper.
 * @param {import('express').Response} res - Express response object
 * @param {object} data - Payload data
 * @param {number} status - HTTP status code (default 200)
 */
export function sendSuccess(res, data, status = 200) {
  return res.status(status).json(data);
}
