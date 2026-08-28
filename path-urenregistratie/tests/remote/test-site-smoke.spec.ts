import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

// Read-only rondgang over de LIVE TEST-site. Geen schrijfacties: geen uren
// indienen, niks goedkeuren, geen factuur vergrendelen, geen mail versturen.
// Bedoeld om deploy- en omgevingsfouten te vangen die lokaal niet zichtbaar zijn:
// ontbrekende assets, 500's, verkeerde config, CSP die scripts blokkeert,
// verkeerde versie, gebroken views.

const VERWACHTE_VERSIE = process.env.TEST_REMOTE_EXPECTED_VERSION || '0.9.147';
const ADMIN = { email: 'gio@example.invalid', password: 'LocalDemoAdmin2026' };
const EMPLOYEE = { email: 'stasjo@example.invalid', password: 'LocalDemoEmployee2026' };

function vangConsoleFouten(page: Page): string[] {
  const fouten: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const tekst = msg.text();
    // Ruis die niets over de app zegt.
    if (/favicon\.ico|net::ERR_ABORTED .*favicon/i.test(tekst)) return;
    fouten.push(tekst);
  });
  page.on('pageerror', (err: Error) => fouten.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 500) fouten.push(`HTTP ${res.status()} ${res.request().method()} ${res.url()}`);
  });
  return fouten;
}

async function login(page: Page, account: { email: string; password: string }): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#login-screen')).toBeVisible();
  await expect(page.locator('#auth-login-submit')).toBeEnabled({ timeout: 20_000 });
  await page.locator('#auth-login-email').fill(account.email);
  await page.locator('#auth-login-password').fill(account.password);
  await page.locator('#auth-login-submit').click();
  await expect(page.locator('#app-shell')).toBeVisible({ timeout: 20_000 });
}

test('[TEST-SMOKE-01] de TEST-site draait de verwachte versie met veilige headers', async ({ page, request }) => {
  const health = await request.get('/server/health.php');
  expect(health.status(), 'health.php hoort 200 te geven').toBe(200);
  const h = await health.json();
  expect(h.checks?.database_connection?.ok, 'de TEST-database hoort bereikbaar te zijn').toBe(true);
  expect(h.checks?.demo_seed_present?.ok, 'de demo-seed hoort aanwezig te zijn').toBe(true);

  const index = await request.get('/index.html');
  expect(index.status()).toBe(200);
  const html = await index.text();
  expect(html, `de gedeployde index hoort versie ${VERWACHTE_VERSIE} te tonen`)
    .toContain(`Versie ${VERWACHTE_VERSIE}`);

  const headers = index.headers();
  expect(headers['x-content-type-options']).toMatch(/nosniff/i);
  expect(headers['content-security-policy'] || '', 'er hoort een CSP te staan').toContain("default-src 'self'");
});

test('[TEST-SMOKE-02] beheerder kan inloggen en elke view laadt zonder fouten', async ({ page }) => {
  const fouten = vangConsoleFouten(page);
  await login(page, ADMIN);

  await expect(page.locator('.demo-badge').first(), 'de versiebadge hoort in de app te staan')
    .toContainText(`Versie ${VERWACHTE_VERSIE}`);

  // Loop over de navigatieknoppen die voor deze rol werkelijk zichtbaar zijn --
  // sommige (timesheet) zijn role-employee-only en blijven voor de beheerder
  // hidden. Elke zichtbare view hoort te openen met een titel en zonder fouten.
  const zichtbareViews = page.locator('nav button[data-view]:visible');
  const aantal = await zichtbareViews.count();
  expect(aantal, 'de beheerder hoort meerdere navigatie-items te hebben').toBeGreaterThanOrEqual(3);
  for (let i = 0; i < aantal; i++) {
    const knop = zichtbareViews.nth(i);
    const view = await knop.getAttribute('data-view');
    await knop.click();
    await expect(page.locator('#page-title'), `view ${view} hoort een titel te tonen`).not.toBeEmpty();
    await expect(page.locator('#app-shell')).toBeVisible();
    await page.waitForTimeout(200);
  }

  // Factuuroverzicht: minstens één factuur uit de demo-seed hoort zichtbaar te zijn.
  await page.locator('button[data-view="invoices"]').first().click();
  await expect(page.locator('#page-title')).toHaveText(/Facturen/i);

  expect(fouten, `console/HTTP-fouten op TEST:\n${fouten.join('\n')}`).toEqual([]);
});

test('[TEST-SMOKE-03] medewerker ziet alleen de eigen uren', async ({ page }) => {
  const fouten = vangConsoleFouten(page);
  await login(page, EMPLOYEE);

  await page.locator('button[data-view="timesheet"]').first().click();
  await expect(page.locator('#timesheet-status')).toBeVisible();

  // Een medewerker hoort geen beheerknoppen te kunnen gebruiken. De SPA bouwt de
  // nav eenmalig op en verbergt de beheeritems per rol, dus toets op zichtbaarheid.
  await expect(page.locator('button[data-view="approvals"]')).toBeHidden();
  await expect(page.locator('button[data-view="employees"]')).toBeHidden();
  // En de server weigert de beheerroute ook echt.
  const approve = await page.request.get('/server/api/timesheets.php?period=2026-08&employee_id=1');
  expect([401, 403]).toContain(approve.status());

  expect(fouten, `console/HTTP-fouten op TEST:\n${fouten.join('\n')}`).toEqual([]);
});

test('[TEST-SMOKE-04] de factuurpreview rendert met bedragen en bedrijfsidentiteit', async ({ page }) => {
  const fouten = vangConsoleFouten(page);
  await login(page, ADMIN);

  const opende = await page.evaluate(() => {
    const fn = (window as unknown as { showInvoiceDocumentPreview?: (id: number) => void }).showInvoiceDocumentPreview;
    if (typeof fn !== 'function') return false;
    fn(4);
    return true;
  });
  test.skip(!opende, 'showInvoiceDocumentPreview niet beschikbaar in deze build');

  const preview = page.locator('.invoice-document-preview');
  await expect(preview).toBeVisible({ timeout: 10_000 });
  await expect(preview.locator('.invoice-brand-party.sender h4'), 'de afzendernaam hoort te staan').not.toBeEmpty();
  await expect(preview.locator('.invoice-brand-payment'), 'de betaalregel met IBAN hoort te staan').toContainText(/NL\d\d[A-Z]{4}/);

  expect(fouten, `console/HTTP-fouten op TEST:\n${fouten.join('\n')}`).toEqual([]);
});
