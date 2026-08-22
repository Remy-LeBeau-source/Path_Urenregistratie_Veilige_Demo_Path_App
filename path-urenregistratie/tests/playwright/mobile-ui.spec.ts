import { expect, test, type Page } from '@playwright/test';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { LoginPage } from './pages/LoginPage';
import { attachBusinessScreenshot } from './reporting/uiAttachments';

const MOBILE_PERIOD = '2026-01';
const CORRECTION_MESSAGE = 'Controleer dag 2: dit moet 4 uur zijn.';

type MockAuthUser = {
  id: number;
  company_id: number;
  email: string;
  display_name: string;
  role: 'employee' | 'administrator';
  force_password_change: boolean;
};

async function isolateFrontendState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage restrictions in the browser sandbox.
    }
  });

  await page.route('**/server/api.php?action=state*', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, state: null }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  let authSessionUser: MockAuthUser | null = null;

  await page.route('**/server/auth/csrf.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, csrf_token: 'mobile-test-csrf-token' }) });
  });

  await page.route('**/server/auth/me.php*', async route => {
    if (!authSessionUser) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: false, csrf_token: 'mobile-test-csrf-token', user: null }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: true, csrf_token: 'mobile-test-csrf-token', user: authSessionUser }) });
  });

  await page.route('**/server/auth/login.php*', async route => {
    const payload = route.request().postDataJSON() as { email?: string; password?: string } | null;
    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '');

    const admin: MockAuthUser = { id: 1, company_id: 1, email: 'gio@example.invalid', display_name: 'Gio Maatsen', role: 'administrator', force_password_change: false };
    const employee: MockAuthUser = { id: 2, company_id: 1, email: 'stasjo@example.invalid', display_name: 'Stasjo van Bakel', role: 'employee', force_password_change: false };

    const userMap: Record<string, MockAuthUser> = {
      'gio@example.invalid': admin,
      'stasjo@example.invalid': employee,
    };

    const user = userMap[email] || null;
    if (!user || !password) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'invalid-credentials', message: 'E-mailadres of wachtwoord is onjuist.' }) });
      return;
    }

    authSessionUser = user;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, csrf_token: 'mobile-test-csrf-token', user }) });
  });

  await page.route('**/server/auth/logout.php*', async route => {
    authSessionUser = null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  const bootstrapPayload = {
    ok: true,
    companies: [{
      id: 1,
      trade_name: 'Path Consultancy',
      legal_name: 'Path Consultancy',
      app_name: 'Uren & Facturatie',
      support_name: 'Path Backoffice',
      support_email: 'backoffice@pathconsultancy.nl',
      payment_term_days: 30,
      brand_primary: '#0d1b38',
      brand_accent: '#3abd9d',
      chamber_of_commerce_number: '89320018',
      vat_number: 'NL001622017B32',
      iban: 'NL95INGB0006947972',
      address_line: 'Du Perronstraat 12',
      postal_code: '3067 HN',
      city: 'Rotterdam',
      customer_timesheet_reminder_enabled: 1,
      customer_timesheet_reminder_time: '15:00',
      customer_timesheet_overdue_workdays: 2,
    }],
    users: [
      { id: 1, company_id: 1, email: 'gio@example.invalid', display_name: 'Gio Maatsen', role: 'administrator', active: 1 },
      { id: 2, company_id: 1, email: 'stasjo@example.invalid', display_name: 'Stasjo van Bakel', role: 'employee', active: 1 },
      { id: 3, company_id: 1, email: 'joyce@example.invalid', display_name: 'Joyce van der Steenhoven', role: 'administrator', active: 1 },
    ],
    employees: [
      { id: 2, user_id: 2, full_name: 'Stasjo van Bakel', job_title: 'Test Engineer', active: 1, employment_start_date: '2026-01-01', weekly_contract_hours: 36 },
    ],
    assignments: [],
    counterparties: [],
    assignment_mail_routes: [],
    mail_recipients: [],
  };

  await page.route('**/server/api/bootstrap.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(bootstrapPayload) });
  });

  await page.route('**/server/api/dashboard.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, per_maand: [] }) });
  });

  await page.route('**/server/api/invoices.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) });
  });

  await page.route('**/server/api/notifications.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) });
  });

  await page.route('**/server/api/announcements.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) });
  });

  await page.route('**/server/api/email-queue.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) });
  });

  await page.route('**/server/api/mail-acceptance.php', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        enabled: false,
        ready: false,
        issues: ['De acceptatieconsole staat uit in de testfixture.'],
        scenarios: [],
      }),
    });
  });

  await page.route('**/server/api/staff.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, employees: bootstrapPayload.employees }) });
  });

  await page.route('**/server/api/settings.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, settings: {} }) });
  });

  await page.route('**/server/api/users.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, users: bootstrapPayload.users }) });
  });

  await page.route('**/server/api/customer-timesheets.php*', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) });
  });
}

