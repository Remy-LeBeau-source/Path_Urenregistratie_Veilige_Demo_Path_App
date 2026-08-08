import { expect, test } from '@playwright/test';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';

test('admin dashboard opent zonder console errors', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await loginPage.open();
  await loginPage.loginAsAdmin();
  clearConsoleErrors(consoleErrors);
  await dashboardPage.assertAdminDashboardVisible();

  expect(consoleErrors).toEqual([]);
});

test('employee dashboard opent zonder console errors', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await loginPage.open();
  await loginPage.loginAsEmployee();
  clearConsoleErrors(consoleErrors);
  await dashboardPage.assertEmployeeDashboardVisible();

  expect(consoleErrors).toEqual([]);
});
