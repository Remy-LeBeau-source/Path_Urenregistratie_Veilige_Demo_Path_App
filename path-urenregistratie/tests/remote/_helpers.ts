import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { jsPDF } from 'jspdf';

export const SINK = 'giovanno.maatsen@pathconsultancy.nl';

export type Creds = { admin: { email: string; password: string }; employee: { email: string; password: string } };

/** De demo-credentials die de TEST-site zelf voor de autofill vrijgeeft. */
export async function demoCreds(request: APIRequestContext): Promise<Creds> {
  const res = await request.get('/server/auth/local-login-hints.php', { headers: { Accept: 'application/json' } });
  expect(res.status(), 'local-login-hints hoort op TEST beschikbaar te zijn').toBe(200);
  const h = await res.json();
  expect(h.enabled, 'automatische login-fill hoort aan te staan op TEST').toBe(true);
  return {
    admin: { email: 'gio@example.invalid', password: String(h.adminPassword) },
    employee: { email: 'stasjo@example.invalid', password: String(h.employeePassword) },
  };
}

export async function csrf(ctx: { get: APIRequestContext['get'] }): Promise<string> {
  const res = await ctx.get('/server/auth/csrf.php');
  const body = await res.json();
  return String(body.csrf_token || '');
}

export async function apiLogin(request: APIRequestContext, email: string, password: string): Promise<void> {
  const token = await csrf(request);
  const res = await request.post('/server/auth/login.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    data: { email, password },
  });
  expect(res.status(), `API-login voor ${email} hoort te slagen`).toBe(200);
  expect((await res.json()).ok, `API-login voor ${email} hoort ok te melden`).toBe(true);
}

export async function apiLogout(request: APIRequestContext): Promise<void> {
  const token = await csrf(request);
  await request.post('/server/auth/logout.php', { headers: { 'X-CSRF-Token': token } }).catch(() => undefined);
}

/** Zet de gedeelde TEST-baseline transactioneel terug (zoals de publieke smoke doet). */
export async function resetSharedBaseline(request: APIRequestContext, creds: Creds): Promise<void> {
  await apiLogin(request, creds.admin.email, creds.admin.password);
  const token = await csrf(request);
  const res = await request.post('/server/api/test-reset.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    data: { confirm: 'RESET_SHARED_TEST_BASELINE' },
  });
  const body = await res.json().catch(() => ({}));
  expect(res.status(), `baseline-reset hoort te slagen: ${JSON.stringify(body)}`).toBe(200);
  expect(body.ok, 'baseline-reset hoort ok te melden').toBe(true);
  await apiLogout(request);
}

/**
 * Zet de TEST-mailomleiding aan of uit. Met delivery gepauzeerd valt de site
 * terug op dry-run: dan geeft request-reset.php het token in de response terug,
 * zodat de wachtwoordflow zonder toegang tot de postbus te testen is. De aanroeper
 * hoort na afloop altijd weer op true te zetten.
 */
export async function setTestMailDelivery(request: APIRequestContext, enabled: boolean): Promise<void> {
  const token = await csrf(request);
  const res = await request.post('/server/api/email-queue.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    data: { action: 'set-test-delivery', confirm: 'SET_TEST_MAIL_STATE', enabled },
  });
  expect(res.status(), `TEST-maillevering op ${enabled} zetten hoort te slagen: ${await res.text()}`).toBe(200);
}

export async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#login-screen')).toBeVisible();
  await expect(page.locator('#auth-login-submit')).toBeEnabled({ timeout: 20_000 });
  await page.locator('#auth-login-email').fill(email);
  await page.locator('#auth-login-password').fill(password);
  await page.locator('#auth-login-submit').click();
  await expect(page.locator('#app-shell')).toBeVisible({ timeout: 20_000 });
}

