import { expect, test, type Page } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { setLeaveSickEntryEnabled } from './helpers/companySettings';
import { LoginPage } from './pages/LoginPage';
import { attachBusinessScreenshot } from './reporting/uiAttachments';

const PERIOD_KEY = '2026-01';
const CORRECTION_MESSAGE = 'Controleer dag 2: dit moet 4 uur zijn.';

async function openView(page: Page, view: 'dashboard' | 'timesheet' | 'approvals') {
  await page.locator(`button[data-view="${view}"]:visible`).first().click();
}

async function setPeriod(page: Page, periodKey: string) {
  await page.evaluate((nextPeriod) => {
    const control = document.querySelector('#period-picker') as HTMLInputElement | null;
    if (!control) {
      throw new Error('Period control #period-picker niet gevonden.');
    }
    control.value = nextPeriod;
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }, periodKey);
  await expect(page.locator('#period-picker')).toHaveValue(periodKey);
}

async function fillFirstTwoHours(page: Page, first: string, second: string) {
  const inputs = page.locator('#hours-grid .hours-input:not([disabled])');
  await expect(inputs.first()).toBeVisible();
  await inputs.nth(0).fill(first);
  await inputs.nth(1).fill(second);
}

// Deze specs gebruiken PERIOD_KEY (januari 2026) voor medewerker 2, wat nu vóór
// diens echte TEST-indiensttreding (mei 2026) ligt. Zonder deze mock blokkeert
// setPeriod() de gemockte periode als "vóór indiensttreding". We forceren de
// startdatum hier terug naar ruim vóór PERIOD_KEY; de rest van bootstrap blijft
// echt. Was voorheen ook al nodig voor hermetische stabiliteit in de volle
// seriële run (zie TS-REV-UI-H-008).
async function mockEmploymentStartDate(page: Page) {
  await page.route('**/server/api/bootstrap.php', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    if (Array.isArray(body?.employees)) {
      for (const employee of body.employees) {
        if (Number(employee.id) === 2) {
          employee.employment_start_date = '2025-01-01';
          employee.employment_end_date = null;
          employee.active = 1;
        }
      }
    }
    await route.fulfill({ response, json: body });
  });
}

