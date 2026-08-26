import { test, expect } from './fixtures/e2eIsolation';
import type { Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { LoginPage } from './pages/LoginPage';

// Beloofde bijlagen moeten werkelijk bestaan.
//
// Dit is het punt waar Gio twee keer op is gestuit: een vinkje "Factuur meesturen"
// dat wel werd opgeslagen maar niets deed, en een mail waarvan de bijlage ontbrak.
// De suite keek toen alleen of er een opslagsleutel was ingevuld. Een sleutel is
// geen bestand, en een bestand is nog geen PDF die opengaat.
//
// Deze case haalt elk beloofd document echt op en kijkt naar de bytes: begint hij
// met %PDF-, eindigt hij met %%EOF, is hij niet verdacht klein, en komt hij met de
// juiste headers binnen. En andersom: geen enkele delivery mag een bijlage beloven
// zonder dat het bestand er is.

type Json = Record<string, unknown>;

// Een factuur bevat tarieven en NAW-gegevens. Deze twee headers horen erbij; ze
// stonden wel bij de klanturenstaat en ontbraken bij de factuur.
const VERPLICHTE_HEADERS: Array<[string, RegExp]> = [
  ['content-type', /^application\/pdf/i],
  ['cache-control', /private/i],
  ['cache-control', /no-store/i],
  ['x-content-type-options', /^nosniff$/i],
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

test('[E2E-H-018] iedere beloofde factuurbijlage bestaat werkelijk als geldige en te openen PDF', async ({ page }) => {
  test.setTimeout(210_000);

  const loginPage = new LoginPage(page);
  let periodeSleutel = '';
  let medewerkerId = 0;
  let urenstaatId = 0;
  let factuurId = 0;
  let eersteHash = '';

  await test.step('Given een goedgekeurde urenstaat klaarstaat voor facturatie', async () => {
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
    urenstaatId = Number((await leesUrenstaat(page, periodeSleutel, medewerkerId)).id || 0);
    expect(urenstaatId, 'de urenstaat hoort te bestaan').toBeGreaterThan(0);

    await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
    await loginPage.open();
    await loginPage.loginAsAdmin();

    const status = String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status);
    if (status === 'submitted') {
      await page.locator('button[data-view="approvals"]').click();
      const goedkeuren = page.locator(`[data-approve="${medewerkerId}"]`).first();
      await expect(goedkeuren).toBeVisible();
      const schrijf = page.waitForResponse(response =>
        response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
      await goedkeuren.click();
      await schrijf;
    }
    expect(String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status),
      'de urenstaat hoort goedgekeurd te zijn voordat er gefactureerd wordt').toBe('approved');
  });

  await test.step('When Backoffice de factuur definitief maakt', async () => {
    const vergrendel = await page.request.post('/server/api/invoices.php', {
      headers: { 'X-CSRF-Token': await csrf(page) },
      data: { action: 'lock', timesheet_id: urenstaatId },
    });
    expect(vergrendel.ok(), `definitief maken hoort te slagen: ${await vergrendel.text()}`).toBe(true);

    const facturen = await (await page.request.get(
      `/server/api/invoices.php?period=${periodeSleutel}`)).json() as Json;
    const lijst = (facturen.invoices as Json[]) || (facturen.items as Json[]) || [];
    const factuur = lijst.find(item => Number(item.timesheet_id) === urenstaatId);
    expect(factuur, 'er hoort een factuur te bestaan voor deze urenstaat').toBeDefined();
    factuurId = Number(factuur?.id || 0);
    expect(factuurId, 'de factuur hoort een id te hebben').toBeGreaterThan(0);
    // Bewust niet controleren of pdf_storage_key gevuld is: dat pad wordt terecht
    // nooit uitgeleverd, en "de sleutel staat er" bewees toch al niets over het
    // bestand. De volgende stap haalt het document echt op; dat is het bewijs.
  });

  await test.step('Then levert de factuurbijlage een echte, geldige PDF met veilige headers', async () => {
    const response = await page.request.get(
      `/server/api/invoices.php?action=download&invoice_id=${factuurId}`);
    expect(response.status(), 'de bijlage hoort gewoon op te halen te zijn').toBe(200);

    const headers = response.headers();
    for (const [naam, patroon] of VERPLICHTE_HEADERS) {
      expect(String(headers[naam] || ''), `header ${naam} hoort ${patroon} te matchen`).toMatch(patroon);
    }

    // De bestandsnaam mag niets bevatten waarmee je uit de map kunt stappen.
    const dispositie = String(headers['content-disposition'] || '');
    const naam = /filename="([^"]+)"/.exec(dispositie)?.[1] || '';
    expect(naam, 'de bijlage hoort een bestandsnaam mee te krijgen').not.toBe('');
    expect(naam, 'de bestandsnaam hoort op .pdf te eindigen').toMatch(/\.pdf$/);
    expect(naam, 'de bestandsnaam mag geen pad of rare tekens bevatten').toMatch(/^[A-Za-z0-9_-]+\.pdf$/);

    // En dan de inhoud zelf. Hier zat het gat: een sleutel in de database zegt
    // niets over wat er werkelijk op schijf staat.
    const bytes = await response.body();
    expect(bytes.length, 'een echte factuur-PDF is niet een paar bytes').toBeGreaterThan(1_000);
    expect(bytes.subarray(0, 5).toString('latin1'),
      'een PDF hoort met %PDF- te beginnen').toBe('%PDF-');
    expect(bytes.subarray(-1024).toString('latin1'),
      'een volledige PDF hoort met %%EOF af te sluiten').toContain('%%EOF');

    eersteHash = createHash('sha256').update(bytes).digest('hex');
  });

  await test.step('And blijft dezelfde bijlage na een verversing byte voor byte gelijk', async () => {
    await page.reload();
    const opnieuw = await page.request.get(
      `/server/api/invoices.php?action=download&invoice_id=${factuurId}`);
    expect(opnieuw.status()).toBe(200);
    const nogmaals = createHash('sha256').update(await opnieuw.body()).digest('hex');
    expect(nogmaals,
      'een definitieve factuur hoort bij elke download hetzelfde document te zijn').toBe(eersteHash);
  });

  await test.step('And belooft geen enkele delivery een bijlage zonder werkelijk bestand', async () => {
    const queue = await (await page.request.get('/server/api/email-queue.php?limit=100')).json() as Json;
    const deliveries = ((queue.items as Json[]) || (queue.deliveries as Json[]) || [])
      .filter(item => Number(item.invoice_id) === factuurId);
    expect(deliveries.length,
      'een afgeronde factuur hoort berichten te hebben klaargezet').toBeGreaterThan(0);

    let metBijlage = 0;
    for (const delivery of deliveries) {
      const beleid = String(delivery.attachment_policy || '');
      expect(['invoice', 'none'],
        `onbekend bijlagebeleid ${beleid} bij kanaal ${String(delivery.channel)}`).toContain(beleid);

      if (beleid !== 'invoice') continue;
      metBijlage++;

      // De belofte waarmaken: het document achter deze delivery moet ophalen.
      const factuurVanDelivery = Number(delivery.invoice_id || 0);
      expect(factuurVanDelivery,
        `${String(delivery.channel)} belooft een factuur maar verwijst nergens heen`).toBeGreaterThan(0);
      const bijlage = await page.request.get(
        `/server/api/invoices.php?action=download&invoice_id=${factuurVanDelivery}`);
      expect(bijlage.status(),
        `de bijlage die ${String(delivery.channel)} beloofd krijgt, hoort te bestaan`).toBe(200);
      const bytes = await bijlage.body();
      expect(bytes.subarray(0, 5).toString('latin1'),
        `de bijlage voor ${String(delivery.channel)} hoort een echte PDF te zijn`).toBe('%PDF-');
    }

    expect(metBijlage,
      'minstens één ontvanger hoort de factuur werkelijk als bijlage te krijgen').toBeGreaterThan(0);

    // De salarisadministratie krijgt categorisch nooit een factuur. Dat staat zo in
    // het Functioneel Ontwerp en het is geen instelling maar een harde regel.
    const salaris = deliveries.filter(item => String(item.channel) === 'payroll');
    for (const regel of salaris) {
      expect(String(regel.attachment_policy),
        'de salarisadministratie hoort nooit een factuur mee te krijgen').toBe('none');
    }
  });
});
