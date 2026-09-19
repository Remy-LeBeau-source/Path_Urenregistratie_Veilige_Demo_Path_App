import { expect, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

// Een goedgekeurde urenstaat die klaarstaat om te factureren, in een eigen maand.
//
// E2E-H-018 en E2E-N-019 werkten eerder in de huidige maand van de gezaaide
// medewerker, met takken voor "er is nog een vrij vak" en "hij is al ingediend".
// Daardoor leunden ze op elkaar en op de volgorde: E2E-N-019 slaagde alleen omdat
// E2E-H-018 die maand eerder in dezelfde run had goedgekeurd. Stond de maand op
// iets anders (bijvoorbeeld correctie, na een andere case), dan liepen ze vast
// zonder dat er aan de facturatie iets mis was (TW-1).
//
// Nu een willekeurige, nog ongebruikte maand ver weg, zoals de e-mailwachtrij-
// specs: de harness stuurt de run-sleutel mee (X-Path-E2E-Run-Id), waardoor de
// server die maand toestaat. Dag 1 moet ma-do zijn; de server weigert een
// werkdag in het weekend. Goedkeuren gaat via de API: de goedkeurlijst kijkt
// bewust niet vooruit, en deze cases gaan over wat er ná het goedkeuren gebeurt.
//
// Na afloop is Backoffice ingelogd op `page`.

type Json = Record<string, unknown>;

async function csrf(page: Page): Promise<string> {
  const body = await (await page.request.get('/server/auth/csrf.php')).json() as Json;
  return String(body.csrf_token || '');
}

async function schrijf(page: Page, pad: string, data: Json): Promise<{ status: number; body: Json }> {
  const response = await page.request.post(pad, { headers: { 'X-CSRF-Token': await csrf(page) }, data });
  return { status: response.status(), body: await response.json() as Json };
}

async function leesUrenstaat(page: Page, periode: string, medewerkerId: number): Promise<Json> {
  const response = await page.request.get(`/server/api/timesheets.php?period=${periode}&employee_id=${medewerkerId}`);
  return (await response.json() as Json).timesheet as Json;
}

async function ongebruiktePeriode(page: Page, medewerkerId: number): Promise<string> {
  for (let poging = 0; poging < 40; poging++) {
    const jaar = 3000 + Math.floor(Math.random() * 7000);
    const maand = 1 + Math.floor(Math.random() * 12);
    const weekdag = new Date(Date.UTC(jaar, maand - 1, 1)).getUTCDay();
    if (weekdag < 1 || weekdag > 4) continue;
    const periode = `${jaar}-${String(maand).padStart(2, '0')}`;
    const gelezen = await (await page.request.get(
      `/server/api/timesheets.php?period=${periode}&employee_id=${medewerkerId}`)).json() as Json;
    if (gelezen.ok && !gelezen.found) return periode;
  }
  throw new Error('geen ongebruikte periode gevonden');
}

export async function eigenGoedgekeurdeUrenstaat(page: Page, omschrijving: string): Promise<{
  periodeSleutel: string;
  medewerkerId: number;
  urenstaatId: number;
  versie: number;
}> {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();

  const ik = await (await page.request.get('/server/auth/me.php')).json() as Json;
  const bootstrap = await (await page.request.get('/server/api/bootstrap.php')).json() as Json;
  const medewerkerId = Number((bootstrap.employees as Json[]).find(
    item => Number(item.user_id) === Number((ik.user as Json).id))?.id || 0);
  expect(medewerkerId).toBeGreaterThan(0);
  const periodeSleutel = await ongebruiktePeriode(page, medewerkerId);

  const uren = {
    period: periodeSleutel, contractual_hours: 160, billable_hours: 8, leave_hours: 0, sickness_hours: 0,
    day_entries: [{ work_date: `${periodeSleutel}-01`, hours: 8, description: omschrijving }],
  };
  const concept = await schrijf(page, '/server/api/timesheets.php', { action: 'save_draft', ...uren });
  expect(concept.status, JSON.stringify(concept.body)).toBe(200);
  const ingediend = await schrijf(page, '/server/api/timesheets.php', {
    action: 'submit', ...uren, expected_version: Number((concept.body.timesheet as Json | undefined)?.version || 0),
  });
  expect(ingediend.status, JSON.stringify(ingediend.body)).toBe(200);
  const ingediendeUrenstaat = await leesUrenstaat(page, periodeSleutel, medewerkerId);
  const urenstaatId = Number(ingediendeUrenstaat.id || 0);
  expect(urenstaatId, 'de urenstaat hoort te bestaan').toBeGreaterThan(0);
  expect(String(ingediendeUrenstaat.status), 'de urenstaat hoort ingediend te zijn').toBe('submitted');

  const klanturenstaat = await schrijf(page, '/server/api/customer-timesheets.php', {
    action: 'mark_skipped', period: periodeSleutel, employee_id: medewerkerId,
    review_note: 'De klanturenstaat is al rechtstreeks naar Path Backoffice gemaild.',
  });
  expect(klanturenstaat.status, `de klanturenstaat-route hoort gereed te zijn: ${JSON.stringify(klanturenstaat.body)}`).toBe(200);

  await page.request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': await csrf(page) } });
  await loginPage.open();
  await loginPage.loginAsAdmin();
  const bevestigd = await schrijf(page, '/server/api/customer-timesheets.php', {
    action: 'confirm_external', period: periodeSleutel, employee_id: medewerkerId, review_note: 'Ontvangst extern gecontroleerd.',
  });
  expect(bevestigd.status, `extern bevestigen hoort te slagen: ${JSON.stringify(bevestigd.body)}`).toBe(200);

  const goedgekeurd = await schrijf(page, '/server/api/timesheets.php', {
    action: 'approve', period: periodeSleutel, employee_id: medewerkerId,
    expected_version: Number((await leesUrenstaat(page, periodeSleutel, medewerkerId)).version || 0),
  });
  expect(goedgekeurd.status, JSON.stringify(goedgekeurd.body)).toBe(200);
  const urenstaat = await leesUrenstaat(page, periodeSleutel, medewerkerId);
  expect(String(urenstaat.status), 'de urenstaat hoort goedgekeurd te zijn voordat er gefactureerd wordt').toBe('approved');

  return { periodeSleutel, medewerkerId, urenstaatId, versie: Number(urenstaat.version || 0) };
}
