import { expect, Page, test } from '@playwright/test';

type Role = 'employee' | 'administrator';
type PilotState = {
  role: Role;
  timesheet: Record<string, any> | null;
  customer: Record<string, any> | null;
  timesheetActions: string[];
  customerActions: string[];
};

const employee = {
  id: 11, company_id: 1, user_id: 22, full_name: 'Shawn-Douglas Nahar', job_title: 'Consultancy',
  weekly_contract_hours: 40, active: 1,
};
const assignment = { id: 31, employee_id: 11, assignment_name: 'Path Consultancy', active: 1 };

async function mockPilotApi(page: Page, state: PilotState) {
  await page.route('**/server/auth/me.php', async (route) => {
    const user = state.role === 'employee'
      ? { id: 22, company_id: 1, email: 'shawn@example.test', display_name: employee.full_name, role: 'employee' }
      : { id: 2, company_id: 1, email: 'anne@example.test', display_name: 'Anne Verbeek', role: 'administrator' };
    await route.fulfill({ json: { ok: true, authenticated: true, csrf_token: 'pilot-csrf', user } });
  });
  await page.route('**/server/auth/csrf.php', (route) => route.fulfill({ json: { ok: true, csrf_token: 'pilot-csrf' } }));
  await page.route('**/server/auth/logout.php', (route) => route.fulfill({ json: { ok: true } }));
  await page.route('**/server/api/bootstrap.php', async (route) => {
    await route.fulfill({ json: {
      ok: true,
      companies: [{ id: 1, legal_name: 'Path Consultancy', leave_sick_entry_enabled: 1 }],
      employees: [employee], assignments: [assignment],
      periods: [{ id: 91, year: 2026, month: 8, period_key: '2026-08' }, { id: 92, year: 2026, month: 9, period_key: '2026-09' }],
    } });
  });
  await page.route('**/server/api/invoices.php**', (route) => route.fulfill({ json: { ok: true, items: [] } }));
  await page.route('**/server/api/timesheets.php**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: state.timesheet ? { ok: true, found: true, timesheet: state.timesheet } : { ok: true, found: false } });
      return;
    }
    const payload = route.request().postDataJSON() as Record<string, any>;
    const action = String(payload.action || '');
    state.timesheetActions.push(action);
    const previousVersion = Number(state.timesheet?.version || 0);
    state.timesheet = {
      ...state.timesheet, ...payload,
      status: action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : action === 'request_correction' ? 'correction' : 'draft',
      review_note: action === 'request_correction' ? String(payload.correction_message || '') : null,
      version: previousVersion + 1,
    };
    await route.fulfill({ json: { ok: true, timesheet: state.timesheet } });
  });
  await page.route('**/server/api/customer-timesheets.php**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: state.customer ? { ok: true, found: true, customer_timesheet: state.customer } : { ok: true, found: false } });
      return;
    }
    const post = route.request().postData() || '';
    const action = ['confirm_external', 'restore_missing', 'mark_skipped', 'request_resubmit', 'approve', 'submit', 'save_draft']
      .find((candidate) => post.includes(candidate)) || '';
    state.customerActions.push(action);
    if (action === 'restore_missing') state.customer = null;
    else if (action === 'confirm_external') state.customer = { ...state.customer, status: 'skipped', review_note: 'Extern bevestigd: Goedkeuring van de uren ontvangen van de klant' };
    else if (action === 'mark_skipped') state.customer = { id: 81, status: 'skipped', review_note: 'Goedkeuring van de uren rechtstreeks per e-mail ontvangen' };
    else if (action === 'approve') state.customer = { ...state.customer, status: 'approved', review_note: '' };
    else if (action === 'request_resubmit') state.customer = { ...state.customer, status: 'resubmit', review_note: 'Nieuwe PDF nodig' };
    else state.customer = { id: 81, status: action === 'submit' ? 'received' : 'draft', review_note: '', storage_key: 'pilot/test.pdf', download_url: '/server/api/customer-timesheets.php?action=download' };
    await route.fulfill({ json: { ok: true, customer_timesheet: state.customer } });
  });
}

const draftTimesheet = () => ({
  id: 71, employee_id: 11, period: '2026-09', status: 'draft', contractual_hours: 176,
  billable_hours: 0, leave_hours: 0, sickness_hours: 0, day_entries: [], version: 1,
});

test('[PILOT-H-001] beide 1919-portals leven naast de bestaande app', async ({ page }) => {
  await expect((await page.goto('/pilot/1919-medewerker.html'))?.status()).toBe(200);
  await expect(page.locator('.pilot-flag')).toContainText('nieuwe medewerkerportal');
  await expect(page.locator('script[src="1919-portal.js"]')).toHaveCount(1);
  await expect(page.locator('script[src*="assets/app.js"]')).toHaveCount(0);

  await expect((await page.goto('/pilot/1919-beheerder.html'))?.status()).toBe(200);
  await expect(page.locator('.pilot-flag')).toContainText('nieuwe Backofficeportal');
  await expect(page.locator('script[src="1919-beheerder.js"]')).toHaveCount(1);
  await expect(page.locator('script[src*="assets/app.js"]')).toHaveCount(0);

  await page.goto('/');
  await expect(page.locator('#login-screen')).toBeVisible();
});

