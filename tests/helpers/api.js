import fs from 'fs';
import http from 'http';
import app from '../../app.js';

if (typeof process.loadEnvFile === 'function' && fs.existsSync('.env')) {
  try {
    process.loadEnvFile('.env');
  } catch (e) {}
}

let server = null;
let baseUrl = '';

export async function startServer() {
  if (server) return baseUrl;
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
  return baseUrl;
}

export async function stopServer() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
    baseUrl = '';
  }
}

export async function request(path, options = {}) {
  if (!baseUrl) {
    await startServer();
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

  const response = await fetch(url, { ...options, headers });
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
  };
}
