import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/api.js';
import { loginAsAdmin, loginAsManager } from './helpers/auth.js';
import { getUniqueEmail, trackCreatedEvent, trackCreatedUser } from './helpers/testData.js';
import { db } from '../db/index.js';
import { gigProfiles } from '../db/schema.js';
import { eq, isNull, and } from 'drizzle-orm';

describe('Event Gig Assignment APIs (/api/events/:id/gigs)', () => {
  let createdManagerCookies = null;
  let eventId = null;
  let testGigId = null;
  let assignmentId = null;

  test('Setup: Create test manager, event, and gig profile', async () => {
    const adminCookies = await loginAsAdmin();
    const mgrEmail = getUniqueEmail('asgn_mgr');
    const mgrPassword = 'Password123!';

    const mgrRes = await request('/managers', {
      method: 'POST',
      cookies: adminCookies,
      body: {
        name: 'Assignment Test Manager',
        email: mgrEmail,
        password: mgrPassword,
        phone: '07111222333',
      },
    });

    assert.equal(mgrRes.status, 201);
    trackCreatedUser(mgrRes.data.data.userId);
    createdManagerCookies = await loginAsManager(mgrEmail, mgrPassword);

    // Create Event
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 86400000 + 4 * 3600000).toISOString(); // 4 hours

    const evtRes = await request('/events', {
      method: 'POST',
      cookies: createdManagerCookies,
      body: {
        name: 'TEST_Event_For_Assignments',
        place: 'Birmingham City Hall',
        startDatetime: start,
        endDatetime: end,
      },
    });
    assert.equal(evtRes.status, 201);
    eventId = evtRes.data.data.id;
    trackCreatedEvent(eventId);

    // Fetch existing active gig from DB or create a test gig profile
    const existingGigs = await db
      .select({ id: gigProfiles.id })
      .from(gigProfiles)
      .where(isNull(gigProfiles.deletedAt))
      .limit(1);

    if (existingGigs.length > 0) {
      testGigId = existingGigs[0].id;
    } else {
      const gigEmail = getUniqueEmail('gig_user');
      const [newGigProf] = await db
        .insert(gigProfiles)
        .values({
          name: 'Test Gig Worker',
          email: gigEmail,
          phone: '07000000000',
          payRate: '15.00',
        })
        .returning();

      testGigId = newGigProf.id;
    }
  });

  test('POST /api/events/:id/gigs — Assigns gig to event with default event datetimes and calculated hours', async () => {
    const res = await request(`/events/${eventId}/gigs`, {
      method: 'POST',
      cookies: createdManagerCookies,
      body: { gigId: testGigId },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.data.eventId, eventId);
    assert.equal(res.data.data.gigId, testGigId);
    assert.equal(res.data.data.totalHours, 4);

    assignmentId = res.data.data.id;
  });

  test('POST /api/events/:id/gigs — Duplicate assignment returns 409 Conflict', async () => {
    const res = await request(`/events/${eventId}/gigs`, {
      method: 'POST',
      cookies: createdManagerCookies,
      body: { gigId: testGigId },
    });

    assert.equal(res.status, 409);
    assert.equal(res.data.error, 'Gig is already assigned to this event');
  });

  test('GET /api/events/:id/gigs — Lists gig assignments for event', async () => {
    const res = await request(`/events/${eventId}/gigs`, {
      cookies: createdManagerCookies,
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data));
    assert.equal(res.data.data.length, 1);
    assert.equal(res.data.data[0].id, assignmentId);
  });

  test('PATCH /api/events/:id/gigs/:assignmentId — Updates assignment status and actual times', async () => {
    const res = await request(`/events/${eventId}/gigs/${assignmentId}`, {
      method: 'PATCH',
      cookies: createdManagerCookies,
      body: {
        status: 'confirmed',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.data.status, 'confirmed');
  });

  test('DELETE /api/events/:id/gigs/:assignmentId — Removes gig assignment from event', async () => {
    const res = await request(`/events/${eventId}/gigs/${assignmentId}`, {
      method: 'DELETE',
      cookies: createdManagerCookies,
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.message, 'Gig assignment removed successfully');
  });
});
