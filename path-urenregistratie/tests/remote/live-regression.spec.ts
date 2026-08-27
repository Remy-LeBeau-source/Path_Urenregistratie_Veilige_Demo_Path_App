import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  demoCreds, csrf, apiLogin, apiLogout, resetSharedBaseline, setTestMailDelivery,
  uiLogin, uiLogout, periodeKey, nlBedrag, SINK, type Creds,
  guiApprove, guiFinaliseInvoice, assertConceptInvoicePdf,
} from './_helpers';

// Volledige regressie tegen de LIVE TEST-site (https://uren-test.pathconsultancy.nl).
//
// Dit muteert gedeelde TEST-data en verstuurt echte mail naar de vaste sink
// (giovanno.maatsen@pathconsultancy.nl); TEST staat op mail_mode "test_active"
// met omleiding naar die postbus. Na afloop wordt de gedeelde baseline
// transactioneel teruggezet. Alleen tegen TEST draaien, nooit tegen PROD.

// Bewust niet serial: een val in één case mag de rest niet overslaan. Elke test
// logt zelf in en is zelfstandig.
let creds: Creds;

test.beforeAll(async ({ request }) => {
  creds = await demoCreds(request);
});

test.afterAll(async ({ request }) => {
  // Altijd eerst de maillevering terugzetten (een gepauzeerde reset-test kan hem
  // uit hebben gezet), dan de gedeelde baseline herstellen.
  await apiLogin(request, creds.admin.email, creds.admin.password);
  await setTestMailDelivery(request, true).catch(() => undefined);
  await apiLogout(request);
  await resetSharedBaseline(request, creds);
});

async function findEmployeeId(request: APIRequestContext): Promise<number> {
  const me = await (await request.get('/server/auth/me.php')).json();
  const boot = await (await request.get('/server/api/bootstrap.php')).json();
  const emp = (boot.employees as Array<Record<string, unknown>>)
    .find((e) => Number(e.user_id) === Number(me.user.id));
  return Number(emp?.id || 0);
}

async function readTimesheet(request: APIRequestContext, period: string, employeeId: number) {
  const res = await request.get(`/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`);
  return (await res.json()).timesheet as Record<string, unknown>;
}

// --------------------------------------------------------------------------

test('[TEST-E2E-01] inloggen: juiste credentials binnen, foute geweigerd', async ({ page, request }) => {
  await uiLogin(page, creds.admin.email, creds.admin.password);
  await expect(page.locator('.demo-badge').first()).toContainText(/Versie \d+\.\d+\.\d+/);
  await uiLogout(page);

  await page.locator('#auth-login-email').fill(creds.admin.email);
  await page.locator('#auth-login-password').fill('ditIsHetVerkeerdeWachtwoord!');
  await page.locator('#auth-login-submit').click();
  await expect(page.locator('#auth-login-feedback')).not.toBeEmpty();
  await expect(page.locator('#app-shell')).toBeHidden();

  // Server weigert het ook op API-niveau met een nette fout, geen 500.
  const token = await csrf(request);
  const res = await request.post('/server/auth/login.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    data: { email: creds.admin.email, password: 'nogsteedsfout' },
  });
  expect([400, 401]).toContain(res.status());
  expect((await res.json()).ok).toBe(false);
});

