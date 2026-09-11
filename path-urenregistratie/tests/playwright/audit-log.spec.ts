import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

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

  test('[AUD-H-011] aanmaken, instellingen opslaan en verwijderen worden geauditeerd met de juiste actor', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    const suffix = Date.now().toString().slice(-7);
    let audittestUserId = 0;

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
      audittestUserId = Number(created.body.user_id || 0);

      expect(await auditHas('entity_type=employee', row =>
        (row.event_type === 'employee.upsert' || row.event_type.startsWith('employee.'))
        && row.actor_id === Number(admin.user.id))).toBe(true);
    });

    await test.step('When de beheerder de bedrijfsinstellingen opslaat en meteen weer herstelt', async () => {
      const bootstrap = await ctx.get('/server/api/bootstrap.php');
      const settings = (await bootstrap.json()).settings ?? {};
      const saved = await post('/server/api/settings.php', {
        settings: { ...settings, supportName: `Backoffice ${suffix}` },
      });
      expect(saved.status, JSON.stringify(saved.body)).toBe(200);
      expect(await auditHas('entity_type=company', row => row.event_type.startsWith('company.') || row.event_type.startsWith('settings.'))).toBe(true);
      // Gedeelde bedrijfsrij: meteen terugzetten zodat latere factuur- en
      // mailcases niet tegen een testwaarde asserten.
      const herstel = await post('/server/api/settings.php', { settings });
      expect(herstel.status).toBe(200);
    });

    await test.step('Then verdwijnt de testmedewerker weer zonder historie, ook geauditeerd', async () => {
      // Geen urenstaat aangemaakt voor deze medewerker, dus definitief verwijderen
      // mag. Zo laat deze case niets achter dat latere tel- of factuurcases raakt.
      if (audittestUserId > 0) {
        expect((await post('/server/api/users.php', { action: 'deactivate', user_id: audittestUserId })).status).toBe(200);
        const del = await post('/server/api/users.php', { action: 'delete', user_id: audittestUserId });
        expect(del.status, JSON.stringify(del.body)).toBe(200);
      }
      expect(await auditHas('entity_type=user', row =>
        row.event_type === 'user.deleted_without_history' || row.event_type.startsWith('user.'))).toBe(true);
      await authApi.logout();
    });

    await ctx.dispose();
  });

  test('[AUD-H-012] auditlog filtert op actor_id (Instellingen > Auditlog: "wie deed dit")', async () => {
    // Gebruikersvraag (11 sep): op TEST kunnen meerdere echte mensen (Giovanno,
    // Marc, andere testers) in dezelfde omgeving acties uitvoeren -- de mail
    // zelf laat alleen zien VOOR wie een gebeurtenis is, niet WIE de knop
    // indrukte. Het nieuwe Instellingen > Auditlog-scherm filtert daarom ook
    // op actor_id (wie), naast het bestaande entity_type/event_type (waarover).
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    const admin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    const adminId = Number(admin.user.id);

    await test.step('When er een echte actie is uitgevoerd door deze beheerder', async () => {
      const csrf = await ctx.get('/server/auth/csrf.php');
      const token = String((await csrf.json()).csrf_token || '');
      const bootstrap = await ctx.get('/server/api/bootstrap.php');
      const settings = (await bootstrap.json()).settings ?? {};
      const saved = await ctx.post('/server/api/settings.php', {
        headers: { 'X-CSRF-Token': token }, data: { settings },
      });
      expect(saved.status()).toBe(200);
    });

    await test.step('Then geeft actor_id alleen gebeurtenissen van deze beheerder terug', async () => {
      const res = await ctx.get(`/server/api/audit-log.php?actor_id=${adminId}&limit=50`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.count).toBeGreaterThan(0);
      expect(body.items.every((i: { actor_id: number | null }) => i.actor_id === adminId)).toBe(true);
    });

    await test.step('And een niet-bestaand account levert geen resultaten op', async () => {
      const res = await ctx.get('/server/api/audit-log.php?actor_id=999999999');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.count).toBe(0);
    });

    await test.step('And een niet-numerieke actor_id wordt genegeerd in plaats van een SQL-fout te geven', async () => {
      const res = await ctx.get('/server/api/audit-log.php?actor_id=1%20OR%201%3D1');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.count).toBeGreaterThan(0);
    });

    await authApi.logout();
    await ctx.dispose();
  });
});

