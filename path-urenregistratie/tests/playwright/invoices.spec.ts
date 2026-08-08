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

test('[INV-001] admin facturen zichtbaar en console errors 0', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const invoicesPage = new InvoicesPage(page);

  await test.step('Given de administrator is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    clearConsoleErrors(consoleErrors);
  });

  await test.step('When de administrator het facturenscherm opent', async () => {
    await invoicesPage.open();
  });

  await test.step('Then facturen per periode zijn zichtbaar zonder consolefouten', async () => {
    await invoicesPage.assertRowsVisible();
    expect(consoleErrors).toEqual([]);
  });
});

test('[INV-002] employee facturen zichtbaar maar beperkt en console errors 0', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    clearConsoleErrors(consoleErrors);
  });

  await test.step('When de medewerker factuurdata opvraagt', async () => {
    const invoices = await readInvoicesInBrowser(page);
    expect(Array.isArray(invoices.items)).toBe(true);
    expect(invoices.items.length).toBeGreaterThan(0);
    for (const item of invoices.items) {
      expect(item.employee_name).toBe('Stasjo van Bakel');
    }
  });

  await test.step('Then alleen eigen facturen zijn zichtbaar zonder consolefouten', async () => {
    expect(consoleErrors).toEqual([]);
  });
});

test('[INV-003] periodefilter juli en augustus werkt', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const invoicesPage = new InvoicesPage(page);

  await test.step('Given de administrator is ingelogd en op het facturenscherm staat', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await invoicesPage.open();
  });

  await test.step('When de administrator wisselt tussen juli en augustus 2026', async () => {
    await invoicesPage.selectPeriod('2026-07');
    await invoicesPage.assertRowsVisible();
    await invoicesPage.selectPeriod('2026-08');
  });

  await test.step('Then het factuuroverzicht ververst voor de gekozen periode', async () => {
    await invoicesPage.assertRowsVisible();
  });
});
