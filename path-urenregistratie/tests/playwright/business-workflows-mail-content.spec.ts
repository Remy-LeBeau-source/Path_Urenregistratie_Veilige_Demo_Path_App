import { test, expect } from './fixtures/e2eIsolation';
import type { Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { LoginPage } from './pages/LoginPage';

const execFileAsync = promisify(execFile);

// Wat de ontvanger werkelijk leest.
//
// De suite bewees al dat er een mail klaarstaat, dat het onderwerp en de body
// niet leeg zijn, en dat de bijlage met %PDF- begint en met %%EOF eindigt. Wat
// nergens werd nagelopen: of er in die PDF ook de juiste bedragen, het juiste
// factuurnummer, de IBAN en de KvK/Btw-nummers staan -- en of er geen
// conceptwatermerk op de definitieve factuur is blijven staan. Een geldige maar
// verkeerd gevulde PDF kwam er zo ongemerkt doorheen; dat is precies wat een
// klant als eerste ziet.
//
// De PDF-tekst komt uit server/scripts/mail-delivery-inspect.php. De writer in
// server/lib/simple_pdf.php laat elke regel als een losse `(tekst) Tj` achter in
// een ongecomprimeerde stream, dus de tekst is zonder PDF-parser terug te lezen.

type Json = Record<string, unknown>;

type Inspectie = {
  ok: boolean;
  deliveries: Array<Record<string, string>>;
  invoice_number: string;
  attachment: { bestaat: boolean; bytes: number; is_pdf: boolean; pdf_text: string };
  pdf_text: string;
};

async function inspecteerFactuurmail(invoiceId: number): Promise<Inspectie> {
  const uitvoer = await execFileAsync('php', ['server/scripts/mail-delivery-inspect.php', String(invoiceId)], {
    cwd: process.cwd(),
    windowsHide: true,
  });
  return JSON.parse(uitvoer.stdout) as Inspectie;
}

/**
 * Leest de zichtbare tekst uit een PDF van server/lib/simple_pdf.php. Diezelfde
 * writer legt elke regel als een losse `(tekst) Tj` in een ongecomprimeerde
 * stream, dus de tekst is zonder PDF-parser terug te halen: haal de
 * string-operands eruit en draai de `\( \) \\`-escaping terug. De writer codeert
 * naar Windows-1252; alles wat deze test controleert (FACTUUR, IBAN, cijfers,
 * EUR, Btw, KvK) valt binnen ASCII, dus latin1 volstaat.
 */
function pdfTekst(bytes: Buffer): string {
  const ruw = bytes.toString('latin1');
  const regels: string[] = [];
  const patroon = /\(((?:\\.|[^\\()])*)\)\s*Tj/gs;
  let match: RegExpExecArray | null;
  while ((match = patroon.exec(ruw)) !== null) {
    regels.push(match[1].replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')'));
  }
  return regels.join('\n');
}

/** De letterlijke fragmenten van een sjabloon, dus zonder de {velden}. */
function sjabloonFragmenten(sjabloon: string): string[] {
  return sjabloon
    .split(/\{[a-zA-Z_]+\}/)
    .map(deel => deel.trim())
    .filter(deel => deel.length >= 5);
}

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

/** Zelfde opmaak als PHP number_format($n, 2, ',', '.'): 1.234,56 */
function nlBedrag(waarde: number): string {
  const [heel, deel] = waarde.toFixed(2).split('.');
  return `${heel.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${deel}`;
}

/** Zelfde als de PHP-kant: number_format gevolgd door rtrim('0') en rtrim(','). */
function btwLabel(percentage: number): string {
  return nlBedrag(percentage).replace(/0+$/, '').replace(/,$/, '');
}

/** Rijdt uren -> goedkeuren -> definitieve factuur via de GUI en geeft het factuur-ID terug. */
async function ketenTotFactuur(page: Page, loginPage: LoginPage): Promise<{ factuurId: number; periodeSleutel: string; medewerkerId: number }> {
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await page.locator('button[data-view="timesheet"]').click();
  await expect(page.locator('#timesheet-status')).toBeVisible();
  const periodeSleutel = periodeKey(String(await page.locator('#period-label').textContent() || '').trim());

  const ik = await (await page.request.get('/server/auth/me.php')).json() as Json;
  const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
  const medewerkerId = Number((bootstrap.employees as Json[]).find(
    item => Number(item.user_id) === Number((ik.user as Json).id))?.id || 0);
  expect(medewerkerId, 'de ingelogde medewerker hoort een profiel te hebben').toBeGreaterThan(0);

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
  expect(urenstaatId, 'de urenstaat hoort te bestaan').toBeGreaterThan(0);

  await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
  await loginPage.open();
  await loginPage.loginAsAdmin();

  if (String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status) === 'submitted') {
    await page.locator('button[data-view="approvals"]').click();
    const goedkeuren = page.locator(`[data-approve="${medewerkerId}"]`).first();
    await expect(goedkeuren).toBeVisible();
    const schrijf = page.waitForResponse(response =>
      response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
    await goedkeuren.click();
    await schrijf;
  }
  await expect(async () => {
    expect(String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status),
      'de urenstaat hoort goedgekeurd te zijn voor het factureren').toBe('approved');
  }).toPass({ timeout: 20_000, intervals: [250, 500, 1_000] });

  const vergrendel = await page.request.post('/server/api/invoices.php', {
    headers: { 'X-CSRF-Token': await csrf(page) },
    data: { action: 'lock', timesheet_id: urenstaatId },
  });
  expect(vergrendel.ok(), `definitief maken hoort te slagen: ${await vergrendel.text()}`).toBe(true);

  const facturen = await (await page.request.get(
    `/server/api/invoices.php?period=${periodeSleutel}`)).json() as Json;
  const factuurRij = ((facturen.invoices as Json[]) || (facturen.items as Json[]) || [])
    .find(item => Number(item.timesheet_id) === urenstaatId);
  const factuurId = Number(factuurRij?.id || 0);
  expect(factuurId, 'er hoort een definitieve factuur te zijn').toBeGreaterThan(0);
  return { factuurId, periodeSleutel, medewerkerId };
}

