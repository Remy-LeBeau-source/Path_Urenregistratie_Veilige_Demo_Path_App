import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { ReadApi } from './api/ReadApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

test('zonder sessie geeft protected API 401', async ({ request }) => {
  for (const endpoint of [
    '/server/api/bootstrap.php',
    '/server/api/dashboard.php',
    '/server/api/invoices.php',
  ]) {
    const response = await request.get(endpoint);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('not-authenticated');
  }
});

test('admin ziet volledige data', async ({ request }) => {
  const authApi = new AuthApi(request);
  const readApi = new ReadApi(request);

  const login = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  expect(login.user.role).toBe('administrator');

  const bootstrap = await readApi.bootstrap();
  expect(Array.isArray(bootstrap.users)).toBe(true);
  expect(bootstrap.users.length).toBeGreaterThan(1);

  const dashboard = await readApi.dashboard();
  expect(Array.isArray(dashboard.per_maand)).toBe(true);
  expect(dashboard.per_maand.length).toBeGreaterThan(0);

  const invoices = await readApi.invoices();
  expect(Array.isArray(invoices.items)).toBe(true);
  expect(invoices.items.length).toBeGreaterThan(0);

  await authApi.logout();
});

test('employee ziet alleen eigen data', async ({ request }) => {
  const authApi = new AuthApi(request);
  const readApi = new ReadApi(request);

  const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
  expect(login.user.role).toBe('employee');

  const bootstrap = await readApi.bootstrap();
  expect(bootstrap.users).toHaveLength(1);
  expect(bootstrap.users[0].email).toBe(appConfig.employeeEmail);
  expect(bootstrap.employees).toHaveLength(1);
  expect(bootstrap.assignments).toHaveLength(1);
  expect(bootstrap.mail_recipients).toHaveLength(0);

  const invoices = await readApi.invoices();
  expect(Array.isArray(invoices.items)).toBe(true);
  for (const item of invoices.items) {
    expect(item.employee_name).toBe('Stasjo van Bakel');
  }

  await authApi.logout();
});
