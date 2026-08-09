import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

async function getCSRF(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const r = await ctx.get('/server/auth/csrf.php');
  return String(((await r.json()) as { csrf_token?: string }).csrf_token ?? '');
}

async function postNotif(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  body: Record<string, unknown>
) {
  const token = await getCSRF(ctx);
  const r = await ctx.post('/server/api/notifications.php', {
    headers: { 'X-CSRF-Token': token },
    data: body,
  });
  return { status: r.status(), body: await r.json() };
}

test.describe('notifications api', () => {

  test('[NOT-H-001] ingelogde gebruiker kan notificaties ophalen', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde medewerker', async () => {
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    });

    await test.step('When notificaties worden opgehaald', async () => {
      const res = await ctx.get('/server/api/notifications.php');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(typeof body.count).toBe('number');
      expect(typeof body.unread_count).toBe('number');
      expect(Array.isArray(body.items)).toBe(true);
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[NOT-H-002] mark_all_read werkt zonder fouten', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('When mark_all_read wordt aangeroepen', async () => {
      const res = await postNotif(ctx, { action: 'mark_all_read' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.action).toBe('mark_all_read');
      expect(typeof res.body.updated).toBe('number');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[NOT-N-003] anonieme gebruiker krijgt 401 op notificaties', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    await test.step('When notificaties.php zonder sessie wordt aangeroepen', async () => {
      const res = await ctx.get('/server/api/notifications.php');
      expect(res.status()).toBe(401);
    });
    await ctx.dispose();
  });

  test('[NOT-N-004] unknown action geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een ingelogde medewerker', async () => {
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    });
    await test.step('When een onbekende action wordt verstuurd', async () => {
      const res = await postNotif(ctx, { action: 'delete_all' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('unknown-action');
    });
    await authApi.logout();
    await ctx.dispose();
  });
});
