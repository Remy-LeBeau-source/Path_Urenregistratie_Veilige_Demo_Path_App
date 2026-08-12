import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

const TRADE_NAME = 'Path Consultancy';
const LEGAL_NAME = 'QSI Consultancy B.V.';

async function openSettings(page: import('@playwright/test').Page) {
  await page.locator('button[data-view="settings"]').click();
  await expect(page.locator('#page-title')).toHaveText('Instellingen');
}

async function saveInvoiceIdentity(page: import('@playwright/test').Page, display: 'trade_and_legal' | 'legal_only') {
  await page.locator('#setting-organization-name').fill(TRADE_NAME);
  await page.locator('#setting-company-name').fill(LEGAL_NAME);
  await page.locator('#setting-invoice-name-display-trigger').click();
  await page.locator(`[data-standard-choice-target="setting-invoice-name-display"][data-standard-choice-value="${display}"]`).click();
  await expect(page.locator('#setting-invoice-identity-heading')).toHaveText(display === 'legal_only' ? LEGAL_NAME : TRADE_NAME);
  await expect(page.locator('#setting-invoice-identity-subline')).toHaveText(display === 'legal_only'
    ? 'Juridische naam op factuur'
    : `Handelsnaam van ${LEGAL_NAME}`);
  const response = page.waitForResponse(item => item.url().includes('/server/api/settings.php') && item.request().method() === 'POST');
  await page.locator('#save-settings').click();
  expect((await response).status()).toBe(200);
  await expect(page.locator('#toast')).toContainText('Instellingen zijn op de server opgeslagen');
}

async function openFirstInvoicePreview(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const preview = (window as typeof window & { showInvoiceDocumentPreview?: (employeeId: number) => void }).showInvoiceDocumentPreview;
    if (!preview) throw new Error('Factuurpreviewfunctie ontbreekt.');
    preview(4);
  });
  await expect(page.locator('.invoice-document-preview')).toBeVisible();
}

test.describe('facturerende ondernemingsidentiteit', () => {
  test('[INV-ID-H-001] handelsnaam en juridische naam staan samen op de factuurpreview', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await openSettings(page);
    await saveInvoiceIdentity(page, 'trade_and_legal');
    await openFirstInvoicePreview(page);

    const sender = page.locator('.invoice-brand-party.sender');
    await expect(sender.locator('h4')).toHaveText(TRADE_NAME);
    await expect(sender.locator('.invoice-brand-identity')).toHaveText(`Handelsnaam van ${LEGAL_NAME}`);
    await expect(page.locator('.invoice-brand-footer')).toContainText(`${TRADE_NAME} · handelsnaam van ${LEGAL_NAME}`);
  });

  test('[INV-ID-H-002] alleen juridische naam is als factuurweergave te kiezen', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await openSettings(page);
    await saveInvoiceIdentity(page, 'legal_only');
    await openFirstInvoicePreview(page);

    const sender = page.locator('.invoice-brand-party.sender');
    await expect(sender.locator('h4')).toHaveText(LEGAL_NAME);
    await expect(sender.locator('.invoice-brand-identity')).toHaveCount(0);
    await expect(page.locator('.invoice-brand-footer')).toContainText(LEGAL_NAME);

    await page.locator('#modal-close').click();
    await openSettings(page);
    await saveInvoiceIdentity(page, 'trade_and_legal');
  });

  test('[INV-ID-H-003] factuuridentiteit wordt door settings API opgeslagen en via bootstrap herladen', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const auth = new AuthApi(ctx);
    await auth.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const beforeResponse = await ctx.get('/server/api/bootstrap.php');
    const before = await beforeResponse.json();
    const company = before.companies[0];
    const csrfResponse = await ctx.get('/server/auth/csrf.php');
    const csrf = await csrfResponse.json();
    const save = await ctx.post('/server/api/settings.php', {
      headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') },
      data: {
        settings: {
          organizationName: TRADE_NAME,
          companyName: LEGAL_NAME,
          invoiceNameDisplay: 'trade_and_legal',
          appName: company.app_name || 'Uren & Facturatie',
          supportName: company.support_name || 'Path Backoffice',
          supportEmail: company.support_email || 'backoffice@pathconsultancy.nl',
          brandPrimary: company.brand_primary || '#0d1b38',
          brandAccent: company.brand_accent || '#3abd9d',
          kvk: company.chamber_of_commerce_number || '89320018',
          vat: company.vat_number || 'NL001622017B32',
          iban: company.iban || 'NL95INGB0006947972',
          address: company.address_line || 'Du Perronstraat 12',
          postalCity: '3067 HN Rotterdam',
          phone: '06 21 46 91 72',
          invoiceEmail: 'info@pathconsultancy.nl',
          paymentTerm: Number(company.payment_term_days || 30),
          customerTimesheetReminderEnabled: true,
          customerTimesheetReminderTime: '15:00',
          customerTimesheetOverdueWorkdays: 2,
        },
        mailRecipients: before.mail_recipients,
      },
    });
    expect(save.status(), await save.text()).toBe(200);

    const after = await (await ctx.get('/server/api/bootstrap.php')).json();
    expect(after.companies[0]).toMatchObject({
      trade_name: TRADE_NAME,
      legal_name: LEGAL_NAME,
      invoice_name_display: 'trade_and_legal',
      postal_code: '3067 HN',
      city: 'Rotterdam',
      invoice_phone: '06 21 46 91 72',
      invoice_email: 'info@pathconsultancy.nl',
    });
    await auth.logout();
    await ctx.dispose();
  });

  test('[INV-ID-N-004] settings API weigert een onbekende factuurweergave', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const auth = new AuthApi(ctx);
    await auth.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    const csrf = await (await ctx.get('/server/auth/csrf.php')).json();
    const response = await ctx.post('/server/api/settings.php', {
      headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') },
      data: { settings: { invoiceNameDisplay: 'onbekend' }, mailRecipients: [] },
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: 'invalid-payload' });
    await auth.logout();
    await ctx.dispose();
  });

  test('[INV-ID-H-005] instellingen tonen verkoopklare bedrijfsidentiteit en beveiligde verzendmodus', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await openSettings(page);

    await expect(page.locator('#settings-invoicing h3')).toHaveText('Bedrijfsidentiteit op facturen');
    await expect(page.locator('#setting-organization-name')).toHaveValue(TRADE_NAME);
    await expect(page.locator('#setting-company-name')).toHaveValue(LEGAL_NAME);
    await expect(page.locator('#setting-invoice-identity-heading')).toHaveText(TRADE_NAME);
    await expect(page.locator('#setting-invoice-identity-subline')).toHaveText(`Handelsnaam van ${LEGAL_NAME}`);

    await page.locator('#connect-gmail').click();
    await expect(page.locator('#modal-title')).toHaveText('E-mail staat onder gecontroleerde vrijgave');
    await expect(page.locator('#modal-summary')).toContainText('SMTP Relay');
    await expect(page.locator('#modal-summary')).toContainText('Controleren zonder verzenden');
  });
});
