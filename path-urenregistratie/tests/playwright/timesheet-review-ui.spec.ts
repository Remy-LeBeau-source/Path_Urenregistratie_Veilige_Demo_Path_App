import { expect, test, type Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const PERIOD_KEY = '2125-01';
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

test('[TS-REV-UI-001] browserflow: admin vraagt correctie, medewerker dient opnieuw in, admin keurt goed', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let writeVersion = 100;

  await page.route('**/server/api/timesheets.php', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    let action = 'save_draft';
    try {
      const payload = request.postDataJSON() as { action?: string };
      action = String(payload?.action || 'save_draft');
    } catch {
      action = 'save_draft';
    }

    writeVersion += 1;
    const status = action === 'submit' ? 'submitted' : 'draft';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        period: PERIOD_KEY,
        employee_id: 2,
        timesheet: {
          id: 9000,
          status,
          submitted_at: action === 'submit' ? new Date().toISOString() : null,
          version: writeVersion,
        },
        audit_event: action === 'submit' ? 'timesheet.submitted' : 'timesheet.draft_saved',
      }),
    });
  });

  await loginPage.open();
  await loginPage.loginAsEmployee();
  await openView(page, 'timesheet');
  await setPeriod(page, PERIOD_KEY);

  const employeeName = (await page.locator('#timesheet-employee').textContent() || '').trim();
  expect(employeeName.length).toBeGreaterThan(0);

  await fillFirstTwoHours(page, '8', '8');
  await page.locator('#submit-timesheet').click();
  await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');

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

  await loginPage.logout();
  await loginPage.assertLoggedOut();

  await loginPage.loginAsEmployee();
  await openView(page, 'timesheet');
  await setPeriod(page, PERIOD_KEY);
  await expect(page.locator('#timesheet-status')).toHaveText('Goedgekeurd');
});
