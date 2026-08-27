import { expect, type APIRequestContext, type Page } from '@playwright/test';

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
  if (await knop.count() === 0) return; // al goedgekeurd
  await expect(knop).toBeVisible();
  const schrijf = page.waitForResponse((r) =>
    r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST');
  await knop.click();
  await schrijf;
}

/**
 * Rondt de verzending af via de echte GUI-knop "Controle afronden". Dat is het
 * pad waar de browser de jsPDF-conceptfactuur maakt en als concept_pdf_base64
 * naar de server stuurt -- die PDF wordt de definitieve factuur. Een lock via de
 * API zonder concept levert alleen de platte serverfallback op.
 */
export async function guiFinaliseInvoice(page: Page, employeeId: number, period: string): Promise<void> {
  await page.locator('button[data-view="dashboard"]:visible').first().click();
  const taak = page.locator(`[data-admin-task-invoice="${employeeId}"][data-period-key="${period}"]`).first();
  await expect(taak, 'de taak "Verzending controleren" hoort klaar te staan na goedkeuring').toBeVisible({ timeout: 15_000 });
  await taak.click();
  await expect(page.locator('#modal')).toBeVisible();
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
