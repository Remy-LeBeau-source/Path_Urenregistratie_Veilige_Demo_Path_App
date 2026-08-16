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

  await test.step('And F5 behoudt de geldige sessie zonder terugkeer naar accountkeuze', async () => {
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('#login-screen')).toBeHidden();
    const meAfterReload = await authApi.me();
    expect(meAfterReload.body.authenticated).toBe(true);
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

test('[AUTH-H-010] andere rol kiezen vult zonder herladen direct het juiste testaccount in', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const employeePassword = requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD');
  const adminPassword = requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD');

  await test.step('Given de testlogin gereed is zonder pagina-herlaad', async () => {
    await loginPage.open();
    await expect(page.locator('#login-screen')).toBeVisible();
  });

  await test.step('When een andere medewerker via de zichtbare rolkeuze wordt gekozen', async () => {
    await page.locator('#login-employee-trigger').click();
    const employeeChoice = page.locator('#login-employee-choices [data-login-account-role="employee"]').nth(1);
    await expect(employeeChoice).toBeVisible();
    await employeeChoice.click();
  });

  await test.step('Then staan e-mail en medewerkerswachtwoord direct klaar zonder F5', async () => {
    await expect(page.locator('#login-employee-trigger')).toContainText('Stasjo van Bakel');
    await expect(page.locator('#auth-login-email')).toHaveValue('stasjo@example.invalid');
    await expect(page.locator('#auth-login-password')).toHaveValue(employeePassword);
  });

  await test.step('When daarna een beheerder via de zichtbare rolkeuze wordt gekozen', async () => {
    await page.locator('#login-admin-trigger').click();
    const adminChoice = page.locator('#login-admin-choices [data-login-account-role="admin"]').last();
    await expect(adminChoice).toBeVisible();
    await adminChoice.click();
  });

  await test.step('Then wisselen e-mail en wachtwoord meteen naar het beheeraccount', async () => {
    await expect(page.locator('#login-admin-trigger')).toContainText('Joyce van der Steenhoven');
    await expect(page.locator('#auth-login-email')).toHaveValue('joyce@example.invalid');
    await expect(page.locator('#auth-login-password')).toHaveValue(adminPassword);
    await expect(page.locator('#auth-login-feedback')).toContainText('testwachtwoord voorgeselecteerd');
  });
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

test('[AUTH-N-008] de inlogblokkade en aftelling blijven zichtbaar na herladen', async ({ page }) => {
  const email = `blocked-refresh-${Date.now()}@example.invalid`;
  const api = page.context().request;

  await test.step('Given het account door vijf mislukte pogingen is geblokkeerd', async () => {
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
    await page.locator('#auth-login-email').fill(email);
    await page.locator('#auth-login-password').fill('OnjuistWachtwoord!2026');
    await page.locator('#auth-login-submit').click();
    await expect(page.locator('#auth-login-feedback')).toContainText('Probeer opnieuw over');
  });

  await test.step('When de pagina met F5 wordt herladen', async () => {
    await page.reload();
  });

  await test.step('Then blijft de aflopende blokkade zichtbaar en blijft de server leidend', async () => {
    await expect(page.locator('#auth-login-feedback')).toHaveText(
      /Te veel mislukte inlogpogingen\. Probeer opnieuw over 1[345]:[0-5]\d\./,
    );
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('path-auth-login-block-v1') || 'null'));
    expect(persisted.email).toBe(email);
    expect(Number(persisted.deadline)).toBeGreaterThan(Date.now());
    await page.locator('#auth-login-email').fill(email);
    await page.locator('#auth-login-password').fill('OnjuistWachtwoord!2026');
    const responsePromise = page.waitForResponse(response => response.url().includes('/server/auth/login.php'));
    await page.locator('#auth-login-submit').click();
    expect((await responsePromise).status()).toBe(429);
  });
});

test('[AUTH-N-009] geen loginflits: login-scherm en app-shell blijven verborgen tijdens auth-bootstrap na F5', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de administrator is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  await test.step('When de pagina met F5 wordt herladen terwijl de sessiecontrole vertraagd is', async () => {
    await page.route('**/server/auth/me.php', async route => {
      await new Promise(resolve => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.reload({ waitUntil: 'commit' });
  });

  await test.step('Then blijft body.auth-booting actief en zijn beide shells onzichtbaar zolang de sessiecontrole loopt', async () => {
    await expect(page.locator('body')).toHaveClass(/auth-booting/);
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(page.locator('#app-shell')).toBeHidden();
    const loginScreenDisplay = await page.locator('#login-screen').evaluate(el => getComputedStyle(el).display);
    const appShellDisplay = await page.locator('#app-shell').evaluate(el => getComputedStyle(el).display);
    expect(loginScreenDisplay).toBe('none');
    expect(appShellDisplay).toBe('none');
  });

  await test.step('And na afronden van de sessiecontrole verdwijnt auth-booting en toont alleen de juiste shell', async () => {
    await expect(page.locator('body')).not.toHaveClass(/auth-booting/, { timeout: 10_000 });
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('#login-screen')).toBeHidden();
    await page.unroute('**/server/auth/me.php');
  });
});

test('[AUTH-H-009] lokale login benoemt de veilige testomgeving en productnaam', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de lokale Path loginpagina beschikbaar is', async () => {
    await loginPage.open();
    await expect(page.locator('#login-environment-label')).toBeVisible();
  });

  await test.step('Then heet het omgevingsveld Veilige testomgeving', async () => {
    await expect(page.locator('#login-environment-label')).toHaveText('Veilige testomgeving');
    await expect(page.locator('#local-account-login-tools')).toBeVisible();
  });

  await test.step('And heet de lokale titel Welkom bij Uren & Facturatie', async () => {
    await expect(page.locator('#login-title')).toHaveText('Welkom bij Uren & Facturatie');
  });

  await test.step('When dezelfde login als productiepresentatie wordt getoond', async () => {
    await page.evaluate(() => {
      const runtime = window as typeof window & { applyLoginPresentation: (allowed: boolean) => void };
      runtime.applyLoginPresentation(false);
    });
  });

  await test.step('Then heten omgeving en titel Beveiligde omgeving en Inloggen', async () => {
    await expect(page.locator('#login-environment-label')).toHaveText('Beveiligde omgeving');
    await expect(page.locator('#login-title')).toHaveText('Inloggen');
  });
});
