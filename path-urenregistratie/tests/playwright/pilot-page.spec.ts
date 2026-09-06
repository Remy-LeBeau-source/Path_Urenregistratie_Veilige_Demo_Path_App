import { expect, Page, test } from '@playwright/test';

// De medewerker-pilot (pilot/1919-medewerker.html) is bewust een STATISCHE
// 1-op-1 reproductie van design-mockups/1414-path-bento-space/medewerker-
// dashboard.jpg: vaste mockup-data, geen live server, geen schrijfacties.
// De Backoffice-pilot (pilot/1919-beheerder.html) is nog wel functioneel en
// servergestuurd; die flows worden hieronder met gemockte endpoints getoetst.

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

test('[PILOT-H-001] beide pilotpagina’s leven naast een ongewijzigde app', async ({ page }) => {
  await test.step('Given de webroot met de app op /', async () => { /* de app blijft de baseline */ });

  await test.step('When de medewerker- en Backoffice-pilot als eigen URL worden opgevraagd', async () => {
    expect((await page.goto('/pilot/1919-medewerker.html'))?.status()).toBe(200);
  });

  await test.step('Then dragen ze de pilot-vlag/marker en delen ze geen code met de app', async () => {
    await expect(page.locator('.pilot-flag')).toContainText('nieuwe medewerkerportal');
    await expect(page.locator('body')).toHaveAttribute('data-pilot-design', 'combo-1414-1919');
    await expect(page.locator('a[href="/"]')).toHaveCount(0);
    await expect(page.locator('script[src*="assets/app.js"], link[href*="assets/styles.css"]')).toHaveCount(0);

    expect((await page.goto('/pilot/1919-beheerder.html'))?.status()).toBe(200);
    await expect(page.locator('.pilot-flag')).toContainText('nieuwe Backofficeportal');
    await expect(page.locator('body')).toHaveAttribute('data-pilot-design', 'combo-1414-1919');
    await expect(page.locator('script[src*="assets/app.js"]')).toHaveCount(0);
  });

  await test.step('And de bestaande app blijft er onaangeroerd naast draaien', async () => {
    await page.goto('/');
    await expect(page.locator('#login-screen')).toBeVisible();
  });
});

test('[PILOT-H-002] medewerker-pilot toont de 1414-look met werkende maand en invoer', async ({ page }) => {
  await test.step('Given de medewerker-pilot', async () => {
    await page.goto('/pilot/1919-medewerker.html');
  });

  await test.step('When de pagina is geladen', async () => {
    await expect(page.locator('.hero h1')).toHaveText('Begin met je uren');
  });

  await test.step('Then staat september klaar met de mockup-uren, invoervelden en de wekenmeter', async () => {
    await expect(page.locator('.monthpick .mlabel')).toHaveText('September 2026');
    // Weekstrook: 7 dagen; ma/di/wo/do gevuld met de mockup-uren, wo actief, vr–zo leeg (zonder voorgevulde nul).
    const days = page.locator('.week li');
    await expect(days).toHaveCount(7);
    await expect(days.nth(0).locator('.hin')).toHaveValue('8,00');
    await expect(days.nth(2)).toHaveClass(/on/);
    await expect(days.nth(3).locator('.hin')).toHaveValue('7,30');
    await expect(days.nth(4).locator('.hin')).toHaveValue('');
    await expect(days.nth(4).locator('.hin')).toHaveAttribute('placeholder', '0,00');
    await expect(page.locator('.week .total .tval')).toHaveText('30,30');
    // Voortgangsmeter in weken (mockup met de afgesproken aanpassing).
    await expect(page.locator('.gauge .ring .num')).toHaveText('1');
    await expect(page.locator('.gauge .pct')).toHaveText('20%');
    // Klanturenstaatkaart: september is nog niet verstuurd, dus geen vinkje.
    await expect(page.locator('.kt')).toHaveAttribute('data-state', 'pending');
    await expect(page.locator('.kt .txt p')).toContainText('Nog niet verstuurd');
    // Vier-stappen-strook.
    await expect(page.locator('.steps li b')).toHaveText([
      'Uren invullen', 'Indienen', 'Controle Backoffice', 'Klanturenstaat',
    ]);
  });
});

