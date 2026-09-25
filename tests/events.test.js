import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/api.js';
import { loginAsAdmin, loginAsManager } from './helpers/auth.js';
import { getUniqueEmail, trackCreatedEvent, trackCreatedUser } from './helpers/testData.js';

describe('Event APIs (GET / POST / PATCH / DELETE /api/events)', () => {
  let createdManagerCookies = null;
  let createdEventId = null;

  test('Setup: Create a test manager account for event operations', async () => {
    const adminCookies = await loginAsAdmin();
    const mgrEmail = getUniqueEmail('evt_mgr');
    const mgrPassword = 'Password123!';

    const mgrRes = await request('/managers', {
      method: 'POST',
      cookies: adminCookies,
      body: {
        name: 'Event Test Manager',
        email: mgrEmail,
        password: mgrPassword,
        phone: '07999888777',
      },
    });

    assert.equal(mgrRes.status, 201);
    trackCreatedUser(mgrRes.data.data.userId);

    createdManagerCookies = await loginAsManager(mgrEmail, mgrPassword);
    assert.ok(createdManagerCookies);
  });

  test('POST /api/events — Manager creates an event with dynamic status', async () => {
    const start = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    const end = new Date(Date.now() + 172800000).toISOString(); // day after tomorrow

    const res = await request('/events', {
      method: 'POST',
      cookies: createdManagerCookies,
      body: {
        name: 'TEST_Event_Future',
        place: 'London Arena',
        startDatetime: start,
        endDatetime: end,
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.data.name, 'TEST_Event_Future');
    assert.equal(res.data.data.status, 'upcoming');

    createdEventId = res.data.data.id;
    trackCreatedEvent(createdEventId);
  });

  test('POST /api/events — Fails with 400 when endDatetime <= startDatetime', async () => {
    const start = new Date(Date.now() + 172800000).toISOString();
    const end = new Date(Date.now() + 86400000).toISOString();

    const res = await request('/events', {
      method: 'POST',
      cookies: createdManagerCookies,
      body: {
        name: 'TEST_Event_Invalid_Dates',
        place: 'London Arena',
        startDatetime: start,
        endDatetime: end,
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'End datetime must be after start datetime');
  });

  test('GET /api/events — Admin lists all events and supports query filters', async () => {
    const adminCookies = await loginAsAdmin();
    const res = await request('/events?status=upcoming&place=London', {
      cookies: adminCookies,
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
  });

  test('GET /api/events/:id — Manager retrieves own event detail with calculated totalHours', async () => {
    const res = await request(`/events/${createdEventId}`, {
      cookies: createdManagerCookies,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.data.id, createdEventId);
    assert.equal(typeof res.data.data.totalHours, 'number');
  });

  test('PATCH /api/events/:id — Manager updates event details', async () => {
    const res = await request(`/events/${createdEventId}`, {
      method: 'PATCH',
      cookies: createdManagerCookies,
      body: {
        name: 'TEST_Event_Updated_Name',
        place: 'Manchester Arena',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.data.name, 'TEST_Event_Updated_Name');
    assert.equal(res.data.data.place, 'Manchester Arena');
  });

  test('DELETE /api/events/:id — Manager soft-deletes event', async () => {
    const res = await request(`/events/${createdEventId}`, {
      method: 'DELETE',
      cookies: createdManagerCookies,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.message, 'Event deleted successfully');

    // Confirm soft deleted event returns 404 on subsequent get
    const getRes = await request(`/events/${createdEventId}`, {
      cookies: createdManagerCookies,
    });
    assert.equal(getRes.status, 404);
  });
});
