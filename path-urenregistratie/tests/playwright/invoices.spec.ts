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

test('[INV-H-001] admin facturen zichtbaar en console errors 0', async ({ page }) => {
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

test('[INV-N-005] employee facturen zichtbaar maar beperkt en console errors 0', async ({ page }) => {
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

test('[INV-H-002] periodefilter juli en augustus werkt', async ({ page }) => {
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

test('[INV-H-003] server berekent bedrag uit uren en uurtarief voor open facturen', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let target: {
    locked: boolean;
    billable_hours: number;
    hourly_rate: number;
    subtotal: number;
    vat_amount: number;
    total: number;
  } | null = null;

  await test.step('Given de administrator is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
  });

  await test.step('When factuurdata voor augustus 2026 wordt opgevraagd', async () => {
    const invoices = await page.evaluate(async () => {
      const response = await fetch('/server/api/invoices.php?period=2026-08', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return response.json();
    });

    target = invoices.items.find((item: { invoice_number?: string }) => item.invoice_number === 'COA-2026-augustus') || null;
  });

  await test.step('Then het bedrag komt uit server-side berekening in plaats van alleen statische demo-output', async () => {
    expect(target).toBeTruthy();
    expect(target?.locked).toBe(false);
    expect(target?.billable_hours).toBe(144);
    expect(target?.hourly_rate).toBe(72.5);
    expect(target?.subtotal).toBe(10440);
    expect(target?.vat_amount).toBe(2192.4);
    expect(target?.total).toBe(12632.4);
  });
});

test('[INV-H-006] admin kan het gekozen maanddetail inklappen en weer uitklappen', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const invoicesPage = new InvoicesPage(page);

  await test.step('Given de administrator is ingelogd en op facturen staat', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await invoicesPage.open();
  });

  await test.step('When de gekozen maanddetails worden verborgen en opnieuw getoond', async () => {
    const toggle = page.locator('#invoice-detail-toggle');
    await expect(toggle).toHaveText('Toon gekozen maand');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveText('Verberg gekozen maand');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#month-batch-card')).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveText('Toon gekozen maand');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#month-batch-card')).toBeHidden();
  });

  await test.step('Then blijven het overzicht en de gekozen maand netjes gescheiden zichtbaar', async () => {
    await expect(page.locator('#invoice-month-overview')).toBeVisible();
    await expect(page.locator('#month-batch-card')).toBeHidden();
    await expect(page.locator('#invoice-detail-toggle')).toHaveText('Toon gekozen maand');
  });
});

test('[INV-H-007] factuurnavigatie onderscheidt geblokkeerde en controleklare maanden met oranje en groen', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de administrator is ingelogd met de vaste demo-baseline', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
  });

  await test.step('Then toont Facturen één oranje blokkadebadge en één groene controlebadge', async () => {
    const badgeGroup = page.locator('#invoice-batch-count');
    const blockedBadge = page.locator('#invoice-batch-blocked-count');
    const readyBadge = page.locator('#invoice-batch-ready-count');

    await expect(badgeGroup).toBeVisible();
    await expect(badgeGroup).toHaveAttribute('aria-label', '2 open maandcontroles: 1 geblokkeerd, 1 klaar voor controle');
    await expect(blockedBadge).toBeVisible();
    await expect(blockedBadge).toHaveText('1');
    await expect(readyBadge).toBeVisible();
    await expect(readyBadge).toHaveText('1');
    await expect(blockedBadge).toHaveCSS('background-color', 'rgb(187, 118, 35)');
    await expect(readyBadge).toHaveCSS('background-color', 'rgb(58, 189, 157)');
    await expect(page.locator('#employees-count')).toHaveCSS('background-color', 'rgb(187, 118, 35)');
  });
});

test('[INV-N-007] ongeldige periodefilter geeft nette 400-fout', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let status = 0;
  let body: { ok?: boolean; error?: string; message?: string } | null = null;

  await test.step('Given de administrator is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
  });

  await test.step('When een ongeldige periodefilter wordt opgevraagd', async () => {
    const response = await page.evaluate(async () => {
      const result = await fetch('/server/api/invoices.php?period=2026-13', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const json = await result.json();
      return { status: result.status, body: json };
    });

    status = Number(response.status || 0);
    body = response.body || null;
  });

  await test.step('Then geeft de API invalid-period met status 400 terug', async () => {
    expect(status).toBe(400);
    expect(body?.ok).toBe(false);
    expect(body?.error).toBe('invalid-period');
    expect(String(body?.message || '')).toContain('between 01 and 12');
  });
});

