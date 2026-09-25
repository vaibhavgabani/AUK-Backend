import { testDbConnection } from '../../db/index.js';

export async function getHealth(req, res) {
  try {
    const isDbConnected = await testDbConnection();

    if (isDbConnected) {
      return res.status(200).json({
        status: 'ok',
        database: 'connected',
      });
    }

    return res.status(500).json({
      status: 'error',
      database: 'disconnected',
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      database: 'disconnected',
    });
  }
}