export async function uiLogout(page: Page): Promise<void> {
  const desktop = page.locator('#switch-role');
  const mobile = page.locator('#mobile-switch-role');
  if (await desktop.isVisible()) await desktop.click();
  else if (await mobile.isVisible()) await mobile.click();
  await expect(page.locator('#login-screen')).toBeVisible({ timeout: 15_000 });
}

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

export function periodeKey(label: string): string {
  const delen = label.toLowerCase().trim().split(/\s+/);
  return `${delen[1]}-${String(MAANDEN.indexOf(delen[0]) + 1).padStart(2, '0')}`;
}

/**
 * Tekst uit een PDF van server/lib/simple_pdf.php: ongecomprimeerde streams met
 * elke regel als `(escaped) Tj`. Alles wat hier gecontroleerd wordt is ASCII.
 */
export function pdfText(bytes: Buffer): string {
  const ruw = bytes.toString('latin1');
  const regels: string[] = [];
  const patroon = /\(((?:\\.|[^\\()])*)\)\s*Tj/gs;
  let m: RegExpExecArray | null;
  while ((m = patroon.exec(ruw)) !== null) {
    regels.push(m[1].replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')'));
  }
  return regels.join('\n');
}

/** PHP number_format($n, 2, ',', '.') */
export function nlBedrag(waarde: number): string {
  const [heel, deel] = waarde.toFixed(2).split('.');
  return `${heel.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${deel}`;
}

export function btwLabel(pct: number): string {
  return nlBedrag(pct).replace(/0+$/, '').replace(/,$/, '');
}

