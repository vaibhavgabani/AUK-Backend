import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/api.js';
import { loginAsAdmin, loginAsManager } from './helpers/auth.js';
import { getUniqueEmail, trackCreatedEvent, trackCreatedUser } from './helpers/testData.js';
import { db } from '../db/index.js';
import { eventGigAssignments, gigProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

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

  test('DELETE /api/events/:id — Deleting event purges assignments and worker total accumulated hours decreases', async () => {
    const adminCookies = await loginAsAdmin();

    // 1. Create a dedicated test gig worker
    const gigEmail = getUniqueEmail('phantom_worker');
    const [testGig] = await db
      .insert(gigProfiles)
      .values({
        name: 'Phantom Test Worker',
        email: gigEmail,
        phone: '07123999888',
        payRate: '20.00',
      })
      .returning();

    // 2. Create an event with 5 hours duration
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 86400000 + 5 * 3600000).toISOString(); // 5 hours

    const evtRes = await request('/events', {
      method: 'POST',
      cookies: createdManagerCookies,
      body: {
        name: 'TEST_Event_With_Worker_To_Delete',
        place: 'Leeds Arena',
        startDatetime: start,
        endDatetime: end,
      },
    });
    assert.equal(evtRes.status, 201);
    const eventToDeleteId = evtRes.data.data.id;
    trackCreatedEvent(eventToDeleteId);

    // 3. Assign the worker to this event
    const assignRes = await request(`/events/${eventToDeleteId}/gigs`, {
      method: 'POST',
      cookies: createdManagerCookies,
      body: { gigId: testGig.id },
    });
    assert.equal(assignRes.status, 201);

    // 4. Verify worker's accumulated hours include the 5 hours
    const gigListBefore = await request('/gigs', { cookies: adminCookies });
    assert.equal(gigListBefore.status, 200);
    const workerBefore = gigListBefore.data.data.find((g) => g.gigId === testGig.id);
    assert.ok(workerBefore, 'Worker must be listed in gigs roster');
    assert.equal(workerBefore.personTotalHours, 5);

    // 5. Delete the event
    const delRes = await request(`/events/${eventToDeleteId}`, {
      method: 'DELETE',
      cookies: createdManagerCookies,
    });
    assert.equal(delRes.status, 200);

    // 6. Verify corresponding assignments are purged from event_gig_assignments in database
    const remainingAssignments = await db
      .select()
      .from(eventGigAssignments)
      .where(eq(eventGigAssignments.eventId, eventToDeleteId));
    assert.equal(remainingAssignments.length, 0, 'Assignments must be purged from database on event deletion');

    // 7. Verify worker's total accumulated hours immediately decreased by 5 hours (now 0)
    const gigListAfter = await request('/gigs', { cookies: adminCookies });
    assert.equal(gigListAfter.status, 200);
    const workerAfter = gigListAfter.data.data.find((g) => g.gigId === testGig.id);
    assert.ok(workerAfter, 'Worker must still exist in roster as available');
    assert.equal(workerAfter.personTotalHours, 0, 'Worker hours must immediately decrease after event deletion');
  });
});
