import { expect, test, type APIResponse } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

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
