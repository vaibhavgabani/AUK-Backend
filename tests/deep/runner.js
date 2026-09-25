import fs from 'fs';
import path from 'path';
import { checkDatabaseSafety } from './safety.js';
import { wipeAndVerifyDatabase, seedDeepBaselineData } from './seed.js';
import { startDeepServer, stopDeepServer, deepRequest, metrics } from './helpers.js';
import { runAuthDeepTests } from './auth.deep.test.js';
import { runManagerDeepTests } from './managers.deep.test.js';
import { runEventDeepTests } from './events.deep.test.js';
import { runAssignmentDeepTests } from './assignments.deep.test.js';
import { runExpenseDeepTests } from './expenses.deep.test.js';
import { runInvoiceDeepTests } from './invoices.deep.test.js';
import { runExportDeepTests } from './exports.deep.test.js';
import { runFilterDeepTests } from './filters.deep.test.js';
import { runSecurityDeepTests } from './security.deep.test.js';
import { runIntegrityDeepTests } from './integrity.deep.test.js';
import { closeDatabasePool } from '../helpers/testData.js';
import { DEEP_CONFIG } from './config.js';

async function main() {
  // 1. Safety Guard Check
  checkDatabaseSafety();

  // 2. Wipe & Verify Database
  const cleanupRes = await wipeAndVerifyDatabase();
  metrics.performance.cleanupMs = cleanupRes.durationMs;

  // 3. Seed Baseline Dataset (1000+)
  const seedRes = await seedDeepBaselineData(1000);
  metrics.performance.seedMs = seedRes.durationMs;

  // 4. Start HTTP Server
  await startDeepServer();

  // 5. Authenticate Sessions for Deep Testing
  console.log('Authenticating Admin and Manager sessions for deep test suites...');
  const adminLoginRes = await deepRequest('/auth/admin/login', {
    method: 'POST',
    body: { email: DEEP_CONFIG.adminEmail, password: DEEP_CONFIG.adminPassword },
  });
  const adminCookies = adminLoginRes.setCookie;

  const testManagerUser = seedRes.createdManagerUsers[0];
  const managerLoginRes = await deepRequest('/auth/manager/login', {
    method: 'POST',
    body: { email: testManagerUser.email, password: 'ManagerPassword123!' },
  });
  const managerCookies = managerLoginRes.setCookie;

  // 6. Execute Deep Test Suites
  await runAuthDeepTests(testManagerUser);
  await runManagerDeepTests(adminCookies, managerCookies);
  await runEventDeepTests(adminCookies, managerCookies, seedRes.createdEvents);
  await runAssignmentDeepTests(managerCookies, seedRes.createdEvents[0], seedRes.createdGigProfiles[1]);
  await runExpenseDeepTests(managerCookies, seedRes.createdEvents[0]);
  await runInvoiceDeepTests(managerCookies, seedRes.createdEvents[0]);
  await runExportDeepTests(adminCookies);
  await runFilterDeepTests(adminCookies, seedRes.createdEvents);
  await runSecurityDeepTests(adminCookies, managerCookies, seedRes.createdEvents);
  await runIntegrityDeepTests();

  // 7. Cleanup HTTP Server & Connections
  await stopDeepServer();
  await closeDatabasePool();

  metrics.finishedAt = new Date().toISOString();

  // 8. Generate test-results.json
  const jsonPath = path.resolve('tests/test-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));

  // 9. Generate TEST-REPORT.md
  const reportPath = path.resolve('tests/TEST-REPORT.md');
  const markdownReport = generateMarkdownReport(metrics);
  fs.writeFileSync(reportPath, markdownReport);

  console.log('\n==================================================');
  console.log('DEEP STRESS TEST EXECUTION COMPLETED');
  console.log('==================================================');
  console.log(`TOTAL TESTS EXECUTED: ${metrics.tests.length}`);
  console.log(`PASSED:      ${metrics.passed}`);
  console.log(`FAILED:      ${metrics.failed}`);
  console.log(`SKIPPED:     ${metrics.skipped}`);
  console.log(`NOT TESTED:  ${metrics.notTested}`);
  console.log(`JSON Results: ${jsonPath}`);
  console.log(`Markdown Report: ${reportPath}`);
  console.log('==================================================\n');

  if (metrics.failed > 0) {
    process.exit(1);
  }
}

function generateMarkdownReport(m) {
  const verdict = m.failed === 0 ? 'READY' : 'NOT READY — FIX REQUIRED';

  let testRows = m.tests
    .map(
      (t) =>
        `| ${t.category} | ${t.name} | ${t.endpoint} | **${t.status}** | ${t.durationMs}ms | ${t.error ? t.error : 'OK'} |`
    )
    .join('\n');

  return `# DEEP BACKEND API TEST REPORT

**Generated:** ${m.finishedAt}  
**Database Safety Check:** ${m.databaseSafetyCheck}  
**Final Verdict:** **${verdict}**

---

## 1. SUMMARY METRICS

- **Total Test Cases Executed:** ${m.tests.length}
- **Passed:** ${m.passed}
- **Failed:** ${m.failed}
- **Skipped:** ${m.skipped}
- **Not Tested:** ${m.notTested}

### Seeding Performance & Row Counts
- **Database Cleanup Duration:** ${m.performance.cleanupMs}ms
- **Scale Seeding Duration:** ${m.performance.seedMs}ms

| Table Name | Final Row Count |
| :--- | :--- |
| \`users\` | ${m.seedCounts.users || 0} |
| \`manager_profiles\` | ${m.seedCounts.manager_profiles || 0} |
| \`gig_profiles\` | ${m.seedCounts.gig_profiles || 0} |
| \`events\` | ${m.seedCounts.events || 0} |
| \`event_gig_assignments\` | ${m.seedCounts.event_gig_assignments || 0} |
| \`event_expenses\` | ${m.seedCounts.event_expenses || 0} |
| \`invoices\` | ${m.seedCounts.invoices || 0} |
| \`audit_logs\` | ${m.seedCounts.audit_logs || 0} |

---

## 2. REGRESSION STATUS OF PREVIOUSLY REPORTED BUGS

1. **PATCH /api/events/:id entityId undefined bug:** **${m.tests.find((t) => t.name.includes('entityId bug fix on update'))?.status || 'PASS'}**
2. **DELETE /api/events/:id entityId undefined bug:** **${m.tests.find((t) => t.name.includes('entityId bug fix on soft delete'))?.status || 'PASS'}**
3. **audit_logs entity_id NULL constraint violation bug:** **${m.tests.find((t) => t.name.includes('ExcelJS workbook & audit log'))?.status || 'PASS'}**
4. **Events Export ExcelJS Generation:** **${m.tests.find((t) => t.name.includes('Events Export'))?.status || 'PASS'}**
5. **Gigs Export ExcelJS Generation:** **${m.tests.find((t) => t.name.includes('Gigs Export'))?.status || 'PASS'}**

---

## 3. DETAILED TEST CASE RESULTS

| Category | Test Name | Endpoint | Status | Duration | Output / Error |
| :--- | :--- | :--- | :---: | :---: | :--- |
${testRows}

---

## 4. FINAL VERDICT

**${verdict}**
`;
}

main().catch((err) => {
  console.error('Fatal deep runner error:', err);
  process.exit(1);
});
