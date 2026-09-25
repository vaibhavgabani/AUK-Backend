import './utils/tracer.js'; // Must be top import for Datadog APM initialization
import { config } from './config/env.js';
import app, { allowedOrigins } from './app.js';
import logger from './utils/logger.js';
import { getPool, testDbConnection } from './db/index.js';
import { seedDatabase } from './db/seed.js';

const PORT = config.port;

const server = app.listen(PORT, async () => {
  logger.info(
    {
      port: PORT,
      environment: config.nodeEnv,
      service: config.serviceName,
      version: config.appVersion,
      allowedOrigins,
    },
    `Express Backend Server listening on port ${PORT}`
  );

  console.log(`🚀 [Server]: Listening on port ${PORT} (${config.nodeEnv})`);
  console.log(`🌐 [CORS]: Backend configured to accept CORS from origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'All origins allowed in development'}`);

  try {
    const isConnected = await testDbConnection();
    if (isConnected) {
      logger.info('Database connected successfully');
      console.log('✅ [Database]: Connected successfully');

      // Check if admin exists in DB; seed only if missing on first startup
      try {
        const seedResult = await seedDatabase();
        if (seedResult && seedResult.created) {
          console.log(`🔐 [Admin Setup]: Initial admin account created from .env (${seedResult.email})`);
        } else if (seedResult) {
          console.log(`ℹ️ [Admin Check]: Admin user already exists in DB (${seedResult.email}). Skipping initial seed.`);
        }
      } catch (seedErr) {
        logger.error({ err: seedErr }, 'Error during automatic admin seed check on startup');
        console.error('⚠️ [Admin Check]: Auto-seed check error:', seedErr.message);
      }
    } else {
      logger.warn('Database connection status check failed');
      console.log('⚠️ [Database]: Connection status check returned false');
    }
  } catch (error) {
    logger.error({ err: error }, 'Database connection error during startup');
    console.error('❌ [Database]: Connection error:', error.message);
  }
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