test('[TS-REV-UI-H-008] browserflow: correctie, herindiening, goedkeuring en heropening blijven servergestuurd', async ({ page }) => {
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
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

  await mockEmploymentStartDate(page);

  // Deze case gaat over de urenstaat-reviewketen. Klanturenstaten mogen de
  // dashboardprioriteit niet vertroebelen met een openstaande actie die een
  // eerdere case op de gedeelde TEST heeft achtergelaten.
  await page.route('**/server/api/customer-timesheets.php**', async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') {
      await route.continue();
      return;
    }
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        found: false,
        period: url.searchParams.get('period') || '',
        employee_id: Number(url.searchParams.get('employee_id') || 0),
        customer_timesheet: null,
      }),
    });
  });

  await page.route('**/server/api/timesheets.php**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (method === 'GET') {
      const url = new URL(request.url());
      const requestedEmployee = Number(url.searchParams.get('employee_id') || 0);
      const requestedPeriod = String(url.searchParams.get('period') || '');
      if (requestedEmployee !== 2 || requestedPeriod !== PERIOD_KEY) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            found: false,
            period: requestedPeriod,
            employee_id: requestedEmployee,
            timesheet: null,
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          found: true,
          period: PERIOD_KEY,
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
              { work_date: `${PERIOD_KEY}-01`, hours: 8, description: 'Reviewflow dag 1' },
              { work_date: `${PERIOD_KEY}-02`, hours: 8, description: 'Reviewflow dag 2' },
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

    let action = 'save_draft';
    let correctionMessage = '';
    try {
      const payload = request.postDataJSON() as { action?: string; correction_message?: string };
      action = String(payload?.action || 'save_draft');
      correctionMessage = String(payload?.correction_message || '');
    } catch {
      action = 'save_draft';
    }

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
        correction_message: correctionMessage || CORRECTION_MESSAGE,
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
        period: PERIOD_KEY,
        employee_id: 2,
        timesheet: {
          id: 9000,
          status: mockStatus,
          contractual_hours: 160,
          billable_hours: mockStatus === 'approved' ? 12 : 12,
          leave_hours: 0,
          sickness_hours: 0,
          employee_note: null,
          review_note: mockReviewNote || null,
          day_entries: [
            { work_date: `${PERIOD_KEY}-01`, hours: 8, description: 'Reviewflow dag 1' },
            { work_date: `${PERIOD_KEY}-02`, hours: 8, description: 'Reviewflow dag 2' },
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

  let employeeName = '';

  await test.step('Given de medewerker een urenstaat indient in de browser', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openView(page, 'timesheet');
    await setPeriod(page, PERIOD_KEY);

    employeeName = (await page.locator('#timesheet-employee').textContent() || '').trim();
    expect(employeeName.length).toBeGreaterThan(0);

    await fillFirstTwoHours(page, '8', '8');
    const submitWrite = page.waitForRequest((request) =>
      request.url().includes('/server/api/timesheets.php') &&
      request.method() === 'POST' &&
      String((request.postDataJSON() as { action?: string } | null)?.action || '') === 'submit'
    );
    {
      // Indienen is een serverwrite; de zichtbare status volgt pas daarna.
      const indienen = page.waitForResponse(response =>
        response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
      await page.locator('#submit-timesheet').click();
      await indienen;
    }
    await submitWrite;
    expect(mockStatus).toBe('submitted');
    await expect.poll(() => page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { id: number };
        recordFor: (employeeId: number) => { timesheetStatus: string };
      };
      return runtime.recordFor(runtime.currentEmployee().id).timesheetStatus;
    })).toBe('submitted');
    const renderDiagnostic = await page.evaluate(() => {
      const runtime = window as typeof window & { renderAll: () => void };
      try {
        runtime.renderAll();
        return { error: '', status: document.querySelector('#timesheet-status')?.textContent || '' };
      } catch (error) {
        return { error: String(error instanceof Error ? error.stack || error.message : error), status: '' };
      }
    });
    expect(renderDiagnostic.error).toBe('');
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend', { timeout: 15_000 });
  });

  await test.step('When de administrator een correctieverzoek plaatst', async () => {
    await loginPage.logout();
    await loginPage.assertLoggedOut();

    await loginPage.loginAsAdmin();
    await openView(page, 'approvals');
    await setPeriod(page, PERIOD_KEY);

    const approvalCard = page
      .locator(`article.approval-card[data-approval-period="${PERIOD_KEY}"]`)
      .filter({ hasText: employeeName })
      .first();

    await expect(approvalCard).toBeVisible();
    await approvalCard.locator('[data-request-correction]').click();

    await expect(page.locator('#modal')).toBeVisible();
    await page.locator('#correction-reason').fill(CORRECTION_MESSAGE);

    // Ook dit is een serverwrite. In een losse run gaat het net goed, in de volle
    // suite -- met een tragere machine onder belasting -- net niet. Wachten op het
    // antwoord maakt de case ongevoelig voor hoe druk het toevallig is.
    const correctie = page.waitForResponse(response =>
      response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
    await page.locator('#modal-confirm').click();
    await correctie;

    await expect(
      page.locator(`article.approval-card[data-approval-period="${PERIOD_KEY}"]`).filter({ hasText: employeeName })
    ).toHaveCount(0, { timeout: 15_000 });
  });

  await test.step('Then ziet de medewerker het correctieverzoek en dient opnieuw in', async () => {
    await loginPage.logout();
    await loginPage.assertLoggedOut();

    await loginPage.loginAsEmployee();
    await openView(page, 'timesheet');
    await setPeriod(page, PERIOD_KEY);

    await expect(page.locator('#timesheet-status')).toHaveText('Correctie nodig');
    await expect(page.locator('#timesheet-correction-banner')).toBeVisible();
    await expect(page.locator('#timesheet-correction-message')).toContainText('Controleer dag 2');

    await fillFirstTwoHours(page, '8', '4');
    {
      // Indienen is een serverwrite; de zichtbare status volgt pas daarna.
      const indienen = page.waitForResponse(response =>
        response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
      await page.locator('#submit-timesheet').click();
      await indienen;
    }
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend', { timeout: 15_000 });
    await expect(page.locator('#timesheet-correction-banner')).toBeHidden();
  });

  await test.step('And de administrator keurt de herindiening goed', async () => {
    await loginPage.logout();
    await loginPage.assertLoggedOut();

    await loginPage.loginAsAdmin();
    await openView(page, 'approvals');
    await setPeriod(page, PERIOD_KEY);

    const approvalCardAfterResubmit = page
      .locator(`article.approval-card[data-approval-period="${PERIOD_KEY}"]`)
      .filter({ hasText: employeeName })
      .first();

    await expect(approvalCardAfterResubmit).toBeVisible();

    // Goedkeuren is een serverwrite; de kaart verdwijnt pas als die is afgerond.
    // Zonder daarop te wachten meet je de netwerklatentie in plaats van het gedrag,
    // en dat viel hier af en toe om zonder dat er iets mis was.
    const goedkeuring = page.waitForResponse(response =>
      response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
    await approvalCardAfterResubmit.locator('[data-approve]').click();
    await goedkeuring;

    await expect(
      page.locator(`article.approval-card[data-approval-period="${PERIOD_KEY}"]`).filter({ hasText: employeeName })
    ).toHaveCount(0, { timeout: 15_000 });
  });

  await test.step('Then ziet de medewerker de eindstatus Goedgekeurd', async () => {
    await loginPage.logout();
    await loginPage.assertLoggedOut();

    await loginPage.loginAsEmployee();
    await openView(page, 'timesheet');
    await setPeriod(page, PERIOD_KEY);
    await expect(page.locator('#timesheet-status')).toHaveText('Goedgekeurd');
    await attachBusinessScreenshot(page, 'Business state · Timesheet goedgekeurd');
  });

  await test.step('When de administrator de goedkeuring met reden intrekt', async () => {
    await loginPage.logout();
    await loginPage.assertLoggedOut();

    await loginPage.loginAsAdmin();
    await openView(page, 'dashboard');
    await setPeriod(page, PERIOD_KEY);

    const employeeRow = page.locator('#dashboard-employee-rows tr').filter({ hasText: employeeName }).first();
    await expect(employeeRow).toBeVisible();
    await employeeRow.locator('[data-admin-hours-detail]').click();
    await expect(page.locator('#modal-secondary')).toHaveText('Goedkeuring intrekken');
    await page.locator('#modal-secondary').click();
    await page.locator('#reopen-hours-reason').fill('De klant meldt na goedkeuring een afwijking op dag 2.');

    const reopenResponse = page.waitForResponse((response) =>
      response.url().includes('/server/api/timesheets.php') &&
      response.request().method() === 'POST'
    );
    await page.locator('#modal-confirm').click();
    expect((await reopenResponse).status()).toBe(200);
    await expect(page.locator('#modal')).toBeHidden();
  });

  await test.step('Then opent de medewerker de dashboardcorrectie en kan opnieuw indienen', async () => {
    await loginPage.logout();
    await loginPage.assertLoggedOut();

    await loginPage.loginAsEmployee();
    const correctionAction = page.locator('#employee-dashboard-action');
    await expect(correctionAction).toContainText('Open correctie');
    await expect(correctionAction).toHaveAttribute('data-employee-action-period', PERIOD_KEY);
    await correctionAction.click();

    await expect(page.locator('#timesheet-status')).toHaveText('Correctie nodig');
    await expect(page.locator('#timesheet-correction-banner')).toBeVisible();
    await expect(page.locator('#timesheet-correction-message')).toContainText('na goedkeuring');
    await expect(page.locator('#hours-grid .hours-input:not([disabled])').first()).toBeVisible();
    await expect(page.locator('#submit-timesheet')).toBeVisible();
    await expect(page.locator('#submit-timesheet')).toContainText('opnieuw indienen');

    await fillFirstTwoHours(page, '8', '3');
    {
      // Indienen is een serverwrite; de zichtbare status volgt pas daarna.
      const indienen = page.waitForResponse(response =>
        response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
      await page.locator('#submit-timesheet').click();
      await indienen;
    }
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend', { timeout: 15_000 });
    await expect(page.locator('#timesheet-correction-banner')).toBeHidden();
  });
});

test('[TS-REV-UI-H-009] ingediende urenstaat blijft vergrendeld tot Backoffice een correctie vraagt', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await mockEmploymentStartDate(page);

  await page.route('**/server/api/timesheets.php**', async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, found: true, period: PERIOD_KEY, employee_id: 2,
      timesheet: { id: 9001, status: 'submitted', contractual_hours: 160, billable_hours: 16,
        leave_hours: 0, sickness_hours: 0, employee_note: null, review_note: null,
        day_entries: [{ work_date: `${PERIOD_KEY}-01`, hours: 8, description: 'dag' }],
        submitted_at: new Date().toISOString(), approved_at: null, approved_by: null,
        version: 1, latest_correction: null, correction_history: [] } }) });
  });

  await test.step('Given medewerker opent een ingediende urenstaat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openView(page, 'timesheet');
    await setPeriod(page, PERIOD_KEY);
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend', { timeout: 15_000 });
  });

  await test.step('Then zijn invoer en indienactie vergrendeld en wacht de medewerker op Backoffice', async () => {
    await expect(page.locator('#hours-grid .hours-input:not([disabled])')).toHaveCount(0);
    await expect(page.locator('#submit-timesheet')).toBeHidden();
    await expect(page.locator('#submit-timesheet-note')).toBeVisible();
    await expect(page.locator('#submit-timesheet-note')).toContainText('wachten op controle');
  });
});

