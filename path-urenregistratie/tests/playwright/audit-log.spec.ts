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
});
