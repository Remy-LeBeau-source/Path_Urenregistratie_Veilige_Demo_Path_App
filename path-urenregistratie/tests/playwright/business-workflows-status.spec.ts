import { test, expect } from './fixtures/e2eIsolation';
import { LoginPage } from './pages/LoginPage';

// De urenstaat-statusketen uit het Functioneel Ontwerp, hoofdstuk 5, gestuurd via
// het echte scherm.
//
// Die tabel zegt precies welke overgang mag en wie er daarna eigenaar is. Wat er
// niet in staat is minstens zo belangrijk: een goedgekeurde of gefactureerde
// urenstaat mag de medewerker niet meer wijzigen. Een keten die alleen de gelukkige
// route aflegt, bewijst niet dat de sloten werken -- en juist een slot dat niet
// sluit merk je pas als er al iets is verstuurd.

type Json = Record<string, unknown>;

async function openView(page: import('@playwright/test').Page, view: string) {
  await page.locator(`button[data-view="${view}"]`).click();
}

async function leesUrenstaat(page: import('@playwright/test').Page, periode: string, medewerkerId: number) {
  const response = await page.request.get(`/server/api/timesheets.php?period=${periode}&employee_id=${medewerkerId}`);
  return await response.json() as Json;
}

test('[E2E-H-017] de volledige toegestane urenstatusketen bewaakt na iedere write status, eigenaar en taak', async ({ page }) => {
  test.setTimeout(150_000);

  const loginPage = new LoginPage(page);
  let periode = '';
  let medewerkerId = 0;
  let versieBijIndienen = 0;

  await test.step('Given een medewerker met een openstaande urenstaat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);

    await openView(page, 'timesheet');
    await expect(page.locator('#timesheet-status')).toBeVisible();

    const ik = await (await page.request.get('/server/auth/me.php')).json() as Json;
    const gebruiker = ik.user as Json;
    const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
    const mij = (bootstrap.employees as Json[]).find(item => Number(item.user_id) === Number(gebruiker.id));
    medewerkerId = Number(mij?.id || 0);
    expect(medewerkerId, 'de ingelogde medewerker hoort een profiel te hebben').toBeGreaterThan(0);
    periode = String((await page.locator('#period-label').textContent() || '')).trim();
    expect(periode, 'er hoort een periode in beeld te staan').not.toBe('');
  });

  await test.step('When de medewerker zijn uren indient', async () => {
    // Eerst een uur invullen, anders is er niets om in te dienen.
    const eersteInvoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
    await expect(eersteInvoer, 'een openstaande urenstaat hoort invulbaar te zijn').toBeVisible();
    await eersteInvoer.fill('8');
    await eersteInvoer.press('Tab');

    const schrijf = page.waitForResponse(response =>
      response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
    await page.locator('#submit-timesheet').click();
    await schrijf;
    await expect(page.locator('#timesheet-status'), 'na indienen hoort de status te wisselen').toHaveText('Ingediend');
  });

  await test.step('Then staat de urenstaat op ingediend en is Backoffice eigenaar', async () => {
    const staat = await leesUrenstaat(page, periodeKey(periode), medewerkerId);
    const urenstaat = staat.timesheet as Json;
    expect(staat.found, 'de urenstaat hoort te bestaan').toBe(true);
    expect(String(urenstaat.status), 'de server hoort ingediend te melden, niet alleen het scherm').toBe('submitted');
    versieBijIndienen = Number(urenstaat.version || 0);
    expect(versieBijIndienen, 'een write hoort de versie op te hogen').toBeGreaterThan(0);

    // De invoervelden horen op slot te zitten zodra Backoffice eigenaar is.
    await expect(page.locator('#hours-grid .hours-input:not([disabled])'),
      'een ingediende urenstaat hoort niet meer invulbaar te zijn').toHaveCount(0);
  });

  await test.step('And weigert de server iedere wijziging door de medewerker', async () => {
    // Dit is de regel die het Functioneel Ontwerp expliciet noemt en die je nergens
    // ziet: het scherm zit op slot, maar de server moet het ook weigeren. Een slot
    // dat alleen in de browser zit, is geen slot.
    const csrf = await (await page.request.get('/server/auth/csrf.php')).json() as Json;
    const poging = await page.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') },
      data: {
        // Exact de veldnamen die de app zelf gebruikt (snake_case). Met camelCase
        // antwoordt de server 400 invalid-payload en lijkt de write geweigerd
        // terwijl het slot nooit is aangeraakt -- deze assertie stond hier eerst
        // groen om precies die verkeerde reden.
        action: 'save_draft',
        period: periodeKey(periode),
        employee_id: medewerkerId,
        contractual_hours: 160,
        billable_hours: 8,
        leave_hours: 0,
        sickness_hours: 0,
        day_entries: [{ work_date: `${periodeKey(periode)}-01`, hours: 8, description: 'Webapp daginvoer' }],
        expected_version: versieBijIndienen,
      },
    });
    expect(poging.ok(), 'een ingediende urenstaat mag de medewerker niet meer wijzigen').toBe(false);
    const weigering = await poging.json() as Json;
    expect(String(weigering.error), 'de weigering hoort uit het slot te komen, niet uit de invoercontrole')
      .toBe('timesheet-locked');
    expect(poging.status(), 'een vergrendelde urenstaat hoort 409 te geven').toBe(409);

    const na = await leesUrenstaat(page, periodeKey(periode), medewerkerId);
    const urenstaatNa = na.timesheet as Json;
    expect(String(urenstaatNa.status), 'de status hoort onveranderd te blijven').toBe('submitted');
    expect(Number(urenstaatNa.version), 'een geweigerde poging mag de versie niet ophogen').toBe(versieBijIndienen);
  });

  await test.step('And keurt Backoffice goed, waarna de medewerker nog steeds niets kan wijzigen', async () => {
    await page.request.post('/server/auth/logout.php', {
      headers: { 'X-CSRF-Token': String(((await (await page.request.get('/server/auth/csrf.php')).json()) as Json).csrf_token || '') },
    });
    await loginPage.open();
    await loginPage.loginAsAdmin();

    await openView(page, 'approvals');
    const rij = page.locator(`[data-approve="${medewerkerId}"]`).first();
    await expect(rij, 'de ingediende urenstaat hoort als goed te keuren werk te staan').toBeVisible();

    const goedkeuring = page.waitForResponse(response =>
      response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
    await rij.click();
    await goedkeuring;

    const na = await leesUrenstaat(page, periodeKey(periode), medewerkerId);
    const urenstaatNa = na.timesheet as Json;
    expect(String(urenstaatNa.status), 'goedkeuren hoort de status te verzetten').toBe('approved');
    expect(Number(urenstaatNa.version), 'goedkeuren is een write en hoort de versie op te hogen')
      .toBeGreaterThan(versieBijIndienen);
  });
});

// De periodeknop toont "Augustus 2026"; de API wil 2026-08.
function periodeKey(label: string): string {
  const maanden = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const delen = label.toLowerCase().split(/\s+/);
  const maand = maanden.indexOf(delen[0]) + 1;
  const jaar = delen[1];
  return `${jaar}-${String(maand).padStart(2, '0')}`;
}
