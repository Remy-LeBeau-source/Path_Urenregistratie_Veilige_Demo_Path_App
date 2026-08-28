import { test, expect, type APIRequestContext } from '@playwright/test';
import { CustomerTimesheetApi } from '../playwright/api/CustomerTimesheetApi';
import {
  demoCreds, csrf, apiLogin, apiLogout, resetSharedBaseline, setTestMailDelivery,
  uiLogin, uiLogout, guiSubmitHours, guiApprove, apiApprove, finaliseViaConceptUpload, assertConceptInvoicePdf,
  createDemoEmployee, createDemoAdmin, validPdfBytes, currentPeriodKey, type Creds,
} from './_helpers';

/**
 * Maakt in de browser dezelfde jsPDF-conceptfactuur als de GUI-knop en geeft de
 * base64 terug. Tegen de LIVE TEST-site met echte mail mag een factuur NOOIT
 * zonder deze bijlage worden vergrendeld: zonder concept valt de server terug op
 * de platte tekst-PDF en die gaat dan echt de deur uit.
 */
async function browserConcept(page: import('@playwright/test').Page, employeeId: number, period: string): Promise<string> {
  await page.locator('button[data-view="invoices"]:visible').first().click();
  const base64 = await page.evaluate(([id, key]) => {
    const w = window as unknown as { downloadInvoicePdf?: (e: number, p: string, m: string) => unknown };
    if (typeof w.downloadInvoicePdf !== 'function') return '';
    const out = w.downloadInvoicePdf(id, key, 'base64');
    return typeof out === 'string' ? out : '';
  }, [employeeId, period] as [number, string]);
  expect(base64.length, 'de browser hoort de jsPDF-conceptfactuur te maken').toBeGreaterThan(20_000);
  return base64;
}

// Resterende charter-cases (zie tests/remote/TEST-CHARTER.md): klanturenstaat-
// toestandsketen, uren-invoer EP/BVA, robuustheid/"monkey", exploratory
// (mededelingen + instellingen) en de herinnering-planningslogica. Alles draait
// tegen de LIVE TEST-site; muterende stappen zetten daarna de baseline terug.

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

async function readTimesheet(request: APIRequestContext, period: string, employeeId: number) {
  const res = await request.get(`/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`);
  return (await res.json()) as { timesheet?: Record<string, unknown> };
}

