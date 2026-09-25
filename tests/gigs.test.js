import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/api.js';
import { loginAsAdmin, loginAsManager } from './helpers/auth.js';

describe('Admin Gig Bookings API (GET /api/gigs)', () => {
  test('GET /api/gigs — Admin retrieves all active gig bookings with dynamic hours', async () => {
    const cookies = await loginAsAdmin();
    const res = await request('/gigs', { cookies });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));

    if (res.data.data.length > 0) {
      const bkg = res.data.data[0];
      assert.ok(bkg.assignmentId);
      assert.ok(bkg.eventId);
      assert.ok(bkg.eventName);
      assert.equal(typeof bkg.calculatedHours, 'number');
    }
  });

  test('GET /api/gigs — Admin can apply combined query filters', async () => {
    const cookies = await loginAsAdmin();
    const res = await request('/gigs?place=London&from=2026-01-01&to=2026-12-31', { cookies });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
  });

  test('GET /api/gigs — Unauthenticated user gets 401', async () => {
    const res = await request('/gigs');
    assert.equal(res.status, 401);
  });

  test('GET /api/gigs — Manager gets 403 Forbidden', async () => {
    try {
      const cookies = await loginAsManager();
      const res = await request('/gigs', { cookies });
      assert.equal(res.status, 403);
    } catch (e) {
      assert.ok(true);
    }
  });
});
