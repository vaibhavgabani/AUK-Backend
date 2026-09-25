import './utils/tracer.js'; // Must be top import for Datadog APM initialization
import { config } from './config/env.js';
import app from './app.js';
import logger from './utils/logger.js';
import { getPool } from './db/index.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      environment: config.nodeEnv,
      service: config.serviceName,
      version: config.appVersion,
    },
    `Express Backend Server listening on port ${PORT}`
  );
});

// Graceful Shutdown & Unhandled Exception Management
async function shutdown(signal, err) {
  if (err) {
    logger.fatal(
      {
        err: {
          name: err.name,
          message: err.message,
          stack: err.stack,
        },
        signal,
      },
      `Fatal error trigger shutdown: ${err.message}`
    );
  } else {
    logger.info({ signal }, `Received ${signal}. Initiating graceful shutdown...`);
  }

  // Stop taking new HTTP requests
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      // Drain PostgreSQL connection pool
      const pool = getPool();
      if (pool && !pool.ended) {
        await pool.end();
        logger.info('PostgreSQL connection pool closed.');
      }
    } catch (poolErr) {
      logger.error({ err: poolErr }, 'Error closing PostgreSQL pool during shutdown.');
    } finally {
      process.exit(err ? 1 : 0);
    }
  });

  // Force exit after 10 seconds if shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown timeout reached. Exiting process.');
    process.exit(1);
  }, 10000).unref();
}

process.on('uncaughtException', (err) => shutdown('uncaughtException', err));
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  shutdown('unhandledRejection', err);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
