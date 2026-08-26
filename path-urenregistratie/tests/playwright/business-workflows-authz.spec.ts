import { test, expect } from './fixtures/e2eIsolation';
import type { Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

// Autorisatie, gemeten aan twee kanten tegelijk.
//
// Een rolcontrole die alleen knoppen verbergt is geen rolcontrole. Het scherm is
// de beleefde helft; de server is de echte. Deze case eist ze allebei, en eist er
// daarna een derde ding bij dat makkelijk wordt vergeten: dat een geweigerde
// poging werkelijk niets heeft achtergelaten. Een 403 die onderweg toch al een
// factuurregel of een auditsucces heeft weggeschreven, is nog steeds een lek.

type Json = Record<string, unknown>;

// Woorden die in geen enkele foutmelding voor een eindgebruiker thuishoren. Een
// tabelnaam of pad in een 403 vertelt een aanvaller hoe de binnenkant eruitziet.
const TECHNISCHE_LEKWOORDEN = [
  'SQLSTATE', 'SELECT ', 'INSERT ', 'UPDATE ', 'PDOException', 'Fatal error',
  'Stack trace', '/server/', '.php:', 'mysql',
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

// De periodeknop toont "Augustus 2026"; de API wil 2026-08.
function periodeKey(label: string): string {
  const maanden = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const delen = label.toLowerCase().split(/\s+/);
  return `${delen[1]}-${String(maanden.indexOf(delen[0]) + 1).padStart(2, '0')}`;
}

test('[E2E-N-020] een medewerker kan de Backoffice-keten niet uitvoeren en een weigering verandert niets', async ({ page }) => {
  test.setTimeout(150_000);

  const loginPage = new LoginPage(page);
  let periode = '';
  let medewerkerId = 0;
  let versieVooraf = 0;

  await test.step('Given een ingediende urenstaat als controle bij Backoffice staat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);

    await page.locator('button[data-view="timesheet"]').click();
    await expect(page.locator('#timesheet-status')).toBeVisible();
    periode = String(await page.locator('#period-label').textContent() || '').trim();
    expect(periode, 'er hoort een periode in beeld te staan').not.toBe('');

    const ik = await (await page.request.get('/server/auth/me.php')).json() as Json;
    const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
    const mij = (bootstrap.employees as Json[]).find(
      item => Number(item.user_id) === Number((ik.user as Json).id));
    medewerkerId = Number(mij?.id || 0);
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
    await expect(page.locator('#timesheet-status'),
      'de controle hoort bij Backoffice te liggen').toHaveText('Ingediend');

    const urenstaat = await leesUrenstaat(page, periodeKey(periode), medewerkerId);
    versieVooraf = Number(urenstaat.version || 0);
    expect(String(urenstaat.status)).toBe('submitted');
  });

  await test.step('Then zijn Teambeheer, goedkeuren, factureren en mailbeheer niet bedienbaar', async () => {
    // Niet "onzichtbaar genoeg": werkelijk afwezig of verborgen. Een knop die er
    // staat en niets doet, is precies het soort ding dat hier eerder misging.
    //
    // En daar blijft het niet bij. Een lus die alleen verborgen knoppen nakijkt,
    // beweert niets zodra die knoppen er helemaal niet zijn -- de test wordt dan
    // stilzwijgend leeg. Daarom wordt elk beheerdersscherm daarna alsnog
    // geforceerd geopend: pas als het dán dicht blijft, is het echt op slot.
    await expect(page.locator('button[data-view="timesheet"]'),
      'de medewerker hoort zijn eigen urenstaat wél te kunnen openen').toBeVisible();

    for (const view of ['employees', 'approvals', 'invoices', 'settings']) {
      const knop = page.locator(`button[data-view="${view}"]`);
      for (let i = 0; i < await knop.count(); i++) {
        await expect(knop.nth(i), `${view} hoort voor een medewerker niet bedienbaar te zijn`)
          .toBeHidden();
      }

      await page.evaluate((naam) => {
        document.querySelector<HTMLButtonElement>(`button[data-view="${naam}"]`)?.click();
      }, view);

      const scherm = page.locator(`#view-${view}`);
      if (await scherm.count()) {
        await expect(scherm, `${view} mag ook geforceerd niet opengaan voor een medewerker`)
          .not.toHaveClass(/is-active/);
      }
    }

    // En hij belandt niet op een leeg scherm: showView() stuurt een medewerker die
    // een beheerdersscherm forceert terug naar zijn eigen dashboard. Dat is de
    // guard zelf, dus die hoort hier bewezen te worden en niet alleen aangenomen.
    await expect(page.locator('#view-employee-dashboard'),
      'een geforceerde poging hoort de medewerker naar zijn eigen dashboard terug te sturen')
      .toHaveClass(/is-active/);
  });

  await test.step('When de medewerker met geldige CSRF timesheets.php action approve probeert', async () => {
    const poging = await page.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': await csrf(page) },
      data: {
        action: 'approve',
        period: periodeKey(periode),
        employee_id: medewerkerId,
        expectedVersion: versieVooraf,
      },
    });

    expect(poging.status(), 'goedkeuren door een medewerker hoort exact 403 te zijn').toBe(403);
    const body = await poging.json() as Json;
    expect(body.ok).toBe(false);
    expect(String(body.error), 'het foutcontract hoort vastgelegd te zijn').toBe('forbidden-action');

    const tekst = `${String(body.message || '')} ${String(body.error || '')}`;
    for (const woord of TECHNISCHE_LEKWOORDEN) {
      expect(tekst, `een 403 mag ${woord} niet prijsgeven`).not.toContain(woord);
    }
    expect(String(body.message || '').length,
      'een weigering hoort uit te leggen waarom').toBeGreaterThan(10);
  });

  await test.step('And weigert de server ook de overige Backoffice-eindpunten', async () => {
    const token = await csrf(page);
    const pogingen: Array<[string, Json]> = [
      ['/server/api/timesheets.php', {
        action: 'request_correction', period: periodeKey(periode),
        employee_id: medewerkerId, message: 'nee',
      }],
      ['/server/api/staff.php', {
        action: 'upsert_employee', sendInvitation: false,
        employee: { name: 'Insluiper', email: 'insluiper@example.invalid', role: 'Consultant' },
      }],
      ['/server/api/users.php', { action: 'delete', user_id: 1 }],
    ];
    for (const [pad, data] of pogingen) {
      const response = await page.request.post(pad, { headers: { 'X-CSRF-Token': token }, data });
      expect(response.ok(), `${pad} hoort een medewerker te weigeren`).toBe(false);
      expect(response.status(), `${pad} hoort te weigeren, niet te crashen`).toBeGreaterThanOrEqual(400);
      expect(response.status(), `${pad} mag geen serverfout opleveren`).toBeLessThan(500);
    }
  });

  await test.step('And blijven status, versie en eigenaar exact ongewijzigd', async () => {
    const urenstaat = await leesUrenstaat(page, periodeKey(periode), medewerkerId);
    expect(String(urenstaat.status),
      'een geweigerde goedkeuring mag de status niet verzetten').toBe('submitted');
    expect(Number(urenstaat.version),
      'een geweigerde poging mag de versie niet ophogen').toBe(versieVooraf);

    // Meteen na het herladen, niet na omzwervingen. Precies hier zat een echte bug:
    // de bootlezing was nog onderweg toen dit scherm openging, en de app tekende
    // daarna niet opnieuw. Je zag dan de vorige status -- "Correctie nodig" terwijl
    // de server allang submitted zei -- tot je ergens anders heen klikte en terugkwam.
    // Deze assertie is de bewaker daarvan en mag nooit een omweg krijgen.
    await page.reload();
    await page.locator('button[data-view="timesheet"]').click();

    const naReload = String(await page.locator('#period-label').textContent() || '').trim();
    expect(naReload, 'een verversing hoort dezelfde periode te tonen').toBe(periode);
    const serverNa = await leesUrenstaat(page, periodeKey(naReload), medewerkerId);
    expect(String(serverNa.status), 'de server hoort nog steeds submitted te zeggen').toBe('submitted');

    await expect(page.locator('#timesheet-status'),
      'direct na een verversing hoort het scherm de serverstatus te tonen, niet de vorige')
      .toHaveText('Ingediend');
  });

  await test.step('And ontstaan geen factuur, audit-succes of maildelivery door de poging', async () => {
    // Alleen Backoffice mag dit zien, dus de controle gebeurt vanaf dat account.
    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();

    const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
    const facturen = ((bootstrap.invoices as Json[]) || [])
      .filter(item => Number(item.employee_id) === medewerkerId);
    expect(facturen,
      'een geweigerde goedkeuring mag geen factuur hebben gemaakt').toHaveLength(0);

    const queue = await (await page.request.get('/server/api/email-queue.php')).json() as Json;
    const deliveries = (queue.deliveries as Json[]) || (queue.items as Json[]) || [];
    const verzonden = deliveries.filter(item =>
      Number(item.employee_id) === medewerkerId && String(item.status) === 'sent');
    expect(verzonden, 'er hoort geen verzonden mail te zijn ontstaan').toHaveLength(0);

    const audit = await (await page.request.get('/server/api/audit-log.php?limit=200')).json() as Json;
    const regels = (audit.entries as Json[]) || (audit.items as Json[]) || [];
    const geslaagd = regels.filter(regel =>
      String(regel.event_type || '').includes('approve')
      && String(regel.entity_id || '') === String(medewerkerId)
      && String(regel.outcome || 'success') === 'success');
    expect(geslaagd,
      'een geweigerde poging mag geen geslaagde auditregel achterlaten').toHaveLength(0);
  });
});