test('[PILOT-H-006] medewerker-pilot: uren invullen zonder voorgevulde nul, + stapt met 30 minuten', async ({ page }) => {
  await test.step('Given de medewerker-pilot met september open', async () => {
    await page.goto('/pilot/1919-medewerker.html');
  });

  const vr = page.locator('.week li').nth(4);

  await test.step('When een lege dag wordt ingevuld en met de knoppen bijgesteld', async () => {
    await expect(vr.locator('.hin')).toHaveValue('');
    await vr.locator('.hin').click();
    await vr.locator('.hin').pressSequentially('6');
    await vr.locator('.hin').blur();
    await expect(vr.locator('.hin')).toHaveValue('6,00');
    await expect(page.locator('.week .total .tval')).toHaveText('36,30');
    await vr.locator('.st.pls').click();
    await expect(vr.locator('.hin')).toHaveValue('6,50');
    await vr.locator('.st.mns').click();
    await vr.locator('.st.mns').click();
    await expect(vr.locator('.hin')).toHaveValue('5,50');
  });

  await test.step('Then vergrendelt "Indienen ter controle" de maand', async () => {
    await page.getByRole('button', { name: 'Indienen ter controle' }).click();
    await expect(page.locator('.week .done')).toContainText('Backoffice controleert');
    await expect(page.locator('.week .hin')).toHaveCount(0);
    await expect(page.locator('.gauge .pct')).toHaveText('100%');
  });
});

test('[PILOT-H-007] medewerker-pilot: afgeronde maand toont vergrendelde uren en verzonden klanturenstaat', async ({ page }) => {
  await test.step('Given de medewerker-pilot', async () => {
    await page.goto('/pilot/1919-medewerker.html');
    await expect(page.locator('.monthpick .mlabel')).toHaveText('September 2026');
  });

  await test.step('When augustus wordt gekozen in de maandkeuze', async () => {
    await page.locator('.monthpick').click();
    await page.locator('.monthmenu li[data-key="2026-08"]').click();
  });

  await test.step('Then staan de uren vast en is de klanturenstaat verzonden', async () => {
    await expect(page.locator('.monthpick .mlabel')).toHaveText('Augustus 2026');
    await expect(page.locator('.week .hin')).toHaveCount(0);
    await expect(page.locator('.week li').nth(0).locator('.h')).toHaveText('8,00');
    await expect(page.locator('.gauge .ring .num')).toHaveText('5');
    await expect(page.locator('.gauge .pct')).toHaveText('100%');
    await expect(page.locator('.kt')).toHaveAttribute('data-state', 'sent');
    await expect(page.locator('.kt .txt p')).toHaveText('Gereed en verzonden via e-mail.');
    await expect(page.locator('.kt .check')).toBeVisible();
  });
});

test('[PILOT-H-003] Backoffice: rechtstreeks gemaild blijft oranje tot externe bevestiging, en terugdraaien vraagt bevestiging', async ({ page }) => {
  const state: PilotState = {
    role: 'administrator',
    timesheet: { ...draftTimesheet(), status: 'approved', billable_hours: 40, version: 3 },
    customer: { id: 81, status: 'skipped', review_note: 'Goedkeuring van de uren rechtstreeks per e-mail ontvangen' },
    timesheetActions: [], customerActions: [],
  };
  await mockPilotApi(page, state);

  await test.step('Given een dossier waarvan de klanturenstaat rechtstreeks is gemaild', async () => {
    await page.goto('/pilot/1919-beheerder.html');
    await expect(page.locator('#next-title')).toHaveText('Externe bevestiging vereist');
    await expect(page.locator('.node-external')).toHaveClass(/waiting/);
  });

  await test.step('When Backoffice extern bevestigt met een verplichte reden', async () => {
    await page.locator('[data-action="confirm-external"]').click();
    await page.getByRole('button', { name: 'Extern bevestigd vastleggen' }).click();
    await expect(page.locator('#admin-dialog .error')).toContainText('Kies een reden');
    await page.locator('#external-reason').selectOption({ label: 'Goedkeuring van de uren ontvangen van de klant' });
    await page.getByRole('button', { name: 'Extern bevestigd vastleggen' }).click();
  });

  await test.step('Then wordt de stap groen en kan de bevestiging alleen na een tweede bevestiging terug', async () => {
    await expect(page.locator('.node-external')).toHaveClass(/done/);
    await page.getByRole('button', { name: 'Bevestiging terugdraaien' }).click();
    await expect(page.locator('#admin-dialog')).toContainText('Weet je het zeker?');
    await page.getByRole('button', { name: 'Ja, bevestiging terugdraaien' }).click();
    await expect(page.locator('.node-external')).not.toHaveClass(/done/);
    expect(state.customerActions).toEqual(['confirm_external', 'restore_missing']);
  });
});

