import { test, expect } from './fixtures/e2eIsolation';
import type { Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

// Wat er gebeurt als het misgaat en je het opnieuw probeert.
//
// Een factuurpoging die halverwege strandt is het gevaarlijkste moment in de hele
// keten. Als de app dan doet alsof er niets is gebeurd, klikt Backoffice nog eens en
// staat er zo een tweede factuur. Als de app doet alsof het wél is gelukt, blijft er
// eentje ontbreken en merkt niemand dat.
//
// De fout wordt hier gecontroleerd opgewekt door het verzoek te laten mislukken op
// netwerkniveau -- zoals een verbroken verbinding. Wat daarna telt: blijft de taak
// staan, is er niets half aangemaakt, en levert opnieuw proberen precies één factuur op.

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

async function facturenVoor(page: Page, periode: string, urenstaatId: number): Promise<Json[]> {
  const body = await (await page.request.get(`/server/api/invoices.php?period=${periode}`)).json() as Json;
  return ((body.invoices as Json[]) || (body.items as Json[]) || [])
    .filter(item => Number(item.timesheet_id) === urenstaatId);
}

async function deliveryIds(page: Page): Promise<number[]> {
  const body = await (await page.request.get('/server/api/email-queue.php?limit=100')).json() as Json;
  return ((body.items as Json[]) || (body.deliveries as Json[]) || [])
    .map(item => Number(item.id)).sort((left, right) => left - right);
}

function periodeKey(label: string): string {
  const maanden = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const delen = label.toLowerCase().split(/\s+/);
  return `${delen[1]}-${String(maanden.indexOf(delen[0]) + 1).padStart(2, '0')}`;
}

test('[E2E-N-019] een mislukte factuurpoging laat niets half achter en opnieuw proberen levert één factuur', async ({ page }) => {
  test.setTimeout(210_000);

  const loginPage = new LoginPage(page);
  let periodeSleutel = '';
  let medewerkerId = 0;
  let urenstaatId = 0;
  let deliveriesVooraf: number[] = [];
  let versieVooraf = 0;

  await test.step('Given een goedgekeurde urenstaat en de voorstatus is vastgelegd', async () => {
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
    const urenstaat = await leesUrenstaat(page, periodeSleutel, medewerkerId);
    expect(String(urenstaat.status), 'de urenstaat hoort goedgekeurd te zijn').toBe('approved');
    versieVooraf = Number(urenstaat.version || 0);

    // Let op: zodra een urenstaat is goedgekeurd bestaat er al een CONCEPTfactuur.
    // De invariant gaat dus niet over 'geen factuur' maar over 'niets definitiefs',
    // en over: geen tweede concept erbij door een mislukte poging.
    const conceptVooraf = await facturenVoor(page, periodeSleutel, urenstaatId);
    expect(conceptVooraf.filter(item => item.locked === true),
      'vooraf hoort er nog niets definitief te zijn').toHaveLength(0);
    expect(conceptVooraf, 'vooraf hoort er precies één conceptfactuur te staan').toHaveLength(1);
    deliveriesVooraf = await deliveryIds(page);
  });

  await test.step('When de eerste factuurpoging gecontroleerd faalt', async () => {
    // Eén keer laten stranden, daarna gaat alles weer gewoon door.
    let gefaald = false;
    await page.route('**/server/api/invoices.php', async route => {
      if (route.request().method() === 'POST' && !gefaald) {
        gefaald = true;
        return route.abort('connectionfailed');
      }
      return route.fallback();
    });

    const mislukt = await page.evaluate(async (timesheetId) => {
      const csrfResponse = await fetch('/server/auth/csrf.php');
      const csrfBody = await csrfResponse.json() as { csrf_token?: string };
      try {
        const response = await fetch('/server/api/invoices.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': String(csrfBody.csrf_token || '') },
          body: JSON.stringify({ action: 'lock', timesheet_id: timesheetId }),
        });
        return { gelukt: response.ok };
      } catch {
        return { gelukt: false };
      }
    }, urenstaatId);
    expect(mislukt.gelukt, 'de eerste poging hoort werkelijk te stranden').toBe(false);
    expect(gefaald, 'de foutinjectie hoort daadwerkelijk te hebben toegeslagen').toBe(true);
  });

  await test.step('Then blijven taak, status, versie, factuur en deliveries onaangeroerd', async () => {
    const urenstaat = await leesUrenstaat(page, periodeSleutel, medewerkerId);
    expect(String(urenstaat.status),
      'een gestrande factuurpoging mag de urenstaat niet op gefactureerd zetten').toBe('approved');
    expect(Number(urenstaat.version),
      'een gestrande poging mag de versie niet ophogen').toBe(versieVooraf);

    const naFout = await facturenVoor(page, periodeSleutel, urenstaatId);
    expect(naFout, 'een gestrande poging mag geen tweede factuurregel achterlaten').toHaveLength(1);
    expect(naFout.filter(item => item.locked === true),
      'een gestrande poging mag niets definitief hebben gemaakt').toHaveLength(0);
    expect(await deliveryIds(page),
      'een gestrande poging mag geen mailitems hebben klaargezet').toEqual(deliveriesVooraf);
  });

  await test.step('When Backoffice het opnieuw probeert, ontstaat precies één factuur', async () => {
    await page.unroute('**/server/api/invoices.php');

    const opnieuw = await page.request.post('/server/api/invoices.php', {
      headers: { 'X-CSRF-Token': await csrf(page) },
      data: { action: 'lock', timesheet_id: urenstaatId },
    });
    expect(opnieuw.ok(), `opnieuw proberen hoort te slagen: ${await opnieuw.text()}`).toBe(true);

    const facturen = await facturenVoor(page, periodeSleutel, urenstaatId);
    expect(facturen,
      'na een gestrande en een geslaagde poging hoort er precies één factuur te zijn').toHaveLength(1);
    expect(facturen[0].locked, 'die ene factuur hoort nu definitief te zijn').toBe(true);
    expect(String((await leesUrenstaat(page, periodeSleutel, medewerkerId)).status)).toBe('invoiced');
  });

  await test.step('And ontstaat per ontvanger precies één bericht zonder dubbele bijlage', async () => {
    const factuurId = Number((await facturenVoor(page, periodeSleutel, urenstaatId))[0]?.id || 0);
    const queue = await (await page.request.get('/server/api/email-queue.php?limit=100')).json() as Json;
    const deliveries = ((queue.items as Json[]) || (queue.deliveries as Json[]) || [])
      .filter(item => Number(item.invoice_id) === factuurId);
    expect(deliveries.length, 'er horen berichten klaargezet te zijn').toBeGreaterThan(0);

    const perOntvanger = new Map<string, number>();
    for (const delivery of deliveries) {
      const sleutel = `${String(delivery.channel)}|${String(delivery.recipient_email)}`;
      perOntvanger.set(sleutel, (perOntvanger.get(sleutel) || 0) + 1);
    }
    for (const [ontvanger, aantal] of perOntvanger) {
      expect(aantal, `${ontvanger} hoort precies één bericht te krijgen na een mislukte eerste poging`).toBe(1);
    }
  });
});
