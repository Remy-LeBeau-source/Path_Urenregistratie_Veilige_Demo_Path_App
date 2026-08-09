import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

async function getCSRF(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const r = await ctx.get('/server/auth/csrf.php');
  return String(((await r.json()) as { csrf_token?: string }).csrf_token ?? '');
}

async function postUsers(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  body: Record<string, unknown>
) {
  const token = await getCSRF(ctx);
  const r = await ctx.post('/server/api/users.php', {
    headers: { 'X-CSRF-Token': token },
    data: body,
  });
  return { status: r.status(), body: await r.json() };
}

test.describe('user management api', () => {

  test('[USR-H-001] admin ziet alle gebruikers van het bedrijf', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('When de userlijst wordt opgehaald', async () => {
      const res = await ctx.get('/server/api/users.php');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.count).toBeGreaterThan(0);
      const user = body.users[0];
      expect(typeof user.id).toBe('number');
      expect(typeof user.email).toBe('string');
      expect(typeof user.active).toBe('boolean');
      expect(typeof user.force_password_change).toBe('boolean');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[USR-H-002] admin kan medewerker deactiveren en heractiveren', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    let employeeUserId = 0;
    await test.step('When de admin een medewerker deactiveert', async () => {
      const list = await ctx.get('/server/api/users.php');
      const users = (await list.json()).users as Array<{ id: number; role: string; active: boolean }>;
      const employee = users.find(u => u.role === 'employee' && u.active);
      expect(employee).toBeDefined();
      employeeUserId = employee!.id;

      const res = await postUsers(ctx, { action: 'deactivate', user_id: employeeUserId });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    await test.step('Then is de medewerker daarna inactief', async () => {
      const list = await ctx.get('/server/api/users.php');
      const users = (await list.json()).users as Array<{ id: number; active: boolean }>;
      const u = users.find(u => u.id === employeeUserId);
      expect(u?.active).toBe(false);
    });

    await test.step('And heractiveren werkt ook', async () => {
      const res = await postUsers(ctx, { action: 'reactivate', user_id: employeeUserId });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const list = await ctx.get('/server/api/users.php');
      const users = (await list.json()).users as Array<{ id: number; active: boolean }>;
      expect(users.find(u => u.id === employeeUserId)?.active).toBe(true);
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[USR-H-003] admin kan force_password_change instellen', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('When force_password_change wordt ingesteld voor een medewerker', async () => {
      const list = await ctx.get('/server/api/users.php');
      const users = (await list.json()).users as Array<{ id: number; role: string; active: boolean }>;
      const employee = users.find(u => u.role === 'employee' && u.active);
      const res = await postUsers(ctx, { action: 'force_password_change', user_id: employee!.id });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Reset it via reset-password flow so next tests aren't affected.
      const csrf = await getCSRF(ctx);
      await ctx.post('/server/auth/request-reset.php', {
        headers: { 'X-CSRF-Token': csrf },
        data: { email: appConfig.employeeEmail },
      });
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[USR-N-004] anonieme gebruiker krijgt 401 op user-list', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    await test.step('Given geen sessie', async () => {});
    await test.step('When GET users.php wordt aangeroepen', async () => {
      const res = await ctx.get('/server/api/users.php');
      expect(res.status()).toBe(401);
    });
    await ctx.dispose();
  });

  test('[USR-N-005] medewerker mag geen gebruikersbeheer uitvoeren', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde medewerker', async () => {
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    });

    await test.step('When GET users.php wordt aangeroepen als medewerker', async () => {
      const res = await ctx.get('/server/api/users.php');
      expect(res.status()).toBe(403);
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[USR-N-006] admin kan zichzelf niet deactiveren', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });

    await test.step('When de admin zichzelf probeert te deactiveren', async () => {
      const me = await ctx.get('/server/auth/me.php');
      const selfId = (await me.json()).user.id as number;
      const res = await postUsers(ctx, { action: 'deactivate', user_id: selfId });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('cannot-modify-self');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[USR-N-007] dubbel deactiveren geeft 409', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await test.step('Given een reeds gedeactiveerde medewerker', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const list = await ctx.get('/server/api/users.php');
      const users = (await list.json()).users as Array<{ id: number; role: string; active: boolean }>;
      const employee = users.find(u => u.role === 'employee' && u.active)!;
      await postUsers(ctx, { action: 'deactivate', user_id: employee.id });
    });

    await test.step('When de admin dezelfde medewerker nogmaals probeert te deactiveren', async () => {
      const list = await ctx.get('/server/api/users.php');
      const users = (await list.json()).users as Array<{ id: number; role: string; active: boolean }>;
      const inactive = users.find(u => u.role === 'employee' && !u.active)!;
      const res = await postUsers(ctx, { action: 'deactivate', user_id: inactive.id });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('already-inactive');

      // Cleanup.
      await postUsers(ctx, { action: 'reactivate', user_id: inactive.id });
    });

    await authApi.logout();
    await ctx.dispose();
  });
});