test('[TEST-E2E-02] wachtwoord vergeten: aanvraag, nieuw wachtwoord, oude link vervalt', async ({ page, request }) => {
  const nieuwWachtwoord = `TestReset!${Date.now().toString().slice(-8)}`;
  // Bewust een ander demo-account dan stasjo (die gebruiken andere cases voor
  // login), zodat de 3-per-15-min-resetgrens elkaar niet in de weg zit.
  const doelEmail = 'marc@example.invalid';

  // TEST verstuurt normaal echte reset-mail (token alleen in de mail). Voor deze
  // geautomatiseerde flow pauzeren we de levering: dan valt de site terug op
  // dry-run en geeft request-reset.php het token in de response terug. Aan het
  // eind (en in afterAll) zetten we de levering weer aan.
  await apiLogin(request, creds.admin.email, creds.admin.password);
  await setTestMailDelivery(request, false);
  await apiLogout(request);

  async function vraagReset(): Promise<string> {
    const t = await csrf(request);
    const r = await request.post('/server/auth/request-reset.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t },
      data: { email: doelEmail },
    });
    expect(r.status(), 'de resetaanvraag hoort te slagen').toBe(200);
    const token = String((await r.json()).token || '');
    expect(token, 'er hoort een token van 64 hex terug te komen (rate limit: max 3 per 15 min)')
      .toMatch(/^[a-f0-9]{64}$/);
    return token;
  }

  try {
  // Bewust maar twee aanvragen: request-reset.php begrenst op 3 per 15 minuten.
  const tokenA = await test.step('Given een eerste resetaanvraag een eenmalige link geeft', vraagReset);
  const tokenB = await test.step('And een tweede aanvraag een nieuwe link geeft', async () => {
    const b = await vraagReset();
    expect(b, 'een nieuwe aanvraag hoort een ander token te geven').not.toBe(tokenA);
    return b;
  });

  await test.step('When de nieuwste link een nieuw wachtwoord zet', async () => {
    await page.goto(`/index.html#reset-password=${tokenB}`);
    await page.locator('#auth-reset-new-password').fill(nieuwWachtwoord);
    await page.locator('#auth-reset-confirm-password').fill(nieuwWachtwoord);
    await page.locator('#auth-reset-complete-submit').click();
    await expect(page.locator('#auth-reset-complete-feedback')).toContainText('Je wachtwoord is ingesteld');
  });

  await test.step('Then werkt het nieuwe wachtwoord', async () => {
    await uiLogin(page, doelEmail, nieuwWachtwoord);
    await expect(page.locator('#app-shell')).toBeVisible();
    await uiLogout(page);
  });

  await test.step('And zijn zowel het gebruikte als het vervangen token ongeldig', async () => {
    for (const dood of [tokenB, tokenA]) {
      await page.goto(`/index.html#reset-password=${dood}`);
      await page.locator('#auth-reset-new-password').fill(`Weer!${Date.now()}`);
      await page.locator('#auth-reset-confirm-password').fill(`Weer!${Date.now()}`);
      await page.locator('#auth-reset-complete-submit').click();
      await expect(page.locator('#auth-reset-complete-feedback'),
        'een gebruikt of vervangen token hoort geweigerd te worden').not.toContainText('Je wachtwoord is ingesteld');
    }
  });
  } finally {
    await apiLogin(request, creds.admin.email, creds.admin.password);
    await setTestMailDelivery(request, true);
    await apiLogout(request);
  }
});

test('[TEST-E2E-03] medewerker aanmaken, laat hem zelf inloggen en alleen eigen uren zien', async ({ page, request }) => {
  const uniek = Date.now().toString().slice(-8);
  const naam = `TEST Nieuweling ${uniek}`;
  const adres = `test-nieuweling-${uniek}@example.invalid`;
  const wachtwoord = `Nieuw!${uniek}`;

  // Zelfde reden als E2E-02: pauzeer de levering zodat de setup-link als token
  // terugkomt in plaats van alleen in een mail naar de sink.
  await apiLogin(request, creds.admin.email, creds.admin.password);
  await setTestMailDelivery(request, false);
  try {
  const maakToken = await csrf(request);
  const maak = await request.post('/server/api/staff.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': maakToken },
    data: {
      action: 'upsert_employee',
      employee: {
        name: naam, email: adres, role: 'Consultant',
        startDate: new Date().toISOString().slice(0, 10),
        weeklyHours: 40, rate: 95,
        client: `TEST Klant ${uniek}`, broker: `TEST Broker ${uniek}`,
        brokerEmail: `test-broker-${uniek}@example.invalid`,
      },
      mailRecipients: [],
      sendInvitation: false,
    },
  });
  expect(maak.status(), `medewerker aanmaken hoort te slagen: ${await maak.text()}`).toBe(200);
  const maakBody = await maak.json();
  expect(maakBody.ok).toBe(true);
  expect(Number(maakBody.employee_id), 'er hoort een medewerker-id terug te komen').toBeGreaterThan(0);

  const zetToken = await csrf(request);
  const reset = await request.post('/server/auth/request-reset.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': zetToken },
    data: { email: adres },
  });
  const token = String((await reset.json()).token || '');
  expect(token, 'de nieuwe medewerker hoort een setup-link te krijgen').toMatch(/^[a-f0-9]{64}$/);
  await apiLogout(request);

  await page.goto(`/index.html#reset-password=${token}`);
  await page.locator('#auth-reset-new-password').fill(wachtwoord);
  await page.locator('#auth-reset-confirm-password').fill(wachtwoord);
  await page.locator('#auth-reset-complete-submit').click();
  await expect(page.locator('#auth-reset-complete-feedback')).toContainText('Je wachtwoord is ingesteld');

  await uiLogin(page, adres, wachtwoord);
  const ik = await (await page.request.get('/server/auth/me.php')).json();
  expect(String(ik.user.email), 'hij hoort als zichzelf ingelogd te zijn').toBe(adres);
  await page.locator('button[data-view="timesheet"]').first().click();
  await expect(page.locator('#timesheet-status')).toBeVisible();
  await expect(page.locator('button[data-view="approvals"]'),
    'een medewerker hoort geen goedkeuringsscherm te kunnen gebruiken').toBeHidden();
  await expect(page.locator('button[data-view="employees"]'),
    'een medewerker hoort geen teambeheer te kunnen gebruiken').toBeHidden();
  await uiLogout(page);
  } finally {
    await apiLogin(request, creds.admin.email, creds.admin.password);
    await setTestMailDelivery(request, true);
    await apiLogout(request);
  }
});

