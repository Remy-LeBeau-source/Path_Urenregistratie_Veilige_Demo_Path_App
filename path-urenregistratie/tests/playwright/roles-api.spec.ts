import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { ReadApi } from './api/ReadApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

test('[ROLE-N-003] zonder sessie geeft protected API 401', async ({ request }) => {
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

test('[ROLE-H-001] admin ziet volledige data', async ({ request }) => {
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

  await test.step('And de sessie wordt afgesloten zodat volgende scenario\'s schoon starten', async () => {
    await authApi.logout();
  });
});

test('[ROLE-H-002] employee ziet alleen eigen data', async ({ request }) => {
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

  await test.step('And de sessie wordt afgesloten zodat volgende scenario\'s schoon starten', async () => {
    await authApi.logout();
  });
});


test('[ROLE-N-004] een medewerker krijgt 403 op elke beheerder-only schrijfactie', async ({ request }) => {
  const authApi = new AuthApi(request);
  const csrf = async () => String((await (await request.get('/server/auth/csrf.php')).json()).csrf_token || '');
  const post = async (path: string, data: Record<string, unknown>) => {
    const r = await request.post(path, { headers: { 'X-CSRF-Token': await csrf() }, data });
    return { status: r.status(), body: await r.json().catch(() => ({})) };
  };

  await test.step('Given een ingelogde medewerker', async () => {
    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');
  });

  await test.step('Then weigert elke beheerder-only actie met 403 en verandert er niets', async () => {
    // [path, payload] -- elk is een echte beheerder-schrijfactie.
    const beheerderActies: Array<[string, Record<string, unknown>]> = [
      ['/server/api/users.php', { action: 'deactivate', user_id: 1 }],
      ['/server/api/staff.php', { action: 'upsert_employee', sendInvitation: false, employee: { name: 'X', email: 'x@example.invalid', role: 'Consultant', startDate: '2026-08-01', active: true, client: 'C', broker: 'B', brokerEmail: 'b@example.invalid', projectCode: 'X1' }, mailRecipients: [] }],
      ['/server/api/settings.php', { settings: { supportName: 'Hack' } }],
      ['/server/api/announcements.php', { action: 'create', title: 'X', message: 'X' }],
      ['/server/api/periods.php', { action: 'close', period: '2026-08' }],
    ];
    for (const [path, payload] of beheerderActies) {
      const res = await post(path, payload);
      expect([401, 403], `${path}: status ${res.status} (${JSON.stringify(res.body).slice(0, 120)})`).toContain(res.status);
    }
  });

  await test.step('And ook de leesbare beheerdersbronnen blijven dicht', async () => {
    for (const path of ['/server/api/audit-log.php', '/server/api/email-queue.php', '/server/api/mail-acceptance.php']) {
      const r = await request.get(path);
      expect([401, 403], `${path}: ${r.status()}`).toContain(r.status());
    }
    await authApi.logout();
  });
});
