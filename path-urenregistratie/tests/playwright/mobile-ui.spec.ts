import { expect, test, type Page } from '@playwright/test';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { LoginPage } from './pages/LoginPage';
import { attachBusinessScreenshot } from './reporting/uiAttachments';

const MOBILE_PERIOD = '2126-01';
const CORRECTION_MESSAGE = 'Controleer dag 2: dit moet 4 uur zijn.';

async function isolateFrontendState(page: Page): Promise<void> {
  await page.route('**/server/api.php?action=state*', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, state: null }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
}

async function mockTimesheetWrites(page: Page): Promise<void> {
  let writeVersion = 100;
  await page.route('**/server/api/timesheets.php', async route => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const payload = route.request().postDataJSON() as { action?: string };
    const action = String(payload?.action || 'save_draft');
    writeVersion += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        period: MOBILE_PERIOD,
        employee_id: 2,
        timesheet: {
          id: 9000,
          status: action === 'submit' ? 'submitted' : 'draft',
          submitted_at: action === 'submit' ? new Date().toISOString() : null,
          version: writeVersion,
        },
        audit_event: action === 'submit' ? 'timesheet.submitted' : 'timesheet.draft_saved',
      }),
    });
  });
}

async function setPeriod(page: Page, periodKey: string): Promise<void> {
  await page.evaluate(nextPeriod => {
    const control = document.querySelector('#period-picker') as HTMLInputElement | null;
    if (!control) throw new Error('Period control ontbreekt.');
    control.value = nextPeriod;
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }, periodKey);
  await expect(page.locator('#period-picker')).toHaveValue(periodKey);
}

async function openView(page: Page, view: string): Promise<void> {
  await page.locator(`button[data-view="${view}"]:visible`).first().click();
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
    await expect(page.locator('button[data-view="dashboard"]:visible')).toBeVisible();
    await page.locator('.mobile-brand-home').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#view-dashboard .metric-card').first()).toBeVisible();
    await expect(page.locator('#hero-task-total')).toBeVisible();
    await expect(page.locator('#admin-task-summary')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  await test.step('Then Home en rolwissel blijven bereikbaar zonder console- of page-errors', async () => {
    await openView(page, 'invoices');
    await expect(page.locator('.mobile-brand-home')).toBeVisible();
    await expect(page.locator('#mobile-switch-role')).toBeVisible();
    await page.locator('.mobile-brand-home').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
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
    await openView(page, 'timesheet');
    await setPeriod(page, MOBILE_PERIOD);
  });

  await test.step('When uren als concept worden gewijzigd en daarna ingediend', async () => {
    const firstInput = page.locator('#hours-grid .hours-input:not([disabled])').first();
    await expect(firstInput).toBeVisible();
    const draftResponse = page.waitForResponse(response => response.url().includes('/server/api/timesheets.php') && response.request().method() === 'POST');
    await firstInput.fill('8');
    await firstInput.press('Enter');
    expect((await draftResponse).ok()).toBe(true);
    await expect(page.locator('#timesheet-status')).toHaveText('Nog invullen');

    await page.locator('#submit-timesheet').click();
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
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
    employeeName = (await page.locator('#timesheet-employee').textContent() || '').trim();
    const inputs = page.locator('#hours-grid .hours-input:not([disabled])');
    await inputs.nth(0).fill('8');
    await inputs.nth(1).fill('8');
    await page.locator('#submit-timesheet').click();
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
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
    await expect(page.locator('#timesheet-status')).toHaveText('Correctie nodig');
    await expect(page.locator('#timesheet-correction-banner')).toBeVisible();
    await expect(page.locator('#timesheet-correction-message')).toContainText('Controleer dag 2');
    const inputs = page.locator('#hours-grid .hours-input:not([disabled])');
    await inputs.nth(1).fill('4');
    await page.locator('#submit-timesheet').click();
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
  });

  await test.step('And de administrator mobiel goedkeurt', async () => {
    await loginPage.logout();
    await loginPage.loginAsAdmin();
    await openView(page, 'approvals');
    await setPeriod(page, MOBILE_PERIOD);
    const card = page.locator(`article.approval-card[data-approval-period="${MOBILE_PERIOD}"]`).filter({ hasText: employeeName }).first();
    await expect(card).toBeVisible();
    await card.locator('[data-approve]').click();
    await expect(card).toHaveCount(0);
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
