import { test, expect } from './fixtures/e2eIsolation';
import type { APIResponse, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

// De sloten op de urenstaat, per status, aan beide kanten gemeten.
//
// Het Functioneel Ontwerp is hier ondubbelzinnig: zodra een urenstaat is ingediend
// ligt hij bij Backoffice, en de medewerker komt er niet meer bij. Dat geldt voor
// ingediend, goedgekeurd en gefactureerd. Het scherm doet dat netjes -- de velden
// gaan op slot -- maar een slot dat alleen in de browser zit is geen slot. Deze
// case probeert per status een echte schrijfpoging met een geldige CSRF en een
// gewone, geldige inhoud, zodat een weigering niet per ongeluk uit een
// invoercontrole komt in plaats van uit het slot zelf. Een assertie die om de
// verkeerde reden slaagt, is erger dan geen assertie: hij geeft rust die er niet is.

type Json = Record<string, unknown>;

const GELDIGE_STATUSSEN = ['submitted', 'approved', 'invoiced'] as const;

async function csrf(page: Page): Promise<string> {
  const body = await (await page.request.get('/server/auth/csrf.php')).json() as Json;
  return String(body.csrf_token || '');
}

async function leesUrenstaat(page: Page, periode: string, medewerkerId: number): Promise<Json> {
  const response = await page.request.get(
    `/server/api/timesheets.php?period=${periode}&employee_id=${medewerkerId}`);
  return (await response.json() as Json).timesheet as Json;
}

// De periodeknop toont "Augustus 2026"; de API wil 2026-08.
function periodeKey(label: string): string {
  const maanden = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const delen = label.toLowerCase().split(/\s+/);
  return `${delen[1]}-${String(maanden.indexOf(delen[0]) + 1).padStart(2, '0')}`;
}

test('[E2E-N-017] submitted, approved en invoiced blokkeren iedere verboden medewerkerwrite', async ({ page }) => {
  test.setTimeout(210_000);

  const loginPage = new LoginPage(page);
  let periode = '';
  let periodeSleutel = '';
  let medewerkerId = 0;
  let urenstaatId = 0;

  // Per status wat de server antwoordde, zodat de laatste stap kan bewijzen dat
  // geen enkele poging iets heeft achtergelaten.
  const weigeringen: Array<{ status: string; httpStatus: number; error: string }> = [];

  async function verbodenWrite(verwachteVersie: number): Promise<APIResponse> {
    // Bewust een doodgewone, geldige invoer: acht uur op de eerste van de maand,
    // met de juiste versie. Wordt dit geweigerd, dan komt dat door het slot en
    // niet doordat de inhoud niet deugde.
    //
    // De veldnamen zijn exact die van buildTimesheetWritePayload() in app.js --
    // snake_case, niet camelCase. Dat is geen muggenzifterij: met camelCase
    // antwoordt de server 400 invalid-payload, en dan lijkt de write geweigerd
    // terwijl het slot nooit is aangeraakt. Deze case is eerst precies zo groen
    // geweest, om de verkeerde reden.
    return page.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': await csrf(page) },
      data: {
        action: 'save_draft',
        period: periodeSleutel,
        employee_id: medewerkerId,
        contractual_hours: 160,
        billable_hours: 8,
        leave_hours: 0,
        sickness_hours: 0,
        day_entries: [{ work_date: `${periodeSleutel}-01`, hours: 8, description: 'Webapp daginvoer' }],
        expected_version: verwachteVersie,
      },
    });
  }

  async function controleerSlot(status: string): Promise<void> {
    const voor = await leesUrenstaat(page, periodeSleutel, medewerkerId);
    expect(String(voor.status), `de voorwaarde voor deze stap is status ${status}`).toBe(status);
    const versieVoor = Number(voor.version || 0);

    // Het scherm: geen invulbaar veld, geen actieve indienknop.
    await page.locator('button[data-view="timesheet"]').click();
    await expect(page.locator('#hours-grid .hours-input:not([disabled])'),
      `bij ${status} hoort geen enkel uurveld invulbaar te zijn`).toHaveCount(0);
    const indienen = page.locator('#submit-timesheet');
    if (await indienen.count()) {
      const bedienbaar = await indienen.isVisible() && await indienen.isEnabled();
      expect(bedienbaar, `bij ${status} hoort indienen niet bedienbaar te zijn`).toBe(false);
    }

    // De server: dezelfde regel, maar dan echt.
    const poging = await verbodenWrite(versieVoor);
    expect(poging.ok(),
      `bij ${status} hoort de server een medewerkerwrite te weigeren, niet alleen het scherm`)
      .toBe(false);
    const body = await poging.json() as Json;
    expect(body.ok).toBe(false);

    // Niet "een weigering", maar de júiste weigering. Een 400 invalid-payload zou
    // hier ook groen ogen terwijl het slot nooit is aangeraakt -- precies de val
    // waar deze case eerst in liep.
    expect(String(body.error), `bij ${status} hoort het slot te weigeren, niet de invoercontrole`)
      .toBe('timesheet-locked');
    expect(poging.status(), `bij ${status} hoort een 409-conflict`).toBe(409);
    weigeringen.push({ status, httpStatus: poging.status(), error: String(body.error || '') });

    // En de invarianten: er is niets verschoven door de poging.
    const na = await leesUrenstaat(page, periodeSleutel, medewerkerId);
    expect(String(na.status), `een geweigerde write mag de status bij ${status} niet verzetten`).toBe(status);
    expect(Number(na.version), `een geweigerde write mag de versie bij ${status} niet ophogen`).toBe(versieVoor);
  }

  await test.step('Given een medewerker zijn urenstaat indient', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('button[data-view="timesheet"]').click();
    await expect(page.locator('#timesheet-status')).toBeVisible();

    periode = String(await page.locator('#period-label').textContent() || '').trim();
    periodeSleutel = periodeKey(periode);

    const ik = await (await page.request.get('/server/auth/me.php')).json() as Json;
    const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
    medewerkerId = Number((bootstrap.employees as Json[]).find(
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
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');

    const urenstaat = await leesUrenstaat(page, periodeSleutel, medewerkerId);
    urenstaatId = Number(urenstaat.id || 0);
    expect(urenstaatId, 'de urenstaat hoort een id te hebben').toBeGreaterThan(0);
  });

  await test.step('Then blokkeert submitted iedere medewerkerwrite', async () => {
    await controleerSlot('submitted');
  });

  await test.step('When Backoffice goedkeurt, blokkeert approved die write opnieuw', async () => {
    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();

    await page.locator('button[data-view="approvals"]').click();
    const goedkeuren = page.locator(`[data-approve="${medewerkerId}"]`).first();
    await expect(goedkeuren, 'de ingediende urenstaat hoort als controle te staan').toBeVisible();
    const schrijf = page.waitForResponse(response =>
      response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
    await goedkeuren.click();
    await schrijf;
    expect(String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status)).toBe('approved');

    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await controleerSlot('approved');
  });

  await test.step('When Backoffice de factuur vergrendelt, blokkeert invoiced die write ook', async () => {
    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();

    const vergrendel = await page.request.post('/server/api/invoices.php', {
      headers: { 'X-CSRF-Token': await csrf(page) },
      data: { action: 'lock', timesheet_id: urenstaatId },
    });
    expect(vergrendel.ok(),
      `definitief maken hoort te slagen: ${await vergrendel.text()}`).toBe(true);
    expect(String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status)).toBe('invoiced');

    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await controleerSlot('invoiced');
  });

  await test.step('And is elke status werkelijk beproefd en heeft geen poging iets achtergelaten', async () => {
    // Zonder deze stap zou een lus die stilletjes niets deed, groen kunnen zijn.
    expect(weigeringen.map(item => item.status),
      'alle drie de vergrendelde statussen horen beproefd te zijn')
      .toEqual([...GELDIGE_STATUSSEN]);
    for (const weigering of weigeringen) {
      expect(weigering.httpStatus,
        `${weigering.status} hoort met een cliëntfout te weigeren, niet met een serverfout`)
        .toBeGreaterThanOrEqual(400);
      expect(weigering.httpStatus,
        `${weigering.status} mag geen 5xx opleveren`).toBeLessThan(500);
    }

    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();

    const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
    const facturen = ((bootstrap.invoices as Json[]) || [])
      .filter(item => Number(item.employee_id) === medewerkerId);
    expect(facturen.length,
      'de geweigerde pogingen mogen geen extra factuur hebben opgeleverd').toBeLessThanOrEqual(1);

    const eindstand = await leesUrenstaat(page, periodeSleutel, medewerkerId);
    expect(String(eindstand.status),
      'na alle pogingen hoort de urenstaat nog steeds gefactureerd te zijn').toBe('invoiced');
  });
});