async function mockTimesheetWrites(page: Page): Promise<void> {
  let writeVersion = 100;
  let mockStatus: 'draft' | 'submitted' | 'correction' | 'approved' = 'draft';
  let mockReviewNote = '';
  let mockApprovedAt: string | null = null;
  let mockApprovedBy: number | null = null;
  const mockCorrectionHistory: Array<{
    id: number;
    requested_by: number;
    requested_by_name: string;
    correction_message: string;
    requested_at: string;
    resubmitted_at: string | null;
  }> = [];

  await page.route('**/server/api/timesheets.php**', async route => {
    const method = route.request().method().toUpperCase();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          found: true,
          period: MOBILE_PERIOD,
          employee_id: 2,
          timesheet: {
            id: 9000,
            status: mockStatus,
            contractual_hours: 160,
            billable_hours: mockStatus === 'draft' ? 0 : 12,
            leave_hours: 0,
            sickness_hours: 0,
            employee_note: null,
            review_note: mockReviewNote || null,
            day_entries: [
              { work_date: `${MOBILE_PERIOD}-01`, hours: 8, description: 'Mobile review dag 1' },
              { work_date: `${MOBILE_PERIOD}-02`, hours: 8, description: 'Mobile review dag 2' },
            ],
            submitted_at: mockStatus === 'submitted' || mockStatus === 'approved' ? new Date().toISOString() : null,
            approved_at: mockApprovedAt,
            approved_by: mockApprovedBy,
            version: writeVersion,
            latest_correction: mockCorrectionHistory.at(-1) || null,
            correction_history: mockCorrectionHistory,
          },
        }),
      });
      return;
    }

    if (method !== 'POST') {
      await route.continue();
      return;
    }

    const payload = route.request().postDataJSON() as { action?: string; correction_message?: string };
    const action = String(payload?.action || 'save_draft');
    const correctionMessage = String(payload?.correction_message || CORRECTION_MESSAGE);
    const previousStatus = mockStatus;

    writeVersion += 1;

    if (action === 'submit') {
      if (previousStatus === 'correction' && mockCorrectionHistory.length) {
        mockCorrectionHistory[mockCorrectionHistory.length - 1].resubmitted_at = new Date().toISOString();
      }
      mockStatus = 'submitted';
      mockApprovedAt = null;
      mockApprovedBy = null;
    } else if (action === 'request_correction') {
      mockStatus = 'correction';
      mockReviewNote = correctionMessage;
      mockApprovedAt = null;
      mockApprovedBy = null;
      mockCorrectionHistory.push({
        id: mockCorrectionHistory.length + 1,
        requested_by: 100,
        requested_by_name: 'Beheerder',
        correction_message: correctionMessage,
        requested_at: new Date().toISOString(),
        resubmitted_at: null,
      });
    } else if (action === 'approve') {
      mockStatus = 'approved';
      mockApprovedAt = new Date().toISOString();
      mockApprovedBy = 100;
    } else {
      mockStatus = previousStatus === 'correction' ? 'correction' : 'draft';
      mockApprovedAt = null;
      mockApprovedBy = null;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        period: MOBILE_PERIOD,
        employee_id: 2,
        timesheet: {
          id: 9000,
          status: mockStatus,
          contractual_hours: 160,
          billable_hours: mockStatus === 'draft' ? 0 : 12,
          leave_hours: 0,
          sickness_hours: 0,
          employee_note: null,
          review_note: mockReviewNote || null,
          day_entries: [
            { work_date: `${MOBILE_PERIOD}-01`, hours: 8, description: 'Mobile review dag 1' },
            { work_date: `${MOBILE_PERIOD}-02`, hours: 8, description: 'Mobile review dag 2' },
          ],
          submitted_at: mockStatus === 'submitted' || mockStatus === 'approved' ? new Date().toISOString() : null,
          approved_at: mockApprovedAt,
          approved_by: mockApprovedBy,
          version: writeVersion,
          latest_correction: mockCorrectionHistory.at(-1) || null,
          correction_history: mockCorrectionHistory,
        },
        audit_event: action === 'approve'
          ? 'timesheet.approved'
          : action === 'request_correction'
            ? 'timesheet.correction_requested'
            : action === 'submit' && previousStatus === 'correction'
              ? 'timesheet.resubmitted'
              : action === 'submit'
                ? 'timesheet.submitted'
                : 'timesheet.draft_saved',
      }),
    });
  });
}

