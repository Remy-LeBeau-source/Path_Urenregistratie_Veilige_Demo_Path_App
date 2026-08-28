import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  demoCreds, csrf, apiLogin, apiLogout, resetSharedBaseline, setTestMailDelivery,
  uiLogin, uiLogout, periodeKey, finaliseViaConceptUpload, type Creds,
} from './_helpers';

// Verbreding van de TEST-regressie: alle demo-medewerkers, een zelf aangemaakte
// medewerker met eigen opdracht-opties, en het herinneringen-scherm. Muteert
// gedeelde TEST-data; afterAll zet de baseline terug.

let creds: Creds;

test.beforeAll(async ({ request }) => {
  creds = await demoCreds(request);
});

test.afterAll(async ({ request }) => {
  await apiLogin(request, creds.admin.email, creds.admin.password);
  await setTestMailDelivery(request, true).catch(() => undefined);
  await apiLogout(request);
  await resetSharedBaseline(request, creds);
});

const DEMO_EMPLOYEES = [
  'marc@example.invalid',
  'stasjo@example.invalid',
  'brian@example.invalid',
  'shawn@example.invalid',
];

// Een echt factuurnummer volgt de per-opdracht template <prefix>-{jaar}-{maandnaam}.
// Nooit de generieke acceptatie-dummy PATH-2026-nnn.
const ECHT_FACTUURNUMMER = /^[A-Za-z][A-Za-z-]*-\d{4}-(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)$/;
const DUMMY_FACTUURNUMMER = /^PATH-\d{4}-\d{3}$/i;

test('[TEST-E2E-06] elke demo-medewerker ziet alleen eigen data; alle facturen hebben een echt nummer', async ({ page }) => {
  test.setTimeout(240_000);

  for (const email of DEMO_EMPLOYEES) {
    await uiLogin(page, email, creds.employee.password);
    const ik = await (await page.request.get('/server/auth/me.php')).json();
    expect(String(ik.user.email), `${email} hoort als zichzelf ingelogd te zijn`).toBe(email);
    await page.locator('button[data-view="timesheet"]').first().click();
    await expect(page.locator('#timesheet-status')).toBeVisible();
    await expect(page.locator('button[data-view="approvals"]'), `${email}: geen goedkeuringsscherm`).toBeHidden();
    await expect(page.locator('button[data-view="employees"]'), `${email}: geen teambeheer`).toBeHidden();
    const vreemd = await page.request.get('/server/api/timesheets.php?period=2026-08&employee_id=999');
    expect([400, 403], `${email}: vreemde urenstaat lezen hoort te falen`).toContain(vreemd.status());
    await uiLogout(page);
  }

  await uiLogin(page, creds.admin.email, creds.admin.password);
  let gezien = 0;
  for (const periode of ['2026-06', '2026-07', '2026-08', '2026-09']) {
    const res = await (await page.request.get(`/server/api/invoices.php?period=${periode}`)).json();
    for (const inv of ((res.invoices || res.items || []) as Array<Record<string, unknown>>)) {
      const nr = String(inv.invoice_number || '');
      if (nr === '') continue;
      gezien++;
      expect(nr, `factuur ${nr} mag niet de generieke dummy-nummering hebben`).not.toMatch(DUMMY_FACTUURNUMMER);
      expect(nr, `factuur ${nr} hoort de per-opdracht nummering te volgen`).toMatch(ECHT_FACTUURNUMMER);
    }
  }
  expect(gezien, 'er horen bestaande facturen te zijn om te controleren').toBeGreaterThan(0);
  await uiLogout(page);
});

