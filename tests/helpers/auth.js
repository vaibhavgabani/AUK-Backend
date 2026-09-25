import { request } from './api.js';

let cachedAdminCookies = null;
let cachedManagerCookies = null;

export async function loginAsAdmin() {
  if (cachedAdminCookies) return cachedAdminCookies;

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@anshil.co.uk';
  const password = process.env.SEED_ADMIN_PASSWORD || 'AdminSecret123!';

  const res = await request('/auth/admin/login', {
    method: 'POST',
    body: { email, password },
  });

  if (res.status !== 200 || !res.setCookie) {
    throw new Error(`Admin login helper failed with status ${res.status}`);
  }

  cachedAdminCookies = res.setCookie;
  return cachedAdminCookies;
}

export async function loginAsManager(email = 'john@example.com', password = 'Password123!') {
  const res = await request('/auth/manager/login', {
    method: 'POST',
    body: { email, password },
  });

  if (res.status !== 200 || !res.setCookie) {
    throw new Error(`Manager login helper failed with status ${res.status} for ${email}`);
  }

  return res.setCookie;
}
