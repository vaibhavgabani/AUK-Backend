import { deepRequest, recordTestResult } from './helpers.js';

export async function runEventDeepTests(adminCookies, managerCookies, seedEvents) {
  console.log('\n--- EVENT DEEP TESTS ---');

  // 1. Manager Create Event
  const t1Start = Date.now();
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(Date.now() + 172800000).toISOString();

  let createdEvtId = null;
  try {
    const res = await deepRequest('/events', {
      method: 'POST',
      cookies: managerCookies,
      body: {
        name: 'London Deep Operations Event',
        place: 'London Exhibition Centre',
        startDatetime: start,
        endDatetime: end,
      },
    });

    if (res.status === 201 && res.data.data.status === 'upcoming') {
      createdEvtId = res.data.data.id;
      recordTestResult({
        name: 'Manager Create Event - Dynamic status upcoming',
        category: 'EVENTS',
        status: 'PASS',
        endpoint: 'POST /api/events',
        expected: '201 with status: "upcoming"',
        actual: `201 status ${res.data.data.status}`,
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/event.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Manager Create Event - Dynamic status upcoming',
        category: 'EVENTS',
        status: 'FAIL',
        endpoint: 'POST /api/events',
        expected: '201 with status: "upcoming"',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Event creation failed',
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/event.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Manager Create Event - Dynamic status upcoming',
      category: 'EVENTS',
      status: 'FAIL',
      endpoint: 'POST /api/events',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'controllers/event.controller.js',
    });
  }

  // 2. End datetime <= start datetime returns 400
  const t2Start = Date.now();
  try {
    const res = await deepRequest('/events', {
      method: 'POST',
      cookies: managerCookies,
      body: {
        name: 'Invalid Date Event',
        place: 'London Centre',
        startDatetime: end,
        endDatetime: start,
      },
    });

    if (res.status === 400 && res.data.error === 'End datetime must be after start datetime') {
      recordTestResult({
        name: 'Manager Create Event - endDatetime <= startDatetime returns 400',
        category: 'EVENTS',
        status: 'PASS',
        endpoint: 'POST /api/events',
        expected: '400 { error: "End datetime must be after start datetime" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t2Start,
        sourceFile: 'validators/event.validator.js',
      });
    } else {
      recordTestResult({
        name: 'Manager Create Event - endDatetime <= startDatetime returns 400',
        category: 'EVENTS',
        status: 'FAIL',
        endpoint: 'POST /api/events',
        expected: '400 { error: "End datetime must be after start datetime" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Validation error message mismatch',
        durationMs: Date.now() - t2Start,
        sourceFile: 'validators/event.validator.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Manager Create Event - endDatetime <= startDatetime returns 400',
      category: 'EVENTS',
      status: 'FAIL',
      endpoint: 'POST /api/events',
      error: err.message,
      durationMs: Date.now() - t2Start,
      sourceFile: 'validators/event.validator.js',
    });
  }

  // 3. REGRESSION CHECK: PATCH Event (verify entityId is defined bug fix)
  const targetEvtId = createdEvtId || seedEvents[0].id;
  const t3Start = Date.now();
  try {
    const res = await deepRequest(`/events/${targetEvtId}`, {
      method: 'PATCH',
      cookies: managerCookies,
      body: {
        name: 'Updated London Deep Operations Event',
        place: 'London Exhibition Centre Suite A',
      },
    });

    if (res.status === 200 && res.data.data.name === 'Updated London Deep Operations Event') {
      recordTestResult({
        name: 'PATCH /api/events/:id — Regression Check: entityId bug fix on update',
        category: 'EVENTS',
        status: 'PASS',
        endpoint: 'PATCH /api/events/:id',
        expected: '200 Updated event',
        actual: `200 ${JSON.stringify(res.data.data)}`,
        durationMs: Date.now() - t3Start,
        sourceFile: 'services/event.service.js',
      });
    } else {
      recordTestResult({
        name: 'PATCH /api/events/:id — Regression Check: entityId bug fix on update',
        category: 'EVENTS',
        status: 'FAIL',
        endpoint: 'PATCH /api/events/:id',
        expected: '200 Updated event',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: res.data.error || 'Event update failed',
        durationMs: Date.now() - t3Start,
        sourceFile: 'services/event.service.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'PATCH /api/events/:id — Regression Check: entityId bug fix on update',
      category: 'EVENTS',
      status: 'FAIL',
      endpoint: 'PATCH /api/events/:id',
      error: err.message,
      durationMs: Date.now() - t3Start,
      sourceFile: 'services/event.service.js',
    });
  }

  // 4. REGRESSION CHECK: DELETE Event (verify entityId is defined bug fix & soft delete)
  const t4Start = Date.now();
  try {
    const res = await deepRequest(`/events/${targetEvtId}`, {
      method: 'DELETE',
      cookies: managerCookies,
    });

    if (res.status === 200 && res.data.message === 'Event deleted successfully') {
      recordTestResult({
        name: 'DELETE /api/events/:id — Regression Check: entityId bug fix on soft delete',
        category: 'EVENTS',
        status: 'PASS',
        endpoint: 'DELETE /api/events/:id',
        expected: '200 { message: "Event deleted successfully" }',
        actual: `200 ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t4Start,
        sourceFile: 'services/event.service.js',
      });
    } else {
      recordTestResult({
        name: 'DELETE /api/events/:id — Regression Check: entityId bug fix on soft delete',
        category: 'EVENTS',
        status: 'FAIL',
        endpoint: 'DELETE /api/events/:id',
        expected: '200 { message: "Event deleted successfully" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: res.data.error || 'Event delete failed',
        durationMs: Date.now() - t4Start,
        sourceFile: 'services/event.service.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'DELETE /api/events/:id — Regression Check: entityId bug fix on soft delete',
      category: 'EVENTS',
      status: 'FAIL',
      endpoint: 'DELETE /api/events/:id',
      error: err.message,
      durationMs: Date.now() - t4Start,
      sourceFile: 'services/event.service.js',
    });
  }

  // 5. Admin GET Events at scale (1000+)
  const t5Start = Date.now();
  try {
    const res = await deepRequest('/events', { cookies: adminCookies });
    if (res.status === 200 && Array.isArray(res.data.data) && res.data.data.length >= 990) {
      recordTestResult({
        name: 'Admin GET Events - Scale listing (1000+ records)',
        category: 'EVENTS',
        status: 'PASS',
        endpoint: 'GET /api/events',
        expected: '200 with array length >= 990',
        actual: `200 with array length ${res.data.data.length}`,
        durationMs: Date.now() - t5Start,
        sourceFile: 'controllers/event.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Admin GET Events - Scale listing (1000+ records)',
        category: 'EVENTS',
        status: 'FAIL',
        endpoint: 'GET /api/events',
        expected: '200 with array length >= 990',
        actual: `${res.status} array length ${res.data?.data?.length}`,
        error: 'Event scale list failed or count mismatch',
        durationMs: Date.now() - t5Start,
        sourceFile: 'controllers/event.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Admin GET Events - Scale listing (1000+ records)',
      category: 'EVENTS',
      status: 'FAIL',
      endpoint: 'GET /api/events',
      error: err.message,
      durationMs: Date.now() - t5Start,
      sourceFile: 'controllers/event.controller.js',
    });
  }
}
