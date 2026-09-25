import { deepRequest, recordTestResult } from './helpers.js';

export async function runManagerDeepTests(adminCookies, managerCookies) {
  console.log('\n--- MANAGER DEEP TESTS ---');

  // 1. Admin GET managers
  const t1Start = Date.now();
  try {
    const res = await deepRequest('/managers', { cookies: adminCookies });
    if (res.status === 200 && Array.isArray(res.data.data) && res.data.data.length >= 1000) {
      recordTestResult({
        name: 'Admin List Managers - Returns full manager list at scale (1000+)',
        category: 'MANAGERS',
        status: 'PASS',
        endpoint: 'GET /api/managers',
        expected: '200 with array length >= 1000',
        actual: `200 with array length ${res.data.data.length}`,
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/manager.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Admin List Managers - Returns full manager list at scale (1000+)',
        category: 'MANAGERS',
        status: 'FAIL',
        endpoint: 'GET /api/managers',
        expected: '200 with array length >= 1000',
        actual: `${res.status} array length ${res.data?.data?.length}`,
        error: 'Manager list failed or incomplete count',
        durationMs: Date.now() - t1Start,
        sourceFile: 'controllers/manager.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Admin List Managers - Returns full manager list at scale (1000+)',
      category: 'MANAGERS',
      status: 'FAIL',
      endpoint: 'GET /api/managers',
      error: err.message,
      durationMs: Date.now() - t1Start,
      sourceFile: 'controllers/manager.controller.js',
    });
  }

  // 2. Admin POST manager
  const t2Start = Date.now();
  const testEmail = `new.created.mgr.${Date.now()}@example.test`;
  try {
    const res = await deepRequest('/managers', {
      method: 'POST',
      cookies: adminCookies,
      body: {
        name: 'Aarav Deep Test Manager',
        email: testEmail,
        password: 'ManagerPassword123!',
        phone: '07111222333',
      },
    });

    if (res.status === 201 && res.data.data.email === testEmail) {
      recordTestResult({
        name: 'Admin Create Manager - Valid creation via API',
        category: 'MANAGERS',
        status: 'PASS',
        endpoint: 'POST /api/managers',
        expected: '201 Created',
        actual: `201 ${JSON.stringify(res.data.data)}`,
        durationMs: Date.now() - t2Start,
        sourceFile: 'controllers/manager.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Admin Create Manager - Valid creation via API',
        category: 'MANAGERS',
        status: 'FAIL',
        endpoint: 'POST /api/managers',
        expected: '201 Created',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Manager creation failed',
        durationMs: Date.now() - t2Start,
        sourceFile: 'controllers/manager.controller.js',
      });
    }

    // 3. Duplicate email returns 409
    const t3Start = Date.now();
    const dupRes = await deepRequest('/managers', {
      method: 'POST',
      cookies: adminCookies,
      body: {
        name: 'Duplicate Aarav Manager',
        email: testEmail,
        password: 'ManagerPassword123!',
      },
    });

    if (dupRes.status === 409 && dupRes.data.error === 'Email already registered') {
      recordTestResult({
        name: 'Admin Create Manager - Duplicate email returns 409',
        category: 'MANAGERS',
        status: 'PASS',
        endpoint: 'POST /api/managers',
        expected: '409 { error: "Email already registered" }',
        actual: `${dupRes.status} ${JSON.stringify(dupRes.data)}`,
        durationMs: Date.now() - t3Start,
        sourceFile: 'controllers/manager.controller.js',
      });
    } else {
      recordTestResult({
        name: 'Admin Create Manager - Duplicate email returns 409',
        category: 'MANAGERS',
        status: 'FAIL',
        endpoint: 'POST /api/managers',
        expected: '409 { error: "Email already registered" }',
        actual: `${dupRes.status} ${JSON.stringify(dupRes.data)}`,
        error: 'Duplicate email check failed',
        durationMs: Date.now() - t3Start,
        sourceFile: 'controllers/manager.controller.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Admin Create Manager - Valid creation via API',
      category: 'MANAGERS',
      status: 'FAIL',
      endpoint: 'POST /api/managers',
      error: err.message,
      durationMs: Date.now() - t2Start,
      sourceFile: 'controllers/manager.controller.js',
    });
  }

  // 4. Manager forbidden from creating manager
  const t4Start = Date.now();
  try {
    const res = await deepRequest('/managers', {
      method: 'POST',
      cookies: managerCookies,
      body: {
        name: 'Forbidden Manager',
        email: `forbidden.${Date.now()}@example.test`,
        password: 'ManagerPassword123!',
      },
    });

    if (res.status === 403) {
      recordTestResult({
        name: 'Manager Create Manager - Non-admin returns 403 Forbidden',
        category: 'MANAGERS',
        status: 'PASS',
        endpoint: 'POST /api/managers',
        expected: '403 Forbidden',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        durationMs: Date.now() - t4Start,
        sourceFile: 'middlewares/role.middleware.js',
      });
    } else {
      recordTestResult({
        name: 'Manager Create Manager - Non-admin returns 403 Forbidden',
        category: 'MANAGERS',
        status: 'FAIL',
        endpoint: 'POST /api/managers',
        expected: '403 Forbidden',
        actual: `${res.status} ${JSON.stringify(res.data)}`,
        error: 'Forbidden check failed for non-admin user',
        durationMs: Date.now() - t4Start,
        sourceFile: 'middlewares/role.middleware.js',
      });
    }
  } catch (err) {
    recordTestResult({
      name: 'Manager Create Manager - Non-admin returns 403 Forbidden',
      category: 'MANAGERS',
      status: 'FAIL',
      endpoint: 'POST /api/managers',
      error: err.message,
      durationMs: Date.now() - t4Start,
      sourceFile: 'middlewares/role.middleware.js',
    });
  }
}
