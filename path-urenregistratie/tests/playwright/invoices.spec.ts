import { expect, test } from '@playwright/test';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { InvoicesPage } from './pages/InvoicesPage';
import { LoginPage } from './pages/LoginPage';

async function readInvoicesInBrowser(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const response = await fetch('/server/api/invoices.php', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response.json();
  });
}

test('admin facturen zichtbaar en console errors 0', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const invoicesPage = new InvoicesPage(page);

  await loginPage.open();
  await loginPage.loginAsAdmin();
  clearConsoleErrors(consoleErrors);
  await invoicesPage.open();
  await invoicesPage.assertRowsVisible();

  expect(consoleErrors).toEqual([]);
});

test('employee facturen zichtbaar maar beperkt en console errors 0', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);

  await loginPage.open();
  await loginPage.loginAsEmployee();
  clearConsoleErrors(consoleErrors);

  const invoices = await readInvoicesInBrowser(page);
  expect(Array.isArray(invoices.items)).toBe(true);
  expect(invoices.items.length).toBeGreaterThan(0);
  for (const item of invoices.items) {
    expect(item.employee_name).toBe('Stasjo van Bakel');
  }

  expect(consoleErrors).toEqual([]);
});

test('periodefilter juli en augustus werkt', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const invoicesPage = new InvoicesPage(page);

  await loginPage.open();
  await loginPage.loginAsAdmin();
  await invoicesPage.open();
  await invoicesPage.selectPeriod('2026-07');
  await invoicesPage.assertRowsVisible();
  await invoicesPage.selectPeriod('2026-08');
  await invoicesPage.assertRowsVisible();
});
