import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/api.js';
import { loginAsAdmin, loginAsManager } from './helpers/auth.js';
import { getUniqueEmail, trackCreatedEvent, trackCreatedUser } from './helpers/testData.js';

describe('Event Expenses API (GET / POST /api/events/:id/expenses)', () => {
  let createdManagerCookies = null;
  let eventId = null;

  test('Setup: Create test manager & event for expenses', async () => {
    const adminCookies = await loginAsAdmin();
    const mgrEmail = getUniqueEmail('exp_mgr');
    const mgrPassword = 'Password123!';

    const mgrRes = await request('/managers', {
      method: 'POST',
      cookies: adminCookies,
      body: {
        name: 'Expense Test Manager',
        email: mgrEmail,
        password: mgrPassword,
        phone: '07555444333',
      },
    });
    assert.equal(mgrRes.status, 201);
    trackCreatedUser(mgrRes.data.data.userId);
    createdManagerCookies = await loginAsManager(mgrEmail, mgrPassword);

    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 172800000).toISOString();

    const evtRes = await request('/events', {
      method: 'POST',
      cookies: createdManagerCookies,
      body: {
        name: 'TEST_Event_Expenses',
        place: 'Bristol Arena',
        startDatetime: start,
        endDatetime: end,
      },
    });
    assert.equal(evtRes.status, 201);
    eventId = evtRes.data.data.id;
    trackCreatedEvent(eventId);
  });

  test('POST /api/events/:id/expenses — Manager adds an expense to event', async () => {
    const res = await request(`/events/${eventId}/expenses`, {
      method: 'POST',
      cookies: createdManagerCookies,
      body: {
        title: 'Catering Lunch for staff',
        amount: 75.5,
        currency: 'GBP',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.data.eventId, eventId);
    assert.equal(Number(res.data.data.amount), 75.5);
    assert.equal(res.data.data.title, 'Catering Lunch for staff');
    assert.equal(res.data.data.currency, 'GBP');
  });

  test('POST /api/events/:id/expenses — Fails with 400 when amount < 0', async () => {
    const res = await request(`/events/${eventId}/expenses`, {
      method: 'POST',
      cookies: createdManagerCookies,
      body: {
        title: 'Invalid expense',
        amount: -10,
        currency: 'GBP',
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Amount must be greater than or equal to 0');
  });

  test('GET /api/events/:id/expenses — Lists expenses for event', async () => {
    const res = await request(`/events/${eventId}/expenses`, {
      cookies: createdManagerCookies,
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    assert.equal(res.data.data.length, 1);
    assert.equal(Number(res.data.data[0].amount), 75.5);
  });
});