/** Vult 8 uur op de eerste vrije dag en dient de urenstaat in, als de ingelogde medewerker. */
export async function guiSubmitHours(page: Page): Promise<{ period: string; employeeId: number }> {
  await page.locator('button[data-view="timesheet"]:visible').first().click();
  await expect(page.locator('#timesheet-status')).toBeVisible();
  const period = periodeKey(String(await page.locator('#period-label').textContent() || ''));
  const me = await (await page.request.get('/server/auth/me.php')).json();
  const boot = await (await page.request.get('/server/api/bootstrap.php')).json();
  const employeeId = Number((boot.employees as Array<Record<string, unknown>>)
    .find((e) => Number(e.user_id) === Number(me.user.id))?.id || 0);
  const invoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
  if (await invoer.count()) {
    await invoer.fill('8');
    await invoer.press('Tab');
    const schrijf = page.waitForResponse((r) =>
      r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST');
    await page.locator('#submit-timesheet').click();
    await schrijf;
  }
  return { period, employeeId };
}

/** Keurt de urenstaat van een medewerker goed via het goedkeuringsscherm (als admin). */
export async function guiApprove(page: Page, employeeId: number): Promise<void> {
  await page.locator('button[data-view="approvals"]:visible').first().click();
  const knop = page.locator(`[data-approve="${employeeId}"]`).first();
  if (await knop.count() > 0) {
    await expect(knop).toBeVisible();
    const schrijf = page.waitForResponse((r) =>
      r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST');
    await knop.click();
    await schrijf;
  }
  // Na de goedkeuring de pagina volledig laten hersyncen, zodat de client de
  // factuur als "ready" kent voordat we die via de GUI proberen af te ronden.
  await page.reload();
  await expect(page.locator('#app-shell')).toBeVisible({ timeout: 20_000 });
}

/**
 * Rondt de verzending af via de echte GUI-knop "Controle afronden". Dat is het
 * pad waar de browser de jsPDF-conceptfactuur maakt en als concept_pdf_base64
 * naar de server stuurt -- die PDF wordt de definitieve factuur. Een lock via de
 * API zonder concept levert alleen de platte serverfallback op.
 */
export async function guiFinaliseInvoice(page: Page, employeeId: number, period: string): Promise<void> {
  // showInvoiceDeliveryCheck opent exact dezelfde "Verzending controleren"-modal
  // als de knoppen in het Facturen-scherm en de (standaard ingeklapte)
  // werkvoorraad. Rechtstreeks aanroepen omzeilt alleen de navigatie; de
  // afrondlogica (jsPDF-conceptfactuur maken en meesturen) blijft dezelfde.
  await page.locator('button[data-view="invoices"]:visible').first().click();
  await expect(page.locator('#view-invoices')).toHaveClass(/is-active/);

  // showInvoiceDeliveryCheck opent de "Verzending controleren"-modal alleen als de
  // client de factuur al als "ready" kent. Vlak na een goedkeuring kan die sync
  // nog lopen; daarom herhaald proberen tot de modal opengaat.
  await expect(async () => {
    const geopend = await page.evaluate(([id, key]) => {
      const w = window as unknown as { showInvoiceDeliveryCheck?: (e: number, p: string) => unknown };
      if (typeof w.showInvoiceDeliveryCheck !== 'function') return false;
      w.showInvoiceDeliveryCheck(id, key);
      return true;
    }, [employeeId, period] as [number, string]);
    expect(geopend, 'showInvoiceDeliveryCheck hoort beschikbaar te zijn').toBe(true);
    await expect(page.locator('#modal')).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000, intervals: [1_000, 2_000, 3_000] });
  const bevestig = page.locator('#modal-confirm');
  await expect(bevestig).toHaveText(/Controle afronden/);
  const lock = page.waitForResponse((r) =>
    r.url().includes('/server/api/invoices.php') && r.request().method() === 'POST');
  await bevestig.click();
  const resp = await lock;
  const body = await resp.json().catch(() => ({}));
  expect(resp.ok(), `afronden hoort te slagen: ${JSON.stringify(body)}`).toBe(true);
  // De browser hoort een echte jsPDF-conceptfactuur te hebben meegestuurd.
  const verzonden = resp.request().postDataJSON() as Record<string, unknown>;
  expect(String(verzonden.concept_pdf_base64 || ''),
    'de GUI hoort de jsPDF-conceptfactuur mee te sturen, niet de serverfallback te forceren')
    .not.toBe('');
  await expect(page.locator('#modal')).toBeHidden({ timeout: 15_000 });
}

/**
 * Rondt de factuur af langs exact het pad dat de GUI-knop volgt: de browser maakt
 * met downloadInvoicePdf(..., "base64") de jsPDF-conceptfactuur en die wordt als
 * concept_pdf_base64 met de lock meegestuurd. Zonder afhankelijkheid van de
 * client-state-timing van de modal.
 */
export async function finaliseViaConceptUpload(
  page: Page, employeeId: number, period: string, timesheetId: number,
): Promise<void> {
  await page.locator('button[data-view="invoices"]:visible').first().click();
  const base64 = await page.evaluate(([id, key]) => {
    const w = window as unknown as { downloadInvoicePdf?: (e: number, p: string, m: string) => unknown };
    if (typeof w.downloadInvoicePdf !== 'function') return '';
    const out = w.downloadInvoicePdf(id, key, 'base64');
    return typeof out === 'string' ? out : '';
  }, [employeeId, period] as [number, string]);
  expect(base64.length, 'de browser hoort de jsPDF-conceptfactuur te maken').toBeGreaterThan(20_000);
  const bytes = Buffer.from(base64, 'base64');
  expect(bytes.toString('latin1'), 'de conceptfactuur is een jsPDF-document').toMatch(/\/Producer\s*\(jsPDF/);
  expect(bytes.toString('latin1'), 'de te versturen factuur mag geen CONCEPT-markering dragen')
    .not.toMatch(/CONCEPT ?- ?NIET VERZONDEN|CONCEPTVOORBEELD/);

  const token = await csrf(page.request);
  const lock = await page.request.post('/server/api/invoices.php', {
    headers: { 'X-CSRF-Token': token },
    data: { action: 'lock', timesheet_id: timesheetId, concept_pdf_base64: base64 },
  });
  const body = await lock.json().catch(() => ({}));
  expect(lock.ok(), `afronden met de jsPDF-conceptfactuur hoort te slagen: ${JSON.stringify(body)}`).toBe(true);
}

/**
 * De opgeslagen factuur-PDF hoort de jsPDF-conceptfactuur te zijn (branded, met
 * lettertypes) en niet de platte simple_pdf-serverfallback.
 */
export async function assertConceptInvoicePdf(page: Page, invoiceId: number): Promise<void> {
  const dl = await page.request.get(`/server/api/invoices.php?action=download&invoice_id=${invoiceId}`);
  expect(dl.status(), 'de factuur-PDF hoort op te halen te zijn').toBe(200);
  const bytes = Buffer.from(await dl.body());
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(bytes.subarray(-2048).toString('latin1')).toContain('%%EOF');
  const head = bytes.toString('latin1');
  expect(head, 'de definitieve factuur hoort de jsPDF-conceptfactuur te zijn, niet de platte serverfallback')
    .toMatch(/\/Producer\s*\(jsPDF/);
  expect(bytes.length, 'een branded jsPDF-factuur is fors groter dan de platte fallback').toBeGreaterThan(60_000);
}

export type NewEmployee = { id: number; email: string; password: string; name: string };

/** Een minimale maar geldige PDF-bytesequence voor uploadtests. */
export function validPdfBytes(note = 'charter'): Buffer {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Klanturenstaat - acceptatiecontrole', 20, 24);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Controle: ${note}`, 20, 36);
  pdf.text('Dit document is een volledige, leesbare PDF met een geldige paginaboom en xref-tabel.', 20, 46);
  return Buffer.from(pdf.output('arraybuffer'));
}

/**
 * Maakt op de TEST-site een verse medewerker aan via de beheerder-API, zet met
 * het reset-token een wachtwoord en geeft de inloggegevens terug. Muteert
 * gedeelde TEST-data; de aanroepende suite hoort in afterAll de baseline terug
 * te zetten. Mail wordt tijdens het zetten van het wachtwoord gepauzeerd zodat
 * request-reset.php het token in de response teruggeeft.
 */
export async function createDemoEmployee(
  request: APIRequestContext,
  creds: Creds,
  opts: { customerTimesheet?: boolean; invoiceTemplate?: string; namePrefix?: string } = {},
): Promise<NewEmployee> {
  const uniek = `${Date.now()}`.slice(-8) + String(Math.floor(Math.random() * 900 + 100));
  const kort = uniek.slice(-4);
  const naam = `${opts.namePrefix || 'TEST Charter'} ${uniek}`;
  const email = `charter-${uniek}@example.invalid`;
  const password = `Charter!${uniek}`;

  await apiLogin(request, creds.admin.email, creds.admin.password);
  const employee: Record<string, unknown> = {
    name: naam, email, role: 'Consultant',
    startDate: new Date().toISOString().slice(0, 10),
    weeklyHours: 40, rate: 85,
    client: `Klantbedrijf ${uniek} B.V.`, broker: `Broker ${uniek} B.V.`,
    brokerEmail: `broker-${uniek}@example.invalid`,
    invoiceProject: `Detachering ${uniek}`,
    projectCode: `TST${kort}`,
    agreementNumber: `OVK-${kort}`,
    // Zonder expliciet sjabloon valt de client-render terug op "{klant}-..."
    // en dat token wordt niet ingevuld -> een letterlijk {klant} in het
    // factuurnummer op de PDF. Altijd een concreet sjabloon meegeven.
    invoiceTemplate: opts.invoiceTemplate || `TST${kort}-{jaar}-{maand}`,
  };
  if (opts.customerTimesheet) employee.customerTimesheetExpected = true;

  const t = await csrf(request);
  const maak = await request.post('/server/api/staff.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t },
    data: { action: 'upsert_employee', employee, mailRecipients: [], sendInvitation: false },
  });
  expect(maak.ok(), `medewerker aanmaken hoort te slagen: ${await maak.text()}`).toBe(true);
  const id = Number((await maak.json()).employee_id || 0);
  expect(id, 'de nieuwe medewerker hoort een id te krijgen').toBeGreaterThan(0);

  await setTestMailDelivery(request, false);
  try {
    const rt = await csrf(request);
    const reset = await request.post('/server/auth/request-reset.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': rt },
      data: { email },
    });
    const token = String((await reset.json()).token || '');
    expect(token, 'het reset-token hoort in de response te staan').toMatch(/^[a-f0-9]{64}$/);
    const ct = await csrf(request);
    const zet = await request.post('/server/auth/reset-password.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': ct },
      data: { token, new_password: password },
    });
    expect(zet.ok(), `wachtwoord zetten hoort te slagen: ${await zet.text()}`).toBe(true);
  } finally {
    await setTestMailDelivery(request, true);
  }
  await apiLogout(request);
  return { id, email, password, name: naam };
}

