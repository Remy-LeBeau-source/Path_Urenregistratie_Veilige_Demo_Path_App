import { expect, request as playwrightRequest, test, type Page } from '@playwright/test';
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

async function isolateNotificationsFrontend(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const isolationMarker = 'path-notifications-test-initialized';
    if (sessionStorage.getItem(isolationMarker) === '1') return;

    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem(isolationMarker, '1');
  });

  const admin = {
    id: 1,
    company_id: 1,
    email: 'gio@example.invalid',
    display_name: 'Gio Maatsen',
    role: 'administrator',
    force_password_change: false,
  };
  let authenticated = false;
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('**/server/api.php?action=state*', route => route.fulfill(json({ ok: true, state: null })));
  await page.route('**/server/auth/csrf.php*', route => route.fulfill(json({ ok: true, csrf_token: 'notifications-csrf' })));
  await page.route('**/server/auth/me.php*', route => route.fulfill(json({
    ok: true,
    authenticated,
    csrf_token: 'notifications-csrf',
    user: authenticated ? admin : null,
  })));
  await page.route('**/server/auth/login.php*', async route => {
    authenticated = true;
    await route.fulfill(json({ ok: true, csrf_token: 'notifications-csrf', user: admin }));
  });
  await page.route('**/server/auth/logout.php*', async route => {
    authenticated = false;
    await route.fulfill(json({ ok: true }));
  });
  await page.route('**/server/api/bootstrap.php*', route => route.fulfill(json({
    ok: true,
    companies: [{ id: 1, trade_name: 'Path Consultancy', legal_name: 'QSI Consultancy B.V.', app_name: 'Uren & Facturatie' }],
    users: [admin],
    employees: [],
    assignments: [],
    counterparties: [],
    assignment_mail_routes: [],
    mail_recipients: [],
  })));

  for (const pattern of [
    '**/server/api/dashboard.php*',
    '**/server/api/invoices.php*',
    '**/server/api/announcements.php*',
    '**/server/api/email-queue.php*',
    '**/server/api/staff.php*',
    '**/server/api/settings.php*',
    '**/server/api/users.php*',
    '**/server/api/customer-timesheets.php*',
  ]) {
    await page.route(pattern, route => route.fulfill(json({ ok: true, items: [], users: [], employees: [], settings: {}, per_maand: [] })));
  }
  await page.route('**/server/api/mail-acceptance.php*', route => route.fulfill(json({ ok: true, enabled: false, ready: false, issues: [], scenarios: [] })));
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

    await isolateNotificationsFrontend(page);
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

  test('[NOT-H-010] Herstel zet drie lokale basismeldingen terug en beschermt ze tegen serveroverschrijving', async ({ page }) => {
    let unreadCount = 5;

    await page.route('**/server/api/notifications.php*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, count: unreadCount, unread_count: unreadCount, items: Array.from({ length: unreadCount }, (_, i) => ({ id: 9000 + i, period_id: null, period_key: null, announcement_id: null, notification_type: 'correction_required', title: `Melding ${i + 1}`, message: '', target_route: 'dashboard', read: false, read_at: null, created_at: '2026-08-05 10:00:00' })) }),
      });
    });

    await isolateNotificationsFrontend(page);

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();

    // Use the app's own refresh function to populate the stale count.
    await page.evaluate(() => { void window.refreshNotificationsReadApi(true); });
    await expect(page.locator('#notification-count')).toHaveText('5');

    // De oude serverwaarheid is 0. Die mag de herstelde lokale baseline niet
    // opnieuw overschrijven zolang Herstel lokaal leidend is.
    unreadCount = 0;
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();

    await expect(page.locator('#notification-count')).toHaveText('3');
    await expect(page.locator('#notification-title')).toHaveText('3 ongelezen meldingen');
    await expect(page.locator('#notification-list .notification-item.is-unread')).toHaveCount(3);
    await expect(page.locator('#notification-list')).toContainText('Correctie nodig');
    await expect(page.locator('#notification-list')).toContainText('Uren ingediend');
    await expect(page.locator('#notification-list')).toContainText('Maandcontrole juli bijna klaar');

    // Ook een expliciete, vertraagde refresh mag de lokale resetbaseline niet wissen.
    await page.evaluate(() => { void window.refreshNotificationsReadApi(true); });
    await page.waitForTimeout(250);
    await expect(page.locator('#notification-count')).toHaveText('3');

    // De resetguard staat in sessionStorage en moet dus ook een F5 plus
    // herlogin overleven.
    await page.reload();
    if (await page.locator('#login-screen').isVisible()) {
      await loginPage.loginAsAdmin();
    }
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('#notification-count')).toHaveText('3');
    await expect(page.locator('#notification-list .notification-item.is-unread')).toHaveCount(3);

    const employeeProjection = await page.evaluate(() => {
      state.currentRole = 'employee';
      state.currentEmployeeId = 2;
      renderNotifications();
      renderEmployeeAnnouncementArchive();
      return {
        badge: document.querySelector('#notification-count')?.textContent,
        filter: document.querySelector('#announcement-unread-filter')?.textContent,
        cards: document.querySelectorAll('#employee-announcement-list .employee-announcement-card.is-unread').length,
      };
    });
    expect(employeeProjection).toEqual({ badge: '3', filter: 'Ongelezen mededelingen · 3', cards: 3 });

    await page.locator('#employee-announcement-list [data-read-announcement]').first().evaluate(element => {
      (element as HTMLButtonElement).click();
    });
    await expect(page.locator('#notification-count')).toHaveText('2');
    await expect(page.locator('#announcement-unread-filter')).toHaveText('Ongelezen mededelingen · 2');
    await expect(page.locator('#employee-announcement-list .employee-announcement-card.is-unread')).toHaveCount(2);

    await loginPage.logout();
  });

  test('[NOT-H-011] medewerker ziet drie echte mededelingen en tellers lopen gelijk terug naar nul', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await test.step('Given Stasjo drie ongelezen mededelingen uit de serverbaseline heeft', async () => {
      await loginPage.open();
      await loginPage.loginAsEmployee();
      expect(await page.locator('#notification-count').isHidden()).toBe(true);
      await expect(page.locator('#notification-count')).toHaveText('3');
      await page.locator('button[data-view="employee-announcements"]').click();
      await expect(page.locator('#announcement-unread-filter')).toHaveText('Ongelezen mededelingen · 3');
      await expect(page.locator('#employee-announcement-list .employee-announcement-card.is-unread')).toHaveCount(3);
    });

    await test.step('When hij de mededelingen een voor een als gelezen markeert', async () => {
      for (const remaining of [2, 1, 0]) {
        await page.locator('#employee-announcement-list [data-read-announcement]').first().click();
        await expect(page.locator('#announcement-unread-filter')).toHaveText(`Ongelezen mededelingen · ${remaining}`);
        await expect(page.locator('#employee-announcement-list .employee-announcement-card.is-unread')).toHaveCount(remaining);
        if (remaining > 0) {
          await expect(page.locator('#notification-count')).toHaveText(String(remaining));
        } else {
          await expect(page.locator('#notification-count')).toBeHidden();
        }
      }
    });

    await test.step('Then blijven bel, filter en persoonlijke historie op dezelfde serverwaarheid', async () => {
      await page.locator('[data-announcement-archive-filter="all"]').click();
      await expect(page.locator('#employee-announcement-list .employee-announcement-card')).toHaveCount(3);
      await expect(page.locator('#employee-announcement-list .employee-announcement-card.is-unread')).toHaveCount(0);
      await expect(page.locator('#notification-title')).toHaveText('Geen ongelezen meldingen');
    });

    await loginPage.logout();
  });
});
