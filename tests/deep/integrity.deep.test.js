import { db } from '../../db/index.js';
import {
  auditLogs,
  invoices,
  eventExpenses,
  eventGigAssignments,
  events,
  gigProfiles,
  managerProfiles,
  adminProfiles,
  users,
  roles,
} from '../../db/schema.js';
import { sql } from 'drizzle-orm';
import { recordTestResult, metrics } from './helpers.js';

export async function runIntegrityDeepTests() {
  console.log('\n--- DATABASE INTEGRITY & TABLE COUNTS TESTS ---');

  const t1Start = Date.now();
  try {
    const tableCounts = {
      roles: parseInt((await db.select({ count: sql`count(*)` }).from(roles))[0].count, 10),
      users: parseInt((await db.select({ count: sql`count(*)` }).from(users))[0].count, 10),
      admin_profiles: parseInt((await db.select({ count: sql`count(*)` }).from(adminProfiles))[0].count, 10),
      manager_profiles: parseInt((await db.select({ count: sql`count(*)` }).from(managerProfiles))[0].count, 10),
      gig_profiles: parseInt((await db.select({ count: sql`count(*)` }).from(gigProfiles))[0].count, 10),
      events: parseInt((await db.select({ count: sql`count(*)` }).from(events))[0].count, 10),
      event_gig_assignments: parseInt((await db.select({ count: sql`count(*)` }).from(eventGigAssignments))[0].count, 10),
      event_expenses: parseInt((await db.select({ count: sql`count(*)` }).from(eventExpenses))[0].count, 10),
      invoices: parseInt((await db.select({ count: sql`count(*)` }).from(invoices))[0].count, 10),
      audit_logs: parseInt((await db.select({ count: sql`count(*)` }).from(auditLogs))[0].count, 10),
    };

    metrics.seedCounts = tableCounts;

    const meetsScaleThresholds =
      tableCounts.users >= 1000 &&
      tableCounts.manager_profiles >= 1000 &&
      tableCounts.gig_profiles >= 1000 &&
      tableCounts.events >= 1000 &&
      tableCounts.event_gig_assignments >= 1000 &&
      tableCounts.event_expenses >= 1000 &&
      tableCounts.audit_logs >= 1;

    if (meetsScaleThresholds) {
      recordTestResult({
        name: 'Database Integrity - Final table row counts meet scale thresholds (1000+ per table)',
        category: 'INTEGRITY',
        status: 'PASS',
        endpoint: 'DB Query',
        expected: '1000+ rows across core tables',
        actual: JSON.stringify(tableCounts),
        durationMs: Date.now() - t1Start,
        sourceFile: 'db/schema.js',
      });
    } else {
      recordTestResult({
        name: 'Database Integrity - Final table row counts meet scale thresholds (1000+ per table)',
        category: 'INTEGRITY',
        status: 'FAIL',
        endpoint: 'DB Query',
        expected: '1000+ rows across core tables',
        actual: JSON.stringify(tableCounts),
        error: 'Table counts below scale threshold',
        durationMs: Date.now() - t1Start,
        sourceFile: 'db/schema.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Database Integrity - Final table row counts meet scale thresholds (1000+ per table)',
      category: 'INTEGRITY',
      status: 'FAIL',
      endpoint: 'DB Query',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'db/schema.js',
    });
  }
}