test('[TEST-E2E-07] nieuwe medewerker met eigen opdracht-opties: volledige keten en eigen factuurnummer', async ({ page, request }) => {
  test.setTimeout(240_000);
  const uniek = Date.now().toString().slice(-8);
  const staart = uniek.slice(-3);
  const naam = `TEST Volledig ${uniek}`;
  const adres = `test-volledig-${uniek}@example.invalid`;
  const wachtwoord = `Volledig!${uniek}`;
  const template = `TST${staart}-{jaar}-{maand}`;

  await apiLogin(request, creds.admin.email, creds.admin.password);
  await setTestMailDelivery(request, false);
  try {
    const t = await csrf(request);
    const maak = await request.post('/server/api/staff.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t },
      data: {
        action: 'upsert_employee',
        employee: {
          name: naam, email: adres, role: 'Consultant',
          startDate: new Date().toISOString().slice(0, 10),
          weeklyHours: 40, rate: 90,
          client: `TEST Klant ${uniek}`, broker: `TEST Broker ${uniek}`,
          brokerEmail: `test-broker-${uniek}@example.invalid`,
          invoiceTemplate: template,
          customerTimesheetExpected: true,
          customerTimesheetBrokerEnabled: true,
          brokerEnabled: true,
          brokerInvoiceAttachment: true,
        },
        mailRecipients: [],
        sendInvitation: false,
      },
    });
    expect(maak.status(), `aanmaken hoort te slagen: ${await maak.text()}`).toBe(200);
    const employeeId = Number((await maak.json()).employee_id || 0);
    expect(employeeId).toBeGreaterThan(0);

    const rt = await csrf(request);
    const reset = await request.post('/server/auth/request-reset.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': rt },
      data: { email: adres },
    });
    const token = String((await reset.json()).token || '');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    await apiLogout(request);

    await page.goto(`/index.html#reset-password=${token}`);
    await page.locator('#auth-reset-new-password').fill(wachtwoord);
    await page.locator('#auth-reset-confirm-password').fill(wachtwoord);
    await page.locator('#auth-reset-complete-submit').click();
    await expect(page.locator('#auth-reset-complete-feedback')).toContainText('Je wachtwoord is ingesteld');

    await uiLogin(page, adres, wachtwoord);
    await page.locator('button[data-view="timesheet"]').first().click();
    await expect(page.locator('#timesheet-status')).toBeVisible();
    const periode = periodeKey(String(await page.locator('#period-label').textContent() || ''));
    const invoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
    await expect(invoer, 'de nieuwe medewerker hoort uren te kunnen invullen').toBeVisible();
    await invoer.fill('8');
    await invoer.press('Tab');
    const schrijf = page.waitForResponse((r) =>
      r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST');
    await page.locator('#submit-timesheet').click();
    await schrijf;
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
    await uiLogout(page);

    await uiLogin(page, creds.admin.email, creds.admin.password);
    const tsRes = await (await page.request.get(
      `/server/api/timesheets.php?period=${periode}&employee_id=${employeeId}`)).json();
    const timesheetId = Number(tsRes.timesheet.id || 0);
    await page.locator('button[data-view="approvals"]').first().click();
    const goedkeuren = page.locator(`[data-approve="${employeeId}"]`).first();
    await expect(goedkeuren).toBeVisible();
    const w = page.waitForResponse((r) =>
      r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST');
    await goedkeuren.click();
    await w;
    // De client moet de factuur als "ready" kennen voordat downloadInvoicePdf
    // een geldige jsPDF-conceptfactuur kan opbouwen.
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible({ timeout: 20_000 });

    // Afronden via het echte jsPDF-conceptpad: op TEST met echte mail mag hier
    // nooit de platte serverfallback-PDF ontstaan.
    await finaliseViaConceptUpload(page, employeeId, periode, timesheetId);

    const facturen = await (await page.request.get(`/server/api/invoices.php?period=${periode}`)).json();
    const factuur = ((facturen.invoices || facturen.items) as Array<Record<string, unknown>>)
      .find((i) => Number(i.timesheet_id) === timesheetId) as Record<string, unknown>;
    expect(factuur, 'er hoort een factuur te zijn').toBeTruthy();
    const nr = String(factuur.invoice_number);
    expect(nr, `het factuurnummer hoort de eigen opdracht-template te volgen`)
      .toMatch(new RegExp(`^TST${staart}-\\d{4}-[a-z]+$`));
    expect(nr, 'geen generieke dummy-nummering').not.toMatch(DUMMY_FACTUURNUMMER);
    await uiLogout(page);
  } finally {
    await apiLogin(request, creds.admin.email, creds.admin.password);
    await setTestMailDelivery(request, true);
    await apiLogout(request);
  }
});

test('[TEST-E2E-08] herinneringen: instelling bewaren en een veilige voorbeeldmelding', async ({ page }) => {
  test.setTimeout(120_000);
  await uiLogin(page, creds.admin.email, creds.admin.password);
  await page.locator('button[data-view="settings"]').first().click();
  await expect(page.locator('#page-title')).toHaveText('Instellingen');

  await expect(page.locator('#reminder-schedule-summary'),
    'de actieve-planning samenvatting hoort te tonen').not.toBeEmpty();

  const wekelijks = page.locator('#setting-weekly-reminder-enabled');
  const beginStand = await wekelijks.isChecked();
  const opslaan = async () => {
    const r = page.waitForResponse((i) =>
      i.url().includes('/server/api/settings.php') && i.request().method() === 'POST');
    await page.locator('#save-settings').click();
    expect((await r).status()).toBe(200);
    await expect(page.locator('#toast')).toContainText('Instellingen zijn op de server opgeslagen');
  };

  try {
    await wekelijks.setChecked(!beginStand);
    await opslaan();
    await page.reload();
    await page.locator('button[data-view="settings"]').first().click();
    await expect(page.locator('#setting-weekly-reminder-enabled'),
      'de gewijzigde herinneringsinstelling hoort na herladen bewaard te zijn')
      .toBeChecked({ checked: !beginStand });
  } finally {
    await page.locator('#setting-weekly-reminder-enabled').setChecked(beginStand);
    await opslaan();
  }

  const queueVoor = await (await page.request.get('/server/api/email-queue.php?limit=100')).json();
  await page.locator('#test-reminder-schedule').click();
  await expect(page.locator('#toast')).toContainText('er is niets gepland of verstuurd');
  const queueNa = await (await page.request.get('/server/api/email-queue.php?limit=100')).json();
  expect(Number(queueNa.count ?? (queueNa.items || []).length),
    'een voorbeeldmelding mag geen mail klaarzetten')
    .toBe(Number(queueVoor.count ?? (queueVoor.items || []).length));
  await uiLogout(page);
});

