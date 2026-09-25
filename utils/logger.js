import pino from 'pino';
import tracer from './tracer.js';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Pino structured JSON logger.
 * Outputs to standard output (stdout / stderr) for platform/Datadog ingestion.
 * Redacts sensitive fields automatically to protect credentials.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  base: {
    service: process.env.SERVICE_NAME || 'anshil-backend',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'jwt',
      'otp',
      'otpHash',
      'currentPassword',
      'newPassword',
      'authorization',
      'cookie',
      'headers.authorization',
      'headers.cookie',
      'body.password',
      'body.currentPassword',
      'body.newPassword',
      'body.otp',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  mixin() {
    // Inject Datadog trace_id and span_id if dd-trace is active
    if (tracer && typeof tracer.scope === 'function') {
      const span = tracer.scope().active();
      if (span) {
        const context = span.context();
        return {
          trace_id: context.toTraceId(),
          span_id: context.toSpanId(),
        };
      }
    }
    return {};
  },
});

export default logger;