test('[TS-REV-UI-H-010] submitknop is verborgen bij goedgekeurde urenstaat', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await mockEmploymentStartDate(page);

  await page.route('**/server/api/timesheets.php**', async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, found: true, period: PERIOD_KEY, employee_id: 2,
      timesheet: { id: 9002, status: 'approved', contractual_hours: 160, billable_hours: 16,
        leave_hours: 0, sickness_hours: 0, employee_note: null, review_note: null,
        day_entries: [{ work_date: `${PERIOD_KEY}-01`, hours: 8, description: 'dag' }],
        submitted_at: new Date().toISOString(), approved_at: new Date().toISOString(), approved_by: 1,
        version: 1, latest_correction: null, correction_history: [] } }) });
  });

  await test.step('Given medewerker opent een goedgekeurde urenstaat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openView(page, 'timesheet');
    await setPeriod(page, PERIOD_KEY);
  });

  await test.step('Then is de indienknop verborgen en staat er een statusmelding', async () => {
    await expect(page.locator('#submit-timesheet')).toBeHidden();
    await expect(page.locator('#submit-timesheet-note')).toBeVisible();
    await expect(page.locator('#submit-timesheet-note')).toContainText('goedgekeurd');
  });
});

test('[TS-REV-UI-N-011] localhost kan demo-uren zonder serverversie voor correctie terugsturen', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let reviewWrites = 0;

  await page.route('**/server/api/timesheets.php**', async (route) => {
    if (route.request().method().toUpperCase() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, found: false, period: '2026-08', employee_id: 1 }),
      });
      return;
    }
    reviewWrites += 1;
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Demo-record mag niet naar de server worden geschreven.' }),
    });
  });

  await test.step('Given de ingelogde localhostomgeving een lokaal demo-record zonder serverversie toont', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await openView(page, 'approvals');
  });

  await test.step('When Backoffice Marc met een concrete toelichting terugstuurt', async () => {
    const approvalCard = page
      .locator('article.approval-card[data-approval-period="2026-08"]')
      .filter({ hasText: 'Marc de Roon' });
    await expect(approvalCard).toBeVisible();
    await approvalCard.locator('[data-request-correction]').click();
    await page.locator('#correction-reason').fill('Controleer 14 juli: daar staat 8 uur in plaats van 4 uur.');
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then wordt de lokale status bijgewerkt zonder ongeldige serverwrite', async () => {
    await expect(page.locator('#toast')).toContainText('met toelichting teruggestuurd');
    await expect(page.locator('article.approval-card[data-approval-period="2026-08"]').filter({ hasText: 'Marc de Roon' })).toHaveCount(0);
    expect(reviewWrites).toBe(0);
  });
});