test('[E2E-H-026] de definitieve factuur-PDF bevat de juiste bedragen en identiteit en geen conceptwatermerk', async ({ page }) => {
  test.setTimeout(240_000);
  const loginPage = new LoginPage(page);

  const { factuurId, periodeSleutel } = await ketenTotFactuur(page, loginPage);

  // De bedragen zoals de server ze na het vergrendelen heeft vastgelegd.
  const facturen = await (await page.request.get(
    `/server/api/invoices.php?period=${periodeSleutel}`)).json() as Json;
  const factuur = ((facturen.invoices as Json[]) || (facturen.items as Json[]) || [])
    .find(item => Number(item.id) === factuurId) as Json;
  expect(factuur, 'de zojuist gemaakte factuur hoort terug te komen uit de API').toBeTruthy();

  const nummer = String(factuur.invoice_number);
  const subtotaal = Number(factuur.subtotal);
  const btwBedrag = Number(factuur.vat_amount);
  const totaal = Number(factuur.total);
  const btwPercentage = Number(factuur.vat_percentage);

  // De bedragen moeten intern kloppen, anders zegt de PDF-controle niets.
  expect(Math.round((subtotaal + btwBedrag) * 100) / 100,
    'subtotaal plus btw hoort het totaal te zijn').toBe(Math.round(totaal * 100) / 100);
  expect(Math.round(subtotaal * (btwPercentage / 100) * 100) / 100,
    'het btw-bedrag hoort het percentage van het subtotaal te zijn').toBe(Math.round(btwBedrag * 100) / 100);

  const bedrijf = ((await (await page.request.get('/server/api/bootstrap.php')).json() as Json)
    .companies as Json[])[0];
  const iban = String(bedrijf.iban || '').trim();
  const kvk = String(bedrijf.chamber_of_commerce_number || '').trim();
  const btwNummer = String(bedrijf.vat_number || '').trim();
  expect(iban.length, 'de vaste organisatie hoort een IBAN te hebben').toBeGreaterThan(0);

  // De factuur-PDF wordt bij het downloaden gegenereerd -- dat is ook het
  // document dat aan de echte mail hangt. Haal het daar op en lees de tekst.
  const download = await page.request.get(
    `/server/api/invoices.php?action=download&invoice_id=${factuurId}`);
  expect(download.status(), 'de factuurbijlage hoort op te halen te zijn').toBe(200);
  const bytes = Buffer.from(await download.body());
  expect(bytes.length, 'een echte factuur-PDF is niet een paar bytes').toBeGreaterThan(1_000);
  expect(bytes.subarray(0, 5).toString('latin1'), 'de bijlage hoort een echte PDF te zijn').toBe('%PDF-');

  const tekst = pdfTekst(bytes);
  expect(tekst.trim(), 'er hoort tekst uit de factuur-PDF te komen').not.toBe('');

  await test.step('Then staan factuurnummer, identiteit en betaalregel letterlijk in de PDF', async () => {
    expect(tekst, 'de PDF hoort de factuurkop met het API-factuurnummer te tonen').toContain(`FACTUUR ${nummer}`);
    expect(tekst, 'de IBAN hoort op de factuur te staan').toContain(`IBAN: ${iban}`);
    expect(tekst, 'KvK- en Btw-nummer horen samen op de factuur te staan')
      .toContain(`KvK: ${kvk} | Btw: ${btwNummer}`);
    expect(tekst, 'de betaalregel hoort naar IBAN en factuurnummer te verwijzen')
      .toContain(`onder vermelding van factuurnummer: ${nummer}`);
  });

  await test.step('And kloppen de bedragen op de factuur met de vastgelegde waarden', async () => {
    expect(tekst, 'het bedrag exclusief btw hoort te kloppen')
      .toContain(`Totaal exclusief: EUR ${nlBedrag(subtotaal)}`);
    expect(tekst, 'de btw-regel hoort percentage en bedrag te tonen')
      .toContain(`Btw (${btwLabel(btwPercentage)}%): EUR ${nlBedrag(btwBedrag)}`);
    expect(tekst, 'het bedrag inclusief btw hoort te kloppen')
      .toContain(`Totaal inclusief: EUR ${nlBedrag(totaal)}`);
  });

  await test.step('And staat er geen conceptwatermerk op de definitieve factuur', async () => {
    // Het conceptvoorbeeld heeft een watermerk; de definitieve factuur mag dat
    // nooit hebben. De klant zou anders een factuur met "CONCEPT" erop krijgen.
    expect(tekst, 'de definitieve factuur mag geen conceptaanduiding bevatten')
      .not.toMatch(/concept|kladversie|voorbeeld|watermerk|draft/i);
  });
});

