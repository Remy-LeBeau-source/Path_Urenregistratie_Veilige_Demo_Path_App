import { execSync } from 'node:child_process';
import { expect, request as playwrightRequest, test, type APIResponse } from '@playwright/test';
import mysql from 'mysql2/promise';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LoginPage } from './pages/LoginPage';

// Zelfde databasetoegang als admin-writes.spec.ts en database-integrity.spec.ts:
// puur voor het opzetten van geïsoleerde wegwerpbedrijven bij een tenant-
// grenstest, nooit voor het lezen of wijzigen van de gedeelde seed.
function dbConfig() {
  const database = String(
    process.env.PATH_APP_DB_NAME || process.env.PLAYWRIGHT_DB_NAME || process.env.DB_NAME || '',
  ).trim();
  return {
    host: process.env.PATH_APP_DB_HOST || process.env.PLAYWRIGHT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.PATH_APP_DB_PORT || process.env.PLAYWRIGHT_DB_PORT || process.env.DB_PORT || 3306),
    user: process.env.PATH_APP_DB_USER || process.env.PLAYWRIGHT_DB_USER || process.env.DB_USER || 'root',
    password: process.env.PATH_APP_DB_PASSWORD || process.env.PLAYWRIGHT_DB_PASSWORD || process.env.DB_PASSWORD || 'root',
    database,
  };
}

