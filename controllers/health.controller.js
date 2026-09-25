import { testDbConnection } from '../db/index.js';

/**
 * GET /api/health
 * Liveness Probe: Quick check to verify process is alive and responding.
 */
export async function getHealth(req, res) {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/ready
 * Readiness Probe: Verifies critical downstream dependencies (PostgreSQL database).
 */
export async function getReadiness(req, res) {
  try {
    const isDbConnected = await testDbConnection();

    if (isDbConnected) {
      return res.status(200).json({
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(503).json({
      status: 'unready',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: 'unready',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}