async function setPeriod(page: Page, periodKey: string): Promise<void> {
  const changed = await page.evaluate(nextPeriod => {
    const periodSetter = (window as typeof window & { setPeriod?: (value: string) => boolean }).setPeriod;
    if (typeof periodSetter !== 'function') throw new Error('Appfunctie setPeriod ontbreekt.');
    return periodSetter(nextPeriod);
  }, periodKey);
  expect(changed).toBe(true);
  await expect(page.locator('#period-picker')).toHaveValue(periodKey);
}

async function openView(page: Page, view: string): Promise<void> {
  await page.locator(`button[data-view="${view}"]:visible`).first().click();
}

async function waitForEditableTimesheetInputs(page: Page, timeout = 20_000): Promise<void> {
  await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/, { timeout });
  await expect(page.locator('#hours-grid')).toBeVisible({ timeout });
  const inputs = page.locator('#hours-grid .hours-input:not([disabled]):visible');
  await expect.poll(async () => await inputs.count(), { timeout }).toBeGreaterThan(0);
  await expect(inputs.first()).toBeVisible({ timeout });
}

async function submitTimesheetAndWaitForServer(page: Page): Promise<void> {
  const submitResponse = page.waitForResponse(response => {
    if (!response.url().includes('/server/api/timesheets.php') || response.request().method() !== 'POST') return false;
    try {
      const payload = response.request().postDataJSON() as { action?: string } | null;
      return payload?.action === 'submit';
    } catch {
      return false;
    }
  });

  await page.locator('#submit-timesheet').click();
  expect((await submitResponse).ok()).toBe(true);
  await expect(page.locator('#timesheet-status')).toHaveText('Ingediend', { timeout: 15_000 });
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test('[MOB-H-001] mobiele login navigatie en dashboard blijven volledig bereikbaar', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  await isolateFrontendState(page);

  await test.step('Given de mobiele loginpagina', async () => {
    await loginPage.open();
    await assertNoHorizontalOverflow(page);
    await expect(page.locator('#login-screen')).toBeVisible();
    await expect(page.locator('.login-brand img')).toBeVisible();
    await expect(page.locator('#auth-login-email')).toBeVisible();
    await page.locator('#auth-login-submit').scrollIntoViewIfNeeded();
    await expect(page.locator('#auth-login-submit')).toBeVisible();
  });

  await test.step('When een administrator inlogt en door de mobiele navigatie gaat', async () => {
    await loginPage.loginAsAdmin();
    clearConsoleErrors(errors);
    await expect(page.locator('.mobile-brand-home')).toBeVisible();
    await expect(page.locator('#mobile-switch-role')).toBeVisible();
    await expect(page.locator('.mobile-version-badge')).toBeVisible();
    await expect(page.locator('.mobile-version-badge')).toHaveText(/Versie 0\.9\.\d+/);
    await expect(page.locator('#quick-reset-demo')).toBeVisible();
    const resetBox = await page.locator('#quick-reset-demo').boundingBox();
    expect(resetBox?.height || 0).toBeGreaterThanOrEqual(42);
    await expect(page.locator('button[data-view="dashboard"]:visible')).toBeVisible();
    await page.locator('.mobile-brand-home').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#view-dashboard .metric-card').first()).toBeVisible();
    await expect(page.locator('#hero-task-total')).toBeVisible();
    await expect(page.locator('#admin-task-summary')).toBeVisible();
    await page.locator('#hero-backoffice-filter').click();
    await expect(page.locator('#admin-task-title')).toHaveText('Acties bij Backoffice per maand');
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    for (const toggle of await page.locator('[data-admin-task-month-toggle]').all()) {
      await toggle.click();
    }
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(7);
    await page.locator('#hero-employee-filter').click();
    await expect(page.locator('#admin-task-title')).toHaveText('Wacht op medewerkers per maand');
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    for (const toggle of await page.locator('[data-admin-task-month-toggle]').all()) {
      await toggle.click();
    }
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(5);
    await expect(page.locator('#customer-timesheet-admin-list .customer-timesheet-admin-row')).toHaveCount(4);
    await expect(page.locator('.workflow-overview .workflow-step')).toHaveCount(4);
    await expect(page.locator('#dashboard-employee-rows .dashboard-team-action')).toHaveCount(4);
    await assertNoHorizontalOverflow(page);
  });

  await test.step('Then Home en rolwissel blijven bereikbaar zonder console- of page-errors', async () => {
    await openView(page, 'invoices');
    await expect(page.locator('.mobile-brand-home')).toBeVisible();
    await expect(page.locator('#mobile-switch-role')).toBeVisible();
    await page.locator('.mobile-brand-home').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await page.locator('#quick-reset-demo').click();
    await expect(page.locator('#modal-title')).toHaveText('Alle lokale wijzigingen wissen?');
    await expect(page.locator('#modal-confirm')).toHaveText('Voorbeeldgegevens herstellen');
    await page.locator('#modal-cancel').click();
    await expect(page.locator('#modal')).toBeHidden();
    await attachBusinessScreenshot(page, 'Business state · Mobile dashboard');
    expect(errors).toEqual([]);
  });
});

