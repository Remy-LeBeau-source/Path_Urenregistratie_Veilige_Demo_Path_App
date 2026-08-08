import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

test('admin login werkt en me klopt', async ({ page }) => {
  const authApi = new AuthApi(page.context().request);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.loginAsAdmin();

  const meAfterLogin = await authApi.me();
  expect(meAfterLogin.status).toBe(200);
  expect(meAfterLogin.body.authenticated).toBe(true);
  expect(meAfterLogin.body.user.email).toBe(appConfig.adminEmail);
});

test('employee login werkt en me klopt', async ({ page }) => {
  const authApi = new AuthApi(page.context().request);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.loginAsEmployee();

  const meAfterLogin = await authApi.me();
  expect(meAfterLogin.status).toBe(200);
  expect(meAfterLogin.body.authenticated).toBe(true);
  expect(meAfterLogin.body.user.email).toBe(appConfig.employeeEmail);
});

test('logout werkt en me klopt na logout', async ({ page }) => {
  const authApi = new AuthApi(page.context().request);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.loginAsAdmin();
  await loginPage.logout();
  await loginPage.assertLoggedOut();

  const meAfterLogout = await authApi.me();
  expect(meAfterLogout.status).toBe(200);
  expect(meAfterLogout.body.authenticated).toBe(false);
  expect(meAfterLogout.body.user).toBeNull();
});