test('[TS-REV-UI-N-012] gefactureerde goedkeuring blijft bij serverweigering vergrendeld', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const approvedPeriod = '2026-07';
  let correctionWrites = 0;

  await page.route('**/server/api/timesheets.php**', async (route) => {
    const request = route.request();
    if (request.method().toUpperCase() === 'GET') {
      const url = new URL(request.url());
      const employeeId = Number(url.searchParams.get('employee_id') || 4);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true,
        found: true,
        period: approvedPeriod,
        employee_id: employeeId,
        timesheet: {
          id: 9012,
          status: 'approved',
          contractual_hours: 144,
          billable_hours: 144,
          leave_hours: 0,
          sickness_hours: 0,
          employee_note: null,
          review_note: null,
          day_entries: [{ work_date: `${approvedPeriod}-03`, hours: 8, description: 'Vergrendelde dag' }],
          submitted_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: 100,
          version: 12,
          latest_correction: null,
          correction_history: [],
        },
      }) });
      return;
    }

    correctionWrites += 1;
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({
      ok: false,
      error: 'timesheet-invoiced',
      message: 'Een goedgekeurde urenstaat kan niet meer worden heropend zodra er een factuur van is gemaakt.',
    }) });
  });

  await test.step('Given Backoffice een goedgekeurde maand met definitieve factuur bekijkt', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await openView(page, 'dashboard');
    await setPeriod(page, approvedPeriod);

    const approvedRow = page.locator('#dashboard-employee-rows tr').filter({ hasText: 'Shawn-Douglas Nahar' });
    await expect(approvedRow).toBeVisible();
    await approvedRow.locator('[data-admin-hours-detail]').click();
    await expect(page.locator('#modal-secondary')).toHaveText('Goedkeuring intrekken');
  });

  await test.step('When de server heropenen wegens facturatie weigert', async () => {
    await page.locator('#modal-secondary').click();
    await page.locator('#reopen-hours-reason').fill('De klant meldt een afwijking na facturatie.');
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then blijft de maand goedgekeurd en krijgt Backoffice een duidelijke blokkade', async () => {
    await expect(page.locator('#modal')).toBeVisible();
    await expect(page.locator('#toast')).toContainText('niet meer worden heropend zodra er een factuur van is gemaakt');
    expect(correctionWrites).toBe(1);
    await page.locator('#modal-cancel').click();
    await expect(page.locator('#dashboard-employee-rows tr').filter({ hasText: 'Shawn-Douglas Nahar' })).toContainText('Goedgekeurd');
  });
});

