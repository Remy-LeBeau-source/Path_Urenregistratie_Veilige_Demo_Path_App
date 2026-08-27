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
