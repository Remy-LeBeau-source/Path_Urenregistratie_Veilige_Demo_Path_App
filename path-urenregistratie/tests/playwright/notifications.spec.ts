import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

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
      const unread = await ctx.get('/server/api/notifications.php?unread=1');
      const unreadBody = await unread.json();
      expect(unread.status()).toBe(200);
      expect(unreadBody.count).toBe(0);
      expect(unreadBody.unread_count).toBe(0);
      expect(unreadBody.items).toEqual([]);
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

  test('[NOT-H-005] notificatielimiet wordt op minimaal een begrensd', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

    const res = await ctx.get('/server/api/notifications.php?limit=0');
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.count).toBeLessThanOrEqual(1);
    expect(body.items).toHaveLength(body.count);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[NOT-H-006] unread-filter retourneert uitsluitend ongelezen meldingen', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

    const res = await ctx.get('/server/api/notifications.php?unread=1');
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.items.every((item: { read: boolean }) => item.read === false)).toBe(true);
    expect(body.unread_count).toBe(body.count);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[NOT-N-007] mark_read zonder notification_id geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

    const res = await postNotif(ctx, { action: 'mark_read' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('missing-notification-id');

    await authApi.logout();
    await ctx.dispose();
  });

  test('[NOT-H-008] mark_read voor onbekende melding wijzigt nul records', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

    const res = await postNotif(ctx, { action: 'mark_read', notification_id: 2147483647 });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(0);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[NOT-H-009] alles gelezen wist teller en een oudere response kan deze niet herstellen', async ({ page }) => {
    let markedAllRead = false;
    let holdNextGet = false;
    let staleCaptured = false;
    let releaseStale: (() => void) | undefined;
    const staleGate = new Promise<void>(resolve => { releaseStale = resolve; });
    const items = (read: boolean) => Array.from({ length: 15 }, (_, index) => ({
      id: 7000 + index,
      period_id: null,
      period_key: null,
      announcement_id: null,
      notification_type: 'timesheet_submitted',
      title: `Testmelding ${index + 1}`,
      message: 'Openstaande testmelding',
      target_route: 'approvals',
      read,
      read_at: read ? '2026-08-14 09:00:00' : null,
      created_at: '2026-08-14 08:00:00',
    }));

    await page.route('**/server/api/notifications.php*', async route => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON() as { action?: string };
        markedAllRead = payload.action === 'mark_all_read';
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, action: payload.action, updated: 15 }) });
        return;
      }
      if (holdNextGet) {
        holdNextGet = false;
        staleCaptured = true;
        await staleGate;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, count: 15, unread_count: 15, items: items(false) }) });
        return;
      }
      const bodyItems = items(markedAllRead);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, count: 15, unread_count: markedAllRead ? 0 : 15, items: bodyItems }) });
    });

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#notification-count')).toHaveText('15');
    await page.locator('#notification-button').click();
    await expect(page.locator('#notification-title')).toHaveText('15 ongelezen meldingen');

    holdNextGet = true;
    await page.evaluate(() => { void window.refreshNotificationsReadApi(true); });
    await expect.poll(() => staleCaptured).toBe(true);
    await page.locator('#mark-notifications-read').click();
    await expect(page.locator('#notification-title')).toHaveText('Geen ongelezen meldingen');
    await expect(page.locator('#notification-count')).toBeHidden();
    await expect(page.locator('#notification-list')).toContainText('Je hebt geen ongelezen meldingen');

    releaseStale?.();
    await page.waitForTimeout(150);
    await expect(page.locator('#notification-title')).toHaveText('Geen ongelezen meldingen');
    await expect(page.locator('#notification-count')).toBeHidden();

    await loginPage.logout();
  });
});