test('[TS-REV-UI-H-011] urencontrole toont dag/week-uitsplitsing vóór goedkeuren', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await mockEmploymentStartDate(page);

  await page.route('**/server/api/timesheets.php**', async (route) => {
    if (route.request().method().toUpperCase() !== 'GET') { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, found: true, period: PERIOD_KEY, employee_id: 2,
      timesheet: { id: 9003, status: 'submitted', contractual_hours: 160, billable_hours: 15,
        leave_hours: 0, sickness_hours: 0, employee_note: null, review_note: null,
        day_entries: [
          { work_date: `${PERIOD_KEY}-01`, hours: 6, description: 'dag 1' },
          { work_date: `${PERIOD_KEY}-02`, hours: 9, description: 'dag 2' },
        ],
        submitted_at: new Date().toISOString(), approved_at: null, approved_by: null,
        version: 1, latest_correction: null, correction_history: [] } }) });
  });

  let employeeName = '';

  await test.step('Given medewerker opent een ingediende urenstaat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openView(page, 'timesheet');
    await setPeriod(page, PERIOD_KEY);
    employeeName = (await page.locator('#timesheet-employee').textContent() || '').trim();
    expect(employeeName.length).toBeGreaterThan(0);
    await loginPage.logout();
    await loginPage.assertLoggedOut();
  });

  await test.step('When de administrator de urencontrole opent', async () => {
    await loginPage.loginAsAdmin();
    await openView(page, 'approvals');
    await setPeriod(page, PERIOD_KEY);
    const approvalCard = page
      .locator(`article.approval-card[data-approval-period="${PERIOD_KEY}"]`)
      .filter({ hasText: employeeName })
      .first();
    await expect(approvalCard).toBeVisible();
    await approvalCard.locator('[data-review]').click();
    await expect(page.locator('#modal')).toBeVisible();
  });

  await test.step('Then ziet de administrator de exacte dag- en weektotalen van de medewerker', async () => {
    const grid = page.locator('#modal-summary .hours-review-grid');
    await expect(grid).toBeVisible();
    const cells = grid.locator('tbody .workday-cell strong');
    await expect(cells.nth(0)).toHaveText('6,0');
    await expect(cells.nth(1)).toHaveText('9,0');
    await expect(grid.locator('tbody .week-total').first()).toHaveText('15,0');
    await expect(grid.locator('tfoot th').last()).toHaveText('15,0');
  });
});

