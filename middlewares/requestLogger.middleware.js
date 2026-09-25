import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import logger from '../utils/logger.js';

/**
 * Sanitizes or generates a safe request ID for request tracing.
 * Accepts client-provided X-Request-ID if alphanumeric and within 128 characters.
 */
function getOrGenerateRequestId(req) {
  const incomingId = req.headers['x-request-id'] || req.headers['X-Request-ID'];
  if (
    typeof incomingId === 'string' &&
    incomingId.length > 0 &&
    incomingId.length <= 128 &&
    /^[a-zA-Z0-9\-_]+$/.test(incomingId)
  ) {
    return incomingId;
  }
  return `req_${randomUUID()}`;
}

/**
 * Pino HTTP Request Logging middleware.
 * Attaches X-Request-ID, logs structured HTTP access metrics, and measures request duration.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const reqId = getOrGenerateRequestId(req);
    res.setHeader('X-Request-ID', reqId);
    req.id = reqId;
    return reqId;
  },
  customProps(req) {
    return {
      request_id: req.id,
      user_id: req.user?.id,
      role: req.user?.role,
    };
  },
  customLogLevel(req, res, err) {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage(req, res, responseTime) {
    return `HTTP ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${Math.round(responseTime)}ms)`;
  },
  customErrorMessage(req, res, err) {
    return `HTTP ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} Error: ${err.message}`;
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
    err(err) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    },
  },
  // Disable automatic logging of request/response headers to protect cookies & tokens
  autoLogging: {
    ignore: (req) => req.url === '/api/health', // Keep liveness health check quiet to avoid log noise
  },
});

export default requestLogger;