test('[E2E-H-027] elk kanaal krijgt de standaardtekst van de server en geen enkele mail verlaat de machine', async ({ page }) => {
  test.setTimeout(240_000);
  const loginPage = new LoginPage(page);

  // De standaardteksten die de server zelf meestuurt. De vergelijking gaat hier
  // tegenaan, niet tegen een tweede kopie in deze test -- een afwijkende kopie
  // zou anders pas in het postvak van de klant opvallen.
  await loginPage.open();
  const bootstrapBinnen = page.waitForResponse(item =>
    item.url().includes('/server/api/bootstrap.php'), { timeout: 20_000 });
  await loginPage.loginAsAdmin();
  const payload = await (await bootstrapBinnen).json() as Json;
  const standaarden = payload.mail_channel_defaults as Record<string, { subject: string; body: string }>;
  expect(standaarden, 'de server hoort de standaardteksten mee te sturen').toBeTruthy();

  await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
  const { factuurId } = await ketenTotFactuur(page, loginPage);
  const inspectie = await inspecteerFactuurmail(factuurId);
  expect(inspectie.deliveries.length, 'een afgeronde factuur hoort berichten klaar te zetten').toBeGreaterThan(0);

  await test.step('Then draagt geen enkele delivery een onvervangen veld of lege tekst', async () => {
    for (const mail of inspectie.deliveries) {
      for (const veld of ['subject_snapshot', 'body_snapshot'] as const) {
        const inhoud = String(mail[veld] || '');
        expect(inhoud, `${mail.channel}: ${veld} mag geen onvervangen {veld} bevatten`).not.toMatch(/\{[a-zA-Z_]+\}/);
        expect(inhoud.trim(), `${mail.channel}: ${veld} mag niet leeg zijn`).not.toBe('');
      }
    }
  });

  await test.step('And dragen boekhouding en salaris exact de standaardtekst van de server', async () => {
    // Alleen deze twee kanalen slaan de opdrachttekst over en vallen dus altijd
    // op de meegeleverde tekst terug (zie server/mail/templates.php). De broker
    // gebruikt bij de demo-seed een opdrachtgebonden tekst; dat pad is al gedekt
    // door E2E-H-024. Hier gaat het erom dat wie niets aanpast, meeloopt met de
    // meegeleverde tekst -- en niet met een tweede, verouderende kopie.
    for (const kanaal of ['accountant', 'payroll'] as const) {
      const standaard = standaarden[kanaal];
      if (!standaard) continue;
      const regels = inspectie.deliveries.filter(mail => String(mail.channel) === kanaal);
      expect(regels.length, `kanaal ${kanaal} hoort precies één bericht te hebben`).toBe(1);
      // De standaardtekst zit vol {velden} die in de snapshot al zijn ingevuld,
      // dus letterlijke gelijkheid kan niet. In plaats daarvan: elk vast
      // tekstfragment tussen de velden hoort ongewijzigd in de mail te staan.
      const body = String(regels[0].body_snapshot);
      const subject = String(regels[0].subject_snapshot);
      for (const fragment of sjabloonFragmenten(standaard.body)) {
        expect(body, `kanaal ${kanaal}: de standaardtekst "${fragment}" hoort in de body te staan`)
          .toContain(fragment);
      }
      for (const fragment of sjabloonFragmenten(standaard.subject)) {
        expect(subject, `kanaal ${kanaal}: het standaard onderwerp "${fragment}" hoort erin te staan`)
          .toContain(fragment);
      }
    }
  });

  await test.step('And is elke delivery als dry-run vastgelegd: lokaal verlaat geen mail de machine', async () => {
    for (const mail of inspectie.deliveries) {
      expect(Number(mail.dry_run),
        `${mail.channel}: een lokale delivery hoort dry_run = 1 te zijn`).toBe(1);
    }
  });

  await test.step('And krijgt de salarisadministratie categorisch geen factuur mee', async () => {
    for (const mail of inspectie.deliveries.filter(item => String(item.channel) === 'payroll')) {
      expect(String(mail.attachment_policy || 'none'),
        'de salarisadministratie hoort nooit een bijlage te krijgen').toBe('none');
    }
  });
});
