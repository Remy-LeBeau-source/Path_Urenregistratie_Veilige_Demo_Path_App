import { test, expect } from './fixtures/e2eIsolation';
import type { Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

// Twee keer klikken mag nooit twee keer gebeuren.
//
// Iemand die niet zeker weet of zijn klik is aangekomen, klikt gewoon nog een keer.
// Dat is normaal gedrag, en op een trage verbinding is het bijna onvermijdelijk.
// De prijs van een dubbele klik mag nooit een dubbele factuur of een tweede mail
// naar de broker zijn -- dat merk je namelijk pas als de ontvanger belt.
//
// De case maakt die kans expres zo groot mogelijk: de eerste schrijfpoging wordt
// gecontroleerd vertraagd, zodat de tweede klik gegarandeerd binnenkomt terwijl de
// eerste nog onderweg is. Zonder die vertraging test je vooral hoe snel je machine
// toevallig is.

type Json = Record<string, unknown>;

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

test('[E2E-H-019] dubbel klikken maakt nooit dubbele statussen, facturen of mails', async ({ page }) => {
  test.setTimeout(210_000);

  const loginPage = new LoginPage(page);
  let periodeSleutel = '';
  let medewerkerId = 0;
  let urenstaatId = 0;

  // Hoeveel schrijfpogingen de browser werkelijk over de lijn stuurt. Twee
  // verzoeken is niet meteen fout -- het gaat erom wat de server ervan commit.
  let submitPogingen = 0;
  let goedkeurPogingen = 0;

  await test.step('Given de eerste submitwrite gecontroleerd wordt vertraagd', async () => {
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

    // De vertraging: alleen de eerste POST wordt opgehouden, de rest gaat gewoon
    // door. Zo staat het venster waarin een tweede klik kan aankomen wijd open.
    let eersteVertraagd = false;
    await page.route('**/server/api/timesheets.php', async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      const body = String(route.request().postData() || '');
      if (body.includes('"submit"')) submitPogingen++;
      if (body.includes('"approve"')) goedkeurPogingen++;
      if (!eersteVertraagd) {
        eersteVertraagd = true;
        await new Promise(resolve => setTimeout(resolve, 1_500));
      }
      return route.fallback();
    });
  });

  await test.step('When de medewerker twee keer snel achter elkaar indient', async () => {
    const invoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
    if (await invoer.count()) {
      await invoer.fill('8');
      await invoer.press('Tab');

      const knop = page.locator('#submit-timesheet');
      // Twee klikken zonder ertussen te wachten. force omdat de knop na de eerste
      // klik uitgeschakeld kan raken -- juist dat wil ik hier omzeilen, want de
      // vraag is wat de server doet als er tóch twee verzoeken komen.
      await knop.click();
      await knop.click({ force: true, timeout: 2_000 }).catch(() => null);
    }
    await expect(page.locator('#timesheet-status'),
      'na indienen hoort er één blijvende vervolgstatus te staan').toHaveText('Ingediend');
  });

  await test.step('Then bestaat er precies één urenstaat met één statusmutatie', async () => {
    const urenstaat = await leesUrenstaat(page, periodeSleutel, medewerkerId);
    urenstaatId = Number(urenstaat.id || 0);
    expect(String(urenstaat.status)).toBe('submitted');

    // De kern: hoe vaak er ook is geklikt, er is één urenstaat en die is één keer
    // van concept naar ingediend gegaan.
    const versieNaSubmit = Number(urenstaat.version || 0);

    await page.reload();
    await page.locator('button[data-view="timesheet"]').click();
    await expect(page.locator('#timesheet-status'),
      'ook na verversen blijft het bij één ingediende urenstaat').toHaveText('Ingediend');

    const naReload = await leesUrenstaat(page, periodeSleutel, medewerkerId);
    expect(Number(naReload.id), 'er hoort één urenstaat te zijn, niet twee').toBe(urenstaatId);
    expect(Number(naReload.version),
      'een tweede klik mag geen extra versie hebben opgeleverd').toBe(versieNaSubmit);
  });

  await test.step('And levert dubbel goedkeuren en dubbel factureren één factuur op', async () => {
    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();

    await page.locator('button[data-view="approvals"]').click();
    const goedkeuren = page.locator(`[data-approve="${medewerkerId}"]`).first();
    await expect(goedkeuren).toBeVisible();
    await goedkeuren.click();
    await goedkeuren.click({ force: true, timeout: 2_000 }).catch(() => null);

    await expect(async () => {
      const status = String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status);
      expect(status).toBe('approved');
    }).toPass({ timeout: 20_000, intervals: [250, 500, 1_000] });

    // Twee keer definitief maken, expres zonder ertussen te wachten.
    const token = await csrf(page);
    const beide = await Promise.all([
      page.request.post('/server/api/invoices.php', {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'lock', timesheet_id: urenstaatId },
      }),
      page.request.post('/server/api/invoices.php', {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'lock', timesheet_id: urenstaatId },
      }),
    ]);
    const geslaagd = beide.filter(response => response.ok()).length;
    expect(geslaagd,
      'minstens één van de twee pogingen hoort de factuur definitief te maken').toBeGreaterThan(0);

    const facturen = await (await page.request.get(
      `/server/api/invoices.php?period=${periodeSleutel}`)).json() as Json;
    const lijst = ((facturen.invoices as Json[]) || (facturen.items as Json[]) || [])
      .filter(item => Number(item.timesheet_id) === urenstaatId);
    expect(lijst,
      'twee keer afronden mag nooit twee facturen voor dezelfde urenstaat maken').toHaveLength(1);
  });

  await test.step('And bestaat per ontvanger precies één delivery zonder dubbele mail', async () => {
    const facturen = await (await page.request.get(
      `/server/api/invoices.php?period=${periodeSleutel}`)).json() as Json;
    const factuurId = Number(((facturen.invoices as Json[]) || (facturen.items as Json[]) || [])
      .find(item => Number(item.timesheet_id) === urenstaatId)?.id || 0);
    expect(factuurId).toBeGreaterThan(0);

    const queue = await (await page.request.get('/server/api/email-queue.php?limit=100')).json() as Json;
    const deliveries = ((queue.items as Json[]) || (queue.deliveries as Json[]) || [])
      .filter(item => Number(item.invoice_id) === factuurId);
    expect(deliveries.length, 'er horen berichten klaargezet te zijn').toBeGreaterThan(0);

    // Per ontvanger exact één bericht. Een dubbele mail naar de broker is precies
    // het soort fout waar een klant je op belt.
    const perOntvanger = new Map<string, number>();
    for (const delivery of deliveries) {
      const sleutel = `${String(delivery.channel)}|${String(delivery.recipient_email)}`;
      perOntvanger.set(sleutel, (perOntvanger.get(sleutel) || 0) + 1);
    }
    for (const [ontvanger, aantal] of perOntvanger) {
      expect(aantal, `${ontvanger} hoort precies één bericht te krijgen, geen twee`).toBe(1);
    }
    expect(perOntvanger.size, 'er hoort minstens één ontvanger te zijn').toBeGreaterThan(0);
  });

  await test.step('And is de dubbele klik werkelijk uitgevoerd', async () => {
    // Zonder deze controle zou de hele case groen kunnen zijn doordat de tweede
    // klik nooit heeft plaatsgevonden -- dan bewijs je niets over idempotentie.
    // Gemeten: de tweede klik levert géén tweede verzoek op, want de GUI zet de
    // knop meteen uit. Dat is goed nieuws en het hoort vastgelegd te worden -- maar
    // het betekent ook dat het dubbelklikken hierboven de server nooit heeft
    // beproefd. Daarom hier alsnog twee werkelijk gelijktijdige schrijfpogingen:
    // een browserknop is een beleefdheid, de server moet het echte werk doen.
    // Hoe vaak de tweede klik werkelijk over de lijn gaat, verschilt per browser:
    // desktop-chromium en mobile-chrome zetten de knop op tijd uit, mobile-safari
    // laat hem er soms doorheen. Daarom is dat hier geen eis -- de eis is dat de
    // uitkomst in beide gevallen dezelfde is. Dat is nu juist het punt: je mag niet
    // afhankelijk zijn van hoe snel een browser toevallig een knop uitschakelt.
    expect(submitPogingen, 'er hoort minstens één indienpoging te zijn gedaan').toBeGreaterThanOrEqual(1);
    expect(submitPogingen, 'twee klikken horen nooit meer dan twee verzoeken te geven').toBeLessThanOrEqual(2);
    expect(goedkeurPogingen, 'er hoort minstens één goedkeurpoging te zijn gedaan').toBeGreaterThanOrEqual(1);

    const token = await csrf(page);
    const versieVooraf = Number((await leesUrenstaat(page, periodeSleutel, medewerkerId)).version || 0);
    const tweeTegelijk = await Promise.all([1, 2].map(() => page.request.post('/server/api/invoices.php', {
      headers: { 'X-CSRF-Token': token },
      data: { action: 'lock', timesheet_id: urenstaatId },
    })));
    expect(tweeTegelijk.filter(response => response.ok()).length,
      'van twee gelijktijdige afrondingen hoort er hooguit één te slagen').toBeLessThanOrEqual(1);

    const facturenNa = await (await page.request.get(
      `/server/api/invoices.php?period=${periodeSleutel}`)).json() as Json;
    expect(((facturenNa.invoices as Json[]) || (facturenNa.items as Json[]) || [])
      .filter(item => Number(item.timesheet_id) === urenstaatId),
      'ook twee gelijktijdige verzoeken mogen samen één factuur opleveren').toHaveLength(1);
    expect(Number((await leesUrenstaat(page, periodeSleutel, medewerkerId)).version),
      'een geweigerde gelijktijdige poging mag de versie niet ophogen').toBe(versieVooraf);
  });
});