test('[PILOT-H-004] Backoffice: geuploade PDF komt ter controle en kan worden goedgekeurd', async ({ page }) => {
  const state: PilotState = {
    role: 'administrator',
    timesheet: { ...draftTimesheet(), status: 'approved', billable_hours: 40, version: 3 },
    customer: { id: 81, status: 'received', review_note: '', storage_key: 'pilot/test.pdf', download_url: '/server/api/customer-timesheets.php?action=download' },
    timesheetActions: [], customerActions: [],
  };
  await mockPilotApi(page, state);

  await test.step('Given een dossier met een ontvangen klanturenstaat-PDF', async () => {
    await page.goto('/pilot/1919-beheerder.html');
    await expect(page.locator('#next-title')).toHaveText('Klanturenstaat controleren');
  });

  await test.step('When Backoffice het document beoordeelt en goedkeurt', async () => {
    await page.getByRole('button', { name: 'Document beoordelen' }).click();
    await expect(page.getByRole('link', { name: 'PDF eerst openen' })).toBeVisible();
    await page.getByRole('button', { name: 'Goedkeuren', exact: true }).click();
  });

  await test.step('Then staat de klanturenstaat-stap op gereed', async () => {
    await expect(page.locator('.node-customer')).toHaveClass(/done/);
    expect(state.customerActions).toEqual(['approve']);
  });
});

test('[PILOT-H-005] Backoffice: correctie vragen zet de ingediende maand terug in de wachtrij', async ({ page }) => {
  const state: PilotState = {
    role: 'administrator',
    timesheet: { ...draftTimesheet(), status: 'submitted', billable_hours: 8, day_entries: [{ work_date: '2026-09-01', hours: 8, description: 'Analyse' }], version: 2 },
    customer: null, timesheetActions: [], customerActions: [],
  };
  await mockPilotApi(page, state);

  await test.step('Given een ingediende maand die Backoffice beoordeelt', async () => {
    await page.goto('/pilot/1919-beheerder.html');
    await page.getByRole('button', { name: 'Uren beoordelen' }).click();
  });

  await test.step('When Backoffice een correctie vraagt zonder reden en daarna met reden', async () => {
    await page.getByRole('button', { name: 'Correctie vragen' }).click();
    await expect(page.locator('#admin-dialog .error')).toContainText('correctiereden');
    await page.locator('#hours-correction-note').fill('Controleer dinsdag 1 september');
    await page.getByRole('button', { name: 'Correctie vragen' }).click();
  });

  await test.step('Then wacht het dossier zichtbaar op gecorrigeerde uren', async () => {
    await expect(page.locator('#next-title')).toHaveText('Wacht op gecorrigeerde uren');
    expect(state.timesheetActions).toEqual(['request_correction']);
  });
});

test('[PILOT-N-001] rollen blijven ook op de pilot-URLs strikt gescheiden', async ({ page }) => {
  const state: PilotState = { role: 'employee', timesheet: draftTimesheet(), customer: null, timesheetActions: [], customerActions: [] };
  await mockPilotApi(page, state);

  await test.step('Given een medewerkersessie', async () => { /* state.role = employee */ });

  await test.step('When de Backoffice-pilot met die sessie wordt geopend', async () => {
    await page.goto('/pilot/1919-beheerder.html');
  });

  await test.step('Then blokkeert de Backoffice-pilot en toont de medewerker-pilot geen Backoffice-onderdelen', async () => {
    await expect(page.locator('#admin-gate')).toBeVisible();
    await expect(page.locator('#admin-gate')).toContainText('Alleen voor Backoffice');

    await page.goto('/pilot/1919-medewerker.html');
    await expect(page.locator('.hero h1')).toHaveText('Begin met je uren');
    await expect(page.getByText('Facturen', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Goedkeuringen', { exact: true })).toHaveCount(0);
  });
});

test('[PILOT-N-002] beide pilots blijven zonder horizontale overflow op telefoon', async ({ page }) => {
  const state: PilotState = { role: 'administrator', timesheet: draftTimesheet(), customer: null, timesheetActions: [], customerActions: [] };
  await mockPilotApi(page, state);
  await page.setViewportSize({ width: 390, height: 844 });

  await test.step('Given een telefoonviewport', async () => { /* 390 x 844 */ });

  await test.step('When beide pilots worden geopend', async () => {
    await page.goto('/pilot/1919-medewerker.html');
  });

  await test.step('Then past alles binnen de breedte en zijn tapdoelen minimaal 42px', async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect((await page.locator('.hero .go').boundingBox())?.height || 0).toBeGreaterThanOrEqual(42);

    await page.goto('/pilot/1919-beheerder.html');
    await expect(page.locator('#admin-app')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect((await page.locator('.employee-card').first().boundingBox())?.height || 0).toBeGreaterThanOrEqual(42);
  });
});
