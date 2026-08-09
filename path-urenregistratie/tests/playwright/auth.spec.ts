import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig } from './fixtures/appConfig';
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
    await loginPage.logout();
    await loginPage.assertLoggedOut();
  });

  await test.step('Then auth/me geeft authenticated false en geen actieve user', async () => {
    const meAfterLogout = await authApi.me();
    expect(meAfterLogout.status).toBe(200);
    expect(meAfterLogout.body.authenticated).toBe(false);
    expect(meAfterLogout.body.user).toBeNull();
  });
});