test('[MOB-H-002] mobiele medewerker kan concepturen opslaan indienen en documentupload bereiken', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  await isolateFrontendState(page);
  await mockTimesheetWrites(page);

  await test.step('Given een medewerker met een mobiele schrijfbare maand', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    clearConsoleErrors(errors);
    await expect(page.locator('#employee-dashboard-next-label')).toHaveText(/Volgende actie|Deze maand/);
    if (await page.locator('#employee-open-overview').isVisible()) {
      const firstMonth = page.locator('#employee-open-overview-list [data-employee-open-month]').first();
      const firstToggle = firstMonth.locator('[data-employee-open-month-toggle]');
      await expect(firstToggle).toHaveAttribute('aria-expanded', 'false');
      await firstToggle.click();
      await expect(firstToggle).toHaveAttribute('aria-expanded', 'true');
      await expect(firstMonth.locator('[data-employee-action-row]').first()).toBeVisible();
      await expect(firstMonth.locator('[data-employee-open-action]').first()).toBeVisible();
    }
    await assertNoHorizontalOverflow(page);
    await openView(page, 'timesheet');
    await setPeriod(page, MOBILE_PERIOD);
  });

  await test.step('When uren als concept worden gewijzigd en daarna ingediend', async () => {
    await waitForEditableTimesheetInputs(page);
    const firstInput = page.locator('#hours-grid .hours-input:not([disabled]):visible').first();
    await expect(firstInput).toBeVisible({ timeout: 10_000 });
    const draftResponse = page.waitForResponse(response => response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
    await firstInput.fill('8');
    await firstInput.press('Enter');
    expect((await draftResponse).ok()).toBe(true);
    await expect(page.locator('#timesheet-status')).toHaveText('Nog invullen');

    await submitTimesheetAndWaitForServer(page);
  });

  await test.step('Then klanturenstaat en notificaties blijven mobiel bereikbaar', async () => {
    await expect(page.locator('#customer-timesheet-upload-panel')).toBeVisible();
    await expect(page.locator('#customer-timesheet-file')).toBeAttached();
    await expect(page.locator('#customer-timesheet-submit')).toBeVisible();
    await expect(async () => {
      await page.locator('#notification-button').click();
      await expect(page.locator('#notification-panel')).toBeVisible();
    }).toPass();
    await page.keyboard.press('Escape');
    await assertNoHorizontalOverflow(page);
    await attachBusinessScreenshot(page, 'Business state · Uren ingediend en upload bereikbaar');
    expect(errors).toEqual([]);
  });
});