test('[TEST-E2E-04] volledige factuur- en mailketen met PDF- en mailinhoudcontrole', async ({ page, request }) => {
  test.setTimeout(180_000);

  // --- medewerker: uren invullen en indienen ---
  await uiLogin(page, creds.employee.email, creds.employee.password);
  await page.locator('button[data-view="timesheet"]').first().click();
  await expect(page.locator('#timesheet-status')).toBeVisible();
  const periode = periodeKey(String(await page.locator('#period-label').textContent() || ''));
  const employeeId = await findEmployeeId(page.request);
  expect(employeeId).toBeGreaterThan(0);

  const invoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
  if (await invoer.count()) {
    await invoer.fill('8');
    await invoer.press('Tab');
    const schrijf = page.waitForResponse((r) =>
      r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST');
    await page.locator('#submit-timesheet').click();
    await schrijf;
  }
  const ts = await readTimesheet(page.request, periode, employeeId);
  const timesheetId = Number(ts.id || 0);
  expect(timesheetId, 'de urenstaat hoort te bestaan').toBeGreaterThan(0);
  expect(['submitted', 'approved'], 'de urenstaat hoort ingediend of al goedgekeurd te zijn')
    .toContain(String(ts.status));
  await uiLogout(page);

  // --- admin: goedkeuren en de verzending afronden via de echte GUI-knop ---
  await uiLogin(page, creds.admin.email, creds.admin.password);
  await guiApprove(page, employeeId);
  await expect(async () => {
    expect(String((await readTimesheet(page.request, periode, employeeId)).status)).toBe('approved');
  }).toPass({ timeout: 20_000 });
  await guiFinaliseInvoice(page, employeeId, periode);
  void timesheetId;

  const facturen = await (await page.request.get(`/server/api/invoices.php?period=${periode}`)).json();
  const factuur = ((facturen.invoices || facturen.items) as Array<Record<string, unknown>>)
    .find((i) => Number(i.timesheet_id) === timesheetId) as Record<string, unknown>;
  expect(factuur, 'er hoort een definitieve factuur te zijn').toBeTruthy();
  const factuurId = Number(factuur.id);
  const nummer = String(factuur.invoice_number);
  const subtotaal = Number(factuur.subtotal);
  const btwBedrag = Number(factuur.vat_amount);
  const totaal = Number(factuur.total);
  const btwPct = Number(factuur.vat_percentage);
  void btwPct; void btwBedrag; void subtotaal; void totaal;

  await test.step('Then is de definitieve factuur de jsPDF-conceptfactuur zonder CONCEPT-markering', async () => {
    await assertConceptInvoicePdf(page, factuurId);
    const dl = await page.request.get(`/server/api/invoices.php?action=download&invoice_id=${factuurId}`);
    const head = Buffer.from(await dl.body()).toString('latin1');
    expect(head, 'de verstuurde factuur mag geen CONCEPT- of CONCEPTVOORBEELD-markering dragen')
      .not.toMatch(/CONCEPT ?- ?NIET VERZONDEN|CONCEPTVOORBEELD/);
  });

  await test.step('And toont de factuurpreview het juiste nummer, de IBAN en de bedragen', async () => {
    await page.evaluate((id) => {
      (window as unknown as { showInvoiceDocumentPreview?: (n: number) => void }).showInvoiceDocumentPreview?.(id);
    }, employeeId);
    const preview = page.locator('.invoice-document-preview');
    await expect(preview).toBeVisible({ timeout: 10_000 });
    await expect(preview.locator('.invoice-brand-number-line')).toContainText(nummer);
    await expect(preview.locator('.invoice-brand-payment')).toContainText(nummer);
    await expect(preview.locator('.invoice-brand-payment')).toContainText(/NL\d\d[A-Z]{4}/);
    await expect(preview.locator('.invoice-brand-totals')).toContainText(nlBedrag(totaal));
    await page.locator('#modal-close').click().catch(() => undefined);
    expect(Math.round((subtotaal + btwBedrag) * 100) / 100).toBe(Math.round(totaal * 100) / 100);
  });

  await test.step('And klopt het mailverkeer: routering, onderwerpen, bijlagebeleid', async () => {
    const queue = await (await page.request.get('/server/api/email-queue.php?limit=100')).json();
    const deliveries = ((queue.items || []) as Array<Record<string, unknown>>)
      .filter((d) => Number(d.invoice_id) === factuurId);
    expect(deliveries.length, 'de factuur hoort mail te hebben klaargezet').toBeGreaterThan(0);

    for (const d of deliveries) {
      expect(String(d.subject_snapshot || '').trim(), `${d.channel}: onderwerp niet leeg`).not.toBe('');
      expect(String(d.subject_snapshot || ''), `${d.channel}: geen onvervangen {veld} in onderwerp`).not.toMatch(/\{[a-zA-Z_]+\}/);
      expect(['none', 'invoice', 'customer_timesheet', 'invoice_and_customer_timesheet'],
        `${d.channel}: bekend bijlagebeleid`).toContain(String(d.attachment_policy));
    }
    const kanalen = deliveries.map((d) => String(d.channel));
    expect(kanalen, 'de brokerroute hoort een mail te krijgen').toContain('broker');

    // Salarisadministratie krijgt categorisch geen factuur mee.
    for (const d of deliveries.filter((x) => String(x.channel) === 'payroll')) {
      expect(String(d.attachment_policy), 'salaris zonder factuurbijlage').toBe('none');
    }
    // De delivery-snapshot bewaart de bedoelde ontvanger (de omleiding naar de
    // sink gebeurt pas bij het verzenden). Dus: geldig adres per route.
    for (const d of deliveries) {
      expect(String(d.recipient_email), `${d.channel}: geldig ontvangeradres`).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    }
  });
  await uiLogout(page);
});

test('[TEST-E2E-05] acceptatieconsole verstuurt de vijf scenario-mails naar de sink', async ({ request }) => {
  test.setTimeout(300_000);
  await apiLogin(request, creds.admin.email, creds.admin.password);

  const status = await (await request.get('/server/api/mail-acceptance.php')).json();
  expect(status.ok).toBe(true);
  expect(status.enabled, 'de acceptatieconsole hoort op TEST beschikbaar te zijn').toBe(true);
  const scenarios = (status.scenarios as Array<Record<string, unknown>>).filter((s) => s.ready === true);
  expect(scenarios.length, 'er horen klaarstaande acceptatiescenario\'s te zijn').toBeGreaterThanOrEqual(3);

  // De acceptatieconsole is gemaakt voor een mens die vijf knoppen na elkaar
  // klikt, niet voor een strak scriptloopje. Google SMTP Relay knijpt af bij
  // een burst. Dus: pauzeren tussen sends, en één herkansing bij een tijdelijke
  // 'smtp-not-accepted'.
  async function stuurScenario(key: string): Promise<Record<string, unknown>> {
    for (let poging = 1; poging <= 2; poging++) {
      const token = await csrf(request);
      const res = await request.post('/server/api/mail-acceptance.php', {
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        data: { confirm: 'SEND_ONE_ACCEPTANCE_MAIL', scenario: key },
      });
      const body = await res.json().catch(() => ({}));
      if (res.status() === 200 && body.ok === true) return body;
      if (poging === 1 && String(body.error || '') === 'smtp-not-accepted') {
        await new Promise((r) => setTimeout(r, 15_000));
        continue;
      }
      expect(res.status(), `scenario ${key} versturen: ${JSON.stringify(body)}`).toBe(200);
      expect(body.ok, `scenario ${key}: ${JSON.stringify(body)}`).toBe(true);
    }
    return {};
  }

  for (const s of scenarios) {
    const body = await stuurScenario(String(s.key));
    expect(body.ok, `scenario ${s.key} hoort ok te melden`).toBe(true);
    expect(body.preview_only, `scenario ${s.key} hoort echt verstuurd te zijn`).not.toBe(true);
    const result = (body.result || {}) as Record<string, unknown>;
    expect(String(result.recipient), `scenario ${s.key} gaat naar de vaste sink`).toBe(SINK);
    expect(String(result.outcome), `scenario ${s.key} hoort als verstuurd te gelden`).toBe('sent');
    await new Promise((r) => setTimeout(r, 5_000));
  }
  await apiLogout(request);
});
