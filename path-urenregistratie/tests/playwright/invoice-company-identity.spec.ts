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
          phone: '0646328283',
          invoiceEmail: 'backoffice@pathconsultancy.nl',
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
      invoice_phone: '0646328283',
      invoice_email: 'backoffice@pathconsultancy.nl',
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
  test('[INV-ID-H-006] bedrijfsgegevens uit het instellingenformulier blijven bewaard en komen op de factuur', async ({ page }) => {
    // The API round-trip was covered, but nothing proved the *form* actually
    // collects these fields. They end up on a real invoice: a betaalregel with
    // the wrong IBAN sends a client's money to the wrong account, and a missing
    // KvK/BTW-nummer makes the invoice fiscally invalid. This walks the route a
    // beheerder takes, and puts the values back afterwards.
    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await openSettings(page);

    const fields = ['setting-iban', 'setting-kvk', 'setting-vat', 'setting-address', 'setting-postal-city', 'setting-phone', 'setting-invoice-email'] as const;
    const original: Record<string, string> = {};
    for (const id of fields) original[id] = await page.locator('#' + id).inputValue();

    const changed: Record<string, string> = {
      'setting-iban': 'NL02ABNA0123456789',
      'setting-kvk': '12345678',
      'setting-vat': 'NL009876543B01',
      'setting-address': 'Teststraat 1',
      'setting-postal-city': '1234 AB Amsterdam',
      'setting-phone': '0612345678',
      'setting-invoice-email': 'facturen@pathconsultancy.nl',
    };

    const saveSettings = async () => {
      const response = page.waitForResponse(item => item.url().includes('/server/api/settings.php') && item.request().method() === 'POST');
      await page.locator('#save-settings').click();
      expect((await response).status()).toBe(200);
      await expect(page.locator('#toast')).toContainText('Instellingen zijn op de server opgeslagen');
    };

    try {
      await test.step('When de beheerder de bedrijfsgegevens aanpast en opslaat', async () => {
        for (const id of fields) await page.locator('#' + id).fill(changed[id]);
        await saveSettings();
      });

      await test.step('Then staan ze na een herlaad nog steeds in het formulier', async () => {
        await page.reload();
        await openSettings(page);
        for (const id of fields) {
          await expect(page.locator('#' + id), id + ' moet bewaard blijven').toHaveValue(changed[id]);
        }
      });

      await test.step('And staat het opgeslagen IBAN op de betaalregel van de factuur', async () => {
        await openFirstInvoicePreview(page);
        await expect(page.locator('.invoice-brand-payment')).toContainText(changed['setting-iban']);
      });
    } finally {
      // Never leave the shared settings row on test values: every later invoice
      // case would otherwise assert against them.
      await page.reload();
      await openSettings(page);
      for (const id of fields) await page.locator('#' + id).fill(original[id]);
      await saveSettings();
      for (const id of fields) {
        await expect(page.locator('#' + id), id + ' moet hersteld zijn').toHaveValue(original[id]);
      }
    }
  });
});

test('[INV-ID-H-007] de klanturenstaat-mailteksten blijven na opslaan bewaard', async ({ page }) => {
  // Reported from the screen: typing in these four fields and pressing F5 lost the
  // change. The form collected them, but settings.php had no columns to store
  // them, so the texts lived only in the browser of whoever typed them.
  const login = new LoginPage(page);
  await login.open();
  await login.loginAsAdmin();
  await openSettings(page);

  const velden = [
    'setting-customer-timesheet-submission-subject',
    'setting-customer-timesheet-submission-body',
    'setting-customer-timesheet-broker-subject',
    'setting-customer-timesheet-broker-body',
  ] as const;

  const origineel: Record<string, string> = {};
  for (const id of velden) origineel[id] = await page.locator('#' + id).inputValue();

  const uniek = Date.now().toString().slice(-6);
  const gewijzigd: Record<string, string> = {
    'setting-customer-timesheet-submission-subject': `Klanturenstaat {medewerker} ter controle ${uniek}`,
    'setting-customer-timesheet-submission-body': `Goedemiddag,\n\nHierbij mijn klanturenstaat ${uniek} over {maand} {jaar}.`,
    'setting-customer-timesheet-broker-subject': `Klanturenstaat {medewerker} voor dossier ${uniek}`,
    'setting-customer-timesheet-broker-body': `Goedemiddag,\n\nHierbij de klanturenstaat ${uniek} van {medewerker}.`,
  };

  const opslaan = async () => {
    const response = page.waitForResponse(item => item.url().includes('/server/api/settings.php') && item.request().method() === 'POST');
    await page.locator('#save-settings').click();
    expect((await response).status()).toBe(200);
    await expect(page.locator('#toast')).toContainText('Instellingen zijn op de server opgeslagen');
  };

  try {
    await test.step('When de vier teksten worden aangepast en opgeslagen', async () => {
      for (const id of velden) await page.locator('#' + id).fill(gewijzigd[id]);
      await opslaan();
    });

    await test.step('Then staan ze na een herlaad nog steeds in het formulier', async () => {
      await page.reload();
      await openSettings(page);
      for (const id of velden) {
        await expect(page.locator('#' + id), id + ' moet bewaard blijven').toHaveValue(gewijzigd[id]);
      }
    });
  } finally {
    // Shared company settings: never leave test wording behind.
    await page.reload();
    await openSettings(page);
    for (const id of velden) await page.locator('#' + id).fill(origineel[id]);
    await opslaan();
    for (const id of velden) {
      await expect(page.locator('#' + id), id + ' moet hersteld zijn').toHaveValue(origineel[id]);
    }
  }
});
