import { DEEP_CONFIG } from './config.js';

export function checkDatabaseSafety() {
  if (!DEEP_CONFIG.isTestDb) {
    console.error('\n==================================================');
    console.error('SAFETY ERROR: DESTRUCTIVE TEST REFUSED TO RUN!');
    console.error('==================================================');
    console.error('TEST_DATABASE=true is required to execute deep tests.');
    console.error('Please set TEST_DATABASE=true in environment or command.');
    console.error('Example: TEST_DATABASE=true npm run test:deep\n');
    process.exit(1);
  }

  // Mask database password in output
  let safeDbUrl = DEEP_CONFIG.databaseUrl;
  try {
    const urlObj = new URL(DEEP_CONFIG.databaseUrl);
    if (urlObj.password) {
      urlObj.password = '****';
    }
    safeDbUrl = urlObj.toString();
  } catch (e) {}

  console.log('==================================================');
  console.log('DESTRUCTIVE TEST MODE');
  console.log('==================================================');
  console.log(`DATABASE: ${safeDbUrl}`);
  console.log('TEST_DATABASE=true');
  console.log('ALL EXISTING APPLICATION DATA WILL BE REMOVED');
  console.log('==================================================\n');
}