test('[MOB-H-003] mobiele correctie herindiening en administratieve goedkeuring zijn bereikbaar', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  await isolateFrontendState(page);
  await mockTimesheetWrites(page);
  let employeeName = '';

  await test.step('Given de medewerker mobiel uren indient', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    clearConsoleErrors(errors);
    await openView(page, 'timesheet');
    await setPeriod(page, MOBILE_PERIOD);
    await waitForEditableTimesheetInputs(page);
    employeeName = (await page.locator('#timesheet-employee').textContent() || '').trim();
    const inputs = page.locator('#hours-grid .hours-input:not([disabled]):visible');
    await expect(inputs).toHaveCount(2, { timeout: 10_000 });
    await inputs.nth(0).fill('8');
    await inputs.nth(1).fill('8');
    await submitTimesheetAndWaitForServer(page);
  });

  await test.step('When de administrator mobiel een correctie vraagt', async () => {
    await loginPage.logout();
    await loginPage.loginAsAdmin();
    await openView(page, 'approvals');
    await setPeriod(page, MOBILE_PERIOD);
    const card = page.locator(`article.approval-card[data-approval-period="${MOBILE_PERIOD}"]`).filter({ hasText: employeeName }).first();
    await expect(card).toBeVisible();
    await card.locator('[data-request-correction]').click();
    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#correction-reason').fill(CORRECTION_MESSAGE);
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then de medewerker de melding leest aanpast en opnieuw indient', async () => {
    await loginPage.logout();
    await loginPage.loginAsEmployee();
    await openView(page, 'timesheet');
    await setPeriod(page, MOBILE_PERIOD);
    await waitForEditableTimesheetInputs(page);
    await expect(page.locator('#timesheet-status')).toHaveText('Correctie nodig');
    await expect(page.locator('#timesheet-correction-banner')).toBeVisible();
    await expect(page.locator('#timesheet-correction-message')).toContainText('Controleer dag 2');
    const inputs = page.locator('#hours-grid .hours-input:not([disabled]):visible');
    await expect(inputs).toHaveCount(2, { timeout: 10_000 });
    await inputs.nth(1).fill('4');
    await submitTimesheetAndWaitForServer(page);
  });

  await test.step('And de administrator mobiel goedkeurt', async () => {
    await loginPage.logout();
    await loginPage.loginAsAdmin();
    await openView(page, 'approvals');
    await setPeriod(page, MOBILE_PERIOD);
    const card = page.locator(`article.approval-card[data-approval-period="${MOBILE_PERIOD}"]`).filter({ hasText: employeeName }).first();
    await expect(card).toBeVisible();
    await card.locator('[data-approve]').click();
    await expect(card).toHaveCount(0, { timeout: 15_000 });
    await assertNoHorizontalOverflow(page);
    await attachBusinessScreenshot(page, 'Business state · Mobile goedkeuring afgerond');
    expect(errors).toEqual([]);
  });
});

test('[MOB-N-004] mobiele facturen touch targets en modals blijven binnen viewport', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  await isolateFrontendState(page);

  await test.step('Given een administrator in het mobiele factuuroverzicht', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    clearConsoleErrors(errors);
    await openView(page, 'invoices');
    await expect(page.locator('#invoice-period-title')).toBeVisible();
    if (await page.locator('#invoice-detail-toggle').isVisible()) await page.locator('#invoice-detail-toggle').click();
  });

  await test.step('Then de brede factuurtabel als mobiele kaartweergave rendert', async () => {
    const invoiceRows = page.locator('#invoice-rows tr');
    await expect(invoiceRows.first()).toBeVisible();
    await expect(page.locator('.invoice-table thead')).toBeHidden();
    expect(await invoiceRows.first().evaluate(element => getComputedStyle(element).display)).toBe('block');
    const firstCell = invoiceRows.first().locator('td').first();
    expect(await firstCell.evaluate(element => getComputedStyle(element).display)).toBe('grid');
    expect(await firstCell.evaluate(element => getComputedStyle(element, '::before').content)).toContain('Factuur');
    await assertNoHorizontalOverflow(page);
  });

  await test.step('And touch controls en bevestigingsmodal binnen viewport blijven', async () => {
    await openView(page, 'settings');
    await page.locator('#reset-demo').click();
    await expect(page.locator('#modal')).toBeVisible();
    const layout = await page.evaluate(() => {
      const modal = document.querySelector('.modal') as HTMLElement;
      const confirm = document.querySelector('#modal-confirm') as HTMLElement;
      const controls = ['#mobile-switch-role', '#reset-demo', '#modal-confirm']
        .map(selector => document.querySelector(selector) as HTMLElement)
        .filter(Boolean)
        .map(element => element.getBoundingClientRect());
      const modalRect = modal.getBoundingClientRect();
      const confirmRect = confirm.getBoundingClientRect();
      return {
        modalFits: modalRect.top >= 0 && modalRect.bottom <= window.innerHeight,
        confirmFits: confirmRect.top >= 0 && confirmRect.bottom <= window.innerHeight,
        touchTargetsFit: controls.every(rect => rect.width >= 32 && rect.height >= 32),
      };
    });
    expect(layout.modalFits).toBe(true);
    expect(layout.confirmFits).toBe(true);
    expect(layout.touchTargetsFit).toBe(true);
    await page.locator('#modal-close').click();
    await expect(page.locator('.mobile-brand-home')).toBeVisible();
    await expect(page.locator('#mobile-switch-role')).toBeVisible();
    await attachBusinessScreenshot(page, 'Business state · Mobile facturen en modal');
    expect(errors).toEqual([]);
  });
});

