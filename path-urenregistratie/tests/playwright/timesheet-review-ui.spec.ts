import { expect, test, type Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { attachBusinessScreenshot } from './reporting/uiAttachments';

const PERIOD_KEY = '2026-01';
const CORRECTION_MESSAGE = 'Controleer dag 2: dit moet 4 uur zijn.';

async function openView(page: Page, view: 'timesheet' | 'approvals') {
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

test('[TS-REV-UI-H-008] browserflow: admin vraagt correctie, medewerker dient opnieuw in, admin keurt goed', async ({ page }) => {
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

  await page.route('**/server/api/timesheets.php**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (method === 'GET') {
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
    await page.locator('#submit-timesheet').click();
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
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
    await page.locator('#modal-confirm').click();

    await expect(
      page.locator(`article.approval-card[data-approval-period="${PERIOD_KEY}"]`).filter({ hasText: employeeName })
    ).toHaveCount(0);
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
    await page.locator('#submit-timesheet').click();
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
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
    await approvalCardAfterResubmit.locator('[data-approve]').click();

    await expect(
      page.locator(`article.approval-card[data-approval-period="${PERIOD_KEY}"]`).filter({ hasText: employeeName })
    ).toHaveCount(0);
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
});

test('[TS-REV-UI-H-009] medewerker kan een ingediende urenstaat opnieuw indienen', async ({ page }) => {
  const loginPage = new LoginPage(page);

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
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
  });

  await test.step('Then kan de medewerker opnieuw indienen zonder blokkerende statusmelding', async () => {
    await expect(page.locator('#submit-timesheet')).toBeVisible();
    await expect(page.locator('#submit-timesheet')).toContainText('opnieuw indienen');
    await expect(page.locator('#submit-timesheet-note')).toBeHidden();
  });
});

test('[TS-REV-UI-H-010] submitknop is verborgen bij goedgekeurde urenstaat', async ({ page }) => {
  const loginPage = new LoginPage(page);

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

