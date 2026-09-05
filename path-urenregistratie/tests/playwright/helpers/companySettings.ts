import { expect, type Page } from '@playwright/test';

/**
 * Zet de company-brede schakelaar "verlof/ziekte handmatig laten invullen" om.
 *
 * De settings-API doet een volledige UPDATE van de companies-rij: elk veld valt
 * zonder waarde terug op de codestandaard. Daarom sturen we de bestaande
 * bedrijfsgegevens mee terug in plaats van een partiële payload -- anders zou
 * deze aanroep stilletjes bedrijfsnaam, betaaltermijn enz. terugzetten en
 * andere cases breken. Vereist een ingelogde beheerder op deze `page`.
 */
export async function setLeaveSickEntryEnabled(page: Page, enabled: boolean): Promise<void> {
  const csrf = await (await page.request.get('/server/auth/csrf.php')).json();
  const before = await (await page.request.get('/server/api/bootstrap.php')).json();
  const company = before.companies[0];
  const save = await page.request.post('/server/api/settings.php', {
    headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') },
    data: {
      settings: {
        organizationName: company.trade_name || 'Path Consultancy',
        companyName: company.legal_name || company.trade_name || 'Path Consultancy',
        invoiceNameDisplay: company.invoice_name_display || 'trade_and_legal',
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
        phone: '0646328286',
        invoiceEmail: 'backoffice@pathconsultancy.nl',
        paymentTerm: Number(company.payment_term_days || 30),
        customerTimesheetReminderEnabled: true,
        customerTimesheetReminderTime: '15:00',
        customerTimesheetOverdueWorkdays: 2,
        leaveSickEntryEnabled: enabled,
      },
      mailRecipients: before.mail_recipients,
    },
  });
  expect(save.status(), await save.text()).toBe(200);
}
