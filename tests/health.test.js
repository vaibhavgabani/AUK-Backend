import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { request } from './helpers/api.js';

describe('Health API (GET /api/health)', () => {
  test('returns 200 with status ok and database connected', async () => {
    const res = await request('/health');
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'ok');
    assert.equal(res.data.database, 'connected');
  });
});