async function withDb<T>(fn: (conn: mysql.Connection) => Promise<T>): Promise<T> {
  const cfg = dbConfig();
  expect(cfg.database.toLowerCase().endsWith('_test'), `databasenaam moet op _test eindigen, is "${cfg.database}"`).toBe(true);
  const conn = await mysql.createConnection(cfg);
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

async function getCSRFToken(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const r = await ctx.get('/server/auth/csrf.php');
  const body = await r.json();
  return String(body.csrf_token || '');
}

async function postJsonAs(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  path: string,
  payload: Record<string, unknown>,
) {
  const token = await getCSRFToken(ctx);
  const response = await ctx.post(path, {
    headers: { 'X-CSRF-Token': token },
    data: payload,
  });
  return { status: response.status(), body: await response.json() };
}

test('[SEC-H-001] csrf token endpoint werkt', async ({ request }) => {
  let response: APIResponse | null = null;
  let body: any;

  await test.step('Given er is geen bestaande sessie nodig voor csrf-opvraag', async () => {
    // Endpoint is publiek toegankelijk voor login-voorbereiding.
  });

  await test.step('When de client een csrf-token opvraagt', async () => {
    response = await request.get('/server/auth/csrf.php');
    expect(response.ok()).toBeTruthy();
    body = await response.json();
  });

  await test.step('Then ontvangt de client een geldige csrf-token payload', async () => {
    expect(body.ok).toBe(true);
    expect(typeof body.csrf_token).toBe('string');
    expect(body.csrf_token.length).toBeGreaterThan(0);
  });
});

test('[SEC-H-002] login met csrf werkt', async ({ request }) => {
  const authApi = new AuthApi(request);
  let login: any;

  await test.step('Given geldige administrator-inloggegevens beschikbaar zijn', async () => {
    requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD');
  });

  await test.step('When de administrator inlogt met csrf-bescherming', async () => {
    login = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  });

  await test.step('Then ontstaat een geldige administrator-sessie', async () => {
    expect(login.ok).toBe(true);
    expect(login.user.role).toBe('administrator');
  });
});

test('[SEC-H-003] logout met csrf werkt', async ({ request }) => {
  const authApi = new AuthApi(request);
  let logout: any;

  await test.step('Given een ingelogde administrator-sessie', async () => {
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  });

  await test.step('When de gebruiker uitlogt met csrf-token', async () => {
    logout = await authApi.logout();
  });

  await test.step('Then wordt de sessie netjes afgesloten', async () => {
    expect(logout.ok).toBe(true);
  });
});

test('[SEC-N-001] login zonder csrf faalt netjes', async ({ request }) => {
  let response: APIResponse | null = null;
  let body: any;

  await test.step('Given een loginpoging zonder csrf-header', async () => {
    // We versturen bewust geen X-CSRF-Token.
  });

  await test.step('When login zonder csrf wordt verstuurd', async () => {
    response = await request.post('/server/auth/login.php', {
      data: { email: appConfig.adminEmail, password: requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD') },
    });
    body = await response.json();
  });

  await test.step('Then geeft de server csrf-invalid met status 403 terug', async () => {
    expect(response).toBeTruthy();
    expect(response!.status()).toBe(403);
    expect(body.error).toBe('csrf-invalid');
  });
});

test('[SEC-N-002] logout zonder csrf faalt netjes', async ({ request }) => {
  let response: APIResponse | null = null;
  let body: any;

  await test.step('Given een logoutpoging zonder csrf-header', async () => {
    // We versturen bewust geen X-CSRF-Token.
  });

  await test.step('When logout zonder csrf wordt verstuurd', async () => {
    response = await request.post('/server/auth/logout.php');
    body = await response.json();
  });

  await test.step('Then geeft de server csrf-invalid met status 403 terug', async () => {
    expect(response).toBeTruthy();
    expect(response!.status()).toBe(403);
    expect(body.error).toBe('csrf-invalid');
  });
});

test('[SEC-N-003] invalid login payload geeft nette error', async ({ request }) => {
  let response: APIResponse | null = null;
  let body: any;

  await test.step('Given een geldige csrf-token met ongeldige loginpayload', async () => {
    const csrfResponse = await request.get('/server/auth/csrf.php');
    const csrfBody = await csrfResponse.json();
    response = await request.post('/server/auth/login.php', {
      headers: { 'X-CSRF-Token': csrfBody.csrf_token },
      data: { email: '', password: '' },
    });
    body = await response.json();
  });

  await test.step('Then geeft de server invalid-payload met status 400 terug', async () => {
    expect(response).toBeTruthy();
    expect(response!.status()).toBe(400);
    expect(body.error).toBe('invalid-payload');
  });
});

test('[SEC-N-004] zonder sessie protected API blijft 401', async ({ request }) => {
  await test.step('Given er is geen actieve sessie', async () => {
    // Geen login op de request-context.
  });

  await test.step('When protected read-endpoints worden opgevraagd', async () => {
    for (const endpoint of ['/server/api/bootstrap.php', '/server/api/dashboard.php', '/server/api/invoices.php']) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });
});

test('[SEC-H-004] csrf-token blijft stabiel binnen dezelfde sessie', async ({ request }) => {
  const first = await request.get('/server/auth/csrf.php');
  const second = await request.get('/server/auth/csrf.php');
  const firstBody = await first.json();
  const secondBody = await second.json();

  expect(first.status()).toBe(200);
  expect(second.status()).toBe(200);
  expect(secondBody.csrf_token).toBe(firstBody.csrf_token);
});

test('[SEC-N-005] csrf-endpoint weigert POST', async ({ request }) => {
  const response = await request.post('/server/auth/csrf.php');
  const body = await response.json();
  expect(response.status()).toBe(405);
  expect(body.error).toBe('method-not-allowed');
});

test('[SEC-N-006] login-endpoint weigert GET', async ({ request }) => {
  const response = await request.get('/server/auth/login.php');
  const body = await response.json();
  expect(response.status()).toBe(405);
  expect(body.error).toBe('method-not-allowed');
});

test('[SEC-N-007] logout-endpoint weigert GET', async ({ request }) => {
  const response = await request.get('/server/auth/logout.php');
  const body = await response.json();
  expect(response.status()).toBe(405);
  expect(body.error).toBe('method-not-allowed');
});

test('[SEC-H-005] sessiecode bevat expliciete timeout-check en sliding expiration', async () => {
  const src = await readFile(join(process.cwd(), 'server', 'auth', 'session.php'), 'utf8');
  expect(src).toContain("_last_active");
  expect(src).toMatch(/time\(\)\s*-\s*\(int\)\$_SESSION\['_last_active'\]/);
  expect(src).toMatch(/\$_SESSION\['_last_active'\]\s*=\s*time\(\)/);
});

test('[SEC-H-006] herhaalde mislukte loginpogingen maken security-audit event', async ({ request }) => {
  const csrf = await request.get('/server/auth/csrf.php');
  const csrfBody = await csrf.json();
  const thresholdAccount = 'joyce@example.invalid';

  for (let i = 0; i < 3; i += 1) {
    const failed = await request.post('/server/auth/login.php', {
      headers: { 'X-CSRF-Token': csrfBody.csrf_token },
      data: {
        email: thresholdAccount,
        password: 'definitely-wrong-password',
      },
    });
    expect([401, 429]).toContain(failed.status());
  }

  const authApi = new AuthApi(request);
  await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  const eventsResponse = await request.get('/server/api/audit-log.php?event_type=auth.failed_login_threshold&limit=20');
  expect(eventsResponse.status()).toBe(200);
  const eventsBody = await eventsResponse.json();
  expect(eventsBody.ok).toBe(true);
  expect(Number(eventsBody.count)).toBeGreaterThan(0);
});

// Dekkingsronde (kritisch): SEC-H-006 hierboven controleerde alleen dat er
// "meer dan nul" auth.failed_login_threshold-events bestaan na drie
// mislukte pogingen -- dat blijft ook groen als de dedup-logica in
// auth_maybe_log_failed_login_alert() (login.php) stuk is en bij elke
// mislukte poging een nieuw event wegschrijft, of als de drempel per ongeluk
// op 2 in plaats van 3 staat. Geen van beide zou hier zijn opgevallen.
test('[SEC-H-013] het drempel-audit-event verschijnt precies bij drie mislukkingen, één keer, met de juiste inhoud', async ({ request }) => {
  // auth_maybe_log_failed_login_alert() slaat het event over zolang er geen
  // company_id is (login.php geeft die alleen mee als de gebruiker echt
  // bestaat) -- een verzonnen adres logt dus stilzwijgend NIETS. Vandaar een
  // echt geseed account, niet elders gebruikt voor mislukte pogingen (zie
  // SEEDED_EMPLOYEES in auth.spec.ts: alleen voor succesvolle logins).
  const account = 'shawn@example.invalid';
  const authApi = new AuthApi(request);

  const failedLogin = async () => {
    const csrf = await request.get('/server/auth/csrf.php');
    const csrfBody = await csrf.json();
    return request.post('/server/auth/login.php', {
      headers: { 'X-CSRF-Token': csrfBody.csrf_token },
      data: { email: account, password: 'definitely-wrong-password' },
    });
  };

  const thresholdEventsFor = async (email: string) => {
    const res = await request.get(
      `/server/api/audit-log.php?event_type=auth.failed_login_threshold&entity_id=${encodeURIComponent(email)}&limit=20`,
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    return body.items as Array<{ entity_id: string; event_data: Record<string, unknown> | null }>;
  };

  await test.step('Given een geseed medewerkersaccount dat nergens anders mislukte pogingen krijgt', async () => {
    // Los van SEC-H-006 (joyce@example.invalid): binnen hetzelfde 15-minuten-
    // venster tellen mislukte pogingen per e-mailadres op, dus twee cases op
    // hetzelfde account zouden elkaars telling verstoren.
  });

  await test.step('When er twee keer mislukt wordt ingelogd (net onder de drempel)', async () => {
    const first = await failedLogin();
    const second = await failedLogin();
    expect([401, 429]).toContain(first.status());
    expect([401, 429]).toContain(second.status());
  });

  await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  await test.step('Then bestaat er nog geen drempel-event (de grens ligt bij drie, niet twee)', async () => {
    const events = await thresholdEventsFor(account);
    expect(events.length).toBe(0);
  });
  await authApi.logout();

  await test.step('When een derde mislukte poging de drempel haalt', async () => {
    const third = await failedLogin();
    expect([401, 429]).toContain(third.status());
  });

  await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  await test.step('Then verschijnt precies één event, met het juiste account en de juiste inhoud', async () => {
    const events = await thresholdEventsFor(account);
    expect(events.length).toBe(1);
    expect(events[0].entity_id).toBe(account);
    expect(events[0].event_data).not.toBeNull();
    expect(events[0].event_data?.email).toBe(account);
    expect(events[0].event_data?.failed_count).toBe(3);
    expect(events[0].event_data?.window_minutes).toBe(15);
  });
  await authApi.logout();

  await test.step('When nog een mislukte poging volgt binnen hetzelfde venster (blijft ruim onder de eigen inlogdrempel van vijf, zie AUTH-N-008/PWD-N-018 -- dit account wordt hierna door andere cases nog echt gebruikt om in te loggen)', async () => {
    const fourth = await failedLogin();
    expect(fourth.status()).toBe(401);
  });

  await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  await test.step('Then blijft het nog steeds precies één event: de dedup-guard voorkomt een tweede', async () => {
    const events = await thresholdEventsFor(account);
    expect(events.length).toBe(1);
  });
  await authApi.logout();
});

test('[SEC-H-007] config voorbeeld bevat voorbereide CSP/CORS/HSTS flags', async () => {
  const src = await readFile(join(process.cwd(), 'server', 'config.example.php'), 'utf8');
  expect(src).toContain("'cors_allowed_origins'");
  expect(src).toContain("'content_security_policy'");
  expect(src).toContain("'hsts_enabled' => false");
});

// Dekkingsronde: SEC-H-007 hierboven pint alleen dat config.example.php de
// juiste sleutels noemt -- geen enkele case controleerde ooit dat de
// draaiende server deze headers ook echt op een responsheader zet. Broncode
// vs. draaiend gedrag is precies het gat dat een broncontract-toets kan
// verbergen; deze twee cases meten het echte HTTP-antwoord.
test('[SEC-H-008] draaiende server zet de vaste beveiligingsheaders echt op elk antwoord', async ({ request }) => {
  let response: APIResponse | null = null;

  await test.step('Given een willekeurig, niet-geauthenticeerd endpoint', async () => {
    // csrf.php is bewust gekozen: vereist geen sessie, dus dit toetst alleen
    // auth_apply_security_headers(), niets van de authenticatielogica zelf.
  });

  await test.step('When de client dat endpoint bevraagt', async () => {
    response = await request.get('/server/auth/csrf.php');
    expect(response.ok()).toBeTruthy();
  });

  await test.step('Then staan de vaste beveiligingsheaders echt op het antwoord', async () => {
    const headers = response!.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['permissions-policy']).toContain('geolocation=()');
  });
});

test('[SEC-N-008] cors weerspiegelt alleen een toegestane origin, nooit een onbekende', async ({ request }) => {
  let allowed: APIResponse | null = null;
  let untrusted: APIResponse | null = null;

  await test.step('Given een verzoek met een toegestane origin uit de lokale/test-allowlist', async () => {
    allowed = await request.get('/server/auth/csrf.php', {
      headers: { Origin: 'http://localhost:8000' },
    });
    expect(allowed.ok()).toBeTruthy();
  });

  await test.step('Then weerspiegelt de server precies die origin met credentials toegestaan', async () => {
    const headers = allowed!.headers();
    expect(headers['access-control-allow-origin']).toBe('http://localhost:8000');
    expect(headers['access-control-allow-credentials']).toBe('true');
    expect(headers['vary']).toContain('Origin');
  });

  await test.step('When hetzelfde verzoek een niet-vertrouwde origin meestuurt', async () => {
    untrusted = await request.get('/server/auth/csrf.php', {
      headers: { Origin: 'https://kwaadaardig.voorbeeld.invalid' },
    });
    expect(untrusted.ok()).toBeTruthy();
  });

  await test.step('Then geeft de server geen Access-Control-Allow-Origin voor die origin terug', async () => {
    const headers = untrusted!.headers();
    expect(headers['access-control-allow-origin']).toBeUndefined();
    expect(headers['access-control-allow-credentials']).toBeUndefined();
  });
});

// Fase 17.4 (GUI/rol-auditmatrix, v2.0.0): de API-autorisatie (ROLE-N-004/005
// hierboven en in roles-api.spec.ts) was al gedekt, maar niets bewees dat de
// UI zelf een medewerker ook daadwerkelijk wegstuurt bij een handmatige
// beheer-URL. showView() in app.js normaliseert een beheerder-only view voor
// een medewerker altijd terug naar employee-dashboard (adminViews.has(view)),
// zowel via de hashchange-listener (live navigatie) als bij het opnieuw laden
// van de pagina (hashViewOnLoad). Deze twee UI-tests bewijzen dat expliciet,
// los van de al bestaande API-403's. Skin-onafhankelijk: showView() zit in de
// gedeelde businesslogica, niet in styles.css/styles-new.css.
test('[SEC-H-009] medewerker die handmatig naar een beheerscherm navigeert komt terug op het eigen dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een ingelogde medewerker op het eigen dashboard', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  await test.step('When de hash handmatig naar een beheerder-only scherm wordt gezet', async () => {
    await page.evaluate(() => { window.location.hash = 'settings'; });
  });

  await test.step('Then blijft de medewerker op het eigen dashboard, niet op Instellingen', async () => {
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#view-settings')).not.toHaveClass(/is-active/);
    await expect(page).toHaveURL(/#employee-dashboard$/);
  });
});

test('[SEC-H-010] medewerker die de pagina herlaadt met een beheer-URL in de adresbalk komt terug op het eigen dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een ingelogde medewerker', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  await test.step('When de pagina wordt herladen met een beheer-only hash al in de URL (bv. bewaarde link)', async () => {
    const url = new URL(page.url());
    url.hash = 'employees';
    await page.goto(url.toString());
  });

  await test.step('Then start de medewerker alsnog op het eigen dashboard, niet op Medewerkersbeheer', async () => {
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#view-employees')).not.toHaveClass(/is-active/);
  });
});

// Audit-vondst 12 sep 2026: van de 13 schermen stond #view-customer-timesheet-admin
// als enige NIET in de adminViews-Set die showView() gebruikt om een medewerker
// terug te sturen -- hij werd in de praktijk al geblokkeerd, maar uitsluitend via
// de generieke `[hidden] { display:none !important; }`-regel (styles.css), niet
// via de expliciete rol-guard die alle 12 andere beheerschermen wél hebben. Nu
// expliciet in adminViews opgenomen; deze test bewijst dat de hash/titel ook
// correct terugvallen, niet alleen dat het scherm visueel verborgen blijft.
test('[SEC-H-011] medewerker die naar Klanturenstaten (beheer) navigeert komt terug op het eigen dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een ingelogde medewerker', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  await test.step('When de hash handmatig naar het beheer-klanturenstatenscherm wordt gezet', async () => {
    await page.evaluate(() => { window.location.hash = 'customer-timesheet-admin'; });
  });

  await test.step('Then blijft de medewerker op het eigen dashboard, met de bijbehorende hash en titel', async () => {
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#view-customer-timesheet-admin')).not.toHaveClass(/is-active/);
    await expect(page).toHaveURL(/#employee-dashboard$/);
  });
});

test('[SEC-H-012] een in localStorage naar beheerder gezette rol geeft geen beheerscherm', async ({ page }) => {
  // Fase 17.4, het laatste openstaande securitypunt: "oude browserstate /
  // localStorage-state". De andere twee punten van dat item waren al gedekt --
  // handmatige URL door [SEC-H-009]/[SEC-H-010], directe API-aanroep door
  // [ROLE-N-004] -- maar geknoei in de opgeslagen staat nog niet.
  //
  // Wat deze case wél en niet bewijst, want dat is hier makkelijk mis te
  // lezen. Gemeten, niet aangenomen: deze case blijft ook slagen als je de
  // scrub bij het inlezen (`saved.currentRole = null`, app.js) weghaalt. Hij
  // bewaakt die regel dus NIET, en wie hem daarvoor aanziet trekt de verkeerde
  // conclusie.
  //
  // De reden is dat de rol in deze app helemaal niet uit localStorage komt.
  // Er zijn drie lagen, en de beslissende is de laatste:
  //   1. `persistState()` schrijft `currentRole` überhaupt niet weg (hij zet
  //      hem op null in de kopie die wordt opgeslagen);
  //   2. bij het inlezen wordt een eventueel aanwezige rol alsnog gewist;
  //   3. de werkelijke rol wordt gezet vanuit het geauthenticeerde profiel van
  //      de server -- geknoei in de client kan dat niet overstemmen.
  // De server weigert bovendien elke beheerderactie los hiervan, bewezen in
  // [ROLE-N-004].
  //
  // Wat deze case dan wél waard is: hij pint de uitkomst vast die uit die
  // opzet volgt. Zou iemand de client later tóch op de bewaarde staat laten
  // vertrouwen -- het echte risico bij een herschrijving -- dan valt hij om.
  const loginPage = new LoginPage(page);

  await test.step('Given een ingelogde medewerker', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  const sleutel = await test.step('When de bewaarde staat handmatig op de beheerdersrol wordt gezet', async () => {
    return page.evaluate(() => {
      // De opslagsleutel niet hardcoden: hij is in het verleden meegewijzigd
      // met de datamodelversie, en dan zou deze case stilletjes niets meer
      // controleren in plaats van te falen.
      const sleutel = Object.keys(localStorage).find(k => k.startsWith('path-uren-demo'));
      if (!sleutel) return '';
      const staat = JSON.parse(localStorage.getItem(sleutel) || '{}');
      staat.currentRole = 'admin';
      localStorage.setItem(sleutel, JSON.stringify(staat));
      return sleutel;
    });
  });

  expect(sleutel, 'de bewaarde staat hoort onder een path-uren-demo-sleutel te staan').not.toBe('');

  await test.step('Then start de app na herladen gewoon als medewerker', async () => {
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();

    const rolNaHerladen = await page.evaluate((k: string) => {
      return JSON.parse(localStorage.getItem(k) || '{}').currentRole;
    }, sleutel);
    expect(rolNaHerladen, 'de gemanipuleerde rol hoort bij het inlezen te worden weggegooid').not.toBe('admin');

    // En het zichtbare gevolg: geen enkel beheerscherm staat open.
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    for (const beheerscherm of ['#view-employees', '#view-settings', '#view-invoices']) {
      await expect(page.locator(beheerscherm), `${beheerscherm} hoort dicht te blijven`).not.toHaveClass(/is-active/);
    }
  });
});

// ---------------------------------------------------------------------------
// Ronde van 18 sep, naar aanleiding van het gevonden en gerepareerde publieke
// datalek (echte financiële persoonsgegevens in het openbaar opgehaalde
// assets/app.js, en de repository-boom die op TEST/PROD zonder inloggen
// uitgedeeld werd). Techniek per case genoemd zoals de rest van deze suite.
// ---------------------------------------------------------------------------

test('[SEC-H-014] assets/app.js bevat nooit meer de echte financiële gegevens van de genoemde testers', async ({ request }) => {
  // Techniek: statische/dynamische inhoudscontrole op gevoelige data (OWASP
  // "Sensitive Data Exposure"), tegen het ECHTE, publiek opgehaalde bestand --
  // niet tegen de broncode op schijf, want dat bewijst niets over wat een
  // bezoeker daadwerkelijk kan opvragen.
  //
  // Regressiebewaking op de fix van 18 sep: tot dan stonden de uurtarieven,
  // contractvormen, bemiddelaargegevens en (voor Shawn) een overeenkomst-,
  // crediteur- en contractantnummer van vier genoemde medewerkers gewoon in
  // assets/app.js, zonder inloggen op te halen door iedereen op internet,
  // ook op productie. Die gegevens horen sindsdien in assets/employees-seed.js
  // te staan, dat op PROD niet wordt uitgerold (zie
  // scripts/deploy-production-transip.sh) maar op TEST/lokaal, waar deze test
  // draait, gewoon aanwezig blijft -- de eis is dus dat app.js zelf schoon is,
  // niet dat er nergens op de server meer een tarief te vinden zou zijn.
  let appJs = '';
  await test.step('Given het publiek opgehaalde assets/app.js', async () => {
    const response = await request.get('/assets/app.js');
    expect(response.ok()).toBeTruthy();
    appJs = await response.text();
  });

  await test.step('Then bevat het geen van de echte tarieven, contractvormen of bemiddelaargegevens', async () => {
    for (const verboden of [
      'rate: 85', 'rate: 80', 'rate: 72.5', 'rate: 85.5',
      'Midlance 70/30', 'Midlance 75/25',
      'ItaQ Consultancy', 'Circle8',
      'facturen-itaq@example.invalid', 'facturen-circle8@example.invalid',
      '202636991', '622085', '217744',
    ]) {
      expect(appJs.includes(verboden), `assets/app.js mag "${verboden}" niet meer bevatten`).toBe(false);
    }
  });

  await test.step('And staat de scheiding zelf overeind: app.js verwijst naar het aparte seed-bestand, kent het niet uit het hoofd', async () => {
    expect(appJs.includes('PATH_EMPLOYEES_SEED'), 'app.js hoort de medewerkerdata uit window.PATH_EMPLOYEES_SEED te lezen, niet uit een eigen array').toBe(true);
  });
});

test('[SEC-N-009] SQL-injectiepogingen op het loginformulier falen netjes, nooit met een serverfout', async ({ request }) => {
  // Techniek: injectie (OWASP A03) met klassieke SQLi-payloads tegen het
  // veld waar de gevolgen het ernstigst zouden zijn (authenticatie-bypass).
  // De code gebruikt overal PDO-prepares met parameters, dus dit hoort altijd
  // gewoon als "verkeerd wachtwoord" terug te komen -- nooit als 500 (dat zou
  // duiden op een query die de payload wél interpreteerde) en nooit met een
  // foutmelding die iets over de databasestructuur verraadt.
  const payloads = [
    "' OR '1'='1",
    "' OR '1'='1' -- ",
    "admin@example.invalid'--",
    "'; DROP TABLE users; --",
    "' UNION SELECT 1,2,3,4,5,6,7,8 -- ",
  ];

  for (const payload of payloads) {
    await test.step(`When ingelogd wordt met payload ${JSON.stringify(payload)} als e-mail én wachtwoord`, async () => {
      const csrfResponse = await request.get('/server/auth/csrf.php');
      const csrfToken = (await csrfResponse.json()).csrf_token;
      const response = await request.post('/server/auth/login.php', {
        headers: { 'X-CSRF-Token': csrfToken },
        data: { email: payload, password: payload },
      });
      const body = await response.json().catch(() => null);

      expect(response.status(), `payload ${JSON.stringify(payload)} mag nooit een serverfout geven`).not.toBe(500);
      expect([400, 401]).toContain(response.status());
      expect(body, 'het antwoord hoort geldige JSON te zijn, geen ruwe databasefout').not.toBeNull();
      const tekst = JSON.stringify(body).toLowerCase();
      for (const lek of ['sql syntax', 'mysql', 'pdoexception', 'sqlstate']) {
        expect(tekst.includes(lek), `het antwoord op payload ${JSON.stringify(payload)} mag geen databasefout lekken ("${lek}")`).toBe(false);
      }
    });
  }

  await test.step('Then werkt een normale login daarna nog gewoon (de tabel bestaat nog, niets is gecorrumpeerd)', async () => {
    const authApi = new AuthApi(request);
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    const { status } = await authApi.me();
    expect(status).toBe(200);
    await authApi.logout();
  });
});

test('[SEC-N-010] een padtraversalpoging op een periode-parameter wordt afgewezen, niet stilzwijgend genegeerd tot een ander antwoord', async ({ request }) => {
  // Techniek: padtraversal (OWASP "Path Traversal"), met de klassieke
  // ../-reeksen en een absoluut pad tegen een parameter die normaal een
  // "YYYY-MM"-periodesleutel is. De bestandsnaam zelf komt bij dit endpoint
  // altijd uit de database (storage_key, zie server/api/customer-timesheets.php),
  // nooit rechtstreeks van de client -- dit bewijst dat een vervormde
  // periodesleutel netjes wordt afgewezen in plaats van een onverwachte
  // interne toestand te bereiken (grenswaardenanalyse op een vormvereiste).
  const authApi = new AuthApi(request);
  await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

  for (const payload of ['../../../../etc/passwd', '..%2f..%2f..%2fetc%2fpasswd', '/etc/passwd', '....//....//etc/passwd']) {
    await test.step(`When de periodeparameter ${JSON.stringify(payload)} bevat`, async () => {
      const response = await request.get(`/server/api/customer-timesheets.php?action=download&period=${encodeURIComponent(payload)}&employee_id=2&assignment_id=1`);
      expect(response.status(), `payload ${JSON.stringify(payload)} mag nooit 200 geven`).not.toBe(200);
      expect([400, 404, 422]).toContain(response.status());
      const tekst = await response.text();
      expect(tekst.toLowerCase().includes('root:'), 'het antwoord mag nooit de inhoud van een systeembestand bevatten').toBe(false);
    });
  }

  await authApi.logout();
});

test('[SEC-H-015] de sessiecookie draagt HttpOnly en SameSite=Lax', async ({ request }) => {
  // Techniek: configuratiecontrole op sessiebeheer (OWASP "Session
  // Management"), rechtstreeks op de Set-Cookie-header van een echte login --
  // niet alleen beredeneerd uit de broncode, want een verkeerd samengestelde
  // header zou deze test wel en de broncode-lezer niet opvallen.
  const csrfResponse = await request.get('/server/auth/csrf.php');
  const csrfToken = (await csrfResponse.json()).csrf_token;
  const response = await request.post('/server/auth/login.php', {
    headers: { 'X-CSRF-Token': csrfToken },
    data: { email: appConfig.employeeEmail, password: requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD') },
  });
  expect(response.ok()).toBeTruthy();

  const setCookie = response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie').map(h => h.value);
  expect(setCookie.length, 'de login hoort minstens één cookie te zetten').toBeGreaterThan(0);
  const sessieCookie = setCookie.find(c => /^PHPSESSID=/i.test(c) || /session/i.test(c)) || setCookie[0];
  expect(sessieCookie.toLowerCase(), 'de sessiecookie hoort HttpOnly te dragen').toContain('httponly');
  expect(sessieCookie.toLowerCase(), 'de sessiecookie hoort SameSite=Lax te dragen').toContain('samesite=lax');

  const authApi = new AuthApi(request);
  await authApi.logout();
});

test('[SEC-N-011] een kapotte JSON-payload lekt geen bestandspad of stacktrace naar de client', async ({ request }) => {
  // Techniek: foutinjectie + informatielek-controle (OWASP "Improper Error
  // Handling"). Een server die op een misvormd verzoek zijn eigen interne pad
  // of een PHP-waarschuwing teruggeeft, verraadt bouwdetails aan een
  // aanvaller. Dit stuurt bewust kapotte JSON naar een endpoint dat een body
  // verwacht en controleert dat het antwoord daar niets van laat zien.
  const csrfResponse = await request.get('/server/auth/csrf.php');
  const csrfToken = (await csrfResponse.json()).csrf_token;
  const response = await request.post('/server/auth/login.php', {
    headers: { 'X-CSRF-Token': csrfToken, 'Content-Type': 'application/json' },
    data: '{"email": "kapot"' as unknown as Record<string, unknown>,
  });
  const tekst = await response.text();

  expect(response.status(), 'kapotte JSON mag nooit een onbehandelde serverfout geven').not.toBe(500);
  for (const lek of ['fatal error', 'stack trace', '.php on line', 'c:\\\\', '/var/www', '/data/sites']) {
    expect(tekst.toLowerCase().includes(lek), `het antwoord mag "${lek}" niet bevatten`).toBe(false);
  }
});

test('[SEC-H-016] een beheerder kan via een geraden gebruikers-id geen medewerker van een ander bedrijf de- of reactiveren', async () => {
  // Techniek: autorisatiegrenstest over een tenant-grens (IDOR / broken access
  // control, OWASP A01). server/api/users.php haalt de doelgebruiker eerst op
  // MET company_id in dezelfde WHERE-clausule, dus dit hoort al dicht te
  // zitten -- deze test legt dat vast in plaats van het alleen te beredeneren.
  // Twee volledig geïsoleerde wegwerpbedrijven (zelfde patroon als
  // admin-writes.spec.ts) zodat niets van de gedeelde seed wordt geraakt.
  const unique = Date.now().toString().slice(-7);
  const wachtwoord = `Proef${unique}TenantGrens`;

  const { slachtofferId, aanvallerEmail } = await withDb(async conn => {
    const hash = execSync('php -r "echo password_hash(getenv(\'SEC_TENANT_PW\'), PASSWORD_DEFAULT);"', {
      env: { ...process.env, SEC_TENANT_PW: wachtwoord },
    }).toString();

    const [slachtofferBedrijf] = await conn.query(
      'INSERT INTO companies (slug, legal_name, trade_name, chamber_of_commerce_number) VALUES (?, ?, ?, ?)',
      [`sec-tenant-a-${unique}`, `SEC-TENANT-A ${unique} BV`, `SEC-TENANT-A ${unique} BV`, '12345678'],
    );
    const slachtofferBedrijfId = (slachtofferBedrijf as mysql.ResultSetHeader).insertId;
    const [slachtofferUser] = await conn.query(
      'INSERT INTO users (company_id, email, display_name, role, active, password_hash, force_password_change) VALUES (?, ?, ?, "employee", 1, ?, 0)',
      [slachtofferBedrijfId, `sec-tenant-a-slachtoffer-${unique}@example.invalid`, `SEC-TENANT-A Medewerker ${unique}`, hash],
    );
    const slachtofferId = (slachtofferUser as mysql.ResultSetHeader).insertId;

    const [aanvallerBedrijf] = await conn.query(
      'INSERT INTO companies (slug, legal_name, trade_name, chamber_of_commerce_number) VALUES (?, ?, ?, ?)',
      [`sec-tenant-b-${unique}`, `SEC-TENANT-B ${unique} BV`, `SEC-TENANT-B ${unique} BV`, '87654321'],
    );
    const aanvallerBedrijfId = (aanvallerBedrijf as mysql.ResultSetHeader).insertId;
    const aanvallerEmail = `sec-tenant-b-beheerder-${unique}@example.invalid`;
    await conn.query(
      'INSERT INTO users (company_id, email, display_name, role, active, password_hash, force_password_change) VALUES (?, ?, ?, "administrator", 1, ?, 0)',
      [aanvallerBedrijfId, aanvallerEmail, `SEC-TENANT-B Beheerder ${unique}`, hash],
    );

    return { slachtofferId, aanvallerEmail };
  });

  const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  const authApi = new AuthApi(ctx);
  await authApi.login(aanvallerEmail, wachtwoord);

  for (const actie of ['deactivate', 'reactivate']) {
    const poging = await postJsonAs(ctx, '/server/api/users.php', {
      action: actie,
      user_id: slachtofferId,
    });
    expect(poging.status, `${actie} over de bedrijfsgrens hoort 404 te geven, kreeg ${JSON.stringify(poging.body)}`).toBe(404);
    expect(poging.body.error).toBe('user-not-found');
  }

  const nogSteedsActief = await withDb(async conn => {
    const [rows] = await conn.query('SELECT active FROM users WHERE id = ?', [slachtofferId]);
    return Number((rows as Array<{ active: number }>)[0]?.active ?? -1);
  });
  expect(nogSteedsActief, 'het slachtofferaccount in het andere bedrijf moet ongewijzigd actief blijven').toBe(1);

  await authApi.logout();
  await ctx.dispose();
});
