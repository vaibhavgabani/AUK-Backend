import { deepRequest, recordTestResult } from './helpers.js';

export async function runAssignmentDeepTests(managerCookies, seedEvent, seedGig) {
  console.log('\n--- GIG ASSIGNMENT DEEP TESTS ---');

  // 1. Assign gig to event
  const t1Start = Date.now();
  let createdAsgnId = null;
  try {
    const res = await deepRequest(`/events/${seedEvent.id}/gigs`, {
      method: 'POST',
      cookies: managerCookies,
      body: { gigId: seedGig.id },
    });

    if (res.status === 201 && res.data.data.eventId === seedEvent.id && typeof res.data.data.totalHours === 'number') {
      createdAsgnId = res.data.data.id;
      recordTestResult({
        name: 'Create Gig Assignment - API creation with calculated totalHours',
        category: 'GIG_ASSIGNMENTS',
        status: 'PASS',
        endpoint: 'POST /api/events/:id/gigs',
        expected: '201 Created with totalHours',
        actual: `201 totalHours: ${res.data.data.totalHours}`,
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/assignment.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Create Gig Assignment - API creation with calculated totalHours',
        category: 'GIG_ASSIGNMENTS',
        status: 'FAIL',
        endpoint: 'POST /api/events/:id/gigs',
        expected: '201 Created with totalHours',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Gig assignment creation failed',
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/assignment.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Create Gig Assignment - API creation with calculated totalHours',
      category: 'GIG_ASSIGNMENTS',
      status: 'FAIL',
      endpoint: 'POST /api/events/:id/gigs',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'controllers/assignment.controller.js',
    });
  }

  // 2. Duplicate assignment returns 409
  const t2Start = Date.now();
  try {
    const res = await deepRequest(`/events/${seedEvent.id}/gigs`, {
      method: 'POST',
      cookies: managerCookies,
      body: { gigId: seedGig.id },
    });

    if (res.status === 409 && res.data.error === 'Gig is already assigned to this event') {
      recordTestResult({
        name: 'Create Gig Assignment - Duplicate assignment returns 409 Conflict',
        category: 'GIG_ASSIGNMENTS',
        status: 'PASS',
        endpoint: 'POST /api/events/:id/gigs',
        expected: '409 { error: "Gig is already assigned to this event" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t2Start,
        sourceFile: 'controllers/assignment.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Create Gig Assignment - Duplicate assignment returns 409 Conflict',
        category: 'GIG_ASSIGNMENTS',
        status: 'FAIL',
        endpoint: 'POST /api/events/:id/gigs',
        expected: '409 { error: "Gig is already assigned to this event" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Duplicate assignment check failed',
        durationMs: Date.now() - t2Start,
        sourceFile: 'controllers/assignment.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Create Gig Assignment - Duplicate assignment returns 409 Conflict',
      category: 'GIG_ASSIGNMENTS',
      status: 'FAIL',
      endpoint: 'POST /api/events/:id/gigs',
      error: err.message,
      durationMs: Date.now() - t2Start,
      sourceFile: 'controllers/assignment.controller.js',
    });
  }

  // 3. GET event gigs
  const t3Start = Date.now();
  try {
    const res = await deepRequest(`/events/${seedEvent.id}/gigs`, {
      cookies: managerCookies,
    });

    if (res.status === 200 && Array.isArray(res.data.data)) {
      recordTestResult({
        name: 'GET Event Gigs - Retrieves assignment list',
        category: 'GIG_ASSIGNMENTS',
        status: 'PASS',
        endpoint: 'GET /api/events/:id/gigs',
        expected: '200 Array of assignments',
        actual: `200 length ${res.data.data.length}`,
        durationMs: Date.now() - t3Start,
        sourceFile: 'controllers/assignment.controller.js',
      });
    } else {
      recordTestResult({
        name: 'GET Event Gigs - Retrieves assignment list',
        category: 'GIG_ASSIGNMENTS',
        status: 'FAIL',
        endpoint: 'GET /api/events/:id/gigs',
        expected: '200 Array of assignments',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'GET event gigs failed',
        durationMs: Date.now() - t3Start,
        sourceFile: 'controllers/assignment.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'GET Event Gigs - Retrieves assignment list',
      category: 'GIG_ASSIGNMENTS',
      status: 'FAIL',
      endpoint: 'GET /api/events/:id/gigs',
      error: err.message,
      durationMs: Date.now() - t3Start,
      sourceFile: 'controllers/assignment.controller.js',
    });
  }
}
