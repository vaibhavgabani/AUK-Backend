import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/api.js';
import { loginAsAdmin, loginAsManager } from './helpers/auth.js';
import { getUniqueEmail, trackCreatedEvent, trackCreatedUser } from './helpers/testData.js';

describe('Invoice Data API (GET /api/events/:id/invoice)', () => {
  let createdManagerCookies = null;
  let eventId = null;

  test('Setup: Create test manager & event with expense for invoice', async () => {
    const adminCookies = await loginAsAdmin();
    const mgrEmail = getUniqueEmail('inv_mgr');
    const mgrPassword = 'Password123!';

    const mgrRes = await request('/managers', {
      method: 'POST',
      cookies: adminCookies,
      body: {
        name: 'Invoice Test Manager',
        email: mgrEmail,
        password: mgrPassword,
        phone: '07666555444',
      },
    });
    assert.equal(mgrRes.status, 201);
    trackCreatedUser(mgrRes.data.data.userId);
    createdManagerCookies = await loginAsManager(mgrEmail, mgrPassword);

    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 86400000 + 5 * 3600000).toISOString(); // 5 hours

    const evtRes = await request('/events', {
      method: 'POST',
      cookies: createdManagerCookies,
      body: {
        name: 'TEST_Event_Invoice',
        place: 'Leeds Exhibition Center',
        startDatetime: start,
        endDatetime: end,
      },
    });
    assert.equal(evtRes.status, 201);
    eventId = evtRes.data.data.id;
    trackCreatedEvent(eventId);

    // Add expense
    await request(`/events/${eventId}/expenses`, {
      method: 'POST',
      cookies: createdManagerCookies,
      body: {
        amount: 120.0,
        category: 'Equipment',
        currency: 'GBP',
      },
    });
  });

  test('GET /api/events/:id/invoice — Assembles full invoice data', async () => {
    const res = await request(`/events/${eventId}/invoice`, {
      cookies: createdManagerCookies,
    });

    assert.equal(res.status, 200);
    const invoice = res.data.data;
    assert.equal(invoice.event.id, eventId);
    assert.equal(invoice.event.name, 'TEST_Event_Invoice');
    assert.ok(invoice.manager.managerName);
    assert.ok(Array.isArray(invoice.gigs));
    assert.ok(Array.isArray(invoice.expenses));
    assert.equal(invoice.expenses.length, 1);
    assert.equal(invoice.expenseTotals.GBP, 120.0);
  });
});