test('[MOB-H-005] mobiele verzendadministratie blijft leesbaar en toont geen geheime inhoud', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  await isolateFrontendState(page);

  await page.route('**/server/api/email-queue.php*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [{
          id: 955,
          invoice_id: 7,
          invoice_number: 'PATH-2026-007',
          channel: 'broker',
          recipient_email: 'info@pathconsultancy.nl',
          subject_snapshot: 'Factuur PATH-2026-007 – juli 2026',
          attachment_policy: 'invoice',
          status: 'sent',
          attempt_count: 1,
          dry_run: false,
          sent_at: '2026-08-14 00:45:00',
          created_at: '2026-08-14 00:44:00',
          body_snapshot: 'GEHEIME-INHOUD-MAG-NIET-ZICHTBAAR-ZIJN',
        }],
      }),
    });
  });
  await page.route('**/server/api/mail-acceptance.php', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      enabled: true,
      ready: true,
      issues: [],
      scenarios: [{
        key: 'broker_bundle',
        label: 'Broker: factuur',
        recipient: 'info@pathconsultancy.nl',
        attachment_count: 1,
        ready: true,
        issues: [],
      }],
    }),
  }));

  await test.step('Given een beheerder de mobiele Instellingen opent', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    clearConsoleErrors(errors);
    await openView(page, 'settings');
    // Op een telefoon beginnen de instellingenpanelen dichtgeklapt, anders is het
    // scherm bijna elf schermen lang. Openen wat je nodig hebt hoort bij de flow.
    const verzendKop = page.locator('#view-settings .settings-card', { has: page.locator('#mail-delivery-history-title') }).locator('.settings-card-heading');
    if (await verzendKop.count() > 0) await verzendKop.first().click();
    await expect(page.locator('#mail-delivery-history-title')).toHaveText('Recente e-mails');
  });

  await test.step('Then de verzendregistratie als leesbare kaart binnen het scherm staat', async () => {
    const history = page.locator('#mail-delivery-history-list');
    const item = history.locator('.mail-delivery-history-item');
    await expect(item).toHaveCount(1);
    await expect(history).toContainText('info@pathconsultancy.nl');
    await expect(history).toContainText('Factuur');
    await expect(history).toContainText('Verzonden');
    expect(await item.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1);
    await assertNoHorizontalOverflow(page);
  });

  await test.step('And geheime inhoud verborgen blijft en Vernieuwen een touchdoel is', async () => {
    const history = page.locator('#mail-delivery-history-list');
    const refresh = page.locator('#refresh-mail-delivery-history');
    await expect(history).not.toContainText('GEHEIME-INHOUD-MAG-NIET-ZICHTBAAR-ZIJN');
    await refresh.scrollIntoViewIfNeeded();
    const box = await refresh.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await refresh.click();
    await expect(refresh).toBeEnabled();
    expect(errors).toEqual([]);
  });

  await test.step('And de losse mailacceptatieactie binnen het scherm blijft met een volwaardig touchdoel', async () => {
    const consolePanel = page.locator('#mail-acceptance-console');
    const action = page.locator('[data-mail-acceptance-scenario="broker_bundle"]');
    await expect(consolePanel).toContainText('info@pathconsultancy.nl');
    await expect(consolePanel).toContainText('1 gecontroleerde PDF-bijlage');
    await action.scrollIntoViewIfNeeded();
    const box = await action.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await assertNoHorizontalOverflow(page);
  });
});

