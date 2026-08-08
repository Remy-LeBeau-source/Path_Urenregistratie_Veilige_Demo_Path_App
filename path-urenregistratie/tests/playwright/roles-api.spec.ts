import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { ReadApi } from './api/ReadApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

test('[ROLE-001] zonder sessie geeft protected API 401', async ({ request }) => {
  await test.step('Given er is geen actieve sessie', async () => {
    // Geen login: request-context is anoniem.
  });

  await test.step('When bootstrap dashboard en invoices anoniem worden opgevraagd', async () => {
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
});

test('[ROLE-002] admin ziet volledige data', async ({ request }) => {
  const authApi = new AuthApi(request);
  const readApi = new ReadApi(request);

  await test.step('Given de administrator is ingelogd', async () => {
    const login = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    expect(login.user.role).toBe('administrator');
  });

  await test.step('When de administrator bootstrapdata opvraagt', async () => {
    const bootstrap = await readApi.bootstrap();
    expect(Array.isArray(bootstrap.users)).toBe(true);
    expect(bootstrap.users.length).toBeGreaterThan(1);
  });

  await test.step('And de administrator dashboarddata opvraagt', async () => {
    const dashboard = await readApi.dashboard();
    expect(Array.isArray(dashboard.per_maand)).toBe(true);
    expect(dashboard.per_maand.length).toBeGreaterThan(0);
  });

  await test.step('Then de administrator ziet volledige invoice-data', async () => {
    const invoices = await readApi.invoices();
    expect(Array.isArray(invoices.items)).toBe(true);
    expect(invoices.items.length).toBeGreaterThan(0);
  });

  await authApi.logout();
});

test('[ROLE-003] employee ziet alleen eigen data', async ({ request }) => {
  const authApi = new AuthApi(request);
  const readApi = new ReadApi(request);

  await test.step('Given de medewerker is ingelogd', async () => {
    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');
  });

  await test.step('When de medewerker bootstrapdata opvraagt', async () => {
    const bootstrap = await readApi.bootstrap();
    expect(bootstrap.users).toHaveLength(1);
    expect(bootstrap.users[0].email).toBe(appConfig.employeeEmail);
    expect(bootstrap.employees).toHaveLength(1);
    expect(bootstrap.assignments).toHaveLength(1);
    expect(bootstrap.mail_recipients).toHaveLength(0);
  });

  await test.step('Then de medewerker ziet alleen eigen invoice-data', async () => {
    const invoices = await readApi.invoices();
    expect(Array.isArray(invoices.items)).toBe(true);
    for (const item of invoices.items) {
      expect(item.employee_name).toBe('Stasjo van Bakel');
    }
  });

  await authApi.logout();
});