test('[TEST-E2E-28] een medewerker komt niet bij de gegevens of acties van een andere medewerker', async ({ request }) => {
  test.setTimeout(120_000);
  const periode = '2026-08';

  // Given: de id's van een andere demo-medewerker (Marc), opgehaald als beheerder.
  await apiLogin(request, creds.admin.email, creds.admin.password);
  const boot = await (await request.get('/server/api/bootstrap.php')).json();
  const marcUser = (boot.users as Array<Record<string, unknown>>)
    .find((u) => String(u.email).toLowerCase() === 'marc@example.invalid');
  const marc = (boot.employees as Array<Record<string, unknown>>)
    .find((e) => Number(e.user_id) === Number(marcUser?.id));
  expect(marc, 'de demo-medewerker Marc hoort te bestaan').toBeTruthy();
  const marcId = Number(marc!.id);
  expect(marcId).toBeGreaterThan(0);
  // Een factuur van Marc uit de demo-seed, voor de download-poging.
  let marcFactuurId = 0;
  for (const p of ['2026-06', '2026-07', '2026-08']) {
    const lijst = await (await request.get(`/server/api/invoices.php?period=${p}`)).json();
    const gevonden = ((lijst.items || lijst.invoices || []) as Array<Record<string, unknown>>)
      .find((i) => String(i.employee_name) === String(marc!.full_name));
    if (gevonden) { marcFactuurId = Number(gevonden.id); break; }
  }
  expect(marcFactuurId, 'er hoort een demo-factuur van Marc te zijn').toBeGreaterThan(0);
  await apiLogout(request);

  // When: Stasjo (een andere medewerker) probeert Marcs gegevens te lezen en acties uit te voeren.
  await apiLogin(request, creds.employee.email, creds.employee.password);
  const token = await csrf(request);

  const urenLezen = await request.get(
    `/server/api/timesheets.php?period=${periode}&employee_id=${marcId}`);
  const klantLezen = await request.get(
    `/server/api/customer-timesheets.php?period=${periode}&employee_id=${marcId}`);
  const klantDownload = await request.get(
    `/server/api/customer-timesheets.php?action=download&period=${periode}&employee_id=${marcId}&assignment_id=1`);
  const goedkeuren = await request.post('/server/api/timesheets.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    data: { action: 'approve', period: periode, employee_id: marcId, expected_version: 1 },
  });
  const auditLezen = await request.get('/server/api/audit-log.php?limit=10');
  const factuurDownload = await request.get(
    `/server/api/invoices.php?action=download&invoice_id=${marcFactuurId}`);
  await apiLogout(request);

  // Then: elke poging wordt geweigerd; geen enkele lekt Marcs gegevens.
  expect([401, 403], `uren van een ander lezen: ${urenLezen.status()}`).toContain(urenLezen.status());
  expect([401, 403], `klanturenstaat van een ander lezen: ${klantLezen.status()}`).toContain(klantLezen.status());
  expect([401, 403, 404], `klanturenstaat van een ander downloaden: ${klantDownload.status()}`)
    .toContain(klantDownload.status());
  expect(klantDownload.headers()['content-type'] || '', 'de download mag geen PDF teruggeven')
    .not.toMatch(/application\/pdf/);
  expect([401, 403], `uren van een ander goedkeuren: ${goedkeuren.status()}`).toContain(goedkeuren.status());
  expect([401, 403], `het auditlog is beheerder-only: ${auditLezen.status()}`).toContain(auditLezen.status());
  expect([401, 403], `de factuur-PDF van een ander downloaden: ${factuurDownload.status()}`)
    .toContain(factuurDownload.status());
  expect(factuurDownload.headers()['content-type'] || '', 'de factuur-download mag geen PDF teruggeven')
    .not.toMatch(/application\/pdf/);
});