test('[MOB-H-006] een uitgenodigde collega stelt op de telefoon een wachtwoord in en ziet een duidelijke bevestiging', async ({ page }) => {
  // An invitation mail is usually opened on a phone, so the one screen a new
  // colleague sees before they can work must hold up on a small viewport:
  // both fields reachable, the confirmation readable, and no sideways scroll.
  const errors = captureConsoleErrors(page);
  await isolateFrontendState(page);

  const token = 'a'.repeat(64);
  let resetPayload: Record<string, unknown> | null = null;

  await page.route('**/server/auth/reset-password.php', async route => {
    resetPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Password updated successfully.' }),
    });
  });

  await test.step('Given de uitgenodigde collega de link uit de mail opent op de telefoon', async () => {
    await page.goto(`/index.html#reset-password=${token}`);
    await expect(page).not.toHaveURL(/reset-password=/);
    await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  await test.step('When beide wachtwoordvelden op het kleine scherm worden ingevuld', async () => {
    const newPassword = page.locator('#auth-reset-new-password');
    const confirmPassword = page.locator('#auth-reset-confirm-password');
    await expect(newPassword).toBeVisible();
    await expect(confirmPassword).toBeVisible();
    await newPassword.fill('RuimVoldoendeLang2026!');
    await confirmPassword.fill('RuimVoldoendeLang2026!');

    const submit = page.locator('#auth-reset-complete-submit');
    const box = await submit.boundingBox();
    expect(box).not.toBeNull();
    // Touch targets stay tappable on a phone.
    expect(box!.height).toBeGreaterThanOrEqual(40);
    await submit.click();
  });

  await test.step('Then verschijnt de bevestiging met een tapbare knop en past alles binnen het scherm', async () => {
    expect(resetPayload).not.toBeNull();
    expect(String((resetPayload as Record<string, unknown>).token)).toBe(token);

    const feedback = page.locator('#auth-reset-complete-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Gelukt!');

    const gotoLogin = page.locator('#auth-reset-goto-login');
    await expect(gotoLogin).toBeVisible();
    const loginBox = await gotoLogin.boundingBox();
    expect(loginBox).not.toBeNull();
    expect(loginBox!.height).toBeGreaterThanOrEqual(40);
    await assertNoHorizontalOverflow(page);

    await gotoLogin.click();
    await expect(page.locator('#auth-login-form')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  expect(errors, errors.join('\n')).toEqual([]);
  await attachBusinessScreenshot(page, 'Mobiel · wachtwoord instellen na uitnodiging');
});

test('[MOB-H-007] een medewerker leest mededelingen op de telefoon zonder afgekapte tekst', async ({ page }) => {
  // Announcements are how the office reaches everyone at once, and most
  // employees read them on a phone. A long message must stay fully readable
  // without the page scrolling sideways.
  const errors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  await isolateFrontendState(page);

  const longMessage = 'Vanaf maandag geldt een nieuwe aanlevertermijn voor de klanturenstaat. '
    + 'Lever het document uiterlijk op de vijfde werkdag aan, zodat de facturatie op tijd verwerkt kan worden.';

  // In auth mode the employee's announcement archive is built from their
  // notifications, not from the announcements endpoint, so mock that source.
  await page.route('**/server/api/notifications.php*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        count: 1,
        items: [{
          id: 9001,
          announcement_id: 9001,
          notification_type: 'announcement',
          title: 'Nieuwe aanlevertermijn klanturenstaat',
          message: longMessage,
          target_route: 'employee-announcements',
          read_at: null,
          created_at: '2026-08-20 09:00:00',
        }],
      }),
    });
  });

  // This case is about reading an announcement, not about hours. Stub the
  // timesheet read so a warm-up fetch that races the fresh session cannot log a
  // 401 and fail the console-error assertion for an unrelated reason.
  await page.route('**/server/api/timesheets.php**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, found: false }),
  }));

  await test.step('Given een ingelogde medewerker op de telefoon', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    clearConsoleErrors(errors);
    await assertNoHorizontalOverflow(page);
  });

  await test.step('When de medewerker de mededelingen opent', async () => {
    await page.locator('button[data-view="employee-announcements"]:visible').first().click();
    await expect(page.locator('#view-employee-announcements')).toHaveClass(/is-active/);
  });

  await test.step('Then is de volledige mededeling leesbaar en scrollt de pagina niet zijwaarts', async () => {
    const list = page.locator('#employee-announcement-list');
    await expect(list).toContainText('Nieuwe aanlevertermijn klanturenstaat');
    // The whole message must be present, not cut off at a fixed width.
    await expect(list).toContainText('uiterlijk op de vijfde werkdag');
    await assertNoHorizontalOverflow(page);
  });

  expect(errors, errors.join('\n')).toEqual([]);
  await attachBusinessScreenshot(page, 'Mobiel · mededeling lezen');
});

