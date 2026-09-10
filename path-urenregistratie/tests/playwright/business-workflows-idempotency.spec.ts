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
      await page.locator('[data-hours-week-scope="all"]').click();

      const knop = page.locator('#submit-timesheet');
      // De eerste klik opent bewust de indienbevestiging. Bevestigen start de
      // echte schrijfactie; daarna proberen we nogmaals te klikken om ook de
      // browserbeveiliging tegen een ongeduldige dubbelklik te bewijzen.
      await knop.click();
      await page.locator('#modal-confirm').click();
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
    // Sinds de verplichte klanturenstaat-check (server/api/invoices.php,
    // customer-timesheet-required) moet die er staan voor er iets kan worden
    // gefactureerd; alleen de medewerker zelf mag hem als rechtstreeks gemaild
    // registreren, dus dat hoort hier, nog in zijn eigen sessie, vóór de
    // rolwissel naar Backoffice.
    const klanturenstaat = await page.request.post('/server/api/customer-timesheets.php', {
      headers: { 'X-CSRF-Token': await csrf(page) },
      data: { action: 'mark_skipped', period: periodeSleutel, review_note: 'E2E-H-019: rechtstreeks gemaild.' },
    });
    expect(klanturenstaat.ok(), `klanturenstaat registreren hoort te slagen: ${await klanturenstaat.text()}`).toBe(true);

    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();
    const confirmation = await page.request.post('/server/api/customer-timesheets.php', {
      headers: { 'X-CSRF-Token': await csrf(page) },
      data: { action: 'confirm_external', period: periodeSleutel, employee_id: medewerkerId, review_note: 'Ontvangst extern gecontroleerd.' },
    });
    expect(confirmation.ok(), `extern bevestigen hoort te slagen: ${await confirmation.text()}`).toBe(true);

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

test('[E2E-H-028] uren invullen en meteen verversen wordt native afgeraden zolang het concept nog niet is opgeslagen, in beide skins', async ({ page }) => {
  // Testfeedback: uren invullen en meteen F5 drukken verloor de zojuist
  // getypte waarde. scheduleDraftTimesheetWrite() (assets/app.js) vertraagt het
  // opslaan bewust 700ms (debounce) om niet bij elke toets een verzoek te
  // sturen -- verversen/sluiten binnen dat venster annuleerde de aflopende
  // timer of lopende fetch zonder enige waarschuwing, in Klassiek én Nieuw
  // (beide skins delen dezelfde writeRuntime). Vast te leggen via een echte
  // page.reload()-dialoog is niet betrouwbaar (Playwright dismist een
  // beforeunload-dialoog standaard); deze case bewijst daarom het mechanisme
  // zelf: vlak na een wijziging moet een beforeunload-event preventDefault
  // krijgen, en zodra de server bevestigd heeft dat het concept is
  // opgeslagen, mag hetzelfde event weer ongehinderd doorgaan.
  const loginPage = new LoginPage(page);

  const beforeUnloadIsGeblokkeerd = () => page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });

  await test.step('Given de medewerker in Klassiek op Mijn uren staat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('button[data-view="timesheet"]').click();
    await expect(page.locator('#timesheet-status')).toBeVisible();
    expect(await beforeUnloadIsGeblokkeerd(), 'zonder enige wijziging mag verversen gewoon doorgaan').toBe(false);
  });

  await test.step('When een uurwaarde net is getypt, vóór de 700ms-debounce is verlopen', async () => {
    const invoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
    await invoer.fill('6');
    await invoer.dispatchEvent('input');
    expect(await beforeUnloadIsGeblokkeerd(),
      'binnen het debounce-venster hoort verversen native afgeraden te worden').toBe(true);
  });

  await test.step('Then mag verversen weer ongehinderd zodra de server het concept bevestigd heeft', async () => {
    await expect(page.locator('#hours-autosave-status')).toHaveText(/Gesynchroniseerd met server/, { timeout: 5_000 });
    await expect.poll(beforeUnloadIsGeblokkeerd, { timeout: 2_000 }).toBe(false);
  });

  await test.step('And hetzelfde geldt in Nieuw, via het bento-uurveld', async () => {
    // Mijn uren staat al actief (vorige stap); de skin-wissel zelf navigeert
    // nergens heen, dus geen nieuwe klik nodig om er te blijven.
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    // De bento-kaartjes tonen alleen bij een enkele weekweergave, niet bij
    // "Hele maand" (die toont ook in Nieuw de compacte tabel). Alle weken
    // staan in de DOM, maar alleen de gekozen week is zichtbaar -- :visible
    // is dus nodig, :not([disabled]) alleen filtert daar niet op.
    await page.locator('[data-hours-week-scope="week-0"]').click();
    const bentoInvoer = page.locator('.new-bento-hours-input:visible:not([disabled])').first();
    await expect(bentoInvoer).toBeVisible();
    await bentoInvoer.fill('7');
    // Het bento-uurveld slaat op "change" op (bij blur/Enter), niet op elke
    // toets zoals het klassieke rooster -- vandaar het andere event hier.
    await bentoInvoer.dispatchEvent('change');
    expect(await beforeUnloadIsGeblokkeerd(),
      'ook in Nieuw hoort verversen binnen het debounce-venster afgeraden te worden').toBe(true);
    await expect(page.locator('#hours-autosave-status')).toHaveText(/Gesynchroniseerd met server/, { timeout: 5_000 });
    // De statustekst wordt al gezet in de .then()-callback, vlak vóór de
    // .finally() die draftInFlight terugzet -- op de tekst wachten is dus geen
    // garantie dat de guard zelf ook al ontgrendeld is. Poll rechtstreeks op de
    // guardvoorwaarde om die ene microtaak-race niet als test-flake te erven.
    await expect.poll(beforeUnloadIsGeblokkeerd, { timeout: 2_000 }).toBe(false);
  });
});
