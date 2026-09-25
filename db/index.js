import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

let poolInstance = null;
let instance = null;

export function getPool() {
  if (!poolInstance || poolInstance.ended) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined.');
    }
    poolInstance = new Pool({ connectionString });
    poolInstance.on('error', (err) => {
      console.error('❌ [Database]: Unexpected error on idle client:', err.message || err);
    });
    instance = drizzle(poolInstance, { schema });
  }
  return poolInstance;
}

export const db = new Proxy(
  {},
  {
    get(target, prop) {
      getPool();
      return instance[prop];
    },
  }
);

/**
 * Executes a lightweight SELECT 1 query via Drizzle ORM to verify database connectivity.
 * @returns {Promise<boolean>} True if PostgreSQL query succeeds.
 */
export async function testDbConnection() {
  const result = await db.execute(sql`SELECT 1 as connected`);
  return Array.isArray(result.rows) && result.rows.length > 0;
}

export { schema };
