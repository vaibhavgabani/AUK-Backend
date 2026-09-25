import { deepRequest, recordTestResult } from './helpers.js';

export async function runFilterDeepTests(adminCookies, seedEvents) {
  console.log('\n--- FILTER TESTING AT SCALE ---');

  // 1. Place filter
  const t1Start = Date.now();
  try {
    const targetPlace = 'London';
    const expectedMatches = seedEvents.filter((e) => e.place.toLowerCase().includes('london'));

    const res = await deepRequest(`/events?place=${targetPlace}`, { cookies: adminCookies });

    if (res.status === 200 && Array.isArray(res.data.data)) {
      const apiMatches = res.data.data;
      const countsMatch = apiMatches.length === expectedMatches.length;

      recordTestResult({
        name: 'Filter by place - Accuracy check at scale',
        category: 'FILTERS',
        status: countsMatch ? 'PASS' : 'FAIL',
        endpoint: `GET /api/events?place=${targetPlace}`,
        expected: `Matching count ${expectedMatches.length}`,
        actual: `API returned count ${apiMatches.length}`,
        error: countsMatch ? '' : `Mismatch: expected ${expectedMatches.length}, got ${apiMatches.length}`,
        durationMs: Date.now() - t1Start,
        sourceFile: 'services/event.service.js',
      });
    } else {
      recordTestResult({
        name: 'Filter by place - Accuracy check at scale',
        category: 'FILTERS',
        status: 'FAIL',
        endpoint: `GET /api/events?place=${targetPlace}`,
        expected: '200 Array',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Place filter API call failed',
        durationMs: Date.now() - t1Start,
        sourceFile: 'services/event.service.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Filter by place - Accuracy check at scale',
      category: 'FILTERS',
      status: 'FAIL',
      endpoint: 'GET /api/events?place=London',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'services/event.service.js',
    });
  }

  // 2. Manager ID filter
  const t2Start = Date.now();
  try {
    const targetMgrId = seedEvents[0].managerId;
    const expectedMatches = seedEvents.filter((e) => e.managerId === targetMgrId);

    const res = await deepRequest(`/events?managerId=${targetMgrId}`, { cookies: adminCookies });

    if (res.status === 200 && Array.isArray(res.data.data)) {
      const apiMatches = res.data.data;
      const countsMatch = apiMatches.length === expectedMatches.length;

      recordTestResult({
        name: 'Filter by managerId - Accuracy check at scale',
        category: 'FILTERS',
        status: countsMatch ? 'PASS' : 'FAIL',
        endpoint: `GET /api/events?managerId=${targetMgrId}`,
        expected: `Matching count ${expectedMatches.length}`,
        actual: `API returned count ${apiMatches.length}`,
        error: countsMatch ? '' : `Mismatch: expected ${expectedMatches.length}, got ${apiMatches.length}`,
        durationMs: Date.now() - t2Start,
        sourceFile: 'services/event.service.js',
      });
    } else {
      recordTestResult({
        name: 'Filter by managerId - Accuracy check at scale',
        category: 'FILTERS',
        status: 'FAIL',
        endpoint: `GET /api/events?managerId=${targetMgrId}`,
        expected: '200 Array',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Manager filter API call failed',
        durationMs: Date.now() - t2Start,
        sourceFile: 'services/event.service.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Filter by managerId - Accuracy check at scale',
      category: 'FILTERS',
      status: 'FAIL',
      endpoint: 'GET /api/events?managerId=1',
      error: err.message,
      durationMs: Date.now() - t2Start,
      sourceFile: 'services/event.service.js',
    });
  }
}
