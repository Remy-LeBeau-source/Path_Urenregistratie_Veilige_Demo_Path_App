import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';
import { openPaneel } from './pages/TopbarMenu';

const TRADE_NAME = 'Path Consultancy';
const LEGAL_NAME = 'QSI Consultancy B.V.';

async function openSettings(page: import('@playwright/test').Page) {
  await page.locator('button[data-view="settings"]').click();
  await expect(page.locator('#page-title')).toHaveText('Instellingen');
}

async function saveInvoiceIdentity(page: import('@playwright/test').Page, display: 'trade_and_legal' | 'legal_only') {
  await page.locator('#setting-organization-name').fill(TRADE_NAME);
  await page.locator('#setting-company-name').fill(LEGAL_NAME);
  await openPaneel(page, '#setting-invoice-name-display-trigger', '#setting-invoice-name-display-choices');
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
          phone: '0646328286',
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
      invoice_phone: '0646328286',
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
      // Het formulier begint na een herlaad met de ingebouwde standaardteksten en
      // krijgt de opgeslagen teksten pas zodra bootstrap.php antwoordt. Zonder
      // hierop te wachten beoordeelt de case soms dat tussenmoment.
      const gegevensBinnen = page.waitForResponse(item => item.url().includes('/server/api/bootstrap.php'), { timeout: 20_000 });
      await page.reload();
      await gegevensBinnen;
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

test('[INV-ID-H-008] typen in een instelling bevriest de rest van het formulier niet', async ({ page }) => {
  // Het formulier sloeg het bijwerken van alle velden over zodra de cursor in
  // een van de velden stond. Bedoeld om je invoer te beschermen, maar het gevolg
  // was dat elk ander veld op zijn oude waarde bleef staan -- en bij het volgende
  // opslaan werd die oude waarde gewoon teruggeschreven. Dat is de klacht over
  // verouderde bedrijfsgegevens in het instellingenformulier.
  //
  // Nu wordt alleen het veld waar de cursor in staat met rust gelaten.
  const login = new LoginPage(page);
  await login.open();
  await login.loginAsAdmin();
  await openSettings(page);

  const getypt = 'Tekst die ik aan het typen ben';
  let verwachteAppNaam = '';

  await test.step('Given de cursor staat in een van de instellingen', async () => {
    verwachteAppNaam = await page.locator('#setting-app-name').inputValue();
    expect(verwachteAppNaam, 'de appnaam moet gevuld zijn, anders zegt deze case niets').not.toBe('');

    const veld = page.locator('#setting-customer-timesheet-submission-subject');
    await veld.click();
    await veld.fill(getypt);
    await expect(page.locator('#setting-customer-timesheet-submission-subject')).toBeFocused();
  });

  await test.step('When een ander veld verouderd raakt en het scherm opnieuw wordt opgebouwd', async () => {
    // Een verouderde waarde nabootsen zoals die ontstaat wanneer het formulier
    // eerder met een oude stand is gevuld.
    await page.evaluate(() => {
      const el = document.querySelector('#setting-app-name') as HTMLInputElement | null;
      if (el) el.value = 'VEROUDERDE WAARDE';
    });
    await page.evaluate(() => (window as unknown as { renderAll: () => void }).renderAll());
  });

  await test.step('Then wordt het verouderde veld hersteld en blijft het getypte veld staan', async () => {
    await expect(page.locator('#setting-app-name'), 'een veld waar je niet in typt moet wel worden bijgewerkt')
      .toHaveValue(verwachteAppNaam);
    await expect(page.locator('#setting-customer-timesheet-submission-subject'), 'het veld waar je in typt mag niet worden overschreven')
      .toHaveValue(getypt);
  });
});

test('[INV-ID-H-009] website en slogan blijven bewaard en komen onder de mail', async ({ page }) => {
  // Dezelfde valkuil als eerder bij de klanturenstaat-teksten: het formulier
  // verzamelt een veld, maar er is geen kolom om het in te bewaren, dus het leeft
  // alleen in de browser van wie het typte. Een F5 was het kwijt.
  //
  // Deze twee velden voeden de handtekening onder de mails van Backoffice, dus
  // ze moeten de hele keten door: formulier, server, database en terug.
  const login = new LoginPage(page);
  await login.open();
  await login.loginAsAdmin();
  await openSettings(page);

  const velden = ['setting-website', 'setting-tagline'] as const;
  const origineel: Record<string, string> = {};
  for (const id of velden) origineel[id] = await page.locator('#' + id).inputValue();

  const uniek = Date.now().toString().slice(-6);
  const gewijzigd: Record<string, string> = {
    'setting-website': `www.test-${uniek}.invalid`,
    'setting-tagline': `Slogan voor de proef ${uniek}`,
  };

  const opslaan = async () => {
    const antwoord = page.waitForResponse(item =>
      item.url().includes('/server/api/settings.php') && item.request().method() === 'POST');
    await page.locator('#save-settings').click();
    expect((await antwoord).status()).toBe(200);
    await expect(page.locator('#toast')).toContainText('Instellingen zijn op de server opgeslagen');
  };

  try {
    await test.step('When website en slogan worden ingevuld en opgeslagen', async () => {
      for (const id of velden) await page.locator('#' + id).fill(gewijzigd[id]);
      await opslaan();
    });

    await test.step('Then staan ze na een herlaad nog steeds in het formulier', async () => {
      const gegevensBinnen = page.waitForResponse(item =>
        item.url().includes('/server/api/bootstrap.php'), { timeout: 20_000 });
      await page.reload();
      await gegevensBinnen;
      await openSettings(page);
      for (const id of velden) {
        await expect(page.locator('#' + id), id + ' moet bewaard blijven').toHaveValue(gewijzigd[id]);
      }
    });
  } finally {
    // Gedeelde bedrijfsinstellingen: nooit proefteksten laten staan.
    await page.reload();
    await openSettings(page);
    for (const id of velden) await page.locator('#' + id).fill(origineel[id]);
    await opslaan();
  }
});

test('[INV-ID-H-010] instellingen tonen de standaardtekst die de ontvanger werkelijk krijgt', async ({ page }) => {
  // De standaardteksten stonden in server/mail/queue.php en nergens anders. Het
  // instellingenscherm zei bij elke ontvanger "Zelfde als de opdracht" -- bij de
  // boekhouder en de salarisadministratie is dat onwaar, want die slaan de
  // opdrachttekst juist over. Je kon dus alleen zien wat er verstuurd werd door
  // het te versturen.
  //
  // Deze case liep bij het schrijven meteen ergens tegenaan: de boekhouder in de
  // seed had helemaal geen soort, viel terug op 'other', en kreeg dus de algemene
  // tekst in plaats van de boekhoudertekst. Dat was niet te zien -- er ging wel
  // gewoon een mail uit. Daarom wordt de soort hier ook los nagelopen.
  //
  // De vergelijking gaat tegen wat de server in dit gesprek meestuurt, niet tegen
  // een letterlijke tekst in deze test: een tweede kopie in de frontend zou anders
  // pas opvallen in het postvak van de klant.
  const login = new LoginPage(page);
  await login.open();

  const bootstrapBinnen = page.waitForResponse(item =>
    item.url().includes('/server/api/bootstrap.php'), { timeout: 20_000 });
  await login.loginAsAdmin();
  const payload = await (await bootstrapBinnen).json();

  const standaarden = payload.mail_channel_defaults as Record<string, { subject: string; body: string }>;
  expect(standaarden, 'de server hoort de standaardteksten mee te sturen').toBeTruthy();
  for (const kanaal of ['accountant', 'payroll', 'other']) {
    expect(standaarden[kanaal]?.body, 'kanaal ' + kanaal + ' hoort een tekst te hebben').toBeTruthy();
  }
  expect(standaarden.payroll.body, 'de salarisadministratie hoort geen bedragen te zien').not.toContain('{bedrag');
  expect(standaarden.accountant.body.trim(), 'boekhouder en salaris horen niet dezelfde tekst te krijgen')
    .not.toBe(standaarden.payroll.body.trim());

  const alleOntvangers = (payload.mail_recipients ?? []) as Array<Record<string, unknown>>;
  const ontvangers = alleOntvangers.filter(item => Number(item.active) === 1);
  expect(ontvangers.length, 'zonder ontvangers zegt deze case niets').toBeGreaterThan(0);

  const soortVan = (category: string) =>
    ({ accounting: 'accountant', payroll: 'payroll' } as Record<string, string>)[category] || 'other';

  await test.step('When de lijst met vaste ontvangers wordt geopend', async () => {
    await openSettings(page);
    await expect(page.locator('.mail-recipient-setting').first()).toBeVisible();
  });

  await test.step('Then staat bij elke ontvanger de tekst van de server', async () => {
    for (const ontvanger of ontvangers) {
      const naam = String(ontvanger.display_name);
      const kanaal = soortVan(String(ontvanger.recipient_category));
      const rij = page.locator('.mail-recipient-setting').filter({ hasText: naam }).first();
      await rij.locator('details.mail-standaardtekst > summary').click();

      const getoond = ((await rij.locator('.mail-standaardtekst-inhoud').textContent()) ?? '').replace(/\r/g, '');
      expect(getoond.trim(), naam + ' hoort de tekst van kanaal ' + kanaal + ' te tonen, niet een eigen kopie')
        .toBe(standaarden[kanaal].body.trim());
    }
  });

  await test.step('And geeft elke ontvanger dezelfde uitleg', async () => {
    // Hier stonden twee verschillende zinnen, want er golden twee regels: sommige
    // ontvangers erfden de opdrachttekst en andere niet. Wie in dit scherm keek zag
    // dus per rij iets anders staan zonder dat duidelijk was waarom. Nu is er één
    // regel, dus hoort er ook één zin te staan -- bij iedereen dezelfde.
    const zinnen: string[] = [];
    for (const ontvanger of ontvangers) {
      const naam = String(ontvanger.display_name);
      const rij = page.locator('.mail-recipient-setting').filter({ hasText: naam }).first();
      const uitleg = rij.locator('details.mail-standaardtekst .form-help').first();
      await expect(uitleg, naam + ': er hoort uitleg bij te staan').toBeVisible();
      zinnen.push(((await uitleg.textContent()) ?? '').trim());
    }
    expect(zinnen.length, 'zonder ontvangers zegt deze stap niets').toBeGreaterThan(0);
    expect([...new Set(zinnen)], 'elke ontvanger hoort dezelfde uitleg te krijgen').toHaveLength(1);
    expect(zinnen[0].toLowerCase(), 'de uitleg mag niet meer naar de opdracht verwijzen: die laag bestaat niet meer')
      .not.toContain('opdracht');
  });

  await test.step('And heeft de boekhouder werkelijk de soort boekhouding', async () => {
    // De seed vulde deze kolom niet, dus stond er 'other' en kreeg de boekhouder
    // stilletjes de algemene tekst.
    const boekhouder = alleOntvangers.find(item => String(item.recipient_key) === 'bookkeeper');
    if (!boekhouder) return;
    expect(String(boekhouder.recipient_category), 'een ontvanger met sleutel bookkeeper hoort soort accounting te hebben')
      .toBe('accounting');
  });

  await test.step('And staat de broker er ook bij, ook al is hij geen vaste ontvanger', async () => {
    // De broker kreeg wel een mail maar stond nergens in dit scherm. Wie hier keek
    // zag twee ontvangers terwijl er drie mails uitgingen. Hij staat per opdracht,
    // dus hij hoort hier alleen te lezen te zijn, met de weg erheen erbij.
    const brokerBlok = page.locator('#mail-broker-route-info .mail-recipient-setting');
    await expect(brokerBlok, 'de broker hoort in het instellingenscherm te staan').toHaveCount(1);
    await expect(brokerBlok, 'er moet bij staan waar je hem wel wijzigt').toContainText('bij Medewerkers');
    await expect(brokerBlok, 'en waarom hij hier niet in de lijst staat').toContainText('per medewerker');
    await expect(brokerBlok.locator('button'), 'de broker is hier niet te wijzigen, dus geen knoppen')
      .toHaveCount(0);

    await brokerBlok.locator('details.mail-standaardtekst > summary').click();
    const getoond = ((await brokerBlok.locator('.mail-standaardtekst-inhoud').textContent()) ?? '').replace(/\r/g, '');
    expect(getoond.trim(), 'de brokertekst moet van de server komen').toBe(standaarden.broker.body.trim());
  });
});
