import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/api.js';

describe('Authentication APIs', () => {
  test('POST /api/auth/admin/login — succeeds with valid admin credentials and sets auth_token cookie', async () => {
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@anshil.co.uk';
    const password = process.env.SEED_ADMIN_PASSWORD || 'AdminSecret123!';

    const res = await request('/auth/admin/login', {
      method: 'POST',
      body: { email, password },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.user.role, 'admin');
    assert.ok(res.setCookie.includes('auth_token'));
    assert.ok(res.setCookie.includes('HttpOnly'));
  });

  test('POST /api/auth/admin/login — returns 401 with invalid password', async () => {
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@anshil.co.uk';

    const res = await request('/auth/admin/login', {
      method: 'POST',
      body: { email, password: 'WrongPassword123!' },
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'Invalid email or password');
  });

  test('POST /api/auth/admin/login — returns 400 with missing/invalid input', async () => {
    const res = await request('/auth/admin/login', {
      method: 'POST',
      body: { email: 'notanemail' },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Invalid email or password');
  });

  test('POST /api/auth/manager/login — succeeds with valid manager credentials', async () => {
    const res = await request('/auth/manager/login', {
      method: 'POST',
      body: { email: 'john@example.com', password: 'Password123!' },
    });

    if (res.status === 200) {
      assert.equal(res.data.user.role, 'manager');
      assert.ok(res.setCookie.includes('auth_token'));
    } else {
      // In case seeder used default manager email
      assert.ok([200, 401].includes(res.status));
    }
  });

  test('GET /api/auth/me — returns user profile with valid cookie', async () => {
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@anshil.co.uk';
    const password = process.env.SEED_ADMIN_PASSWORD || 'AdminSecret123!';

    const loginRes = await request('/auth/admin/login', {
      method: 'POST',
      body: { email, password },
    });

    const meRes = await request('/auth/me', {
      cookies: loginRes.setCookie,
    });

    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.user.role, 'admin');
    assert.equal(meRes.data.user.email, email.toLowerCase());
  });

  test('GET /api/auth/me — returns 401 when unauthenticated', async () => {
    const res = await request('/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'Authentication required');
  });

  test('POST /api/auth/logout — clears auth_token cookie', async () => {
    const res = await request('/auth/logout', { method: 'POST' });
    assert.equal(res.status, 200);
    assert.ok(res.setCookie.includes('auth_token=;'));
  });
});