test('[TS-REV-UI-N-013] Goedkeuringen toont een laadtoestand tot de serverwerkvoorraad binnen is', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let releaseWorkflow = false;

  // De openstaande urencontroles komen uit de serverwerkvoorraad-sync
  // (timesheets + klanturenstaten). Tot die binnen is mag Goedkeuringen geen
  // voorlopige kaarten of zijbalkteller tonen die daarna verspringen.
  const hangUntilReleased = async (route: import('@playwright/test').Route) => {
    if (route.request().method().toUpperCase() !== 'GET') { await route.continue(); return; }
    while (!releaseWorkflow) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    await route.continue();
  };
  await page.route('**/server/api/timesheets.php**', hangUntilReleased);
  await page.route('**/server/api/customer-timesheets.php**', hangUntilReleased);

  await test.step('Given de beheerder opent Goedkeuringen terwijl de eerste serverwerkvoorraad-sync nog loopt', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await openView(page, 'approvals');
    await expect(page.locator('#view-approvals')).toHaveClass(/is-active/);
  });

  await test.step('Then toont Goedkeuringen een neutrale laadtekst en geen voorlopige kaarten of teller', async () => {
    await expect(page.locator('#approval-loading')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#approval-period-title')).toHaveText(/laden/i);
    await expect(page.locator('#approval-list article.approval-card')).toHaveCount(0);
    await expect(page.locator('#approve-all')).toBeHidden();
    await expect(page.locator('#approval-count')).toBeHidden();
  });

  await test.step('When de sync binnenkomt, verdwijnt de laadtekst en verschijnt de echte controlestand', async () => {
    releaseWorkflow = true;
    await expect(page.locator('#approval-loading')).toBeHidden({ timeout: 20_000 });
    await expect(page.locator('#approval-period-title')).not.toHaveText(/laden/i);
    await expect(page.locator('#approval-scope-note')).not.toHaveText(/opgehaald/i);
  });

  await loginPage.logout();
});

test('[TS-REV-UI-N-014] verlof en ziekte staan uit met een duidelijke uitleg', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker opent Mijn uren', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openView(page, 'timesheet');
  });

  await test.step('Then staan verlof en ziekte uitgeschakeld met een zichtbare reden', async () => {
    await expect(page.locator('#summary-leave')).toBeDisabled();
    await expect(page.locator('#summary-sick')).toBeDisabled();
    await expect(page.locator('#payroll-privacy-note')).toContainText('salarisadministratie');
  });

  await test.step('Then oogt het cijfer ook echt grijs, niet als een gewoon invulbaar zwart veld', async () => {
    // Regression: zonder een eigen :disabled-regel erfde het veld gewoon de
    // vetgedrukte --ink-tekstkleur, waardoor "0" er even actief uitzag als een
    // normaal invoerveld, terwijl je er niets in kan wijzigen.
    const leaveColor = await page.locator('#summary-leave').evaluate(el => getComputedStyle(el).color);
    const sickColor = await page.locator('#summary-sick').evaluate(el => getComputedStyle(el).color);
    expect(leaveColor).not.toBe('rgb(23, 35, 50)'); // --ink (zwart)
    expect(sickColor).not.toBe('rgb(23, 35, 50)');
  });

  await loginPage.logout();
});

// setLeaveSickEntryEnabled staat nu in ./helpers/companySettings (gedeeld met
// help-widget.spec.ts).