test.describe('audit log ui', () => {
  test('[AUD-H-013] Instellingen > Auditlog toont wie/wat/wanneer en filtert op persoon en actie', async ({ page }) => {
    // Gebruikersvraag (11 sep): "hoe kan ik zien of ik dit doe of Marc" -- een
    // ontvangen mail laat alleen zien voor wie een gebeurtenis is, niet wie de
    // knop indrukte. Dit scherm maakt de al bestaande audit_log-tabel
    // (server/api/audit-log.php) voor het eerst zichtbaar in de app zelf.
    let requests: URL[] = [];
    // Volgorde zoals de echte server 'm teruggeeft: ORDER BY created_at DESC
    // (server/api/audit-log.php). De mock sorteert zelf niet, dus deze lijst
    // moet al in aflopende tijdsvolgorde staan -- anders test dit alleen of
    // het scherm een array kan tonen, niet of het de servervolgorde vertrouwt.
    const items = [
      {
        id: 1, event_type: 'timesheet.approved', entity_type: 'timesheet', entity_id: '42',
        actor_id: 1, actor_name: 'Giovanno Maatsen', actor_email: 'giovanno.maatsen@pathconsultancy.nl',
        event_data: null, created_at: '2026-09-11 10:00:00',
      },
      {
        id: 2, event_type: 'invoice.locked', entity_type: 'invoice', entity_id: '7',
        actor_id: 2, actor_name: 'Kenrich Lieveld', actor_email: 'kenrich.lieveld@pathconsultancy.nl',
        event_data: null, created_at: '2026-09-10 09:30:00',
      },
    ];

    await page.route('**/server/api/audit-log.php*', async route => {
      const url = new URL(route.request().url());
      requests.push(url);
      const actorId = url.searchParams.get('actor_id');
      const eventType = url.searchParams.get('event_type');
      const filtered = items.filter(item =>
        (!actorId || String(item.actor_id) === actorId) && (!eventType || item.event_type === eventType));
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, count: filtered.length, items: filtered }),
      });
    });

    const login = new LoginPage(page);
    await test.step('Given een beheerder is beveiligd ingelogd', async () => {
      await login.open();
      await login.loginAsAdmin();
    });

    await test.step('When de beheerder Instellingen > Auditlog opent', async () => {
      await page.locator('button[data-view="settings"]').click();
      await expect(page.locator('#audit-log-count-pill')).toHaveText('2 gebeurtenissen');
      await page.locator('[data-scroll-target="settings-audit"]').click();
      await page.locator('#settings-audit').scrollIntoViewIfNeeded();
    });

    await test.step('Then staan tijd, wie en wat per rij, meest recente eerst', async () => {
      const rows = page.locator('#audit-log-rows tr');
      await expect(rows).toHaveCount(2);
      await expect(rows.nth(0)).toContainText('Giovanno Maatsen');
      await expect(rows.nth(0)).toContainText('Uren goedgekeurd');
      await expect(rows.nth(0)).toContainText('timesheet #42');
      await expect(rows.nth(1)).toContainText('Kenrich Lieveld');
      await expect(rows.nth(1)).toContainText('Factuur vergrendeld');
      await expect(rows.nth(1)).toContainText('invoice #7');
    });

    await test.step('And zijn beide personen en beide actietypen als filteropties beschikbaar', async () => {
      const actorOptions = await page.locator('#audit-log-filter-actor option').allTextContents();
      expect(actorOptions).toEqual(expect.arrayContaining(['Iedereen', 'Giovanno Maatsen', 'Kenrich Lieveld']));
      const eventOptions = await page.locator('#audit-log-filter-event option').allTextContents();
      expect(eventOptions).toEqual(expect.arrayContaining(['Alle acties', 'Uren goedgekeurd', 'Factuur vergrendeld']));
    });

    // De app vervangt elke <select> bij het laden door een eigen klikpaneel
    // (initializeStandardChoiceMenus() in assets/app.js) en verbergt het echte
    // element -- selectOption() zou daarom altijd op een hidden element
    // time-outen. Bedienen zoals een gebruiker dat doet: trigger-knop openen,
    // dan de gewenste optie in het paneel aanklikken (zelfde patroon als de
    // bestaande mail-delivery-status-filter in email-queue.spec.ts).
    await test.step('And filteren op persoon toont alleen zijn eigen gebeurtenissen', async () => {
      await page.locator('#audit-log-filter-actor-trigger').click();
      await page.locator('[data-standard-choice-target="audit-log-filter-actor"][data-standard-choice-value="1"]').click();
      await expect(page.locator('#audit-log-count-pill')).toHaveText('1 gebeurtenis');
      await expect(page.locator('#audit-log-rows')).toContainText('Giovanno Maatsen');
      await expect(page.locator('#audit-log-rows')).not.toContainText('Kenrich Lieveld');
      expect(requests.at(-1)?.searchParams.get('actor_id')).toBe('1');
    });

    await test.step('And filteren op actietype werkt onafhankelijk van het personenfilter', async () => {
      await page.locator('#audit-log-filter-actor-trigger').click();
      await page.locator('[data-standard-choice-target="audit-log-filter-actor"][data-standard-choice-value=""]').click();
      await page.locator('#audit-log-filter-event-trigger').click();
      await page.locator('[data-standard-choice-target="audit-log-filter-event"][data-standard-choice-value="invoice.locked"]').click();
      await expect(page.locator('#audit-log-count-pill')).toHaveText('1 gebeurtenis');
      await expect(page.locator('#audit-log-rows')).toContainText('Kenrich Lieveld');
      expect(requests.at(-1)?.searchParams.get('event_type')).toBe('invoice.locked');
      expect(requests.at(-1)?.searchParams.get('actor_id')).toBeNull();
    });
  });
});