test('[MOB-H-008] elk hoofdscherm blijft op een telefoon leesbaar en bedienbaar', async ({ page }) => {
  // Doorgemeten op 412px. Voor deze fix stonden er 89 tikdoelen onder de 44px en
  // 107 teksten onder de 11px, en werden de instellingenpanelen 87px afgesneden.
  // Deze case houdt die norm vast: wie later iets toevoegt met 9px-tekst of een
  // knop van 28px, ziet dat hier meteen terug in plaats van pas op een toestel.
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsAdmin();

  const meet = async () => page.evaluate(() => {
    const doc = document.documentElement;
    const zichtbaar = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const omschrijf = (el: Element) => {
      const e = el as HTMLElement;
      return (e.tagName + (e.id ? '#' + e.id : '')).slice(0, 40);
    };
    const afgesneden: string[] = [];
    document.querySelectorAll('.view.is-active *').forEach(el => {
      if (!zichtbaar(el)) return;
      // Een eigen horizontale scroller mag breder zijn dan het scherm.
      if (el.closest('.table-wrap')) return;
      if (el.getBoundingClientRect().right > doc.clientWidth + 1) afgesneden.push(omschrijf(el));
    });
    const kleineDoelen: string[] = [];
    document.querySelectorAll('.view.is-active button, .view.is-active select, .view.is-active textarea, .view.is-active input:not([type=checkbox])').forEach(el => {
      if (!zichtbaar(el)) return;
      if (el.getBoundingClientRect().height < 44) kleineDoelen.push(omschrijf(el) + '=' + Math.round(el.getBoundingClientRect().height));
    });
    return { afgesneden: [...new Set(afgesneden)], kleineDoelen: [...new Set(kleineDoelen)] };
  });

  for (const view of ['approvals', 'invoices', 'announcements', 'employees'] as const) {
    await test.step(`Het scherm ${view} blijft binnen het scherm en bedienbaar`, async () => {
      await page.locator(`button[data-view="${view}"]:visible`).first().click();
      await expect(page.locator(`#view-${view}`)).toHaveClass(/is-active/);
      const uitslag = await meet();
      expect(uitslag.afgesneden, `${view}: inhoud valt buiten het scherm — ${uitslag.afgesneden.join(', ')}`).toEqual([]);
      expect(uitslag.kleineDoelen, `${view}: tikdoelen onder 44px — ${uitslag.kleineDoelen.join(', ')}`).toEqual([]);
    });
  }

  await test.step('Instellingen valt niet meer buiten het scherm', async () => {
    await page.locator('button[data-view="settings"]:visible').first().click();
    await expect(page.locator('#view-settings')).toHaveClass(/is-active/);
    const uitslag = await meet();
    expect(uitslag.afgesneden, `instellingen: inhoud valt buiten het scherm — ${uitslag.afgesneden.join(', ')}`).toEqual([]);
  });
});

test('[MOB-H-009] instellingen en urenstaat zijn op een telefoon te overzien', async ({ page }) => {
  // Instellingen was 10,9 schermen scrollen en de urenstaat schoof zijwaarts weg
  // onder je duim terwijl je cijfers typte. Deze case houdt beide vast: panelen
  // beginnen dicht en open je zelf, en de urenstaat past binnen het scherm.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsAdmin();

  await test.step('Given de instellingen beginnen dichtgeklapt', async () => {
    await page.locator('button[data-view="settings"]:visible').first().click();
    await expect(page.locator('#view-settings')).toHaveClass(/is-active/);

    const panelen = page.locator('#view-settings .settings-card[data-settings-collapsible="true"]');
    expect(await panelen.count(), 'de instellingenpanelen moeten inklapbaar zijn').toBeGreaterThan(0);
    expect(
      await page.locator('#view-settings .settings-card[data-settings-open="true"]').count(),
      'ze horen dicht te beginnen, anders blijft het scherm even lang'
    ).toBe(0);

    const schermen = await page.evaluate(() => document.documentElement.scrollHeight / document.documentElement.clientHeight);
    expect(schermen, 'dichtgeklapt mag het scherm hooguit een paar schermlengtes zijn').toBeLessThan(4);
  });

  await test.step('When een paneel wordt geopend, verschijnt de inhoud', async () => {
    const eerste = page.locator('#view-settings .settings-card[data-settings-collapsible="true"]').first();
    await eerste.locator('.settings-card-heading').click();
    await expect(eerste).toHaveAttribute('data-settings-open', 'true');
    await expect(eerste.locator('.settings-card-heading')).toHaveAttribute('aria-expanded', 'true');
  });

  await test.step('And de urenstaat past binnen het scherm zonder zijwaarts schuiven', async () => {
    await loginPage.logout();
    await loginPage.loginAsEmployee();
    await page.locator('button[data-view="timesheet"]:visible').first().click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);

    const meting = await page.evaluate(() => {
      const wrap = document.querySelector('.table-wrap') as HTMLElement | null;
      const tabel = document.querySelector('.hours-table') as HTMLElement | null;
      return {
        tabel: tabel ? Math.round(tabel.getBoundingClientRect().width) : 0,
        viewport: document.documentElement.clientWidth,
        zijwaarts: wrap ? wrap.scrollWidth > wrap.clientWidth + 1 : false,
      };
    });
    expect(meting.zijwaarts, 'de urenstaat mag op een telefoon niet zijwaarts schuiven').toBe(false);
    expect(meting.tabel, 'de urenstaat moet binnen het scherm passen').toBeLessThanOrEqual(meting.viewport);
  });
});