test('[TS-REV-UI-H-012] beheerder zet verlof en ziekte aan; de medewerker kan ze dan zelf invullen en het blijft na F5 staan', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await mockEmploymentStartDate(page);

  try {
    await test.step('Given de beheerder verlof en ziekte handmatig invullen aanzet via de instellingen-schakelaar', async () => {
      await loginPage.open();
      await loginPage.loginAsAdmin();
      await page.locator('button[data-view="settings"]').click();
      await expect(page.locator('#page-title')).toHaveText('Instellingen');
      const toggle = page.locator('#setting-leave-sick-entry-enabled');
      const track = page.locator('.leave-sick-toggle .switch-track');
      await expect(toggle).not.toBeChecked();
      // Regression: dit veld stond eerder als kaal <label class="full check-row">
      // in een 2-koloms .form-grid, waar de generieke .form-grid input-regel
      // (width:100%; height:42px) er een gigantische blauwe knop van maakte in
      // plaats van een compacte schakelaar. Nu een eigen toggle-component; deze
      // toets pint dat de knop klein en naast de tekst blijft, niet de hele rij.
      const trackBox = await track.boundingBox();
      expect(trackBox?.width, 'de schakelaar hoort een compacte knop te zijn, geen volle-breedte veld').toBeLessThan(60);
      await toggle.click();
      await expect(toggle).toBeChecked();
      const thumbTransform = await page.locator('.leave-sick-toggle .switch-thumb').evaluate(el => getComputedStyle(el, '::before').transform);
      expect(thumbTransform, 'de knop hoort zichtbaar naar rechts te schuiven zodra hij aan staat').not.toBe('none');
      const responsePromise = page.waitForResponse(response => response.url().includes('/server/api/settings.php') && response.request().method() === 'POST');
      await page.locator('#save-settings').click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      await expect(page.locator('#toast')).toContainText('Instellingen zijn op de server opgeslagen');
      await loginPage.logout();
    });

    await test.step('When de medewerker Mijn uren opent', async () => {
      await loginPage.loginAsEmployee();
      await setPeriod(page, PERIOD_KEY);
      await openView(page, 'timesheet');
    });

    await test.step('Then staan verlof en ziekte niet meer uitgeschakeld en is de uitleg verdwenen', async () => {
      await expect(page.locator('#summary-leave')).toBeEnabled();
      await expect(page.locator('#summary-sick')).toBeEnabled();
      await expect(page.locator('#payroll-privacy-note').locator('xpath=ancestor::div[contains(@class,"summary-note")]')).toBeHidden();
    });

    await test.step('When de medewerker verlof en ziekte zelf invult', async () => {
      // .fill() vuurt een echt "input"-event, waar updateHoursTotal(true) op
      // luistert (de listener op .summary-hours-input) om de conceptschrijf te
      // plannen.
      await page.locator('#summary-leave').fill('4');
      await page.locator('#summary-sick').fill('2');
    });

    await test.step('Then blijven de ingevulde waarden staan na een herlaad', async () => {
      // scheduleDraftTimesheetWrite() debouncet 700ms; wacht op de bevestiging
      // in plaats van een vaste sleep, dat is minder gevoelig voor een trage run.
      await expect(page.locator('#hours-autosave-status')).toContainText('Gesynchroniseerd', { timeout: 5000 });
      await page.reload();
      await expect(page.locator('#app-shell')).toBeVisible();
      await setPeriod(page, PERIOD_KEY);
      await openView(page, 'timesheet');
      await expect(page.locator('#summary-leave')).toHaveValue('4');
      await expect(page.locator('#summary-sick')).toHaveValue('2');
    });

    await loginPage.logout();
  } finally {
    // Dit is een company-brede instelling in de gedeelde TEST-database: andere
    // cases (zoals TS-REV-UI-N-014) gaan uit van de standaardstand (uit). Dit
    // gaat rechtstreeks via de auth-/instellingen-API (niet via de inlog-UI):
    // deze finally moet ook werken als de try hierboven halverwege faalde
    // (dus zonder eigen afsluitende logout(), sessie in onbekende staat), en
    // een verse open()+loginAsAdmin() via de UI bleek onder zware
    // gelijktijdige belasting soms nog een geldige sessie van eerder in deze
    // test aan te treffen bij een verse paginalading (zie AUTH-H-023 voor de
    // losse logout-hardening). Rechtstreeks via de API omzeilt die
    // kwetsbaarheid volledig voor deze zuivere opruimstap.
    const authApi = new AuthApi(page.request);
    await authApi.logout().catch(() => null);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    await setLeaveSickEntryEnabled(page, false);
    await authApi.logout().catch(() => null);
  }
});

