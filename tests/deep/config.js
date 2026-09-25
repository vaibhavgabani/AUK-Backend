import fs from 'fs';
import path from 'path';

if (typeof process.loadEnvFile === 'function' && fs.existsSync('.env')) {
  try {
    process.loadEnvFile('.env');
  } catch (e) {}
}

export const DEEP_CONFIG = {
  isTestDb: process.env.TEST_DATABASE === 'true' || process.env.NODE_ENV === 'test',
  databaseUrl: process.env.DATABASE_URL || '',
  targetCounts: {
    users: 1000,
    managers: 1000,
    gigs: 1000,
    events: 1000,
    assignments: 1000,
    expenses: 1000,
  },
  adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@anshil.co.uk',
  adminPassword: process.env.SEED_ADMIN_PASSWORD || 'AdminSecret123!',
};
