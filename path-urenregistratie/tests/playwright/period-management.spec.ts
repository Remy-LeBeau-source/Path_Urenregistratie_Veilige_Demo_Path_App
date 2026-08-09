import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const TEST_PERIOD = '2200-06';

async function getCSRF(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const r = await ctx.get('/server/auth/csrf.php');
  return String(((await r.json()) as { csrf_token?: string }).csrf_token ?? '');
}

async function postPeriods(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  body: Record<string, unknown>
) {
  const token = await getCSRF(ctx);
  const r = await ctx.post('/server/api/periods.php', {
    headers: { 'X-CSRF-Token': token },
    data: body,
  });
  return { status: r.status(), body: await r.json() };
}

test.describe('period management api', () => {

  test('[PER-H-001] admin kan periodes ophalen met overzicht', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('When de periodes worden opgehaald', async () => {
      const res = await ctx.get('/server/api/periods.php');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.count).toBeGreaterThan(0);
      const period = body.periods[0];
      expect(typeof period.period_key).toBe('string');
      expect(typeof period.status).toBe('string');
      expect(typeof period.timesheet_count).toBe('number');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[PER-H-002] admin kan periode sluiten en heropenen', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('When de testperiode wordt gesloten', async () => {
      const closeRes = await postPeriods(ctx, { action: 'close', period_key: TEST_PERIOD });
      expect(closeRes.status).toBe(200);
      expect(closeRes.body.ok).toBe(true);
      expect(closeRes.body.action).toBe('close');
    });

    await test.step('Then is de periode gesloten', async () => {
      const list = await ctx.get('/server/api/periods.php');
      const body = await list.json();
      const found = body.periods.find((p: { period_key: string; status: string }) => p.period_key === TEST_PERIOD);
      expect(found?.status).toBe('closed');
    });

    await test.step('And heropenen werkt', async () => {
      const reopen = await postPeriods(ctx, { action: 'reopen', period_key: TEST_PERIOD });
      expect(reopen.status).toBe(200);
      expect(reopen.body.action).toBe('reopen');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[PER-N-003] anonieme gebruiker krijgt 401 op periods', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    await test.step('When periods.php wordt aangeroepen zonder sessie', async () => {
      const res = await ctx.get('/server/api/periods.php');
      expect(res.status()).toBe(401);
    });
    await ctx.dispose();
  });

  test('[PER-N-004] medewerker mag geen periodes beheren', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een ingelogde medewerker', async () => {
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    });
    await test.step('When periods.php wordt aangeroepen als medewerker', async () => {
      const res = await ctx.get('/server/api/periods.php');
      expect(res.status()).toBe(403);
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[PER-N-005] dubbel sluiten van periode geeft 409', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een reeds gesloten periode', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      await postPeriods(ctx, { action: 'close', period_key: TEST_PERIOD });
    });

    await test.step('When dezelfde periode nogmaals wordt gesloten', async () => {
      const res = await postPeriods(ctx, { action: 'close', period_key: TEST_PERIOD });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('already-closed');

      // Cleanup.
      await postPeriods(ctx, { action: 'reopen', period_key: TEST_PERIOD });
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[PER-N-006] heropenen van open periode geeft 409', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een open periode en ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });
    await test.step('When een open periode wordt heropend', async () => {
      // Use a far-future period that cannot have been closed.
      const res = await postPeriods(ctx, { action: 'reopen', period_key: '2201-01' });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('not-closed');
    });
    await authApi.logout();
    await ctx.dispose();
  });
});