/** Het huidige periodesleutel JJJJ-MM op basis van de systeemklok. */
export function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Keurt een ingediende urenstaat deterministisch goed via de API (de aanroeper
 * moet met een beheerdersessie zijn ingelogd). Betrouwbaarder dan de GUI-knop
 * voor data-integriteitscases die niet de goedkeur-UI testen.
 */
export async function apiApprove(request: APIRequestContext, period: string, employeeId: number): Promise<void> {
  const cur = await (await request.get(
    `/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`)).json();
  const status = String((cur.timesheet as Record<string, unknown> | undefined)?.status || '');
  expect(status, `alleen een ingediende urenstaat kan worden goedgekeurd (was: ${status})`).toBe('submitted');
  const token = await csrf(request);
  const r = await request.post('/server/api/timesheets.php', {
    headers: { 'X-CSRF-Token': token },
    data: {
      action: 'approve', period, employee_id: employeeId,
      expected_version: Number((cur.timesheet as Record<string, unknown>).version || 1),
    },
  });
  expect(r.ok(), `goedkeuren via API hoort te slagen: ${await r.text()}`).toBe(true);
}

/**
 * Maakt via de beheerder-API een verse administrator aan en zet met het
 * reset-token een wachtwoord. Zelfde patroon als createDemoEmployee.
 */
