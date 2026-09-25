import ExcelJS from 'exceljs';
import { deepRequest, recordTestResult } from './helpers.js';
import { db } from '../../db/index.js';
import { auditLogs } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export async function runExportDeepTests(adminCookies) {
  console.log('\n--- EXCEL EXPORT DEEP TESTS ---');

  // 1. Events Export
  const t1Start = Date.now();
  try {
    const res = await deepRequest('/export/events', { cookies: adminCookies });

    if (res.status === 200 && res.contentType.includes('spreadsheetml.sheet')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.data);
      const sheet = workbook.getWorksheet('Events Export');

      if (sheet && sheet.rowCount >= 1000) {
        // Verify audit log
        const [latestAudit] = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.entityType, 'event_export'))
          .orderBy(desc(auditLogs.createdAt))
          .limit(1);

        if (latestAudit && latestAudit.action === 'export') {
          recordTestResult({
            name: 'Events Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
            category: 'EXPORTS',
            status: 'PASS',
            endpoint: 'GET /api/export/events',
            expected: '200 XLSX buffer with >= 1000 rows and audit log entry',
            actual: `200 XLSX sheet rows: ${sheet.rowCount}, audit log ID: ${latestAudit.id}`,
            durationMs: Date.now() - t1Start,
            sourceFile: 'controllers/export.controller.js',
          });
        } else {
          recordTestResult({
            name: 'Events Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
            category: 'EXPORTS',
            status: 'FAIL',
            endpoint: 'GET /api/export/events',
            expected: 'Audit log entry created',
            actual: 'Missing audit log entry',
            error: 'Audit log entry not found for event export',
            durationMs: Date.now() - t1Start,
            sourceFile: 'controllers/export.controller.js',
          });
        }
      } else {
        recordTestResult({
          name: 'Events Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
          category: 'EXPORTS',
          status: 'FAIL',
          endpoint: 'GET /api/export/events',
          expected: 'Worksheet with >= 1000 rows',
          actual: `Sheet rows: ${sheet?.rowCount}`,
          error: 'Worksheet rows missing or unexpected',
          durationMs: Date.now() - t1Start,
          sourceFile: 'controllers/export.controller.js',
        });
      }
    } else {
      recordTestResult({
        name: 'Events Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
        category: 'EXPORTS',
        status: 'FAIL',
        endpoint: 'GET /api/export/events',
        expected: '200 XLSX content-type',
        actual: `${res.status} ${res.contentType}`,
        error: 'Export failed or invalid content type',
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/export.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Events Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
      category: 'EXPORTS',
      status: 'FAIL',
      endpoint: 'GET /api/export/events',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'controllers/export.controller.js',
    });
  }

  // 2. Gigs Export
  const t2Start = Date.now();
  try {
    const res = await deepRequest('/export/gigs', { cookies: adminCookies });

    if (res.status === 200 && res.contentType.includes('spreadsheetml.sheet')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.data);
      const sheet = workbook.getWorksheet('Gig Bookings Export');

      if (sheet && sheet.rowCount >= 1000) {
        const [latestAudit] = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.entityType, 'gig_export'))
          .orderBy(desc(auditLogs.createdAt))
          .limit(1);

        if (latestAudit && latestAudit.action === 'export') {
          recordTestResult({
            name: 'Gigs Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
            category: 'EXPORTS',
            status: 'PASS',
            endpoint: 'GET /api/export/gigs',
            expected: '200 XLSX buffer with >= 1000 rows and audit log entry',
            actual: `200 XLSX sheet rows: ${sheet.rowCount}, audit log ID: ${latestAudit.id}`,
            durationMs: Date.now() - t2Start,
            sourceFile: 'controllers/export.controller.js',
          });
        } else {
          recordTestResult({
            name: 'Gigs Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
            category: 'EXPORTS',
            status: 'FAIL',
            endpoint: 'GET /api/export/gigs',
            expected: 'Audit log entry created',
            actual: 'Missing audit log entry',
            error: 'Audit log entry not found for gig export',
            durationMs: Date.now() - t2Start,
            sourceFile: 'controllers/export.controller.js',
          });
        }
      } else {
        recordTestResult({
          name: 'Gigs Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
          category: 'EXPORTS',
          status: 'FAIL',
          endpoint: 'GET /api/export/gigs',
          expected: 'Worksheet with >= 1000 rows',
          actual: `Sheet rows: ${sheet?.rowCount}`,
          error: 'Worksheet rows missing or unexpected',
          durationMs: Date.now() - t2Start,
          sourceFile: 'controllers/export.controller.js',
        });
      }
    } else {
      recordTestResult({
        name: 'Gigs Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
        category: 'EXPORTS',
        status: 'FAIL',
        endpoint: 'GET /api/export/gigs',
        expected: '200 XLSX content-type',
        actual: `${res.status} ${res.contentType}`,
        error: 'Export failed or invalid content type',
        durationMs: Date.now() - t2Start,
        sourceFile: 'controllers/export.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Gigs Export - Regression Check: ExcelJS workbook & audit log at scale (1000+)',
      category: 'EXPORTS',
      status: 'FAIL',
      endpoint: 'GET /api/export/gigs',
      error: err.message,
      durationMs: Date.now() - t2Start,
      sourceFile: 'controllers/export.controller.js',
    });
  }

  // 3. Date range validation: from > to returns 400
  const t3Start = Date.now();
  try {
    const res = await deepRequest('/export/events?from=2026-12-31&to=2026-01-01', { cookies: adminCookies });

    if (res.status === 400 && res.data.error === 'Invalid date range') {
      recordTestResult({
        name: 'Export Validation - from > to returns 400',
        category: 'EXPORTS',
        status: 'PASS',
        endpoint: 'GET /api/export/events?from=2026-12-31&to=2026-01-01',
        expected: '400 { error: "Invalid date range" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t3Start,
        sourceFile: 'validators/event.validator.js',
      });
    } else {
      recordTestResult({
        name: 'Export Validation - from > to returns 400',
        category: 'EXPORTS',
        status: 'FAIL',
        endpoint: 'GET /api/export/events?from=2026-12-31&to=2026-01-01',
        expected: '400 { error: "Invalid date range" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Date range validation failed',
        durationMs: Date.now() - t3Start,
        sourceFile: 'validators/event.validator.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Export Validation - from > to returns 400',
      category: 'EXPORTS',
      status: 'FAIL',
      endpoint: 'GET /api/export/events',
      error: err.message,
      durationMs: Date.now() - t3Start,
      sourceFile: 'validators/event.validator.js',
    });
  }
}
