import { expect, test } from '@playwright/test';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';

test('[DASH-H-001] admin dashboard opent zonder console errors', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Given de administrator is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    clearConsoleErrors(consoleErrors);
  });

  await test.step('When de administrator het dashboard opent', async () => {
    await dashboardPage.assertAdminDashboardVisible();
  });

  await test.step('Then het dashboard toont admin-overzicht zonder consolefouten', async () => {
    expect(consoleErrors).toEqual([]);
  });
});

test('[DASH-H-002] employee dashboard opent zonder console errors', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Given de medewerker is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    clearConsoleErrors(consoleErrors);
  });

  await test.step('When de medewerker het dashboard opent', async () => {
    await dashboardPage.assertEmployeeDashboardVisible();
  });

  await test.step('Then alleen medewerkersinformatie wordt getoond zonder consolefouten', async () => {
    expect(consoleErrors).toEqual([]);
  });
});