test('[PILOT-H-002] medewerker schrijft uren via dezelfde API en draagt de maand over', async ({ page }) => {
  const state: PilotState = { role: 'employee', timesheet: draftTimesheet(), customer: null, timesheetActions: [], customerActions: [] };
  await mockPilotApi(page, state);
  await page.goto('/pilot/1919-medewerker.html');

  await expect(page.locator('#pilot-month-button')).toContainText('September 2026');
  await expect(page.getByText('/ 160 uur')).toHaveCount(0);
  await expect(page.getByText('Facturen', { exact: true })).toHaveCount(0);
  await page.locator('[data-open-day]:not([disabled])').first().click();
  await page.locator('#pilot-day-hours').fill('8');
  await page.locator('#pilot-day-description').fill('Analyse en advies');
  await page.getByRole('button', { name: 'Dag opslaan' }).click();
  await expect(page.locator('.portal-summary')).toContainText('8 uur');

  await page.getByRole('button', { name: 'Uren indienen' }).click();
  await expect(page.getByRole('heading', { name: 'Weet je het zeker?' })).toBeVisible();
  await page.getByRole('button', { name: 'Ja, uren indienen' }).click();
  await expect(page.locator('.portal-handoff')).toHaveClass(/show/);
  await expect(page.locator('.portal-status-banner')).toContainText('Backoffice controleert');
  expect(state.timesheetActions).toEqual(['save_draft', 'submit']);
});

test('[PILOT-H-003] rechtstreeks gemaild blijft oranje tot Backoffice extern bevestigt', async ({ page }) => {
  const state: PilotState = {
    role: 'employee', timesheet: { ...draftTimesheet(), status: 'approved', billable_hours: 40, version: 3 },
    customer: null, timesheetActions: [], customerActions: [],
  };
  await mockPilotApi(page, state);
  await page.goto('/pilot/1919-medewerker.html');
  await page.getByRole('button', { name: 'Urenstaat aanleveren' }).click();
  await page.getByRole('button', { name: /Al rechtstreeks gemaild/ }).click();
  await expect(page.locator('.portal-help')).toContainText('blijft oranje en blokkerend');
  await page.locator('#pilot-mailed-reason').selectOption({ label: 'Goedkeuring van de uren rechtstreeks per e-mail ontvangen' });
  await page.getByRole('button', { name: 'Registreren' }).click();
  await expect(page.locator('.portal-document-status')).toContainText('bevestiging nodig');
  await expect(page.locator('.portal-document-status')).toHaveClass(/waiting/);
  expect(state.customerActions).toEqual(['mark_skipped']);

  state.role = 'administrator';
  await page.goto('/pilot/1919-beheerder.html');
  await expect(page.locator('#next-title')).toHaveText('Externe bevestiging vereist');
  await expect(page.locator('.node-external')).toHaveClass(/waiting/);
  await page.locator('[data-action="confirm-external"]').click();
  await page.getByRole('button', { name: 'Extern bevestigd vastleggen' }).click();
  await expect(page.locator('#admin-dialog .error')).toContainText('Kies een reden');
  await page.locator('#external-reason').selectOption({ label: 'Goedkeuring van de uren ontvangen van de klant' });
  await page.getByRole('button', { name: 'Extern bevestigd vastleggen' }).click();
  await expect(page.locator('.node-external')).toHaveClass(/done/);
  await expect(page.getByRole('button', { name: 'Bevestiging terugdraaien' })).toBeVisible();

  await page.getByRole('button', { name: 'Bevestiging terugdraaien' }).click();
  await expect(page.locator('#admin-dialog')).toBeVisible();
  await expect(page.locator('#admin-dialog')).toContainText('Weet je het zeker?');
  await page.getByRole('button', { name: 'Ja, bevestiging terugdraaien' }).click();
  await expect(page.locator('.node-external')).not.toHaveClass(/done/);
  expect(state.customerActions).toEqual(['mark_skipped', 'confirm_external', 'restore_missing']);
});

