import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

test('[AUTH-H-001] Admin logt in en auth/me geeft de juiste gebruiker terug', async ({ page }) => {
  const authApi = new AuthApi(page.context().request);
  const loginPage = new LoginPage(page);

  await test.step('Given de Path loginpagina beschikbaar is', async () => {
    await loginPage.open();
  });

  await test.step('When de administrator inlogt met geldige inloggegevens', async () => {
    await loginPage.loginAsAdmin();
  });

  await test.step('Then auth/me bevestigt administrator sessie en juiste gebruiker', async () => {
    const meAfterLogin = await authApi.me();
    expect(meAfterLogin.status).toBe(200);
    expect(meAfterLogin.body.authenticated).toBe(true);
    expect(meAfterLogin.body.user.email).toBe(appConfig.adminEmail);
  });
});

test('[AUTH-H-002] Medewerker logt in en auth/me geeft de juiste gebruiker terug', async ({ page }) => {
  const authApi = new AuthApi(page.context().request);
  const loginPage = new LoginPage(page);

  await test.step('Given de Path loginpagina beschikbaar is', async () => {
    await loginPage.open();
  });

  await test.step('When de medewerker inlogt met geldige inloggegevens', async () => {
    await loginPage.loginAsEmployee();
  });

  await test.step('Then auth/me bevestigt medewerkersessie en juiste gebruiker', async () => {
    const meAfterLogin = await authApi.me();
    expect(meAfterLogin.status).toBe(200);
    expect(meAfterLogin.body.authenticated).toBe(true);
    expect(meAfterLogin.body.user.email).toBe(appConfig.employeeEmail);
  });
});

test('[AUTH-H-003] Gebruiker logt uit en auth/me geeft authenticated false terug', async ({ page }) => {
  const authApi = new AuthApi(page.context().request);
  const loginPage = new LoginPage(page);

  await test.step('Given een ingelogde Path gebruiker', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
  });

  await test.step('When de gebruiker uitlogt', async () => {
    await page.route('**/server/auth/logout.php*', async route => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await route.continue();
    });
    await loginPage.logout();
    expect(await page.locator('#login-screen').isVisible()).toBe(true);
    await loginPage.assertLoggedOut();
  });

  await test.step('Then auth/me geeft authenticated false en geen actieve user', async () => {
    const meAfterLogout = await authApi.me();
    expect(meAfterLogout.status).toBe(200);
    expect(meAfterLogout.body.authenticated).toBe(false);
    expect(meAfterLogout.body.user).toBeNull();
  });
});

test('[AUTH-H-004] Lokale beheeraccount wordt automatisch ingevuld en opent na een klik', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de lokale Path loginpagina beschikbaar is', async () => {
    await loginPage.open();
  });

  await test.step('Then de gekozen beheeraccount automatisch is ingevuld', async () => {
    await expect(page.locator('#auth-login-email')).toHaveValue(/^[^@]+@example\.invalid$/);
    await expect(page.locator('#auth-login-password')).toHaveValue(
      requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'),
    );
  });

  await test.step('When de gebruiker eenmaal op Inloggen klikt', async () => {
    await page.locator('#auth-login-submit').click();
  });

  await test.step('Then het beheerdersdashboard opent', async () => {
    await expect(page.locator('#app-shell')).toBeVisible();
  });
});

test('[AUTH-N-005] onbekend account geeft dezelfde generieke loginfout', async ({ request }) => {
  const csrfResponse = await request.get('/server/auth/csrf.php');
  const csrf = await csrfResponse.json();
  const response = await request.post('/server/auth/login.php', {
    headers: { 'X-CSRF-Token': csrf.csrf_token },
    data: { email: `unknown-${Date.now()}@example.invalid`, password: 'OnjuistWachtwoord!2026' },
  });
  const body = await response.json();

  expect(response.status()).toBe(401);
  expect(body.error).toBe('invalid-credentials');
  expect(body.message).toBe('E-mailadres of wachtwoord is onjuist.');
});

test('[AUTH-N-006] ongeldig e-mailformaat wordt als invalid-payload geweigerd', async ({ request }) => {
  const csrfResponse = await request.get('/server/auth/csrf.php');
  const csrf = await csrfResponse.json();
  const response = await request.post('/server/auth/login.php', {
    headers: { 'X-CSRF-Token': csrf.csrf_token },
    data: { email: 'geen-geldig-emailadres', password: 'OnjuistWachtwoord!2026' },
  });
  const body = await response.json();

  expect(response.status()).toBe(400);
  expect(body.error).toBe('invalid-payload');
});

test('[AUTH-N-007] vijf mislukte logins tonen een servergestuurde aftelling', async ({ page }) => {
  const email = `blocked-${Date.now()}@example.invalid`;
  const api = page.context().request;

  await test.step('Given vijf mislukte pogingen voor hetzelfde account zijn geregistreerd', async () => {
    await page.goto(appConfig.baseUrl);
    const csrfResponse = await api.get('/server/auth/csrf.php');
    const csrf = await csrfResponse.json();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await api.post('/server/auth/login.php', {
        headers: { 'X-CSRF-Token': csrf.csrf_token },
        data: { email, password: 'OnjuistWachtwoord!2026' },
      });
      expect(failed.status()).toBe(401);
    }
  });

  await test.step('When opnieuw via het loginformulier wordt geprobeerd', async () => {
    await page.locator('#auth-login-email').fill(email);
    await page.locator('#auth-login-password').fill('OnjuistWachtwoord!2026');
    await page.locator('#auth-login-submit').click();
  });

  await test.step('Then toont de UI de resterende blokkeertijd en blijft het formulier bruikbaar voor een ander account', async () => {
    await expect(page.locator('#auth-login-feedback')).toHaveText(
      /Te veel mislukte inlogpogingen\. Probeer opnieuw over 1[345]:[0-5]\d\./,
    );
    await expect(page.locator('#auth-login-feedback')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#auth-login-submit')).toBeEnabled();
  });
});
