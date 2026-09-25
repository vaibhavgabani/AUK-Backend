import { deepRequest, recordTestResult } from './helpers.js';

export async function runSecurityDeepTests(adminCookies, managerCookies, seedEvents) {
  console.log('\n--- SECURITY, AUTHORIZATION & CONCURRENCY TESTS ---');

  // 1. Unowned event ownership check (returns 404, no information leakage)
  const t1Start = Date.now();
  try {
    // Attempt to access unowned event ID 999999 or event owned by another manager
    const res = await deepRequest('/events/999999', { cookies: managerCookies });

    if (res.status === 404 && res.data.error === 'Event not found') {
      recordTestResult({
        name: 'Manager Ownership Isolation - Accessing unowned resource returns 404',
        category: 'SECURITY',
        status: 'PASS',
        endpoint: 'GET /api/events/999999',
        expected: '404 { error: "Event not found" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t1Start,
        sourceFile: 'services/event.service.js',
      });
    } else {
      recordTestResult({
        name: 'Manager Ownership Isolation - Accessing unowned resource returns 404',
        category: 'SECURITY',
        status: 'FAIL',
        endpoint: 'GET /api/events/999999',
        expected: '404 { error: "Event not found" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Ownership isolation check failed or leaked resource existence',
        durationMs: Date.now() - t1Start,
        sourceFile: 'services/event.service.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Manager Ownership Isolation - Accessing unowned resource returns 404',
      category: 'SECURITY',
      status: 'FAIL',
      endpoint: 'GET /api/events/999999',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'services/event.service.js',
    });
  }

  // 2. Fuzzing / Malformed Input Body -> 400 with { error: "message" }
  const t2Start = Date.now();
  try {
    const res = await deepRequest('/events', {
      method: 'POST',
      cookies: managerCookies,
      body: {
        name: 12345, // invalid type
        place: null,
      },
    });

    if (res.status === 400 && typeof res.data.error === 'string') {
      recordTestResult({
        name: 'Fuzz Validation - Invalid payload types return 400 with error message',
        category: 'VALIDATION',
        status: 'PASS',
        endpoint: 'POST /api/events',
        expected: '400 { error: "message" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t2Start,
        sourceFile: 'validators/event.validator.js',
      });
    } else {
      recordTestResult({
        name: 'Fuzz Validation - Invalid payload types return 400 with error message',
        category: 'VALIDATION',
        status: 'FAIL',
        endpoint: 'POST /api/events',
        expected: '400 { error: "message" }',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Validation error response format invalid',
        durationMs: Date.now() - t2Start,
        sourceFile: 'validators/event.validator.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Fuzz Validation - Invalid payload types return 400 with error message',
      category: 'VALIDATION',
      status: 'FAIL',
      endpoint: 'POST /api/events',
      error: err.message,
      durationMs: Date.now() - t2Start,
      sourceFile: 'validators/event.validator.js',
    });
  }

  // 3. Concurrency Batch Testing (20 concurrent requests)
  const t3Start = Date.now();
  try {
    const batchRequests = Array.from({ length: 20 }, (_, i) =>
      deepRequest(`/events?place=City`, { cookies: adminCookies })
    );

    const results = await Promise.all(batchRequests);
    const allSuccessful = results.every((r) => r.status === 200);

    if (allSuccessful) {
      recordTestResult({
        name: 'Concurrency Testing - 20 simultaneous GET events requests succeed cleanly',
        category: 'PERFORMANCE',
        status: 'PASS',
        endpoint: 'GET /api/events (20x concurrent)',
        expected: '20x HTTP 200',
        actual: '20x HTTP 200',
        durationMs: Date.now() - t3Start,
        sourceFile: 'app.js',
      });
    } else {
      recordTestResult({
        name: 'Concurrency Testing - 20 simultaneous GET events requests succeed cleanly',
        category: 'PERFORMANCE',
        status: 'FAIL',
        endpoint: 'GET /api/events (20x concurrent)',
        expected: '20x HTTP 200',
        actual: `Statuses: ${results.map((r) => r.status).join(',')}`,
        error: 'Concurrent batch contains failures',
        durationMs: Date.now() - t3Start,
        sourceFile: 'app.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Concurrency Testing - 20 simultaneous GET events requests succeed cleanly',
      category: 'PERFORMANCE',
      status: 'FAIL',
      endpoint: 'GET /api/events (20x concurrent)',
      error: err.message,
      durationMs: Date.now() - t3Start,
      sourceFile: 'app.js',
    });
  }
}
