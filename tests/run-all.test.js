import fs from 'fs';
import { startServer, stopServer } from './helpers/api.js';
import { cleanupTestData, closeDatabasePool } from './helpers/testData.js';

if (typeof process.loadEnvFile === 'function' && fs.existsSync('.env')) {
  try {
    process.loadEnvFile('.env');
  } catch (e) {}
}

async function main() {
  console.log('==================================================');
  console.log('STARTING COMPLETE BACKEND API AUTOMATED TEST SUITE');
  console.log('==================================================\n');

  try {
    await startServer();

    // Import and execute tests
    await import('./health.test.js');
    await import('./auth.test.js');
    await import('./password-reset.test.js');
    await import('./managers.test.js');
    await import('./events.test.js');
    await import('./assignments.test.js');
    await import('./gigs.test.js');
    await import('./expenses.test.js');
    await import('./invoice.test.js');
    await import('./export.test.js');
    await import('./security.test.js');
  } catch (err) {
    console.error('Test suite runner encountered an error:', err);
  } finally {
    console.log('\nCleaning up test artifacts...');
    await cleanupTestData();
    await stopServer();
    await closeDatabasePool();
    console.log('Test suite execution completed.\n');
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
