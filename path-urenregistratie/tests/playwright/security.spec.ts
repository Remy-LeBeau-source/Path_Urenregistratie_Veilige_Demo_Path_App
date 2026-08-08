import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

test('csrf token endpoint werkt', async ({ request }) => {
  const response = await request.get('/server/auth/csrf.php');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(typeof body.csrf_token).toBe('string');
  expect(body.csrf_token.length).toBeGreaterThan(0);
});

test('login met csrf werkt', async ({ request }) => {
  const authApi = new AuthApi(request);
  const login = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  expect(login.ok).toBe(true);
  expect(login.user.role).toBe('administrator');
});

test('logout met csrf werkt', async ({ request }) => {
  const authApi = new AuthApi(request);
  await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  const logout = await authApi.logout();
  expect(logout.ok).toBe(true);
});

test('login zonder csrf faalt netjes', async ({ request }) => {
  const response = await request.post('/server/auth/login.php', {
    data: { email: appConfig.adminEmail, password: requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD') },
  });

  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.error).toBe('csrf-invalid');
});

test('logout zonder csrf faalt netjes', async ({ request }) => {
  const response = await request.post('/server/auth/logout.php');

  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.error).toBe('csrf-invalid');
});

test('invalid login payload geeft nette error', async ({ request }) => {
  const csrfResponse = await request.get('/server/auth/csrf.php');
  const csrfBody = await csrfResponse.json();
  const response = await request.post('/server/auth/login.php', {
    headers: { 'X-CSRF-Token': csrfBody.csrf_token },
    data: { email: '', password: '' },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('invalid-payload');
});

test('zonder sessie protected API blijft 401', async ({ request }) => {
  for (const endpoint of ['/server/api/bootstrap.php', '/server/api/dashboard.php', '/server/api/invoices.php']) {
    const response = await request.get(endpoint);
    expect(response.status()).toBe(401);
  }
});