test('[PILOT-H-004] PDF-aanlevering komt bij Backoffice ter controle en kan worden goedgekeurd', async ({ page }) => {
  const state: PilotState = {
    role: 'employee', timesheet: { ...draftTimesheet(), status: 'approved', billable_hours: 40, version: 3 },
    customer: null, timesheetActions: [], customerActions: [],
  };
  await mockPilotApi(page, state);
  await page.goto('/pilot/1919-medewerker.html');
  await page.getByRole('button', { name: 'Urenstaat aanleveren' }).click();
  await page.getByRole('button', { name: /PDF of afbeelding uploaden/ }).click();
  await page.locator('#pilot-customer-file').setInputFiles({ name: 'urenstaat-september.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 pilot') });
  await page.getByRole('button', { name: 'Indienen bij Backoffice' }).click();
  await expect(page.locator('.portal-document-status')).toHaveText('Bij Backoffice');

  state.role = 'administrator';
  await page.goto('/pilot/1919-beheerder.html');
  await expect(page.locator('#next-title')).toHaveText('Klanturenstaat controleren');
  await page.getByRole('button', { name: 'Document beoordelen' }).click();
  await expect(page.getByRole('link', { name: 'PDF eerst openen' })).toBeVisible();
  await page.getByRole('button', { name: 'Goedkeuren', exact: true }).click();
  await expect(page.locator('.node-customer')).toHaveClass(/done/);
  expect(state.customerActions).toEqual(['submit', 'approve']);
});

test('[PILOT-H-005] Backoffice-correctie maakt de ingediende maand weer bewerkbaar', async ({ page }) => {
  const state: PilotState = {
    role: 'administrator',
    timesheet: { ...draftTimesheet(), status: 'submitted', billable_hours: 8, day_entries: [{ work_date: '2026-09-01', hours: 8, description: 'Analyse' }], version: 2 },
    customer: null, timesheetActions: [], customerActions: [],
  };
  await mockPilotApi(page, state);
  await page.goto('/pilot/1919-beheerder.html');
  await page.getByRole('button', { name: 'Uren beoordelen' }).click();
  await page.getByRole('button', { name: 'Correctie vragen' }).click();
  await expect(page.locator('#admin-dialog .error')).toContainText('correctiereden');
  await page.locator('#hours-correction-note').fill('Controleer dinsdag 1 september');
  await page.getByRole('button', { name: 'Correctie vragen' }).click();
  await expect(page.locator('#next-title')).toHaveText('Wacht op gecorrigeerde uren');

  state.role = 'employee';
  await page.goto('/pilot/1919-medewerker.html');
  await expect(page.locator('.portal-summary')).toContainText('Correctie gevraagd');
  await expect(page.locator('[data-open-day]:not([disabled])').first()).toBeEnabled();
  expect(state.timesheetActions).toEqual(['request_correction']);
});

test('[PILOT-H-006] maandkeuze blijft in de sessie en uitloggen herstelt de actuele maand', async ({ page }) => {
  const state: PilotState = { role: 'employee', timesheet: draftTimesheet(), customer: null, timesheetActions: [], customerActions: [] };
  await mockPilotApi(page, state);
  await page.goto('/pilot/1919-medewerker.html');
  await page.locator('#pilot-month-button').click();
  await page.getByRole('menuitem').filter({ hasText: 'Augustus 2026' }).click();
  await expect(page.locator('#pilot-month-button')).toContainText('Augustus 2026');
  await page.reload();
  await expect(page.locator('#pilot-month-button')).toContainText('Augustus 2026');

  await page.locator('#pilot-profile-button').click();
  await page.getByRole('button', { name: 'Uitloggen' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => sessionStorage.getItem('path-1919-session-user'))).toBeNull();
  await page.goto('/pilot/1919-medewerker.html');
  await expect(page.locator('#pilot-month-button')).toContainText('September 2026');
});

test('[PILOT-N-001] rollen blijven ook op de pilot-URLs strikt gescheiden', async ({ page }) => {
  const state: PilotState = { role: 'employee', timesheet: draftTimesheet(), customer: null, timesheetActions: [], customerActions: [] };
  await mockPilotApi(page, state);
  await page.goto('/pilot/1919-beheerder.html');
  await expect(page.locator('#admin-gate')).toBeVisible();
  await expect(page.locator('#admin-gate')).toContainText('Alleen voor Backoffice');

  state.role = 'administrator';
  await page.goto('/pilot/1919-medewerker.html');
  await expect(page.locator('.portal-gate')).toBeVisible();
  await expect(page.locator('.portal-gate')).toContainText('Alleen voor medewerkers');
});

test('[PILOT-N-002] beide pilots blijven bedienbaar zonder horizontale overflow op telefoon', async ({ page }) => {
  const state: PilotState = { role: 'employee', timesheet: draftTimesheet(), customer: null, timesheetActions: [], customerActions: [] };
  await mockPilotApi(page, state);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pilot/1919-medewerker.html');
  await expect(page.locator('.portal-loading')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const dayButton = page.locator('[data-open-day]:not([disabled])').first();
  await expect(dayButton).toBeVisible();
  expect((await dayButton.boundingBox())?.height || 0).toBeGreaterThanOrEqual(42);

  state.role = 'administrator';
  await page.goto('/pilot/1919-beheerder.html');
  await expect(page.locator('#admin-app')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect((await page.locator('.employee-card').first().boundingBox())?.height || 0).toBeGreaterThanOrEqual(42);
});