async function saveDraft(
  request: APIRequestContext,
  period: string,
  body: { billable: number; entries: Array<{ date: string; hours: unknown; description?: string }>; expectedVersion?: number },
) {
  const token = await csrf(request);
  const data: Record<string, unknown> = {
    action: 'save_draft', period,
    contractual_hours: 40, billable_hours: body.billable,
    day_entries: body.entries.map((e) => ({ work_date: e.date, hours: e.hours, description: e.description ?? 'charter' })),
  };
  if (body.expectedVersion !== undefined) data.expected_version = body.expectedVersion;
  const res = await request.post('/server/api/timesheets.php', { headers: { 'X-CSRF-Token': token }, data });
  return { status: res.status(), body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

// ===========================================================================
// TEST-E2E-13 — Toestandsovergang: klanturenstaat-keten (FO §6)
// ===========================================================================
test('[TEST-E2E-13] klanturenstaat-toestandsketen: indienen, opnieuw opvragen, herindienen, goedkeuren, brokerroute', async ({ request }) => {
  test.setTimeout(240_000);
  const emp = await createDemoEmployee(request, creds, { customerTimesheet: true, namePrefix: 'TEST CTS-keten' });
  const period = currentPeriodKey();
  const cts = new CustomerTimesheetApi(request);

  await apiLogin(request, emp.email, emp.password);
  await test.step('Medewerker dient een geldige klanturenstaat in -> received', async () => {
    const r = await cts.write({ action: 'submit', period, file: { name: 'k.pdf', mimeType: 'application/pdf', buffer: validPdfBytes('cts-1') } });
    expect(r.status, `indienen hoort te slagen: ${JSON.stringify(r.body)}`).toBe(200);
    const nu = await cts.read(period);
    expect((nu.body as { customer_timesheet?: { status?: string } }).customer_timesheet?.status).toBe('received');
  });
  await apiLogout(request);

  await apiLogin(request, creds.admin.email, creds.admin.password);
  await test.step('Ongeldige overgang: "verzonden" markeren vóór goedkeuring -> geweigerd, status ongewijzigd', async () => {
    const r = await cts.write({ action: 'mark_sent', period, employeeId: emp.id });
    expect(r.status, 'alleen een goedgekeurde klanturenstaat kan als verzonden worden gemarkeerd').toBe(409);
    expect(String((r.body as { error?: string }).error || '')).toContain('invalid-customer-timesheet-transition');
    const nu = await cts.read(period, emp.id);
    expect((nu.body as { customer_timesheet?: { status?: string } }).customer_timesheet?.status,
      'de geweigerde overgang mag de status niet veranderen').toBe('received');
  });

  await test.step('Backoffice vraagt een nieuw document met reden -> resubmit', async () => {
    const r = await cts.write({ action: 'request_resubmit', period, employeeId: emp.id, reviewNote: 'Graag met handtekening van de klant.' });
    expect(r.status, `opnieuw opvragen hoort te slagen: ${JSON.stringify(r.body)}`).toBe(200);
    const nu = await cts.read(period, emp.id);
    const ct = (nu.body as { customer_timesheet?: { status?: string; review_note?: string } }).customer_timesheet;
    expect(ct?.status).toBe('resubmit');
    expect(String(ct?.review_note || ''), 'de reden hoort bewaard te zijn').toContain('handtekening');
  });

  await test.step('Ongeldige overgang: goedkeuren terwijl status resubmit is -> geweigerd', async () => {
    const r = await cts.write({ action: 'approve', period, employeeId: emp.id });
    expect(r.status, 'alleen een ingediende klanturenstaat kan worden goedgekeurd').toBe(409);
    const nu = await cts.read(period, emp.id);
    expect((nu.body as { customer_timesheet?: { status?: string } }).customer_timesheet?.status).toBe('resubmit');
  });
  await apiLogout(request);

  await apiLogin(request, emp.email, emp.password);
  await test.step('Medewerker levert opnieuw aan -> received', async () => {
    const r = await cts.write({ action: 'submit', period, file: { name: 'k2.pdf', mimeType: 'application/pdf', buffer: validPdfBytes('cts-2') } });
    expect(r.status, `herindienen hoort te slagen: ${JSON.stringify(r.body)}`).toBe(200);
    const nu = await cts.read(period);
    expect((nu.body as { customer_timesheet?: { status?: string } }).customer_timesheet?.status).toBe('received');
  });
  await apiLogout(request);

  await apiLogin(request, creds.admin.email, creds.admin.password);
  await test.step('Backoffice keurt goed en markeert daarna als verzonden', async () => {
    const ok = await cts.write({ action: 'approve', period, employeeId: emp.id });
    expect(ok.status, `goedkeuren hoort te slagen: ${JSON.stringify(ok.body)}`).toBe(200);
    const naGoed = await cts.read(period, emp.id);
    expect((naGoed.body as { customer_timesheet?: { status?: string } }).customer_timesheet?.status).toBe('approved');

    const verzonden = await cts.write({ action: 'mark_sent', period, employeeId: emp.id });
    expect(verzonden.status, `als verzonden markeren hoort te slagen: ${JSON.stringify(verzonden.body)}`).toBe(200);
    const naVerzonden = await cts.read(period, emp.id);
    expect((naVerzonden.body as { customer_timesheet?: { status?: string } }).customer_timesheet?.status).toBe('sent');
  });
  await apiLogout(request);

  await test.step('Het document blijft na een verse login inline als PDF bekijkbaar', async () => {
    await apiLogin(request, emp.email, emp.password);
    const dl = await cts.download(period);
    expect(dl.status).toBe(200);
    expect(dl.contentType, 'de klanturenstaat komt terug als PDF').toContain('application/pdf');
    expect(dl.contentDisposition, 'de klanturenstaat opent inline, niet als download').toContain('inline');
    expect(dl.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    await apiLogout(request);
  });
});

// ===========================================================================
// TEST-E2E-15 — Equivalentieklassen + grenswaarden: uren-invoer (FO §5)
// ===========================================================================
test('[TEST-E2E-15] uren-invoer EP/BVA: 0 en 24 door, negatief, >24 en niet-numeriek fail-closed', async ({ request }) => {
  test.setTimeout(180_000);
  const emp = await createDemoEmployee(request, creds, { namePrefix: 'TEST uren-EP' });
  const period = currentPeriodKey();
  const dag = `${period}-02`;
  await apiLogin(request, emp.email, emp.password);

  await test.step('EP geldig: een normale werkdag van 8 uur', async () => {
    const r = await saveDraft(request, period, { billable: 8, entries: [{ date: dag, hours: 8 }] });
    expect(r.status, `8 uur hoort geaccepteerd te worden: ${JSON.stringify(r.body)}`).toBe(200);
    const ts = (await readTimesheet(request, period, emp.id)).timesheet;
    expect(Number(ts?.billable_hours)).toBe(8);
    expect(String(ts?.status)).toBe('draft');
  });

  await test.step('BVA ondergrens: 0 uur is geldig en levert geen dagregel op', async () => {
    const r = await saveDraft(request, period, { billable: 0, entries: [{ date: dag, hours: 0 }] });
    expect(r.status, `0 uur hoort geldig te zijn: ${JSON.stringify(r.body)}`).toBe(200);
    expect(Number((await readTimesheet(request, period, emp.id)).timesheet?.billable_hours)).toBe(0);
  });

  await test.step('BVA bovengrens: 24 uur is nog geldig', async () => {
    const r = await saveDraft(request, period, { billable: 24, entries: [{ date: dag, hours: 24 }] });
    expect(r.status, `24 uur hoort de bovengrens te zijn: ${JSON.stringify(r.body)}`).toBe(200);
    expect(Number((await readTimesheet(request, period, emp.id)).timesheet?.billable_hours)).toBe(24);
  });

  for (const geval of [
    { naam: 'BVA net boven de grens: 24,01 uur', hours: 24.01 },
    { naam: 'EP ongeldig: negatieve uren', hours: -1 },
    { naam: 'EP ongeldig: meer dan 24 uur', hours: 25 },
    { naam: 'EP ongeldig: niet-numerieke invoer', hours: 'acht' },
  ]) {
    await test.step(`${geval.naam} -> geweigerd, urenstaat ongewijzigd`, async () => {
      const r = await saveDraft(request, period, { billable: 0, entries: [{ date: dag, hours: geval.hours }] });
      expect(r.status, `"${geval.naam}" hoort met 400 geweigerd te worden`).toBe(400);
      expect(String(r.body.error || '')).toBe('invalid-payload');
      const ts = (await readTimesheet(request, period, emp.id)).timesheet;
      expect(Number(ts?.billable_hours), 'een geweigerde invoer mag de opgeslagen uren niet aanraken').toBe(24);
    });
  }
  await apiLogout(request);
});

// ===========================================================================
// TEST-E2E-19 — Robuustheid / "monkey" (FO §11)
// ===========================================================================
test('[TEST-E2E-19] robuustheid: te lange invoer begrensd, dubbele acties idempotent, gelijktijdige writes consistent', async ({ page, request }) => {
  test.setTimeout(240_000);
  const emp = await createDemoEmployee(request, creds, { namePrefix: 'TEST robuust' });
  const period = currentPeriodKey();
  const dag = `${period}-02`;

  await test.step('Een zeer lange toelichting wordt met een nette fout begrensd, geen half record', async () => {
    await apiLogin(request, emp.email, emp.password);
    const geldig = await saveDraft(request, period, { billable: 4, entries: [{ date: dag, hours: 4, description: 'kort' }] });
    expect(geldig.status).toBe(200);
    const lang = await saveDraft(request, period, { billable: 4, entries: [{ date: dag, hours: 4, description: 'x'.repeat(5_000) }] });
    expect(lang.status, 'een 5000-teken toelichting hoort een nette 400 te geven, geen 500').toBe(400);
    expect(String(lang.body.error || '')).toBe('invalid-payload');
    const ts = (await readTimesheet(request, period, emp.id)).timesheet;
    expect(Number(ts?.billable_hours), 'het geldige concept blijft ongewijzigd').toBe(4);
    await apiLogout(request);
  });

  await test.step('Een extreem lange naam laat de server niet omvallen', async () => {
    await apiLogin(request, creds.admin.email, creds.admin.password);
    const t = await csrf(request);
    const res = await request.post('/server/api/staff.php', {
      headers: { 'X-CSRF-Token': t },
      data: {
        action: 'upsert_employee',
        employee: { name: 'A'.repeat(20_000), email: `robuust-${Date.now()}@example.invalid`, role: 'Consultant', weeklyHours: 36, rate: 80 },
        mailRecipients: [], sendInvitation: false,
      },
    });
    expect(res.status(), `20k-tekens naam mag geen serverfout geven (kreeg ${res.status()})`).not.toBe(500);
    expect([200, 400], 'de server hoort de te lange naam te begrenzen of netjes te weigeren').toContain(res.status());
    await apiLogout(request);
  });

  await test.step('Dubbele goedkeuring en dubbele factuur-afronding zijn idempotent', async () => {
    await uiLogin(page, emp.email, emp.password);
    await guiSubmitHours(page);
    await uiLogout(page);
    await uiLogin(page, creds.admin.email, creds.admin.password);
    await guiApprove(page, emp.id);
    const goedgekeurd = (await readTimesheet(page.request, period, emp.id)).timesheet;
    const tsId = Number(goedgekeurd?.id || 0);
    expect(tsId).toBeGreaterThan(0);
    expect(String(goedgekeurd?.status)).toBe('approved');

    await test.step('Een tweede goedkeuring op een al goedgekeurde urenstaat wordt geweigerd, status blijft approved', async () => {
      const token = await csrf(page.request);
      const r = await page.request.post('/server/api/timesheets.php', {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'approve', period, employee_id: emp.id, expected_version: Number(goedgekeurd?.version || 1) },
      });
      expect([409, 422], `dubbel goedkeuren hoort geweigerd te worden (kreeg ${r.status()})`).toContain(r.status());
      expect(String((await readTimesheet(page.request, period, emp.id)).timesheet?.status)).toBe('approved');
    });

    // Eerste afronding via het echte jsPDF-conceptpad: dit is de factuur die
    // (op TEST met echte mail) ook daadwerkelijk verstuurd wordt.
    await finaliseViaConceptUpload(page, emp.id, period, tsId);

    await test.step('Een tweede afronding maakt geen tweede factuur', async () => {
      const nogmaals = await browserConcept(page, emp.id, period);
      const token = await csrf(page.request);
      const r = await page.request.post('/server/api/invoices.php', {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'lock', timesheet_id: tsId, concept_pdf_base64: nogmaals },
      });
      expect([200, 409, 422], `een tweede afronding hoort idempotent of geweigerd te zijn (kreeg ${r.status()})`).toContain(r.status());
      const facturen = await (await page.request.get(`/server/api/invoices.php?period=${period}`)).json();
      const eigen = ((facturen.invoices || facturen.items || []) as Array<Record<string, unknown>>)
        .filter((i) => Number(i.timesheet_id) === tsId);
      expect(eigen.length, 'dubbele afronding mag nooit twee facturen voor dezelfde urenstaat maken').toBe(1);
      expect(String((await readTimesheet(page.request, period, emp.id)).timesheet?.status)).toBe('invoiced');
    });
    await uiLogout(page);
  });

  await test.step('Vier gelijktijdige concept-writes met dezelfde versie: één wint, rest stale, eindstaat consistent', async () => {
    const emp2 = await createDemoEmployee(request, creds, { namePrefix: 'TEST race' });
    await apiLogin(request, emp2.email, emp2.password);
    const eerste = await saveDraft(request, period, { billable: 4, entries: [{ date: dag, hours: 4 }] });
    expect(eerste.status).toBe(200);
    const versie = Number((await readTimesheet(request, period, emp2.id)).timesheet?.version || 0);
    expect(versie).toBeGreaterThan(0);

    const pogingen = [5, 6, 7, 8].map((uren) =>
      saveDraft(request, period, { billable: uren, entries: [{ date: dag, hours: uren }], expectedVersion: versie }));
    const uitkomsten = await Promise.all(pogingen);
    const gelukt = uitkomsten.filter((r) => r.status === 200);
    const stale = uitkomsten.filter((r) => r.status === 409 && String(r.body.error || '') === 'stale-version');
    expect(gelukt.length, 'precies één gelijktijdige write mag winnen').toBe(1);
    expect(stale.length, 'de andere drie horen als stale-version te worden geweigerd').toBe(3);

    const na = (await readTimesheet(request, period, emp2.id)).timesheet;
    expect(Number(na?.version), 'de versie hoort precies één keer opgehoogd te zijn').toBe(versie + 1);
    expect([5, 6, 7, 8], 'de opgeslagen uren horen bij precies één van de pogingen te passen').toContain(Number(na?.billable_hours));
    await apiLogout(request);
  });
});

// ===========================================================================
// TEST-E2E-21 — Exploratory: mededelingen + instellingen (hele app)
// ===========================================================================
test('[TEST-E2E-21] exploratory: mededeling plaatsen, ontvangen, intrekken met historie; instellingenmenu compleet', async ({ page, request }) => {
  test.setTimeout(180_000);
  const stempel = Date.now().toString().slice(-6);

  await apiLogin(request, creds.admin.email, creds.admin.password);
  const boot = await (await request.get('/server/api/bootstrap.php')).json();
  // bootstrap: e-mailadressen staan op boot.users, niet op boot.employees.
  const stasjoUser = (boot.users as Array<Record<string, unknown>>).find((u) => String(u.email) === 'stasjo@example.invalid');
  const ontvangerId = Number(stasjoUser?.id || 0);
  expect(ontvangerId, 'de demo-medewerker hoort een user_id te hebben').toBeGreaterThan(0);

  const post = async (data: Record<string, unknown>) => {
    const token = await csrf(request);
    const r = await request.post('/server/api/announcements.php', { headers: { 'X-CSRF-Token': token }, data });
    return { status: r.status(), body: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  };
  const lijst = async () => ((await (await request.get('/server/api/announcements.php?limit=100')).json()).items || []) as Array<Record<string, unknown>>;

  const concept = await post({ action: 'save_draft', title: `Charter concept ${stempel}`, message: 'Nog niet verzenden.' });
  expect(concept.status, `concept opslaan: ${JSON.stringify(concept.body)}`).toBe(200);
  const conceptId = Number(concept.body.id || 0);
  expect((await lijst()).find((a) => Number(a.id) === conceptId)?.status, 'het concept hoort als draft te staan').toBe('draft');

  const verzonden = await post({
    action: 'send', title: `Charter mededeling ${stempel}`,
    message: `Exploratory bericht ${stempel}.`, recipient_user_ids: [ontvangerId], audience_label: '1 medewerker',
  });
  expect(verzonden.status, `verzenden: ${JSON.stringify(verzonden.body)}`).toBe(200);
  const verzondenId = Number(verzonden.body.id || 0);
  expect((await lijst()).find((a) => Number(a.id) === verzondenId)?.status).toBe('sent');
  await apiLogout(request);

  await test.step('De ontvanger ziet de mededeling in het eigen archief', async () => {
    await uiLogin(page, 'stasjo@example.invalid', creds.employee.password);
    await page.locator('button[data-view="employee-announcements"]:visible').first().click();
    await expect(page.locator('#view-employee-announcements')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-announcement-list')).toContainText(`Exploratory bericht ${stempel}`);
    await uiLogout(page);
  });

  await apiLogin(request, creds.admin.email, creds.admin.password);
  await test.step('Intrekken met reden bewaart de historie', async () => {
    const trek = await post({ action: 'withdraw', announcement_id: verzondenId, withdrawal_reason: `Charter rechtzetting ${stempel}` });
    expect(trek.status, `intrekken: ${JSON.stringify(trek.body)}`).toBe(200);
    expect((await lijst()).find((a) => Number(a.id) === verzondenId)?.status, 'de mededeling hoort ingetrokken te zijn').toBe('withdrawn');
  });

  await test.step('Een niet-verzonden concept kan worden verwijderd', async () => {
    const weg = await post({ action: 'delete_draft', announcement_id: conceptId });
    expect(weg.status, `concept verwijderen: ${JSON.stringify(weg.body)}`).toBe(200);
    expect((await lijst()).some((a) => Number(a.id) === conceptId), 'het concept hoort verdwenen te zijn').toBe(false);
  });
  await apiLogout(request);

  await test.step('Het instellingenscherm toont het volledige inhoudsmenu en alle primaire knoppen', async () => {
    await uiLogin(page, creds.admin.email, creds.admin.password);
    await page.locator('button[data-view="settings"]:visible').first().click();
    await expect(page.locator('#page-title')).toHaveText('Instellingen');
    await expect(page.locator('#save-settings')).toBeVisible();
    expect(await page.locator('#view-settings h3, #view-settings .email-template-heading').count(),
      'het instellingenscherm hoort meerdere secties te tonen').toBeGreaterThan(5);
    expect(await page.locator('#view-settings .reminder-choice-field').count(),
      'elke herinneringsregel hoort een keuzemenu te hebben').toBeGreaterThanOrEqual(5);

    await page.locator('button[data-view="announcements"]:visible').first().click();
    await expect(page.locator('#add-announcement')).toBeVisible();
    await page.locator('button[data-view="employees"]:visible').first().click();
    await expect(page.locator('#add-employee')).toBeVisible();
    await expect(page.locator('#add-admin')).toBeVisible();
    await uiLogout(page);
  });
});

// ===========================================================================
// TEST-E2E-22 — Herinneringen: planningslogica, server-wiring, veilige voorbeeldmelding
// ---------------------------------------------------------------------------
// Het daadwerkelijke, op de klok geplande afvuren vraagt een serverplanning die
// op TEST niet actief is ("Voorbereiding · niet automatisch"). Wat hier wél
// aantoonbaar is: (1) de samenvatting is een zuivere afleiding van de
// instellingen (beslissingstabel + grenswaarden), (2) de enige regel met een
// serverkolom -- de klanturenstaat-herinnering -- bereikt de server echt, en
// (3) "Voorbeeldmelding maken" heeft geen enkel neveneffect.
// ===========================================================================
test('[TEST-E2E-22] herinneringen: samenvatting volgt exact de instellingen, klanturenstaat-tijd bereikt de server, voorbeeld zonder neveneffect', async ({ page }) => {
  test.setTimeout(150_000);
  await uiLogin(page, creds.admin.email, creds.admin.password);
  await page.locator('button[data-view="settings"]:visible').first().click();
  await expect(page.locator('#page-title')).toHaveText('Instellingen');

  // De keuzemenu's worden verborgen en vervangen door een eigen widget; de
  // onderliggende <select>/<input> blijven de bron van waarheid. We zetten ze
  // rechtstreeks en vuren change, precies wat de widget ook doet.
  const stelIn = (config: Record<string, string | boolean>) => page.evaluate((cfg) => {
    for (const [id, waarde] of Object.entries(cfg)) {
      const el = document.querySelector<HTMLInputElement>('#' + id);
      if (!el) continue;
      if (el.type === 'checkbox') el.checked = Boolean(waarde);
      else el.value = String(waarde);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, config);
  const samenvatting = () => page.locator('#reminder-schedule-summary').innerText();

  const allesUit: Record<string, boolean> = {
    'setting-weekly-reminder-enabled': false, 'setting-month-end-reminder-enabled': false,
    'setting-overdue-reminder-enabled': false, 'setting-approval-reminder-enabled': false,
    'setting-customer-timesheet-reminder-enabled': false,
  };

  await test.step('Alles uit -> "Planning uit"', async () => {
    await stelIn(allesUit);
    const tekst = await samenvatting();
    expect(tekst).toContain('Planning uit');
    expect(tekst).toContain('Alle geplande herinneringen staan uit');
  });

  await test.step('Eén regel aan -> exacte zin en "1 regel"', async () => {
    await stelIn({ ...allesUit, 'setting-weekly-reminder-enabled': true, 'setting-weekly-reminder-day': 'friday', 'setting-weekly-reminder-time': '15:00' });
    const tekst = await samenvatting();
    expect(tekst).toContain('Week controleren · vrijdag om 15:00');
    expect(tekst).toMatch(/\b1 regel\b/);
  });

  await test.step('Twee regels aan -> tweede zin verschijnt en "2 regels"', async () => {
    await stelIn({ 'setting-month-end-reminder-enabled': true, 'setting-month-end-reminder-time': '16:00' });
    const tekst = await samenvatting();
    expect(tekst).toContain('Week controleren · vrijdag om 15:00');
    expect(tekst).toContain('Maand afsluiten · laatste werkdag om 16:00');
    expect(tekst).toMatch(/\b2 regels\b/);
  });

  await test.step('Grenswaarde dagkeuze: donderdag i.p.v. vrijdag', async () => {
    await stelIn({ 'setting-weekly-reminder-day': 'thursday' });
    expect(await samenvatting()).toContain('Week controleren · donderdag om 15:00');
  });

  await test.step('Klanturenstaat-regel: tijd en te-laat-drempel komen letterlijk terug', async () => {
    await stelIn({ 'setting-customer-timesheet-reminder-enabled': true, 'setting-customer-timesheet-reminder-time': '16:00', 'setting-customer-timesheet-overdue-days': '3' });
    const tekst = await samenvatting();
    expect(tekst).toContain('Klanturenstaat · 1 werkdag vooraf om 16:00');
    expect(tekst).toContain('na 3 werkdagen');
  });

  // --- Server-wiring: de klanturenstaat-tijd is de enige regel met een echte
  //     serverkolom; die moet na opslaan en herladen uit bootstrap terugkomen.
  const leesServerTijd = async () => {
    const boot = await (await page.request.get('/server/api/bootstrap.php')).json();
    return String((boot.companies as Array<Record<string, unknown>>)[0].customer_timesheet_reminder_time || '');
  };
  const origineel = (await leesServerTijd()).slice(0, 5) || '15:00';
  const doel = origineel === '12:00' ? '16:00' : '12:00';
  const opslaan = async () => {
    const r = page.waitForResponse((i) => i.url().includes('/server/api/settings.php') && i.request().method() === 'POST');
    await page.locator('#save-settings').click();
    expect((await r).status()).toBe(200);
    await expect(page.locator('#toast')).toContainText('Instellingen zijn op de server opgeslagen');
  };

  try {
    await test.step('De gewijzigde klanturenstaat-tijd bereikt de server en overleeft herladen', async () => {
      await stelIn({ 'setting-customer-timesheet-reminder-enabled': true, 'setting-customer-timesheet-reminder-time': doel });
      await opslaan();
      await page.reload();
      await page.locator('button[data-view="settings"]:visible').first().click();
      // De bootstrap-lezing kan vlak na de save nog de oude waarde teruggeven;
      // even kort herhalen tot de wijziging doorkomt.
      await expect(async () => {
        expect(await leesServerTijd(), 'bootstrap hoort de nieuwe tijd te melden').toContain(doel);
      }).toPass({ timeout: 15_000, intervals: [500, 1_000, 2_000] });
      await expect(page.locator('#setting-customer-timesheet-reminder-time')).toHaveValue(doel);
    });
  } finally {
    await stelIn({ 'setting-customer-timesheet-reminder-time': origineel });
    await opslaan().catch(() => undefined);
  }

  await test.step('"Voorbeeldmelding maken" zet geen mail klaar en meldt dat expliciet', async () => {
    const voor = await (await page.request.get('/server/api/email-queue.php?limit=100')).json();
    await page.locator('#test-reminder-schedule').click();
    await expect(page.locator('#toast')).toContainText('er is niets gepland of verstuurd');
    const na = await (await page.request.get('/server/api/email-queue.php?limit=100')).json();
    expect(Number(na.count ?? (na.items || []).length), 'een voorbeeldmelding mag de mailwachtrij niet laten groeien')
      .toBe(Number(voor.count ?? (voor.items || []).length));
  });
  await uiLogout(page);
});

// ===========================================================================
// TEST-E2E-23 — Nieuwe beheerder aanmaken, laten inloggen, en de kern-flow draaien
// ---------------------------------------------------------------------------
// Alle andere cases gebruiken de bestaande demo-beheerder. Deze bevestigt dat
// een vers aangemaakte administrator (via het beheer-pad) volledig kan werken:
// goedkeuren, factuur afronden tot de jsPDF-conceptfactuur, en de mailroutering.
// ===========================================================================
test('[TEST-E2E-23] verse beheerder: aanmaken, inloggen, goedkeuren en factuur afronden', async ({ page, request }) => {
  test.setTimeout(240_000);
  const admin = await createDemoAdmin(request, creds, 'TEST Verse beheerder');

  await test.step('De nieuwe beheerder logt zelf in en ziet de beheerschermen', async () => {
    await uiLogin(page, admin.email, admin.password);
    const ik = await (await page.request.get('/server/auth/me.php')).json();
    expect(String(ik.user.email)).toBe(admin.email);
    expect(String(ik.user.role), 'de nieuwe gebruiker hoort administrator te zijn').toBe('administrator');
    await expect(page.locator('button[data-view="approvals"]:visible').first()).toBeVisible();
    await expect(page.locator('button[data-view="employees"]:visible').first()).toBeVisible();
    await expect(page.locator('button[data-view="settings"]:visible').first()).toBeVisible();
    await uiLogout(page);
  });

  // Een demo-medewerker dient uren in die de nieuwe beheerder daarna verwerkt.
  await uiLogin(page, creds.employee.email, creds.employee.password);
  const { period, employeeId } = await guiSubmitHours(page);
  await uiLogout(page);

  await test.step('De nieuwe beheerder keurt goed en rondt de factuur af', async () => {
    await uiLogin(page, admin.email, admin.password);
    await guiApprove(page, employeeId);
    const ts = await (await page.request.get(
      `/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`)).json();
    const timesheetId = Number(ts.timesheet.id || 0);
    expect(timesheetId).toBeGreaterThan(0);

    await finaliseViaConceptUpload(page, employeeId, period, timesheetId);

    const facturen = await (await page.request.get(`/server/api/invoices.php?period=${period}`)).json();
    const factuur = ((facturen.invoices || facturen.items || []) as Array<Record<string, unknown>>)
      .find((i) => Number(i.timesheet_id) === timesheetId) as Record<string, unknown>;
    expect(factuur, 'de nieuwe beheerder hoort een factuur te hebben gemaakt').toBeTruthy();
    const invoiceId = Number(factuur.id);
    await assertConceptInvoicePdf(page, invoiceId);

    const queue = await (await page.request.get('/server/api/email-queue.php?limit=100')).json();
    const deliveries = ((queue.items || []) as Array<Record<string, unknown>>)
      .filter((d) => Number(d.invoice_id) === invoiceId);
    const kanaal = (k: string) => deliveries.filter((d) => String(d.channel) === k).length;
    expect(kanaal('broker'), 'brokerroute').toBe(1);
    expect(kanaal('accountant'), 'boekhoudingsroute').toBe(1);
    expect(kanaal('payroll'), 'salarisroute').toBe(1);
    await uiLogout(page);
  });
});

async function rawLogin(request: APIRequestContext, email: string, password: string): Promise<number> {
  const token = await csrf(request);
  const res = await request.post('/server/auth/login.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    data: { email, password },
  });
  return res.status();
}

// ===========================================================================
// TEST-E2E-24 - Toestandsovergang op het account: deactiveren en heractiveren
// ===========================================================================
test('[TEST-E2E-24] medewerker deactiveren blokkeert inloggen; data blijft; heractiveren herstelt toegang', async ({ request }) => {
  test.setTimeout(180_000);
  const emp = await createDemoEmployee(request, creds, { namePrefix: 'TEST Levenscyclus' });

  expect(await rawLogin(request, emp.email, emp.password), 'een verse medewerker hoort te kunnen inloggen').toBe(200);
  await apiLogout(request);

  await apiLogin(request, creds.admin.email, creds.admin.password);
  const boot = await (await request.get('/server/api/bootstrap.php')).json();
  const userId = Number((boot.users as Array<Record<string, unknown>>).find((u) => String(u.email) === emp.email)?.id || 0);
  expect(userId, 'de medewerker hoort een user-account te hebben').toBeGreaterThan(0);

  await test.step('Deactiveren -> inloggen geweigerd, maar nog zichtbaar voor beheer', async () => {
    const t = await csrf(request);
    const r = await request.post('/server/api/users.php', {
      headers: { 'X-CSRF-Token': t }, data: { action: 'deactivate', user_id: userId },
    });
    expect(r.ok(), `deactiveren hoort te slagen: ${await r.text()}`).toBe(true);
    await apiLogout(request);

    expect([401, 403], 'een gedeactiveerde medewerker mag niet meer inloggen')
      .toContain(await rawLogin(request, emp.email, emp.password));

    await apiLogin(request, creds.admin.email, creds.admin.password);
    const na = await (await request.get('/server/api/bootstrap.php')).json();
    const rec = (na.users as Array<Record<string, unknown>>).find((u) => String(u.email) === emp.email);
    expect(rec, 'de gedeactiveerde medewerker blijft in het beheer zichtbaar').toBeTruthy();
    expect(Boolean(rec?.active), 'en staat als inactief gemarkeerd').toBe(false);
  });

  await test.step('Heractiveren -> inloggen werkt weer', async () => {
    const t = await csrf(request);
    const r = await request.post('/server/api/users.php', {
      headers: { 'X-CSRF-Token': t }, data: { action: 'reactivate', user_id: userId },
    });
    expect(r.ok(), `heractiveren hoort te slagen: ${await r.text()}`).toBe(true);
    await apiLogout(request);
    expect(await rawLogin(request, emp.email, emp.password), 'na heractiveren hoort inloggen weer te werken').toBe(200);
    await apiLogout(request);
  });
});

// ===========================================================================
// TEST-E2E-27 - Beslissingstabel: goedgekeurde urenstaat heropenen
// ===========================================================================
test('[TEST-E2E-27] goedgekeurde urenstaat zonder factuur mag terug naar correctie; met factuur wordt heropenen geweigerd', async ({ page, request }) => {
  test.setTimeout(240_000);
  // Verse medewerker: dan is de urenstaat gegarandeerd nog niet gefactureerd
  // door een eerdere case in dit bestand.
  const emp = await createDemoEmployee(request, creds, { namePrefix: 'TEST Heropen' });
  await uiLogin(page, emp.email, emp.password);
  const { period, employeeId } = await guiSubmitHours(page);
  await uiLogout(page);

  await uiLogin(page, creds.admin.email, creds.admin.password);
  await apiApprove(page.request, period, employeeId);
  let ts = (await readTimesheet(page.request, period, employeeId)).timesheet;
  expect(String(ts?.status)).toBe('approved');

  await test.step('Goedgekeurd zonder factuur -> correctie toegestaan', async () => {
    const t = await csrf(page.request);
    const r = await page.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': t },
      data: {
        action: 'request_correction', period, employee_id: employeeId,
        expected_version: Number(ts?.version || 1), correction_message: 'Graag augustus nalopen.',
      },
    });
    expect(r.ok(), `correctie op goedgekeurd-zonder-factuur hoort te mogen: ${await r.text()}`).toBe(true);
    expect(String((await readTimesheet(page.request, period, employeeId)).timesheet?.status)).toBe('correction');
  });
  await uiLogout(page);

  await test.step('Medewerker herindient, beheerder keurt opnieuw goed en maakt de factuur', async () => {
    await uiLogin(page, emp.email, emp.password);
    await page.locator('button[data-view="timesheet"]:visible').first().click();
    const invoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
    await expect(invoer).toBeVisible();
    await invoer.fill('8');
    await invoer.press('Tab');
    const schrijf = page.waitForResponse((r) =>
      r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST');
    await page.locator('#submit-timesheet').click();
    await schrijf;
    await uiLogout(page);

    await uiLogin(page, creds.admin.email, creds.admin.password);
    await apiApprove(page.request, period, employeeId);
    ts = (await readTimesheet(page.request, period, employeeId)).timesheet;
    await finaliseViaConceptUpload(page, employeeId, period, Number(ts?.id));
    expect(String((await readTimesheet(page.request, period, employeeId)).timesheet?.status)).toBe('invoiced');
  });

  await test.step('Met factuur -> heropenen geweigerd, status ongewijzigd', async () => {
    const na = (await readTimesheet(page.request, period, employeeId)).timesheet;
    const t = await csrf(page.request);
    const r = await page.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': t },
      data: {
        action: 'request_correction', period, employee_id: employeeId,
        expected_version: Number(na?.version || 1), correction_message: 'Toch nog wijzigen.',
      },
    });
    expect([409, 422], `heropenen na facturatie hoort geweigerd te worden (kreeg ${r.status()})`).toContain(r.status());
    expect(String((await r.json().catch(() => ({}))).error || '')).toMatch(/invoiced|invalid-timesheet-transition/);
    expect(String((await readTimesheet(page.request, period, employeeId)).timesheet?.status),
      'de geweigerde heropening mag de status niet veranderen').toBe('invoiced');
  });
  await uiLogout(page);
});

// ===========================================================================
// TEST-E2E-30 - Invariant: factuurnummers zijn uniek, ook bij hetzelfde sjabloon
// ===========================================================================
test('[TEST-E2E-30] twee medewerkers met hetzelfde nummer-sjabloon in dezelfde periode krijgen elk een uniek nummer', async ({ page, request }) => {
  test.setTimeout(300_000);
  const stamp = Date.now().toString().slice(-6);
  const sjabloon = `UNIEK${stamp}-{jaar}-{maand}`;
  const a = await createDemoEmployee(request, creds, { namePrefix: 'TEST Nummer-A', invoiceTemplate: sjabloon });
  const b = await createDemoEmployee(request, creds, { namePrefix: 'TEST Nummer-B', invoiceTemplate: sjabloon });

  const nummers: string[] = [];
  for (const emp of [a, b]) {
    await uiLogin(page, emp.email, emp.password);
    const sub = await guiSubmitHours(page);
    await uiLogout(page);

    await uiLogin(page, creds.admin.email, creds.admin.password);
    await apiApprove(page.request, sub.period, sub.employeeId);
    const ts = (await readTimesheet(page.request, sub.period, sub.employeeId)).timesheet;
    expect(String(ts?.status), `${emp.name} hoort goedgekeurd te zijn voor het afronden`).toBe('approved');
    await finaliseViaConceptUpload(page, sub.employeeId, sub.period, Number(ts?.id));
    const facturen = await (await page.request.get(`/server/api/invoices.php?period=${sub.period}`)).json();
    const factuur = ((facturen.invoices || facturen.items || []) as Array<Record<string, unknown>>)
      .find((i) => Number(i.timesheet_id) === Number(ts?.id)) as Record<string, unknown>;
    expect(factuur, `medewerker ${emp.name} hoort een factuur te hebben`).toBeTruthy();
    nummers.push(String(factuur.invoice_number));
    await uiLogout(page);
  }

  const [n1, n2] = nummers;
  expect(n1, 'beide facturen hebben een nummer').not.toBe('');
  expect(n2).not.toBe('');
  expect(n1, 'de twee factuurnummers moeten verschillen ondanks hetzelfde sjabloon').not.toBe(n2);
  const metSuffix = new RegExp(`^UNIEK${stamp}-\\d{4}-[a-z]+-\\d+$`);
  const basis = new RegExp(`^UNIEK${stamp}-\\d{4}-[a-z]+$`);
  expect(nummers.every((n) => basis.test(n) || metSuffix.test(n)), 'beide nummers volgen het sjabloon').toBe(true);
  expect(nummers.some((n) => metSuffix.test(n)), 'het tweede nummer hoort een numerieke suffix te krijgen').toBe(true);
});

// ===========================================================================
// TEST-E2E-31 - Elke demo-medewerker levert een echte jsPDF-conceptfactuur
// ---------------------------------------------------------------------------
// E2E-04/17 ronden af voor stasjo, E2E-07/11/30 voor verse medewerkers. Marc en
// Brian werden nog niet via de volledige afrond-flow getest.
// ===========================================================================
test('[TEST-E2E-31] Marc en Brian: volledige afrond-flow levert de branded jsPDF-factuur', async ({ page }) => {
  test.setTimeout(300_000);
  const ECHT = /^[A-Za-z][A-Za-z-]*-\d{4}-(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)$/;
  for (const email of ['marc@example.invalid', 'brian@example.invalid']) {
    await uiLogin(page, email, creds.employee.password);
    const me = await (await page.request.get('/server/auth/me.php')).json();
    const boot = await (await page.request.get('/server/api/bootstrap.php')).json();
    const employeeId = Number((boot.employees as Array<Record<string, unknown>>)
      .find((e) => Number(e.user_id) === Number(me.user.id))?.id || 0);
    const { period } = await guiSubmitHours(page);
    await uiLogout(page);

    await uiLogin(page, creds.admin.email, creds.admin.password);
    await apiApprove(page.request, period, employeeId);
    const ts = (await readTimesheet(page.request, period, employeeId)).timesheet;
    await finaliseViaConceptUpload(page, employeeId, period, Number(ts?.id));

    const facturen = await (await page.request.get(`/server/api/invoices.php?period=${period}`)).json();
    const factuur = ((facturen.invoices || facturen.items || []) as Array<Record<string, unknown>>)
      .find((i) => Number(i.timesheet_id) === Number(ts?.id)) as Record<string, unknown>;
    expect(factuur, `${email} hoort een factuur te hebben`).toBeTruthy();
    expect(String(factuur.invoice_number), `${email}: factuurnummer volgt de per-opdracht nummering`).toMatch(ECHT);
    await assertConceptInvoicePdf(page, Number(factuur.id));
    await uiLogout(page);
  }
});