export async function createDemoAdmin(
  request: APIRequestContext,
  creds: Creds,
  namePrefix = 'TEST Beheerder',
): Promise<{ id: number; email: string; password: string; name: string }> {
  const uniek = `${Date.now()}`.slice(-8) + String(Math.floor(Math.random() * 900 + 100));
  const name = `${namePrefix} ${uniek}`;
  const email = `admin-${uniek}@example.invalid`;
  const password = `Beheer!${uniek}`;

  await apiLogin(request, creds.admin.email, creds.admin.password);
  const t = await csrf(request);
  const maak = await request.post('/server/api/staff.php', {
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t },
    data: { action: 'upsert_admin', admin: { name, email, active: true }, sendInvitation: false },
  });
  expect(maak.ok(), `beheerder aanmaken hoort te slagen: ${await maak.text()}`).toBe(true);
  const id = Number((await maak.json()).user_id || 0);
  expect(id, 'de nieuwe beheerder hoort een user_id te krijgen').toBeGreaterThan(0);

  await setTestMailDelivery(request, false);
  try {
    const rt = await csrf(request);
    const reset = await request.post('/server/auth/request-reset.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': rt },
      data: { email },
    });
    const token = String((await reset.json()).token || '');
    expect(token, 'het reset-token hoort in de response te staan').toMatch(/^[a-f0-9]{64}$/);
    const ct = await csrf(request);
    const zet = await request.post('/server/auth/reset-password.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': ct },
      data: { token, new_password: password },
    });
    expect(zet.ok(), `wachtwoord zetten hoort te slagen: ${await zet.text()}`).toBe(true);
  } finally {
    await setTestMailDelivery(request, true);
  }
  await apiLogout(request);
  return { id, email, password, name };
}
