import { expect, test, type APIResponse } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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
