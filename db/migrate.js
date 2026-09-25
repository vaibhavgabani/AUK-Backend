import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getPool } from './index.js';
import logger from '../utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  logger.info('Applying database migrations...');
  const sqlPath = path.join(__dirname, '../drizzle/0000_initial_schema.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query('COMMIT');
    logger.info('Migrations applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Migration failed');
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => {
      const pool = getPool();
      return pool.end();
    })
    .catch((err) => {
      logger.error({ err }, 'Migration runner error');
      process.exit(1);
    });
}
