import { expect, request as playwrightRequest, test, type Page } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';
import { klikTestknop } from './fixtures/testknoppen';

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
    // Een achtergrond-scroll (bijvoorbeeld door late layout-hydratatie) kan het
    // popover sluiten. Deze case test de stale-responsebeveiliging, niet het
    // menugedrag, dus heropen het meldingenmenu net zolang tot het openblijft en
    // de knop klikbaar is.
    await expect(async () => {
      if (await page.locator('#notification-panel').isHidden()) {
        await page.locator('#notification-button').click();
      }
      await expect(page.locator('#mark-notifications-read')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 20_000 });
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
    await klikTestknop(page, '#quick-reset-demo');
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
    // Sinds 15 sep (besluit Gio) staan mededelingen niet meer in de bel van de
    // medewerker maar alleen in Berichten, met een eigen teller op het tabblad.
    expect(employeeProjection).toEqual({ badge: '0', filter: 'Ongelezen mededelingen · 3', cards: 3 });

    // Een tik op de kop van een ongelezen bericht telt als gelezen (geen aparte knop).
    await page.locator('#employee-announcement-list .employee-announcement-card.is-unread [data-bericht-toggle]').first().evaluate(element => {
      (element as HTMLButtonElement).click();
    });
    await expect(page.locator('#announcement-unread-filter')).toHaveText('Ongelezen mededelingen · 2');
    await expect(page.locator('#employee-berichten-count')).toHaveText('2');
    await expect(page.locator('#employee-announcement-list .employee-announcement-card.is-unread')).toHaveCount(2);

    await loginPage.logout();
  });

  // Besluit Gio 15 sep ("slim voorstel"): mededelingen staan alleen in Berichten, niet
  // in de bel. Ongelezen berichten staan open en bovenaan; gelezen en ingetrokken
  // berichten zijn ingeklapt. Gelezen gaat vanzelf: een tik op de kop, of 2 seconden in
  // beeld. Er is geen knop "Markeer als gelezen" meer, wel "Alles gelezen".
  // Nagebootste meldingenlijst voor NOT-H-011 en NOT-N-015: de cases lezen berichten, en
  // dat mag de gedeelde seed-stand niet veranderen.
  async function nagebootsteBerichten(page: Page, meldingen: Array<Record<string, unknown> & { id: number; announcement_id: number | null; read: boolean }>) {
    const verzonden: Array<Record<string, unknown>> = [];
    await page.route('**/server/api/notifications.php*', async route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        verzonden.push(body);
        meldingen.forEach(melding => {
          if (body.action === 'mark_announcement_read' && melding.announcement_id === Number(body.announcement_id)) melding.read = true;
        });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, updated: 1 }) });
        return;
      }
      const items = meldingen.map(melding => ({ period_id: null, period_key: null, message: 'Tekst van de mededeling.', target_route: 'employee-announcements', read_at: null, created_at: '2026-08-20 09:00:00', ...melding }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, count: items.length, unread_count: items.filter(item => !item.read).length, items }) });
    });
    return verzonden;
  }

  // Besluit Gio 15 sep, ronde 2: een bericht telt pas als gelezen als je het openklapt of op
  // het kleine knopje "Markeer als gelezen" tikt. Er gaat niets vanzelf (eerder: 2 seconden
  // in beeld, waardoor op de telefoon alle nieuwe berichten tegelijk verdwenen). Berichten
  // opent bij het eerste ongelezen bericht; een leeg filter Ongelezen valt terug op Alles.
  test('[NOT-H-011] een mededeling telt pas als gelezen na openklappen of het knopje, en Berichten springt naar de eerste ongelezen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    const verzonden = await nagebootsteBerichten(page, [
      { id: 9301, notification_type: 'announcement', announcement_id: 801, title: 'Nieuwe mededeling een', read: false },
      { id: 9302, notification_type: 'announcement', announcement_id: 802, title: 'Nieuwe mededeling twee', read: false },
      { id: 9303, notification_type: 'announcement', announcement_id: 803, title: 'Oude gelezen mededeling', read: true },
      { id: 9305, notification_type: 'correction_required', announcement_id: null, title: 'Correctie gevraagd juli', read: false, period_key: '2026-07' },
    ]);
    const loginPage = new LoginPage(page);
    const lijst = page.locator('#employee-announcement-list');
    const kaart = (titel: string) => lijst.locator('.employee-announcement-card').filter({ hasText: titel });

    await test.step('Given twee ongelezen mededelingen en een ongelezen statusmelding', async () => {
      await loginPage.open();
      await loginPage.loginAsEmployee();
      await page.evaluate(() => { void (window as unknown as { refreshNotificationsReadApi: (force: boolean) => Promise<unknown> }).refreshNotificationsReadApi(true); });
      await expect(page.locator('#employee-berichten-count')).toHaveText('2');
      await expect(page.locator('#notification-count'), 'mededelingen staan niet in de bel').toHaveText('1');
    });

    await test.step('When de medewerker Berichten opent, then zijn alle berichten ingeklapt, staan de nieuwe bovenaan en is de eerste in beeld', async () => {
      await page.locator('button[data-view="employee-announcements"]:visible').first().click();
      await expect(lijst.locator('.employee-announcement-card')).toHaveCount(3);
      const stand = await lijst.locator('.employee-announcement-card').evaluateAll(els => els.map(el => ({
        titel: el.querySelector('h3')?.textContent,
        ongelezen: el.classList.contains('is-unread'),
        open: el.querySelector('[data-bericht-toggle]')?.getAttribute('aria-expanded') === 'true',
        knopje: Boolean(el.querySelector('[data-bericht-gelezen]')),
      })));
      expect(stand).toEqual([
        { titel: 'Nieuwe mededeling twee', ongelezen: true, open: false, knopje: true },
        { titel: 'Nieuwe mededeling een', ongelezen: true, open: false, knopje: true },
        { titel: 'Oude gelezen mededeling', ongelezen: false, open: false, knopje: false },
      ]);
      await expect(kaart('Nieuwe mededeling twee').locator('.status-pill')).toHaveText('Nieuw');
      await expect(kaart('Nieuwe mededeling twee')).toBeInViewport();
      await expect(kaart('Nieuwe mededeling twee').locator('[data-bericht-toggle]')).toBeFocused();
    });

    await test.step('And blijven ze ongelezen, ook als ze langer in beeld staan', async () => {
      await page.waitForTimeout(3_000);
      await expect(page.locator('#announcement-unread-filter')).toHaveText('Ongelezen mededelingen · 2');
      expect(verzonden, 'in beeld staan leest niets').toEqual([]);
    });

    await test.step('When de medewerker het eerste bericht openklapt, then is dat bericht gelezen en blijft het open', async () => {
      await kaart('Nieuwe mededeling twee').locator('[data-bericht-toggle]').click();
      await expect(page.locator('#announcement-unread-filter')).toHaveText('Ongelezen mededelingen · 1');
      await expect(page.locator('#employee-berichten-count')).toHaveText('1');
      await expect(kaart('Nieuwe mededeling twee')).not.toHaveClass(/is-unread/);
      await expect(kaart('Nieuwe mededeling twee').locator('.bericht-inhoud')).toBeVisible();
    });

    await test.step('When de medewerker bij het tweede op Markeer als gelezen tikt, then is het gelezen zonder open te gaan', async () => {
      await kaart('Nieuwe mededeling een').locator('[data-bericht-gelezen]').click();
      await expect(page.locator('#announcement-unread-filter')).toHaveText('Ongelezen mededelingen · 0');
      await expect(page.locator('#employee-berichten-count')).toBeHidden();
      await expect(kaart('Nieuwe mededeling een')).not.toHaveClass(/is-unread/);
      await expect(kaart('Nieuwe mededeling een').locator('.bericht-inhoud')).toBeHidden();
      await expect(page.locator('#notification-count'), 'de statusmelding in de bel blijft ongelezen').toHaveText('1');
      expect([...new Set(verzonden.map(body => `${body.action}:${body.announcement_id}`))].sort()).toEqual(['mark_announcement_read:801', 'mark_announcement_read:802']);
    });

    await test.step('And valt een leeg filter Ongelezen bij terugkomen terug op Alles', async () => {
      await page.locator('[data-announcement-archive-filter="unread"]').click();
      await page.locator('button[data-view="timesheet"]:visible').first().click();
      await page.locator('button[data-view="employee-announcements"]:visible').first().click();
      await expect(page.locator('[data-announcement-archive-filter="all"]')).toHaveClass(/is-active/);
      await expect(lijst.locator('.employee-announcement-card')).toHaveCount(3);
      await expect(lijst.locator('.employee-announcement-card.is-open'), 'na wegnavigeren is alles weer ingeklapt').toHaveCount(0);
    });
  });

  test('[NOT-N-015] dichtklappen of alleen bekijken leest een ongelezen bericht niet', async ({ page }) => {
    const verzonden = await nagebootsteBerichten(page, [
      { id: 9401, notification_type: 'announcement', announcement_id: 901, title: 'Kort bekeken mededeling', read: false },
    ]);
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.evaluate(() => { void (window as unknown as { refreshNotificationsReadApi: (force: boolean) => Promise<unknown> }).refreshNotificationsReadApi(true); });
    await expect(page.locator('#employee-berichten-count')).toHaveText('1');
    await page.locator('button[data-view="employee-announcements"]').click();
    const kop = page.locator('#employee-announcement-list [data-bericht-toggle]');
    await expect(kop).toHaveAttribute('aria-expanded', 'false');
    await page.waitForTimeout(2_500);
    await page.locator('button[data-view="timesheet"]:visible').first().click();
    await page.locator('button[data-view="employee-announcements"]').click();
    expect(verzonden, 'bekijken en wegnavigeren mag niets als gelezen melden').toEqual([]);
    await expect(page.locator('#employee-berichten-count')).toHaveText('1');
    await expect(page.locator('#employee-announcement-list .employee-announcement-card.is-unread')).toHaveCount(1);
  });

  test('[NOT-H-012] medewerker ziet ingetrokken mededelingen ingeklapt met label, de reden bij openen, en het filter toont precies die', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await test.step('Given Stasjo opent Berichten met ingetrokken voorbeeldmededelingen in de TEST-basis', async () => {
      await loginPage.open();
      await loginPage.loginAsEmployee();
      await page.locator('button[data-view="employee-announcements"]').click();
    });

    await test.step('When hij het filter Ingetrokken kiest', async () => {
      await page.locator('[data-announcement-archive-filter="withdrawn"]').click();
    });

    await test.step('Then staan alleen ingetrokken berichten er, ingeklapt met label, en geen ervan als ongelezen', async () => {
      const kaarten = page.locator('#employee-announcement-list .employee-announcement-card');
      const aantalIngetrokken = await page.evaluate(() => ((0, eval)('employeeAnnouncementItemsFromNotifications') as () => Array<{ status: string }>)().filter(item => item.status === 'withdrawn').length);
      // TEST-seed (opdracht Gio 15 sep): 10 mededelingen, waarvan 6 ingetrokken en 4 ongelezen.
      expect(aantalIngetrokken, 'de TEST-basis heeft zes ingetrokken voorbeelden').toBe(6);
      expect(await page.evaluate(() => ((0, eval)('employeeAnnouncementItemsFromNotifications') as () => unknown[])().length), 'tien mededelingen in de TEST-basis').toBe(10);
      await expect(kaarten).toHaveCount(aantalIngetrokken);
      await expect(page.locator('#employee-announcement-list .employee-announcement-card.is-withdrawn')).toHaveCount(aantalIngetrokken);
      await expect(page.locator('#employee-announcement-list .employee-announcement-card.is-unread')).toHaveCount(0);
      const borrel = kaarten.filter({ hasText: 'Vrijdagborrel gaat niet door' });
      await expect(borrel.locator('.status-pill')).toHaveText('Ingetrokken');
      await expect(borrel.locator('[data-bericht-toggle]')).toHaveAttribute('aria-expanded', 'false');
      await expect(borrel.locator('[data-employee-withdrawal-note]')).toBeHidden();
    });

    await test.step('And zie je de reden zodra je het bericht openklapt', async () => {
      const borrel = page.locator('#employee-announcement-list .employee-announcement-card').filter({ hasText: 'Vrijdagborrel gaat niet door' });
      await borrel.locator('[data-bericht-toggle]').click();
      await expect(borrel.locator('[data-bericht-toggle]')).toHaveAttribute('aria-expanded', 'true');
      await expect(borrel.locator('[data-employee-withdrawal-note]')).toBeVisible();
      await expect(borrel.locator('[data-employee-withdrawal-note]')).toContainText('Hij gaat toch door: er is nieuwe taart.');
    });

    await test.step('And steekt de onderste kaart niet buiten de ronde hoeken van het paneel', async () => {
      // Gio 15 sep ("die hoekjes"): de laatste, ingetrokken kaart had rechte hoeken met een
      // eigen achtergrond over de afgeronde onderkant van het paneel heen.
      await page.locator('[data-announcement-archive-filter="all"]').click();
      const stand = await page.locator('#employee-announcement-list').evaluate(lijst => {
        const paneel = lijst.closest('.panel') as HTMLElement;
        const laatste = lijst.querySelector('.employee-announcement-card:last-child') as HTMLElement;
        const p = getComputedStyle(paneel);
        return {
          paneelRond: parseFloat(p.borderBottomLeftRadius) > 0,
          afgeknipt: p.overflow === 'hidden' || p.overflowX === 'hidden' || p.overflow === 'clip',
          kaartHeeftAchtergrond: getComputedStyle(laatste).backgroundColor !== 'rgba(0, 0, 0, 0)',
          kaartTotOnderkant: Math.abs(paneel.getBoundingClientRect().bottom - laatste.getBoundingClientRect().bottom) <= 2,
        };
      });
      expect(stand.paneelRond).toBe(true);
      if (stand.kaartHeeftAchtergrond && stand.kaartTotOnderkant) expect(stand.afgeknipt, 'het paneel moet de ronde hoeken over de kaart heen bewaren').toBe(true);
    });

    await test.step('And staat onder Alles een geldige mededeling niet als ingetrokken', async () => {
      await page.locator('[data-announcement-archive-filter="all"]').click();
      const geldig = page.locator('#employee-announcement-list .employee-announcement-card').filter({ hasText: 'Planning augustus beschikbaar' });
      await expect(geldig).toHaveCount(1);
      await expect(geldig).not.toHaveClass(/is-withdrawn/);
      await expect(geldig.locator('[data-employee-withdrawal-note]')).toHaveCount(0);
    });

    await loginPage.logout();
  });

  test('[NOT-H-013] een melding in de bel brengt de medewerker direct naar de plek waar iets te doen is', async ({ page }) => {
    // Gio 15 sep: "als je hier drukt kom je gelijk uit waar je moet zijn". Beslistabel
    // soort melding -> bestemming, met een nagebootste meldingenlijst zodat de case
    // niet afhangt van wat er toevallig in de gedeelde database staat.
    const meldingen = [
      { id: 9101, notification_type: 'correction_required', title: 'Correctie gevraagd juli', period_key: '2026-07', target_route: 'employee-dashboard' },
      { id: 9102, notification_type: 'timesheet_approved', title: 'Uren juni goedgekeurd', period_key: '2026-06', target_route: 'employee-dashboard' },
      { id: 9103, notification_type: 'timesheet_reminder', title: 'Dien augustus in', period_key: '2026-08', target_route: 'employee-dashboard' },
      { id: 9104, notification_type: 'announcement', title: 'Mededeling hoort niet in de bel', period_key: null, target_route: 'employee-announcements', announcement_id: 1 },
    ];
    const gelezen = new Set<number>();
    await page.route('**/server/api/notifications.php*', async route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { notification_id?: number };
        if (body.notification_id) gelezen.add(Number(body.notification_id));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, updated: 1 }) });
        return;
      }
      const items = meldingen.map(melding => ({ period_id: null, announcement_id: null, message: '', read_at: null, created_at: '2026-08-05 10:00:00', ...melding, read: gelezen.has(melding.id) }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, count: items.length, unread_count: items.filter(item => !item.read).length, items }) });
    });
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.evaluate(() => { void (window as unknown as { refreshNotificationsReadApi: (force: boolean) => Promise<unknown> }).refreshNotificationsReadApi(true); });

    await test.step('Then toont de bel alleen de drie meldingen over de medewerker zelf', async () => {
      await expect(page.locator('#notification-count')).toHaveText('3');
      await page.locator('#notification-button').click();
      await expect(page.locator('#notification-list .notification-item')).toHaveCount(3);
      await expect(page.locator('#notification-list')).not.toContainText('Mededeling hoort niet in de bel');
    });

    const bestemmingen: Array<{ titel: string; scherm: string; maand: string; extra?: string }> = [
      { titel: 'Correctie gevraagd juli', scherm: 'timesheet', maand: '2026-07' },
      { titel: 'Uren juni goedgekeurd', scherm: 'historie', maand: '2026-06', extra: 'maand opengeklapt' },
      { titel: 'Dien augustus in', scherm: 'timesheet', maand: '2026-08' },
    ];
    for (const doel of bestemmingen) {
      await test.step(`When "${doel.titel}" wordt aangeklikt, then staat ${doel.scherm} van ${doel.maand} open${doel.extra ? ' (' + doel.extra + ')' : ''}`, async () => {
        if (await page.locator('#notification-panel').isHidden()) await page.locator('#notification-button').click();
        await page.locator('#notification-list .notification-item', { hasText: doel.titel }).click();
        await expect(page.locator(`#view-${doel.scherm}`)).toHaveClass(/is-active/);
        await expect.poll(() => page.evaluate(() => (window as unknown as { currentPeriod: () => { key: string } }).currentPeriod().key)).toBe(doel.maand);
        if (doel.scherm === 'historie') {
          await expect(page.locator(`#employee-history-verloop-${doel.maand}`)).toBeVisible();
        }
      });
    }
    expect([...gelezen].sort(), 'elke aangeklikte melding telt als gelezen').toEqual([9101, 9102, 9103]);
  });

  test('[NOT-H-014] Alles gelezen in Berichten leest alleen de mededelingen en laat de bel met rust', async ({ page }) => {
    // Nagebootste meldingenlijst: twee ongelezen mededelingen en één ongelezen
    // statusmelding, zodat de case niet afhangt van wat NOT-H-011 al heeft gelezen.
    const meldingen = [
      { id: 9201, notification_type: 'correction_required', title: 'Correctie gevraagd juli', period_key: '2026-07', target_route: 'employee-dashboard', announcement_id: null, read: false },
      { id: 9202, notification_type: 'announcement', title: 'Testmededeling een', period_key: null, target_route: 'employee-announcements', announcement_id: 701, read: false },
      { id: 9203, notification_type: 'announcement', title: 'Testmededeling twee', period_key: null, target_route: 'employee-announcements', announcement_id: 702, read: false },
    ];
    const verzonden: Array<Record<string, unknown>> = [];
    await page.route('**/server/api/notifications.php*', async route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        verzonden.push(body);
        meldingen.forEach(melding => {
          if (body.action === 'mark_all_read') melding.read = true;
          if (body.action === 'mark_announcement_read' && melding.announcement_id === Number(body.announcement_id)) melding.read = true;
        });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, updated: 1 }) });
        return;
      }
      const items = meldingen.map(melding => ({ period_id: null, message: 'Tekst van de melding.', read_at: null, created_at: '2026-08-05 10:00:00', ...melding }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, count: items.length, unread_count: items.filter(item => !item.read).length, items }) });
    });
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.evaluate(() => { void (window as unknown as { refreshNotificationsReadApi: (force: boolean) => Promise<unknown> }).refreshNotificationsReadApi(true); });

    await test.step('Given twee ongelezen mededelingen in Berichten en één statusmelding in de bel', async () => {
      await expect(page.locator('#employee-berichten-count')).toHaveText('2');
      await expect(page.locator('#notification-count')).toHaveText('1');
    });

    await test.step('When de medewerker in Berichten op Alles gelezen tikt', async () => {
      await page.locator('button[data-view="employee-announcements"]').click();
      await page.locator('#berichten-alles-gelezen').click();
    });

    await test.step('Then zijn de mededelingen gelezen en blijft de statusmelding in de bel ongelezen', async () => {
      await expect(page.locator('#announcement-unread-filter')).toHaveText('Ongelezen mededelingen · 0');
      await expect(page.locator('#employee-berichten-count')).toBeHidden();
      await expect(page.locator('#berichten-alles-gelezen')).toBeHidden();
      await expect(page.locator('#notification-count')).toHaveText('1');
      expect(verzonden.some(body => body.action === 'mark_all_read'), 'geen mark_all_read vanuit Berichten').toBe(false);
      expect([...new Set(verzonden.map(body => Number(body.announcement_id)))].sort()).toEqual([701, 702]);
    });
  });
});
