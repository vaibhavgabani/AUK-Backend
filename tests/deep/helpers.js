import http from 'http';
import app from '../../app.js';

let server = null;
let baseUrl = '';

export const metrics = {
  startedAt: new Date().toISOString(),
  finishedAt: null,
  databaseSafetyCheck: 'PASSED',
  seedCounts: {},
  tests: [],
  passed: 0,
  failed: 0,
  skipped: 0,
  notTested: 0,
  performance: {},
};

export async function startDeepServer() {
  if (server) return baseUrl;
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
  return baseUrl;
}

export async function stopDeepServer() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
    baseUrl = '';
  }
}

export async function deepRequest(path, options = {}) {
  if (!baseUrl) {
    await startDeepServer();
  }

  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const headers = { ...(options.headers || {}) };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof Buffer)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  if (options.cookies) {
    headers['Cookie'] = options.cookies;
  }

  const startTime = Date.now();
  const response = await fetch(url, { ...options, headers });
  const durationMs = Date.now() - startTime;

  const contentType = response.headers.get('content-type') || '';
  const setCookie = response.headers.get('set-cookie');

  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else if (contentType.includes('spreadsheetml.sheet')) {
    const arrayBuffer = await response.arrayBuffer();
    data = Buffer.from(arrayBuffer);
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    contentType,
    setCookie,
    data,
    durationMs,
  };
}

export function recordTestResult({ name, category, status, endpoint = '', expected = '', actual = '', error = '', durationMs = 0, sourceFile = '' }) {
  const result = {
    name,
    category,
    status, // 'PASS', 'FAIL', 'SKIPPED', 'NOT TESTED'
    endpoint,
    expected,
    actual,
    error,
    durationMs,
    sourceFile,
  };

  metrics.tests.push(result);
  if (status === 'PASS') metrics.passed++;
  else if (status === 'FAIL') metrics.failed++;
  else if (status === 'SKIPPED') metrics.skipped++;
  else if (status === 'NOT TESTED') metrics.notTested++;

  const statusSymbol = status === 'PASS' ? '✔' : status === 'FAIL' ? '✖' : status === 'SKIPPED' ? '⚠' : '⚡';
  console.log(`  ${statusSymbol} [${status}] ${name} (${durationMs}ms)`);
  if (error) {
    console.log(`     Error: ${error}`);
  }
}
