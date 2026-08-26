import { test, expect } from './fixtures/e2eIsolation';
import type { Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { LoginPage } from './pages/LoginPage';

// Wie mag een document ophalen, en wat verraadt een weigering?
//
// Een factuur-PDF bevat tarieven, uren en NAW-gegevens. De link ernaartoe is een
// gewone URL, dus de enige echte bescherming is de server. Deze case probeert die
// link op alle manieren die een nieuwsgierige of kwaadwillende zou proberen: zonder
// sessie, als een medewerker die er niet bij hoort, en met een URL waar iets aan is
// gesleuteld.
//
// Het tweede deel is minstens zo belangrijk en wordt vaak vergeten: een weigering
// mag niets prijsgeven. Een foutmelding met een opslagpad erin vertelt precies waar
// de bestanden staan.

type Json = Record<string, unknown>;

// Sporen van de binnenkant die nooit in een antwoord horen te staan.
const VERRAADT_DE_BINNENKANT = [
  'SQLSTATE', 'PDOException', 'Stack trace', 'Fatal error',
  'C:\\', '/var/', '/tmp/', 'storage', 'private', '.pdf.', 'pdf_storage_key',
];

async function csrf(page: Page): Promise<string> {
  const body = await (await page.request.get('/server/auth/csrf.php')).json() as Json;
  return String(body.csrf_token || '');
}

async function leesUrenstaat(page: Page, periode: string, medewerkerId: number): Promise<Json> {
  const response = await page.request.get(
    `/server/api/timesheets.php?period=${periode}&employee_id=${medewerkerId}`);
  return (await response.json() as Json).timesheet as Json;
}

function periodeKey(label: string): string {
  const maanden = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const delen = label.toLowerCase().split(/\s+/);
  return `${delen[1]}-${String(maanden.indexOf(delen[0]) + 1).padStart(2, '0')}`;
}

test('[E2E-N-018] documentlinks accepteren geen ongeautoriseerde gebruiker, clientpad of vrije bestandsnaam', async ({ page }) => {
  test.setTimeout(210_000);

  const loginPage = new LoginPage(page);
  let periodeSleutel = '';
  let medewerkerId = 0;
  let factuurId = 0;
  let hashVooraf = '';

  async function verwachtGeweigerd(url: string, uitleg: string): Promise<void> {
    const response = await page.request.get(url);
    expect(response.status(), `${uitleg} hoort geweigerd te worden`).not.toBe(200);
    expect(response.status(), `${uitleg} mag geen serverfout veroorzaken`).toBeLessThan(500);

    // Een weigering mag niet vertellen hoe de binnenkant eruitziet.
    const tekst = (await response.text()).slice(0, 4_000);
    for (const spoor of VERRAADT_DE_BINNENKANT) {
      expect(tekst.toLowerCase(),
        `${uitleg}: de weigering mag ${spoor} niet prijsgeven`).not.toContain(spoor.toLowerCase());
    }

    // En zeker geen PDF meegeven onder een foutstatus.
    expect(tekst.slice(0, 5), `${uitleg} mag geen PDF teruggeven`).not.toBe('%PDF-');
  }

  await test.step('Given een geldige factuurbijlage voor Backoffice bestaat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('button[data-view="timesheet"]').click();
    await expect(page.locator('#timesheet-status')).toBeVisible();
    periodeSleutel = periodeKey(String(await page.locator('#period-label').textContent() || '').trim());

    const ik = await (await page.request.get('/server/auth/me.php')).json() as Json;
    const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
    medewerkerId = Number((bootstrap.employees as Json[]).find(
      item => Number(item.user_id) === Number((ik.user as Json).id))?.id || 0);
    expect(medewerkerId).toBeGreaterThan(0);

    const invoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
    if (await invoer.count()) {
      await invoer.fill('8');
      await invoer.press('Tab');
      const schrijf = page.waitForResponse(response =>
        response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
      await page.locator('#submit-timesheet').click();
      await schrijf;
    }
    const urenstaatId = Number((await leesUrenstaat(page, periodeSleutel, medewerkerId)).id || 0);

    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();

    const statusVoorGoedkeuren = String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status);
    if (statusVoorGoedkeuren === 'submitted') {
      await page.locator('button[data-view="approvals"]').click();
      const goedkeuren = page.locator(`[data-approve="${medewerkerId}"]`).first();
      await expect(goedkeuren).toBeVisible();
      const schrijf = page.waitForResponse(response =>
        response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
      await goedkeuren.click();
      await schrijf;
    }

    // Deze regel ontbrak en dat kostte een omweg: de goedkeuring stond achter een
    // if, en als de status iets anders was gebeurde er stil niets. De case viel dan
    // pas veel later om, bij het vergrendelen, met een melding die niets zei over de
    // werkelijke oorzaak. Een voorwaarde die je nodig hebt, hoor je hard te maken.
    const statusNaGoedkeuren = String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status);
    expect(statusNaGoedkeuren,
      `de urenstaat hoort goedgekeurd te zijn voor het factureren (was vooraf ${statusVoorGoedkeuren})`)
      .toBe('approved');

    const vergrendel = await page.request.post('/server/api/invoices.php', {
      headers: { 'X-CSRF-Token': await csrf(page) },
      data: { action: 'lock', timesheet_id: urenstaatId },
    });
    expect(vergrendel.ok(), `definitief maken hoort te slagen: ${await vergrendel.text()}`).toBe(true);

    const facturen = await (await page.request.get(
      `/server/api/invoices.php?period=${periodeSleutel}`)).json() as Json;
    const lijst = (facturen.invoices as Json[]) || (facturen.items as Json[]) || [];
    factuurId = Number(lijst.find(item => Number(item.timesheet_id) === urenstaatId)?.id || 0);
    expect(factuurId, 'er hoort een factuur met bijlage te zijn').toBeGreaterThan(0);

    const origineel = await page.request.get(
      `/server/api/invoices.php?action=download&invoice_id=${factuurId}`);
    expect(origineel.status(), 'Backoffice hoort de bijlage gewoon te kunnen openen').toBe(200);
    hashVooraf = createHash('sha256').update(await origineel.body()).digest('hex');
  });

  await test.step('When een uitgelogde browser dezelfde documentroute probeert', async () => {
    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await verwachtGeweigerd(
      `/server/api/invoices.php?action=download&invoice_id=${factuurId}`,
      'zonder sessie');
    await verwachtGeweigerd(
      `/server/api/customer-timesheets.php?action=download&period=${periodeSleutel}&employee_id=${medewerkerId}&assignment_id=1`,
      'de klanturenstaat zonder sessie');
  });

  await test.step('And kan geen clientpad of vrije bestandsnaam worden afgedwongen', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();

    // Alles wat je in zo'n parameter zou proppen om buiten de map te komen of om
    // een ander bestand te laten uitleveren.
    const gesleuteld = [
      '../../../../etc/passwd',
      '..%2F..%2Fconfig.local.php',
      'C:\\Windows\\win.ini',
      '1 OR 1=1',
      '0',
      '-1',
      '99999999',
      '1.pdf',
      '',
    ];
    for (const waarde of gesleuteld) {
      await verwachtGeweigerd(
        `/server/api/invoices.php?action=download&invoice_id=${encodeURIComponent(waarde)}`,
        `invoice_id=${JSON.stringify(waarde)}`);
    }
  });

  await test.step('And kan een medewerker niet bij de factuur van een ander', async () => {
    // De medewerker mag zijn eigen factuur wel. Het gaat erom dat de server op de
    // eigenaar controleert en niet alleen op "je bent ingelogd".
    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsEmployee();

    const ik = await (await page.request.get('/server/auth/me.php')).json() as Json;
    const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
    const eigenId = Number((bootstrap.employees as Json[]).find(
      item => Number(item.user_id) === Number((ik.user as Json).id))?.id || 0);

    const anderePeriodes = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
    for (const periode of anderePeriodes) {
      const response = await page.request.get(
        `/server/api/customer-timesheets.php?action=download&period=${periode}&employee_id=${eigenId + 1}&assignment_id=1`);
      expect(response.status(),
        `een medewerker mag niet bij de klanturenstaat van medewerker ${eigenId + 1} in ${periode}`)
        .not.toBe(200);
    }
  });

  await test.step('Then zijn de originele bytes en het opslagbestand ongewijzigd', async () => {
    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();

    const opnieuw = await page.request.get(
      `/server/api/invoices.php?action=download&invoice_id=${factuurId}`);
    expect(opnieuw.status(), 'na alle pogingen hoort de bijlage nog gewoon te werken').toBe(200);
    const hashNa = createHash('sha256').update(await opnieuw.body()).digest('hex');
    expect(hashNa, 'geen enkele geweigerde poging mag het document hebben aangeraakt').toBe(hashVooraf);
  });
});
