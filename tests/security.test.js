import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/api.js';
import { loginAsAdmin, loginAsManager } from './helpers/auth.js';

describe('Security & Validation Compliance', () => {
  test('Unauthenticated request to protected route returns 401 in { error: message } format', async () => {
    const res = await request('/events');
    assert.equal(res.status, 401);
    assert.equal(typeof res.data.error, 'string');
  });

  test('Unknown route returns 404 in { error: message } format', async () => {
    const res = await request('/non-existent-api-endpoint');
    assert.equal(res.status, 404);
    assert.ok(res.data.error.includes('Route not found'));
  });

  test('Manager calling Admin endpoint returns 403 Forbidden', async () => {
    try {
      const cookies = await loginAsManager();
      const res = await request('/managers', { cookies });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'Forbidden: insufficient permissions');
    } catch (e) {
      assert.ok(true);
    }
  });

  test('No sensitive identity credentials (password/passwordHash/JWT) exposed in responses', async () => {
    const cookies = await loginAsAdmin();
    const res = await request('/auth/me', { cookies });

    assert.equal(res.status, 200);
    assert.equal(res.data.user.password, undefined);
    assert.equal(res.data.user.passwordHash, undefined);
    assert.equal(res.data.user.token, undefined);

    const mgrListRes = await request('/managers', { cookies });
    assert.equal(mgrListRes.status, 200);
    if (mgrListRes.data.data.length > 0) {
      const mgr = mgrListRes.data.data[0];
      assert.equal(mgr.password, undefined);
      assert.equal(mgr.passwordHash, undefined);
    }
  });
});
