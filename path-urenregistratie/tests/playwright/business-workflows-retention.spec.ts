import { test, expect } from './fixtures/e2eIsolation';
import type { Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { TeamManagementPage } from './pages/TeamManagementPage';

// Wat er gebeurt met iemand die weggaat maar wel historie heeft.
//
// Dit is de gevaarlijkste knop in Teambeheer. Een account definitief verwijderen
// terwijl er uren, facturen en auditregels aan hangen, zou stil zakelijke historie
// vernietigen -- en dat merk je pas maanden later, als een factuur nergens meer op
// terug te voeren is. De app hoort dat te weigeren, en hoort daarbij te vertellen
// waarom, in gewone taal en zonder tabelnamen of foutcodes uit de database.
//
// De case bouwt daarom eerst echte historie op en probeert daarna pas te
// verwijderen. Een blokkade testen op een leeg account bewijst niets.

type Json = Record<string, unknown>;

const TECHNISCHE_TAAL = [
  'SQLSTATE', 'PDOException', 'SELECT ', 'FOREIGN KEY', 'constraint',
  'Stack trace', '.php', 'audit_log', 'timesheets',
];

async function csrf(page: Page): Promise<string> {
  const body = await (await page.request.get('/server/auth/csrf.php')).json() as Json;
  return String(body.csrf_token || '');
}

test('[E2E-N-021] een gedeactiveerd account met historie blijft veilig bewaard en legt de blokkeerreden uit', async ({ page }) => {
  test.setTimeout(210_000);

  const loginPage = new LoginPage(page);
  const teambeheer = new TeamManagementPage(page);

  const uniek = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  const naam = `Vertrekker ${uniek}`;
  const adres = `vertrekker-${uniek}@example.invalid`;
  const wachtwoord = `E2eTijdelijk!${uniek}`;

  let gebruikerId = 0;
  let medewerkerId = 0;

  await test.step('Given een medewerker met echte uren-, login- en auditgeschiedenis', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await teambeheer.open();

    const write = await teambeheer.addEmployee({
      name: naam,
      email: adres,
      role: 'Consultant',
      client: `Klant ${uniek}`,
      broker: `Broker ${uniek}`,
      brokerEmail: `broker-${uniek}@example.invalid`,
      rate: 100,
      weeklyHours: 40,
      sendInvitation: false,
    });
    gebruikerId = Number(write.body.user_id || 0);
    medewerkerId = Number(write.body.employee_id || 0);
    expect(gebruikerId, 'de nieuwe medewerker hoort een account te krijgen').toBeGreaterThan(0);

    // Een wachtwoord zetten via de echte resetroute, zodat hij ook werkelijk kan
    // inloggen -- en dat inloggen is meteen de loginhistorie die straks blokkeert.
    const reset = await page.request.post('/server/auth/request-reset.php', {
      headers: { 'X-CSRF-Token': await csrf(page) },
      data: { email: adres },
    });
    const resetBody = await reset.json() as Json;
    expect(String(resetBody.token || ''), 'er hoort een resetlink te komen').toMatch(/^[a-f0-9]{64}$/);

    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await page.goto(`/index.html#reset-password=${String(resetBody.token)}`);
    await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
    await page.locator('#auth-reset-new-password').fill(wachtwoord);
    await page.locator('#auth-reset-confirm-password').fill(wachtwoord);
    await page.locator('#auth-reset-complete-submit').click();
    await expect(page.locator('#auth-reset-complete-feedback')).toContainText('Je wachtwoord is ingesteld');

    await loginPage.open();
    await loginPage.login(adres, wachtwoord);
    await expect(page.locator('#view-employee-dashboard'),
      'de nieuwe medewerker hoort zelf te kunnen inloggen').toHaveClass(/is-active/);

    // En echte uren, zodat er zakelijke historie is en niet alleen een login.
    await page.locator('button[data-view="timesheet"]').click();
    const invoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
    if (await invoer.count()) {
      await invoer.fill('8');
      await invoer.press('Tab');
      const schrijf = page.waitForResponse(response =>
        response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
      await page.locator('#submit-timesheet').click();
      await schrijf;
      await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
    }
  });

  await test.step('When Backoffice de medewerker deactiveert', async () => {
    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await teambeheer.open();
    await teambeheer.deactivateEmployee(naam);
  });

  await test.step('Then kan het account niet meer inloggen en staat het niet in de actieve lijst', async () => {
    await expect(page.locator(`.employee-card:has-text("${naam}")`),
      'een gedeactiveerd account hoort uit de actieve lijst te verdwijnen').toHaveCount(0);

    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    let geweigerd = false;
    try {
      await loginPage.login(adres, wachtwoord);
    } catch {
      geweigerd = true;
    }
    expect(geweigerd, 'een gedeactiveerd account hoort niet meer te kunnen inloggen').toBe(true);
    await expect(page.locator('#auth-login-form'),
      'hij hoort op het inlogscherm te blijven staan').toBeVisible();
  });

  await test.step('And weigert definitief verwijderen met een begrijpelijke reden', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await teambeheer.open();
    await teambeheer.showInactive();

    const poging = await teambeheer.attemptDeleteEmployee(naam);
    expect(poging.response.status(),
      'verwijderen met historie hoort een conflict te geven').toBe(409);
    expect(poging.body.ok).toBe(false);
    expect(String(poging.body.error),
      'de blokkade hoort haar eigen vastgelegde reden te dragen').toBe('delete-history-preserved');

    const melding = String(poging.body.message || '');
    expect(melding.length, 'een blokkade hoort uit te leggen waarom').toBeGreaterThan(20);
    for (const woord of TECHNISCHE_TAAL) {
      expect(melding, `de uitleg mag ${woord} niet bevatten`).not.toContain(woord);
    }

    // De reden mag ook concreet zijn: welke historie het tegenhoudt.
    const blockers = (poging.body.blockers as string[]) || [];
    expect(blockers.length, 'de blokkade hoort te benoemen welke historie eraan hangt')
      .toBeGreaterThan(0);
  });

  await test.step('And blijven profiel, opdracht en urenhistorie volledig intact', async () => {
    const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;

    const medewerker = (bootstrap.employees as Json[]).find(item => Number(item.id) === medewerkerId);
    expect(medewerker, 'het medewerkerprofiel hoort bewaard te blijven').toBeDefined();
    expect(String(medewerker?.full_name), 'de naam hoort ongewijzigd te zijn').toBe(naam);

    const opdracht = (bootstrap.assignments as Json[]).find(
      item => Number(item.employee_id) === medewerkerId);
    expect(opdracht, 'de opdracht hoort bewaard te blijven, anders is de factuur nergens op terug te voeren')
      .toBeDefined();

    // En de uren die hij heeft ingediend staan er nog.
    const periode = String(await page.locator('#period-label').textContent() || '').trim();
    if (periode !== '') {
      const maanden = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
        'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
      const delen = periode.toLowerCase().split(/\s+/);
      const sleutel = `${delen[1]}-${String(maanden.indexOf(delen[0]) + 1).padStart(2, '0')}`;
      const urenstaat = await (await page.request.get(
        `/server/api/timesheets.php?period=${sleutel}&employee_id=${medewerkerId}`)).json() as Json;
      expect(urenstaat.ok, 'de urenhistorie hoort opvraagbaar te blijven').toBe(true);
    }
  });

  await test.step('And staat het account na refresh precies eenmaal als inactief vermeld', async () => {
    await page.reload();
    await teambeheer.open();
    await teambeheer.showInactive();

    await expect(page.locator(`.employee-card:has-text("${naam}")`),
      'hij hoort precies eenmaal in de inactieve lijst te staan, niet nul en niet dubbel')
      .toHaveCount(1);
  });
});
