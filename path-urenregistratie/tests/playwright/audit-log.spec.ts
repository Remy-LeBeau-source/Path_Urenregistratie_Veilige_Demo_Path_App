import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

test.describe('audit log api', () => {

  test('[AUD-H-001] admin kan auditlog ophalen', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('When het auditlog wordt opgehaald', async () => {
      const res = await ctx.get('/server/api/audit-log.php');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(typeof body.count).toBe('number');
      expect(body.count).toBeGreaterThan(0);
      const item = body.items[0];
      expect(typeof item.event_type).toBe('string');
      expect(typeof item.entity_type).toBe('string');
      expect(typeof item.created_at).toBe('string');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[AUD-H-002] auditlog filtert op entity_type', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('When gefilterd op entity_type=invoice', async () => {
      const res = await ctx.get('/server/api/audit-log.php?entity_type=invoice');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      if (body.count > 0) {
        expect(body.items.every((i: { entity_type: string }) => i.entity_type === 'invoice')).toBe(true);
      }
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[AUD-H-003] auditlog filtert op event_type', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('When gefilterd op event_type=invoice.locked', async () => {
      const res = await ctx.get('/server/api/audit-log.php?event_type=invoice.locked');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      if (body.count > 0) {
        expect(body.items.every((i: { event_type: string }) => i.event_type === 'invoice.locked')).toBe(true);
      }
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[AUD-H-004] auditlog bevat geen wachtwoorden of tokens in event_data', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('Then bevat geen enkel item een wachtwoord of token veld in event_data', async () => {
      const res = await ctx.get('/server/api/audit-log.php?limit=200');
      const body = await res.json();
      // Check only event_data values — event_type names like "user.force_password_change" are allowed.
      const eventDataValues = body.items
        .map((i: { event_data: unknown }) => JSON.stringify(i.event_data ?? {}))
        .join(' ');
      expect(eventDataValues).not.toMatch(/password_hash|token_hash|plain.*password|secret_key/i);
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[AUD-N-005] anonieme gebruiker krijgt 401 op auditlog', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    await test.step('Given geen sessie', async () => {});
    await test.step('When auditlog wordt opgevraagd', async () => {
      const res = await ctx.get('/server/api/audit-log.php');
      expect(res.status()).toBe(401);
    });
    await ctx.dispose();
  });

  test('[AUD-N-006] medewerker mag auditlog niet lezen', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een ingelogde medewerker', async () => {
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    });
    await test.step('When auditlog wordt opgevraagd als medewerker', async () => {
      const res = await ctx.get('/server/api/audit-log.php');
      expect(res.status()).toBe(403);
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[AUD-H-007] auditlog combineert entity- en eventfilter', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const seedResponse = await ctx.get('/server/api/audit-log.php?limit=1');
    const seedBody = await seedResponse.json();
    expect(seedBody.count).toBe(1);
    const seed = seedBody.items[0] as { entity_type: string; event_type: string };
    const query = new URLSearchParams({ entity_type: seed.entity_type, event_type: seed.event_type });
    const response = await ctx.get(`/server/api/audit-log.php?${query}`);
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.count).toBeGreaterThan(0);
    expect(body.items.every((item: { entity_type: string; event_type: string }) =>
      item.entity_type === seed.entity_type && item.event_type === seed.event_type)).toBe(true);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[AUD-H-008] auditlog begrenst een nullimiet op een record', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const response = await ctx.get('/server/api/audit-log.php?limit=0');
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.count).toBeLessThanOrEqual(1);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[AUD-H-009] auditlog begrenst een hoge limiet op tweehonderd records', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const response = await ctx.get('/server/api/audit-log.php?limit=9999');
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.count).toBeLessThanOrEqual(200);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[AUD-N-010] auditlog weigert POST', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const response = await ctx.post('/server/api/audit-log.php');
    const body = await response.json();
    expect(response.status()).toBe(405);
    expect(body.error).toBe('method-not-allowed');
    await ctx.dispose();
  });

  test('[AUD-H-011] elke schrijfactie belandt in het auditlog met de juiste actor', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    const suffix = Date.now().toString().slice(-7);

    const post = async (path: string, data: Record<string, unknown>) => {
      const csrf = await ctx.get('/server/auth/csrf.php');
      const token = String((await csrf.json()).csrf_token || '');
      const r = await ctx.post(path, { headers: { 'X-CSRF-Token': token }, data });
      return { status: r.status(), body: await r.json() };
    };
    const auditHas = async (query: string, match: (row: { event_type: string; actor_id: number | null; actor_name: string | null }) => boolean) => {
      const r = await ctx.get(`/server/api/audit-log.php?${query}&limit=50`);
      expect(r.status()).toBe(200);
      const items = (await r.json()).items as Array<{ event_type: string; actor_id: number | null; actor_name: string | null }>;
      return items.some(match);
    };

    await test.step('Given de beheerder maakt een medewerker aan', async () => {
      const admin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const created = await post('/server/api/staff.php', {
        action: 'upsert_employee', sendInvitation: false,
        employee: {
          name: `Audittest ${suffix}`, email: `audit-${suffix}@example.invalid`, role: 'Consultant',
          startDate: '2026-08-01', active: true, client: 'Auditklant', broker: 'Auditbroker',
          brokerEmail: 'broker@example.invalid', projectCode: `AUD-${suffix}`,
        },
        mailRecipients: [],
      });
      expect(created.status, JSON.stringify(created.body)).toBe(200);

      expect(await auditHas('entity_type=employee', row =>
        (row.event_type === 'employee.upsert' || row.event_type.startsWith('employee.'))
        && row.actor_id === Number(admin.user.id))).toBe(true);
    });

    await test.step('When de beheerder de bedrijfsinstellingen opslaat', async () => {
      const bootstrap = await ctx.get('/server/api/bootstrap.php');
      const settings = (await bootstrap.json()).settings ?? {};
      const saved = await post('/server/api/settings.php', {
        settings: { ...settings, supportName: `Backoffice ${suffix}` },
      });
      expect(saved.status, JSON.stringify(saved.body)).toBe(200);
      expect(await auditHas('entity_type=company', row => row.event_type.startsWith('company.') || row.event_type.startsWith('settings.'))).toBe(true);
    });

    await test.step('Then registreert een medewerker-schrijfactie de medewerker als actor', async () => {
      await authApi.logout();
      const employee = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      // Een save_draft op een verre lege periode: puur om een geauditeerde
      // medewerker-schrijfactie te forceren.
      const periode = '3300-06';
      const draft = await post('/server/api/timesheets.php', {
        action: 'save_draft', period: periode,
        contractual_hours: 160, billable_hours: 8, leave_hours: 0, sickness_hours: 0,
        day_entries: [{ work_date: `${periode}-02`, hours: 8, description: 'audit' }],
      });
      expect(draft.status, JSON.stringify(draft.body)).toBe(200);
      await authApi.logout();

      // Het auditlog is alleen voor de beheerder leesbaar; log terug in om de
      // door de medewerker geschreven regel te controleren.
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      expect(await auditHas('entity_type=timesheet', row =>
        row.event_type.startsWith('timesheet.') && row.actor_id === Number(employee.user.id))).toBe(true);
      await authApi.logout();
    });

    await ctx.dispose();
  });
});
