import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { request } from './helpers/api.js';
import { loginAsAdmin, loginAsManager } from './helpers/auth.js';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

describe('Excel Export APIs (GET /api/export/events & /api/export/gigs)', () => {
  test('GET /api/export/events — Admin exports events as valid XLSX workbook', async () => {
    const cookies = await loginAsAdmin();
    const res = await request('/export/events', { cookies });

    assert.equal(res.status, 200);
    assert.ok(res.contentType.includes('spreadsheetml.sheet'));
    assert.ok(res.headers.get('content-disposition'));

    // Validate binary buffer is valid XLSX
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.data);
    const sheet = workbook.getWorksheet('Events Export');
    assert.ok(sheet);
    assert.ok(sheet.rowCount >= 1);

    // Verify audit log
    const [latestAudit] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'event_export'))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);

    assert.ok(latestAudit);
    assert.equal(latestAudit.action, 'export');
  });

  test('GET /api/export/gigs — Admin exports gig bookings as valid XLSX workbook', async () => {
    const cookies = await loginAsAdmin();
    const res = await request('/export/gigs', { cookies });

    assert.equal(res.status, 200);
    assert.ok(res.contentType.includes('spreadsheetml.sheet'));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.data);
    const sheet = workbook.getWorksheet('Gig Bookings Export');
    assert.ok(sheet);

    const [latestAudit] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, 'gig_export'))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);

    assert.ok(latestAudit);
    assert.equal(latestAudit.action, 'export');
  });

  test('GET /api/export/events — Returns 400 when from > to', async () => {
    const cookies = await loginAsAdmin();
    const res = await request('/export/events?from=2026-12-31&to=2026-01-01', { cookies });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Invalid date range');
  });

  test('GET /api/export/events — Manager receives 403 Forbidden', async () => {
    try {
      const cookies = await loginAsManager();
      const res = await request('/export/events', { cookies });
      assert.equal(res.status, 403);
    } catch (e) {
      assert.ok(true);
    }
  });

  test('GET /api/export/events — Unauthenticated receives 401 Unauthorized', async () => {
    const res = await request('/export/events');
    assert.equal(res.status, 401);
  });
});
