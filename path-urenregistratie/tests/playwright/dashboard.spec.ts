import { expect, test } from '@playwright/test';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { attachBusinessScreenshot } from './reporting/uiAttachments';
import { openPaneel, openProfielmenu } from './pages/TopbarMenu';

type MutableRecord = {
  entries: number[][];
  contractHours: number;
  leave: number;
  sick: number;
  timesheetStatus: 'draft' | 'submitted' | 'correction' | 'approved';
  invoiceStatus: 'concept' | 'ready' | 'simulated';
  payrollStatus: 'concept' | 'ready' | 'simulated';
  invoiceNumber: string;
  serverVersion: null;
  correctionHistory: Array<unknown>;
  customerTimesheet: {
    status: string;
    isExample: boolean;
    fileName: string;
    originalFileName: string;
    fileData: string;
    mimeType: string;
    uploadedAt: string;
    uploadedBy: string;
    reviewedAt: string;
    reviewedBy: string;
    reviewNote: string;
    submissionSubject: string;
    submissionBody: string;
    brokerSubject: string;
    brokerBody: string;
    sentAt: string;
    skippedReason: string;
    skippedAt: string;
    skippedBy: string;
    reminderCount: number;
    lastReminderAt: string;
  };
};

function staleRecord(periodKey: string, employeeId: number): MutableRecord {
  return {
    entries: Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]),
    contractHours: 151.2,
    leave: 0,
    sick: 0,
    timesheetStatus: 'correction',
    invoiceStatus: 'concept',
    payrollStatus: 'concept',
    invoiceNumber: `STALE-${periodKey}-${employeeId}`,
    serverVersion: null,
    correctionHistory: [],
    customerTimesheet: {
      status: 'missing',
      isExample: false,
      fileName: '',
      originalFileName: '',
      fileData: '',
      mimeType: 'application/pdf',
      uploadedAt: '',
      uploadedBy: '',
      reviewedAt: '',
      reviewedBy: '',
      reviewNote: '',
      submissionSubject: '',
      submissionBody: '',
      brokerSubject: '',
      brokerBody: '',
      sentAt: '',
      skippedReason: '',
      skippedAt: '',
      skippedBy: '',
      reminderCount: 0,
      lastReminderAt: ''
    }
  };
}

function staleServerStateWith132OpenActions(): Record<string, unknown> {
  const records: Record<string, Record<string, MutableRecord>> = {};
  const monthKeys: string[] = [];
  for (let month = 1; month <= 12; month += 1) monthKeys.push(`2024-${String(month).padStart(2, '0')}`);
  for (let month = 1; month <= 12; month += 1) monthKeys.push(`2025-${String(month).padStart(2, '0')}`);
  for (let month = 1; month <= 9; month += 1) monthKeys.push(`2026-${String(month).padStart(2, '0')}`);

  monthKeys.forEach(periodKey => {
    records[periodKey] = {
      '1': staleRecord(periodKey, 1),
      '2': staleRecord(periodKey, 2),
      '3': staleRecord(periodKey, 3),
      '4': staleRecord(periodKey, 4)
    };
  });

  return {
    schemaVersion: 23,
    selectedPeriodKey: '2026-07',
    employees: [
      { id: 1, customerTimesheetExpected: false },
      { id: 2, customerTimesheetExpected: false },
      { id: 3, customerTimesheetExpected: false },
      { id: 4, customerTimesheetExpected: false }
    ],
    records
  };
}

test('[DASH-H-001] admin dashboard opent zonder console errors', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Given de administrator is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    clearConsoleErrors(consoleErrors);
  });

  await test.step('When de administrator het dashboard opent', async () => {
    await dashboardPage.assertAdminDashboardVisible();
  });

  await test.step('Then het dashboard toont admin-overzicht zonder consolefouten', async () => {
    expect(consoleErrors).toEqual([]);
    await attachBusinessScreenshot(page, 'Business state · Admin dashboard');
  });
});

test('[DASH-H-002] employee dashboard opent zonder console errors', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Given de medewerker is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    clearConsoleErrors(consoleErrors);
  });

  await test.step('When de medewerker het dashboard opent', async () => {
    await dashboardPage.assertEmployeeDashboardVisible();
  });

  await test.step('Then alleen medewerkersinformatie wordt getoond zonder consolefouten', async () => {
    expect(consoleErrors).toEqual([]);
  });
});

test('[DASH-N-007] afwijkend API-totaal overschrijft de concrete werkvoorraad niet', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een oude serverstate en een afwijkend API-totaal van 205', async () => {
    await page.route('**/server/api.php?action=state*', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, state: staleServerStateWith132OpenActions() })
      });
    });

    let dashboardGateOpen = false;
    const waitForDashboardGate = async () => {
      while (!dashboardGateOpen) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    };

    await page.route('**/server/api/dashboard.php*', async route => {
      await waitForDashboardGate();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          per_maand: [
            {
              period_key: '2026-07',
              gecontroleerd: 3,
              klaar_voor_controle: 1,
              uren_blokkades: 0,
              medewerkers: 4
            }
          ],
          open_werkvoorraad: {
            totaal: 205,
            bij_backoffice: 203,
            bij_medewerkers: 2
          }
        })
      });
    });

    await loginPage.open();
    await loginPage.loginAsAdmin();

    await expect(page.locator('#hero-task-total')).not.toContainText('132');
    dashboardGateOpen = true;
  });

  await test.step('Then alle zichtbare totalen blijven gelijk aan de concrete taakregels', async () => {
    await expect.poll(async () => page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#admin-task-list [data-admin-task-row]'));
      const total = rows.length;
      const backoffice = rows.filter(row => row.classList.contains('is-actionable')).length;
      const employees = total - backoffice;
      const text = (selector: string) => document.querySelector(selector)?.textContent?.trim() || '';

      return {
        hasRows: total > 0,
        totalMatches: text('#hero-task-total') === `${total} open acties`,
        summaryMatch: text('#admin-task-summary').includes(`Backoffice kan ${backoffice} oppakken; ${employees} `),
        ownerBadgesMatch: text('#hero-backoffice-count') === String(backoffice) && text('#hero-employee-count') === String(employees),
        metricMatches: text('#metric-actions') === String(backoffice),
        queueMatches: text('#open-work-queue') === `Bekijk alle ${total} open acties`,
        staleTotalsAbsent: !['#hero-task-total', '#admin-task-summary', '#metric-actions']
          .some(selector => /(?:132|205)/.test(text(selector)))
      };
    })).toEqual({
      hasRows: true,
      totalMatches: true,
      summaryMatch: true,
      ownerBadgesMatch: true,
      metricMatches: true,
      queueMatches: true,
      staleTotalsAbsent: true
    });
  });
});

test('[DASH-N-008] voorbeeldgegevens herstellen houdt alle werkvoorraadtellers gelijk', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const heroTaskTotal = page.locator('#hero-task-total');

  await test.step('Given auth-modus met oude fallback-state en afwijkende serverwerkvoorraad', async () => {
    await page.route('**/server/api.php?action=state*', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, state: staleServerStateWith132OpenActions() })
      });
    });
    await page.route('**/server/api/dashboard.php*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          per_maand: [
            {
              period_key: '2026-07',
              gecontroleerd: 3,
              klaar_voor_controle: 1,
              uren_blokkades: 0,
              medewerkers: 4
            }
          ],
          open_werkvoorraad: {
            totaal: 7,
            bij_backoffice: 4,
            bij_medewerkers: 3
          }
        })
      });
    });

    await loginPage.open();
    await loginPage.loginAsAdmin();
    // Before reset, the counter reflects real (unmocked) server-side demo state, which
    // shifts as other suite tests submit/approve/correct timesheets before this one runs.
    // We only assert here that the mocked/stale totals below (132, 7) never leak through.
    await expect(heroTaskTotal).not.toHaveText('', { timeout: 15_000 });
    await expect(heroTaskTotal).not.toContainText('132');
    await expect(heroTaskTotal).not.toHaveText('7 open acties');
  });

  await test.step('When voorbeeldgegevens worden hersteld', async () => {
    await page.locator('button[data-view="settings"]').click();
    await page.locator('#reset-demo').click();
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then blijven de concrete taakregels leidend en verschijnt geen oude teller', async () => {
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    // After reset, isLocalResetAuthoritative() intentionally blocks re-syncing server/API
    // state (that's the fixed v0.9.44 behavior guarding against stale-state leakage), so the
    // counter must fall back to the static local demo baseline — a fixed, code-defined value,
    // not something derived from shared/mutable DB state left behind by other suite tests.
    await expect(heroTaskTotal).toHaveText('12 open acties', { timeout: 15_000 });
    await expect(heroTaskTotal).not.toContainText('132');
  });
});

test('[DASH-N-010] herstel blijft na F5 leidend boven een oude serverstatus', async ({ page }) => {
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);
  let businessReadHitsAfterReset = 0;
  let resetCompleted = false;

  await page.route('**/server/api/**', async route => {
    if (resetCompleted && route.request().method() === 'GET') businessReadHitsAfterReset += 1;
    await route.continue();
  });

  await test.step('Given Backoffice de voorbeeldomgeving herstelt en daarna naar Stasjo wisselt', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#quick-reset-demo')).toBeVisible();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
    await loginPage.logout();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('When Stasjo daarna een open urenactie indient', async () => {
    await expect(page.locator('#quick-reset-demo')).toBeVisible();
    await expect(page.locator('#employee-open-task-total')).toHaveText('3 open acties');
    await page.locator('#period-next').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await page.locator('button[data-view="timesheet"]').click();
    await expect(page.locator('#submit-timesheet')).toBeVisible();
    await page.locator('#submit-timesheet').click();
    await expect(page.locator('#employee-open-task-total')).toHaveText('2 open acties');
  });

  await test.step('And Stasjo voert daarna F5 uit', async () => {
    resetCompleted = true;
    await page.reload();
  });

  await test.step('Then blijft de gewijzigde lokale teller zichtbaar en wordt er geen oude serverstatus teruggezet', async () => {
    await expect(page.locator('#login-screen')).toBeHidden();
    // F5 nu bewust het laatst geopende scherm herstelt (i.p.v. altijd terug
    // naar Dashboard te springen), staat Stasjo na herladen weer op de
    // urenstaat waar die was, niet op het overzicht.
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-open-task-total')).toHaveText('2 open acties');
    expect(businessReadHitsAfterReset).toBeLessThanOrEqual(1);
    await attachBusinessScreenshot(page, 'GUI smoke · Herstel blijft na F5 leidend');
  });

  await test.step('And Backoffice kan Marc zijn klanturenstaat goedkeuren zonder statusrace', async () => {
    await page.locator('#switch-role').click();
    await expect(page.locator('#login-screen')).toBeVisible();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await page.locator('#hero-backoffice-filter').click();
    await expect(page.locator('[data-admin-task-filter="actionable"]')).toHaveClass(/is-active/);

    const juneTasks = page.locator('#admin-task-month-body-2026-06');
    if (await juneTasks.isHidden()) {
      await page.locator('[data-admin-task-month-toggle="2026-06"]').click();
    }
    await juneTasks.locator('[data-review-customer-timesheet="1"][data-period-key="2026-06"]').click();
    await expect(page.locator('#modal-title')).toContainText('Marc de Roon');
    await page.locator('#modal-confirm').click();

    await expect(page.locator('#toast')).toContainText('De klanturenstaat van Marc de Roon is goedgekeurd.');
    await expect(page.locator('#toast')).not.toContainText('De status is ondertussen gewijzigd');
    await attachBusinessScreenshot(page, 'GUI smoke · Klanturenstaat goedkeuren zonder statusrace');
  });
});

test('[DASH-N-011] afgeronde Backoffice-taak en teller blijven na F5 stabiel, ongeacht het beginaantal', async ({ page }) => {
  // Regression guard for the "12 -> 5 -> 9" class of bug: completing a Backoffice task must not
  // revert after a reload, and the counter shown right after the action must survive F5 unchanged.
  // Note: completing one task can legitimately chain into a follow-up task (e.g. hours-review ->
  // invoice-delivery), so the total is NOT asserted to change - only that neither the specific
  // completed task reappears, nor does the counter jump to a different (stale) value after F5.
  const loginPage = new LoginPage(page);
  let totalAfterAction = '';
  let approvedEmployeeId = 0;
  let approvedPeriodKey = '';

  await test.step('Given de administrator is ingelogd en reset naar vaste baseline', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('When een actionable urencontrole-taak (hours-review) wordt goedgekeurd', async () => {
    const nextReview = await page.evaluate(() => {
      const task = window.adminOpenTasks().find(item => item.type === 'hours-review' && item.actionable);
      return task ? { employeeId: task.employee.id, periodKey: task.periodKey } : null;
    });
    expect(nextReview).not.toBeNull();
    approvedEmployeeId = nextReview!.employeeId;
    approvedPeriodKey = nextReview!.periodKey;

    await page.locator('#hero-backoffice-filter').click();
    const openMonthToggle = page.locator(`[data-admin-task-month-toggle="${approvedPeriodKey}"]`);
    if (await openMonthToggle.getAttribute('aria-expanded') !== 'true') {
      await openMonthToggle.click();
    }
    const taskRow = page.locator(`[data-admin-task-row="hours-review-${approvedPeriodKey}-${approvedEmployeeId}"]`);
    const reviewButton = taskRow.locator(`[data-review="${approvedEmployeeId}"][data-period-key="${approvedPeriodKey}"]`);
    await expect(reviewButton).toBeVisible();
    await reviewButton.click();
    await expect(page.locator('#modal-confirm')).toHaveText('Goedkeuren');
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#toast')).toContainText('is goedgekeurd');

    await expect.poll(() => page.evaluate(
      ({ employeeId, periodKey }) => window.adminOpenTasks().some(
        task => task.type === 'hours-review' && task.employee.id === employeeId && task.periodKey === periodKey
      ),
      { employeeId: approvedEmployeeId, periodKey: approvedPeriodKey }
    ), { timeout: 10_000 }).toBe(false);

    totalAfterAction = (await page.locator('#hero-task-total').innerText()).trim();
    expect(totalAfterAction).toMatch(/^\d+ open acties$/);
  });

  await test.step('Then blijft de goedgekeurde taak weg en de teller stabiel na F5', async () => {
    await page.reload();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#hero-task-total')).toHaveText(totalAfterAction, { timeout: 15_000 });

    const stillApprovedAway = await page.evaluate(
      ({ employeeId, periodKey }) => !window.adminOpenTasks().some(
        task => task.type === 'hours-review' && task.employee.id === employeeId && task.periodKey === periodKey
      ),
      { employeeId: approvedEmployeeId, periodKey: approvedPeriodKey }
    );
    expect(stillApprovedAway).toBe(true);
  });
});

test('[DASH-H-008] GUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice', async ({ page }) => {
  // Heavy multi-step closeout flow (12 sequential UI actions + a file upload); test.slow()'s 3x multiplier of the
  // 30s default (90s) was observed to be exceeded on slower CI runners, so set an explicit, larger budget instead.
  test.setTimeout(240_000);
  const demoPdf = {
    name: 'klanturenstaat.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% GUI closeout test', 'utf8'),
  };

  async function openDemoEmployee(employeeId: number): Promise<void> {
    if (await page.locator('#app-shell').isVisible()) await page.locator('#switch-role').click();
    await expect(page.locator('#login-screen')).toBeVisible();
    await page.locator('#login-employee-trigger').click();
    const choices = page.locator('#login-employee-choices');
    await expect(choices).toBeVisible();
    const choice = choices.locator(`[data-login-account-role="employee"][data-login-account-id="${employeeId}"]`);
    await expect(choice).toBeVisible();
    await choice.click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  }

  async function openDemoAdmin(): Promise<void> {
    if (await page.locator('#app-shell').isVisible()) await page.locator('#switch-role').click();
    await expect(page.locator('#login-screen')).toBeVisible();
    await page.locator('#login-admin-trigger').click();
    const choices = page.locator('#login-admin-choices');
    await expect(choices).toBeVisible();
    const choice = choices.locator('[data-login-account-role="admin"]').first();
    await expect(choice).toBeVisible();
    await choice.click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  }

  async function chooseMonth(month: string): Promise<void> {
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    const panel = page.locator('#period-month-panel');
    await expect(panel).toBeVisible();
    const picker = panel.locator(`[data-period-month="${month}"][data-month-control="#period-month-picker"]`);
    await expect(picker).toBeVisible();
    await picker.click();
  }

  await page.route('**/server/auth/**', async route => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });

  await test.step('Given de lokale demo toont alle 12 beginacties en tellerverdeling', async () => {
    await page.goto('/');
    await openDemoAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
    await expect(page.locator('#admin-task-summary')).toContainText('Backoffice kan 7 oppakken; 5 wachten op medewerkers');
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(12);
    console.log('GUI-CLOSEOUT baseline: 12 open acties; Backoffice 7; medewerkers 5; Stasjo 3 medewerkeracties; Brian 2 medewerkeracties plus 1 Backoffice-controle; Shawn 1 open dossieractie.');

    await openDemoEmployee(2);
    await expect(page.locator('#employee-open-task-total')).toHaveText('3 open acties');
    await openDemoEmployee(3);
    await expect(page.locator('#employee-open-task-total')).toHaveText('2 open acties');
    await openDemoEmployee(1);
    await expect(page.locator('#employee-open-task-total')).toHaveText('0 open acties');
    await openDemoEmployee(4);
    await expect(page.locator('#employee-open-task-total')).toHaveText('1 open actie');
  });

  await test.step('When medewerkers alle vijf wachtende acties via de zichtbare interface afronden', async () => {
    await openDemoEmployee(2);
    await chooseMonth('06');
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('#submit-timesheet').click();

    await chooseMonth('07');
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('#customer-timesheet-file').setInputFiles(demoPdf);
    await page.locator('#customer-timesheet-submit').click();
    await expect(page.locator('#toast')).toContainText('ingediend bij Backoffice');

    await chooseMonth('08');
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('#submit-timesheet').click();
    await expect(page.locator('#employee-open-task-total')).toHaveText('0 open acties');

    await openDemoEmployee(3);
    await chooseMonth('06');
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('#customer-timesheet-file').setInputFiles(demoPdf);
    await page.locator('#customer-timesheet-submit').click();
    await expect(page.locator('#toast')).toContainText('ingediend bij Backoffice');

    await chooseMonth('07');
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('#submit-timesheet').click();
    await expect(page.locator('#employee-open-task-total')).toHaveText('0 open acties');
  });

  await test.step('And Backoffice bevestigt iedere resterende zichtbare taak tot de werkvoorraad 0 is', async () => {
    await openDemoAdmin();
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');

    for (let actions = 0; actions < 30; actions += 1) {
      const total = (await page.locator('#hero-task-total').textContent() || '').trim();
      if (total === '0 open acties') break;

      if (await page.locator('#modal').isVisible()) {
        const confirm = page.locator('#modal-confirm');
        await confirm.focus();
        await page.keyboard.press('Enter');
      } else {
        await page.locator('#dashboard-next-action-button').click();
      }
    }

    await expect(page.locator('#hero-task-total')).toHaveText('0 open acties');
    await expect(page.locator('#admin-task-summary')).toContainText('Alles is afgehandeld.');
    await attachBusinessScreenshot(page, 'GUI closeout · Alle 12 taken afgerond');
  });
});

test('[DASH-N-009] medewerker teller blijft stabiel bij aug-juli-aug en dashboard triggert geen verborgen timesheet-read', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let timesheetReadHits = 0;

  await test.step('Given de medewerker zit op het dashboard en timesheet-read is gemonitord', async () => {
    await page.route('**/server/api/customer-timesheets.php**', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false })
    }));
    await page.route('**/server/api/timesheets.php**', async route => {
      if (route.request().method() === 'GET') {
        timesheetReadHits += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            found: true,
            timesheet: {
              status: 'submitted',
              contractual_hours: 151.2,
              billable_hours: 8,
              leave_hours: 0,
              sickness_hours: 0,
              day_entries: [],
              version: 7,
              correction_history: []
            }
          })
        });
        return;
      }
      await route.continue();
    });

    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    timesheetReadHits = 0;
  });

  await test.step('When de medewerker augustus-juli-augustus doorloopt vanuit dashboard', async () => {
    await expect(page.locator('#employee-open-task-total')).toHaveText(/\d+ open actie/, { timeout: 15_000 });
    const startBadge = (await page.locator('#employee-dashboard-count').textContent() || '').trim();
    const startHero = (await page.locator('#employee-open-task-total').textContent() || '').trim();

    await page.locator('#period-prev').click();
    await page.locator('#period-next').click();

    await expect(page.locator('#employee-dashboard-count')).toHaveText(startBadge);
    await expect(page.locator('#employee-open-task-total')).toHaveText(startHero);
  });

  await test.step('Then blijft de teller gelijk en zijn er geen verborgen timesheet-reads', async () => {
    expect(timesheetReadHits).toBe(0);
  });
});

test('[DASH-H-012] GUI-smoke scheidt werkacties van medewerkers- en beheerdersaccounts', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de vaste GUI-baseline met twaalf open acties en zes actieve accounts', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
  });

  await test.step('Then toont het dashboard zeven Backoffice-acties en vijf wachttaken zonder medewerkerbadge in het menu', async () => {
    await expect(page.locator('#hero-backoffice-count')).toHaveText('7');
    await expect(page.locator('#hero-employee-count')).toHaveText('5');
    await expect(page.locator('#dashboard-backoffice-count')).toHaveText('7');
    await expect(page.locator('#dashboard-employee-count')).toHaveText('5');
    await expect(page.locator('#dashboard-work-count')).toHaveAttribute('aria-label', '12 open acties: 7 bij Backoffice, 5 wacht op medewerkers');
    await expect(page.locator('#employees-count')).toHaveCount(0);
    const taskTypes = await page.evaluate(() => [...new Set(window.adminOpenTasks().map(task => task.type))].sort());
    expect(taskTypes).toEqual([
      'customer-broker',
      'customer-review',
      'customer-waiting',
      'hours-correction',
      'hours-draft',
      'hours-review',
      'invoice-delivery'
    ]);
    await page.locator('#hero-backoffice-filter').click();
    await expect(page.locator('[data-admin-task-filter="actionable"]')).toHaveClass(/is-active/);
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(7);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await page.locator('[data-admin-task-month-toggle]').first().click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible').first()).toHaveClass(/is-actionable/);
    await page.locator('#hero-employee-filter').click();
    await expect(page.locator('[data-admin-task-filter="waiting"]')).toHaveClass(/is-active/);
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(5);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await page.locator('[data-admin-task-month-toggle]').first().click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible').first()).toHaveClass(/is-waiting/);
  });

  await test.step('And Teambeheer toont vier medewerkers en twee beheerders als zes actieve accounts', async () => {
    await page.locator('button[data-view="employees"]').click();
    await expect(page.locator('#view-employees h2')).toHaveText('Teambeheer');
    await expect(page.locator('#team-active-account-count')).toHaveText('6');
    await expect(page.locator('#team-employees-overview')).toContainText('4 medewerkers');
    await expect(page.locator('#team-admins-overview')).toContainText('2 beheerders');
    await expect(page.locator('.team-account-avatar.employees')).toHaveCount(4);
    await expect(page.locator('.team-account-avatar.admins')).toHaveCount(2);
    await attachBusinessScreenshot(page, 'GUI smoke · Acties en teamaccounts apart');
  });

  await test.step('And Dashboard opent bovenaan terwijl eigenaarbolletjes gericht naar hun werkvoorraad springen', async () => {
    await page.locator('button[data-view="dashboard"]').click();
    await expect(page.locator('.hero-card')).toBeInViewport();
    await page.locator('#hero-backoffice-filter').click();
    await expect(page.locator('#admin-task-panel')).toBeInViewport();
    await expect(page.locator('#admin-task-title')).toHaveText('Acties bij Backoffice per maand');
    await expect(page.locator('#admin-task-summary')).toContainText('7 acties die Backoffice nu kan oppakken');
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(7);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await expect(page.locator('#admin-task-list .admin-task-row.is-waiting')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-filter="all"]')).toHaveText('Alle acties · 12');
    await expect(page.locator('[data-admin-task-filter="actionable"]')).toHaveText('Bij Backoffice · 7');
    await expect(page.locator('[data-admin-task-filter="waiting"]')).toHaveText('Bij medewerkers · 5');
  });
});

test('[DASH-H-013] dashboardmodules tonen compacte documenten, procesfasen en teamacties', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given Backoffice de vaste augustusbaseline opent', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then toont klanturenstaten een verkoopklaar kaartenoverzicht', async () => {
    await expect(page.locator('#customer-timesheet-admin-summary')).toHaveText('4 verwacht · 1 te controleren · 0 wacht op medewerkers');
    await expect(page.locator('#customer-timesheet-admin-list .customer-timesheet-admin-row')).toHaveCount(4);
    await expect(page.locator('#customer-timesheet-admin-list .customer-timesheet-admin-meta')).toHaveCount(4);
    await expect(page.locator('#customer-timesheet-admin-list')).toContainText('Deadline');
    await expect(page.locator('#customer-timesheet-admin-list')).toContainText('Brokerroute');
    await page.locator('#customer-timesheet-admin-panel').scrollIntoViewIfNeeded();
    await attachBusinessScreenshot(page, 'GUI smoke · Klanturenstaten als compacte kaarten');
  });

  await test.step('And proces en team tonen zonder lege tussenruimte duidelijke kerninformatie en acties', async () => {
    await expect(page.locator('.workflow-overview')).toBeVisible();
    await expect(page.locator('.workflow-overview .workflow-step')).toHaveCount(4);
    await expect(page.locator('#dashboard-team-title')).toHaveText('Teamstatus · Augustus 2026');
    await expect(page.locator('#dashboard-team-summary')).toHaveText('4 medewerkers · 2 te controleren · 1 wacht op medewerker');
    await expect(page.locator('#dashboard-employee-rows .dashboard-team-action')).toHaveCount(4);
    await expect(page.locator('#dashboard-employee-rows .dashboard-team-action.send')).toHaveCount(2);
    await page.locator('.workflow-overview').scrollIntoViewIfNeeded();
    await attachBusinessScreenshot(page, 'GUI smoke · Procesfasen als compact overzicht');
    await page.locator('.dashboard-team-panel').scrollIntoViewIfNeeded();
    await attachBusinessScreenshot(page, 'GUI smoke · Teamstatus met vervolgacties');
  });
});

test('[DASH-H-003] medewerkerdashboard ververst meteen na ureninvoer en themakiezer blijft leesbaar', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await page.route('**/server/api/timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));

  await test.step('Given een medewerker die een urenstaat vult en het thema wisselt', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openProfielmenu(page);
    await page.locator('[data-profile-action="preferences"]').click();
    await page.locator('#pref-theme-trigger').click();
    await page.locator('[data-standard-choice-target="pref-theme"][data-standard-choice-value="dark"]').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('button[data-view="timesheet"]').click();
  });

  await test.step('When de medewerker uren invult en terug naar het medewerkerdashboard gaat', async () => {
    const totalBefore = await page.locator('#employee-dashboard-hours').textContent();
    const firstInput = page.locator('.hours-table input').first();
    await firstInput.fill('11');
    await firstInput.press('Enter');
    await page.locator('button[data-view="employee-dashboard"]').click();

    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#page-title')).toHaveText(/Mijn overzicht/);
    await expect(page.locator('#employee-dashboard-hours')).not.toHaveText(totalBefore || '', { timeout: 15_000 });
  });

  await test.step('Then blijven de maandnamen zichtbaar in donkere modus', async () => {
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    await expect(page.locator('#period-month-panel')).toBeVisible();
    const firstMonth = page.locator('#period-month-panel button').first();
    await expect(firstMonth).toBeVisible();
    const contrastRatio = await firstMonth.evaluate((button) => {
      const parseRgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (rgb: number[]) => {
        const channels = rgb.map((value) => {
          const channel = value / 255;
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
      };
      const style = getComputedStyle(button);
      const foreground = luminance(parseRgb(style.color));
      const background = luminance(parseRgb(style.backgroundColor));
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
  });
});

test('[DASH-H-004] terugkeren naar medewerkerdashboard ververst de uren en behoudt maandlabels bij themawissel', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await page.route('**/server/api/timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));

  await test.step('Given een medewerker op donker thema die vanuit dashboard naar uren gaat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await openProfielmenu(page);
    await page.locator('[data-profile-action="preferences"]').click();
    await page.locator('#pref-theme-trigger').click();
    await page.locator('[data-standard-choice-target="pref-theme"][data-standard-choice-value="dark"]').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('button[data-view="employee-dashboard"]').click();
    await page.locator('#employee-dashboard-action').click();
  });

  await test.step('When de medewerker uren wijzigt en terug navigeert via de zichtbare medewerkerroute', async () => {
    const hoursBefore = await page.locator('#employee-dashboard-hours').textContent();
    const firstInput = page.locator('.hours-table input').first();
    await firstInput.fill('11');
    await firstInput.press('Enter');
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-dashboard-hours')).not.toHaveText(hoursBefore || '', { timeout: 15_000 });
  });

  await test.step('Then zijn de maandlabels nog zichtbaar in de maandkiezer', async () => {
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    await expect(page.locator('#period-month-panel')).toBeVisible();
    await expect(page.locator('#period-month-panel button').nth(6)).toHaveText('Juli');
  });
});

test('[DASH-H-005] medewerker ziet open maanden compact en kan direct naar de juiste maand springen', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een medewerker met open maanden', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
  });

  await test.step('When het medewerkerdashboard opent', async () => {
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('Then is er een compacte open-maandenkaart zichtbaar met een directe maandknop', async () => {
    await expect(page.locator('#employee-open-overview')).toBeVisible();
    await expect(page.locator('#employee-open-task-total')).toHaveText(/open acti/);
    await expect(page.locator('#employee-open-task-total')).not.toHaveText('0 open acties');
    await expect(page.locator('#employee-open-task-owners')).toContainText('Urenregistraties');
    await expect(page.locator('#employee-open-task-owners')).not.toContainText('Backoffice');
    const openMonthItems = page.locator('#employee-open-overview-list [data-employee-open-month]');
    await expect.poll(async () => openMonthItems.count()).toBeGreaterThan(0);
    const firstMonth = openMonthItems.first();
    const firstToggle = firstMonth.locator('[data-employee-open-month-toggle]');
    if (await firstToggle.getAttribute('aria-expanded') !== 'true') await firstToggle.click();
    await firstMonth.locator('[data-employee-open-action]').first().click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
  });
});

test('[DASH-H-014] medewerker krijgt de eerstvolgende concrete actie met juiste maand en taakroute', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);

  await test.step('Given een medewerker met meerdere open acties over verschillende maanden', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    clearConsoleErrors(errors);
    await expect(page.locator('#employee-open-overview')).toBeVisible();
    await expect(page.locator('#employee-open-task-total')).not.toHaveText('0 open acties');
  });

  let firstPeriod = '';
  let firstPeriodLabel = '';
  let firstActionType = '';

  await test.step('When het dashboard de werkvoorraad prioriteert', async () => {
    const openMonths = page.locator('#employee-open-overview-list [data-employee-open-month]');
    await expect.poll(async () => openMonths.count()).toBeGreaterThan(0);
    const firstMonth = openMonths.first();
    firstPeriod = (await firstMonth.getAttribute('data-employee-open-month')) || '';
    firstPeriodLabel = ((await firstMonth.locator('.employee-open-month-heading-copy strong').textContent()) || '').split(' · ')[0];
    const firstToggle = firstMonth.locator('[data-employee-open-month-toggle]');
    await expect(firstToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(firstMonth.locator('.employee-open-month-body')).toBeHidden();
    await firstToggle.click();
    await expect(firstToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(firstMonth.locator('.employee-open-month-body')).toBeVisible();

    const allActionRows = page.locator('#employee-open-overview-list [data-employee-action-row]');
    const totalText = (await page.locator('#employee-open-task-total').textContent()) || '0';
    const total = Number(totalText.match(/\d+/)?.[0] || 0);
    await expect(allActionRows).toHaveCount(total);
    await expect(page.locator('#employee-dashboard-all-actions')).toHaveText(`Bekijk alle ${total} open ${total === 1 ? 'actie' : 'acties'}`);
    await page.locator('#employee-dashboard-all-actions').click();
    await expect(page.locator('#employee-open-overview')).toBeInViewport();
    await expect(page.locator('#employee-open-overview .panel-heading h3')).toBeVisible();
    expect(await page.locator('#employee-open-overview').evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(80);
    await expect(page.locator('#employee-history .employee-history-head')).toContainText('Maand');
    await expect(page.locator('#employee-history [data-history-period]').first()).toHaveText('Open maand');

    const firstAction = firstMonth.locator('[data-employee-open-action]').first();
    firstActionType = (await firstAction.getAttribute('data-employee-open-action')) || '';
    await expect(page.locator('#employee-dashboard-next-label')).toContainText('Dit nu');
    await expect(page.locator('#employee-dashboard-next-meta')).toContainText(firstPeriodLabel);
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-period', firstPeriod);
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-type', firstActionType);
    await attachBusinessScreenshot(page, 'GUI smoke · Slim medewerkerdashboard');
  });

  await test.step('Then opent de hoofdactie exact de geprioriteerde maand en juiste taakroute', async () => {
    await page.locator('#employee-dashboard-action').click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('#timesheet-period-title')).toHaveText(firstPeriodLabel);
    if (firstActionType === 'customer') await expect(page.locator('#customer-timesheet-upload-panel')).toBeVisible();
    else await expect(page.locator('#hours-grid')).toBeVisible();
    await attachBusinessScreenshot(page, 'GUI smoke · Medewerker opent eerstvolgende actie');
    expect(errors).toEqual([]);
  });
});

test('[DASH-N-015] medewerkerprioriteit kiest correctie boven document en toont niets als alles klaar is', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.route('**/server/api/timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));
  await page.route('**/server/api/customer-timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));

  await test.step('Given alleen augustus zowel een urencorrectie als documentherindiening vraagt', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { id: number };
        recordFor: (employeeId: number, periodKey: string) => MutableRecord;
        persistState: () => void;
        renderAll: () => void;
      };
      const employeeId = runtime.currentEmployee().id;
      ['2026-06', '2026-07', '2026-08'].forEach(periodKey => {
        const record = runtime.recordFor(employeeId, periodKey);
        record.timesheetStatus = 'submitted';
        record.customerTimesheet.status = 'received';
        record.correctionHistory = [];
      });
      const august = runtime.recordFor(employeeId, '2026-08');
      august.timesheetStatus = 'correction';
      august.customerTimesheet.status = 'resubmit';
      august.customerTimesheet.reviewNote = 'Upload de definitieve ondertekende versie.';
      august.correctionHistory = [{
        requestedBy: 'Gio Maatsen',
        requestedAt: '13 augustus 2026, 10:00',
        message: 'Controleer de uren op maandag.',
        resubmittedAt: ''
      }];
      runtime.persistState();
      runtime.renderAll();
    });
  });

  await test.step('Then staat de urencorrectie vóór het document en kloppen de totalen', async () => {
    await expect(page.locator('#employee-open-task-total')).toHaveText('2 open acties');
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-period', '2026-08');
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-type', 'hours');
    const rows = page.locator('[data-employee-open-month="2026-08"] [data-employee-action-row]');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute('data-employee-action-row', 'hours');
    await expect(rows.nth(0)).toContainText('Correctie indienen');
    await expect(rows.nth(1)).toHaveAttribute('data-employee-action-row', 'customer');
    await expect(rows.nth(1)).toContainText('Upload de definitieve ondertekende versie.');
  });

  await test.step('And bij een volledig afgeronde werkvoorraad verdwijnen taaklijst en prioriteitsdata', async () => {
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { id: number };
        recordFor: (employeeId: number, periodKey: string) => MutableRecord;
        persistState: () => void;
        renderAll: () => void;
      };
      const employeeId = runtime.currentEmployee().id;
      ['2026-06', '2026-07', '2026-08'].forEach(periodKey => {
        const record = runtime.recordFor(employeeId, periodKey);
        record.timesheetStatus = 'approved';
        record.customerTimesheet.status = 'approved';
        record.correctionHistory = [];
      });
      runtime.persistState();
      runtime.renderAll();
    });
    await expect(page.locator('#employee-open-task-total')).toHaveText('0 open acties');
    await expect(page.locator('#employee-open-overview')).toBeHidden();
    await expect(page.locator('#employee-dashboard-all-actions')).toBeHidden();
    await expect(page.locator('#employee-dashboard-next-label')).toHaveText('Deze maand');
    await expect(page.locator('#employee-dashboard-action')).not.toHaveAttribute('data-employee-action-period', /.+/);
    await expect(page.locator('#employee-dashboard-action')).not.toHaveAttribute('data-employee-action-type', /.+/);
  });
});

test('[DASH-N-016] correctieactie ververst een verborgen rooster uit een eerdere maand', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Deze test is uitsluitend gericht op het servergestuurde urenrooster. Houd de
  // expliciet lokaal ingerichte klantdocumentstatus buiten de echte API-readback.
  await page.route('**/server/api/customer-timesheets.php**', async route => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });

  await page.route('**/server/api/timesheets.php**', async route => {
    const request = route.request();
    if (request.method().toUpperCase() !== 'GET') {
      await route.continue();
      return;
    }
    const url = new URL(request.url());
    const period = url.searchParams.get('period') || '2026-08';
    const correction = period === '2026-08';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        found: true,
        period,
        employee_id: 2,
        timesheet: {
          id: correction ? 1602 : 1601,
          status: correction ? 'correction' : 'approved',
          contractual_hours: correction ? 151.2 : 153,
          billable_hours: correction ? 80 : 153,
          leave_hours: 0,
          sickness_hours: 0,
          employee_note: null,
          review_note: correction ? 'Controleer 12 augustus en dien opnieuw in.' : null,
          day_entries: [{ work_date: `${period}-12`, hours: correction ? 8 : 7, description: 'Regressiedag' }],
          submitted_at: '2026-08-05T09:30:00Z',
          approved_at: correction ? null : '2026-08-03T10:02:00Z',
          approved_by: correction ? null : 1,
          version: 4,
          latest_correction: correction ? {
            id: 1,
            correction_message: 'Controleer 12 augustus en dien opnieuw in.',
            requested_by: 1,
            requested_by_name: 'Gio Maatsen',
            requested_at: '2026-08-05T10:15:00Z',
            resubmitted_at: null,
          } : null,
          correction_history: correction ? [{
            id: 1,
            correction_message: 'Controleer 12 augustus en dien opnieuw in.',
            requested_by: 1,
            requested_by_name: 'Gio Maatsen',
            requested_at: '2026-08-05T10:15:00Z',
            resubmitted_at: null,
          }] : [],
        },
      }),
    });
  });

  await test.step('Given juli als goedgekeurde verborgen urenstaat is achtergebleven', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { id: number };
        recordFor: (employeeId: number, periodKey: string) => MutableRecord;
        persistState: () => void;
        renderAll: () => void;
      };
      const employeeId = runtime.currentEmployee().id;
      ['2026-05', '2026-06', '2026-07'].forEach(periodKey => {
        const record = runtime.recordFor(employeeId, periodKey);
        record.timesheetStatus = 'approved';
        record.customerTimesheet.status = 'sent';
        record.correctionHistory = [];
      });
      const august = runtime.recordFor(employeeId, '2026-08');
      august.timesheetStatus = 'correction';
      august.customerTimesheet.status = 'sent';
      august.correctionHistory = [{
        requestedBy: 'Gio Maatsen',
        requestedAt: '5 augustus 2026 om 10:15',
        message: 'Controleer 12 augustus en dien opnieuw in.',
        resubmittedAt: null,
      }];
      runtime.persistState();
      runtime.renderAll();
    });
    await page.locator('button[data-view="timesheet"]').click();
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    await page.locator('#period-month-panel [data-period-month="07"][data-month-control="#period-month-picker"]').click();
    await expect(page.locator('#timesheet-period-title')).toHaveText('Juli 2026');
    await expect(page.locator('#timesheet-status')).toHaveText('Goedgekeurd');
  });

  await test.step('When het dashboard augustus prioriteert en Open correctie wordt gekozen', async () => {
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-period', '2026-08');
    await expect(page.locator('#employee-dashboard-action')).toContainText('Open correctie');
    await page.locator('#employee-dashboard-action').click();
  });

  await test.step('Then toont Mijn uren augustus als bewerkbare correctie met herindienknop', async () => {
    await expect(page.locator('#timesheet-period-title')).toHaveText('Augustus 2026');
    await expect(page.locator('#timesheet-status')).toHaveText('Correctie nodig');
    await expect(page.locator('#timesheet-correction-banner')).toBeVisible();
    await expect(page.locator('#hours-grid .hours-input:not([disabled])').first()).toBeVisible();
    await expect(page.locator('#submit-timesheet')).toBeVisible();
    await expect(page.locator('#submit-timesheet')).toContainText('opnieuw indienen');
  });
});

test('[DASH-H-006] vooruit bladeren maakt geen lege toekomstmaand zichtbaar als medewerkeractie', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let openOverviewVisible = false;
  let baselinePeriod = '';

  await test.step('Given een medewerker zonder open acties in een lege toekomstmaand', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    openOverviewVisible = await page.locator('#employee-open-overview').isVisible();
    baselinePeriod = (await page.locator('#period-label').textContent()) || '';
    await expect(page.locator('#employee-open-overview-list')).not.toContainText('September 2026');
  });

  await test.step('When de medewerker een toekomstige maand probeert te openen', async () => {
    await page.locator('#period-next').click();
    await expect(page.locator('#period-label')).toHaveText(baselinePeriod);
    await expect(page.locator('#toast')).toContainText('Medewerkers kunnen geen toekomstige maand openen');
  });

  await test.step('Then verschijnt september niet als open medewerkermaand', async () => {
    if (openOverviewVisible) {
      await expect(page.locator('#employee-open-overview')).toBeVisible();
    } else {
      await expect(page.locator('#employee-open-overview')).toBeHidden();
    }
    await expect(page.locator('#employee-open-overview-list')).not.toContainText('September 2026');
  });
});

test('[DASH-H-007] dashboardknop behoudt de geldige maand en medewerkeroverzichten', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een medewerker die een toekomstige maand probeert te openen', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#period-next').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
  });

  await test.step('When de medewerker teruggaat naar het dashboard', async () => {
    await page.locator('button[data-view="employee-dashboard"]').click();
  });

  await test.step('Then staat de periode op augustus en toont het overzicht geen toekomstige maanden', async () => {
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await expect(page.locator('#employee-open-overview-list')).not.toContainText('September 2026');
  });
});

test('[DASH-H-017] serverwerkvoorraad hydrateert volledig en blijft stabiel bij maand- en filterwissels', async ({ page }) => {
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);
  let workflowReads = 0;

  page.on('response', response => {
    if (response.request().method() !== 'GET') return;
    if (/\/server\/api\/(?:timesheets|customer-timesheets)\.php\?/.test(response.url())) workflowReads += 1;
  });

  await test.step('Given Backoffice met de volledige serverwerkvoorraad is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    const csrfResponse = await page.request.get('/server/auth/csrf.php');
    const csrf = await csrfResponse.json() as { csrf_token?: string };
    const resetResponse = await page.request.post('/server/api/test-reset.php', {
      headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') },
      data: { confirm: 'RESET_SHARED_TEST_BASELINE' },
    });
    const resetBody = await resetResponse.text();
    expect(resetResponse.ok(), `TEST-reset gaf HTTP ${resetResponse.status()}: ${resetBody}`).toBe(true);
    const reset = JSON.parse(resetBody) as { ok?: boolean; reset?: { open_actions?: number } };
    expect(reset).toMatchObject({ ok: true, reset: { open_actions: 12 } });
    workflowReads = 0;
    await page.reload();
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(page.locator('#view-dashboard')).toBeVisible();
    await expect.poll(() => workflowReads, { timeout: 20_000 }).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => {
      const tasks = window.adminOpenTasks();
      return {
        total: tasks.length,
        actionable: tasks.filter(task => task.actionable).length,
        waiting: tasks.filter(task => !task.actionable).length,
      };
    }), { timeout: 20_000 }).toEqual({ total: 12, actionable: 7, waiting: 5 });
    await expect(page.locator('#admin-task-content')).toBeVisible();
  });

  const snapshot = async () => page.evaluate(() => {
    const tasks = window.adminOpenTasks();
    return {
      ids: tasks.map(task => task.id).sort(),
      total: tasks.length,
      actionable: tasks.filter(task => task.actionable).length,
      waiting: tasks.filter(task => !task.actionable).length,
      months: [...new Set(tasks.map(task => task.periodKey))].sort(),
    };
  });

  const baseline = await snapshot();
  expect(baseline).toMatchObject({ total: 12, actionable: 7, waiting: 5 });

  await test.step('When Backoffice augustus-juli-augustus doorloopt', async () => {
    await page.locator('#period-prev').click();
    await expect(page.locator('#period-label')).toHaveText('Juli 2026');
    await page.locator('#period-next').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
  });

  await test.step('Then blijven globale aantallen, eigenaren en taakidentiteiten gelijk', async () => {
    await expect.poll(snapshot).toEqual(baseline);
    expect(baseline.total).toBe(baseline.actionable + baseline.waiting);
    await expect(page.locator('#hero-task-total')).toHaveText(`${baseline.total} open acties`);
    await expect(page.locator('#hero-backoffice-count')).toHaveText(String(baseline.actionable));
    await expect(page.locator('#hero-employee-count')).toHaveText(String(baseline.waiting));
  });

  await test.step('And eigenaarfilters openen alleen hun concrete taakregels', async () => {
    await page.locator('[data-open-work-filter="actionable"]').first().click();
    await expect(page.locator('#admin-task-content')).toBeVisible();
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(baseline.actionable);
    await expect(page.locator('#admin-task-list .admin-task-row.is-waiting')).toHaveCount(0);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await page.locator('[data-admin-task-month-toggle]').first().click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible').first()).toHaveClass(/is-actionable/);

    await page.locator('[data-admin-task-filter="waiting"]').click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(baseline.waiting);
    await expect(page.locator('#admin-task-list .admin-task-row.is-actionable')).toHaveCount(0);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await page.locator('[data-admin-task-month-toggle]').first().click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible').first()).toHaveClass(/is-waiting/);
  });

  await test.step('And opnieuw openen zet alle maandblokken terug naar ingeklapt', async () => {
    await page.locator('[data-admin-task-filter="all"]').click();
    const julyToggle = page.locator('[data-admin-task-month-toggle="2026-07"]');
    await julyToggle.click();
    await expect(julyToggle).toHaveAttribute('aria-expanded', 'true');

    await page.locator('#admin-task-panel-toggle').click();
    await expect(page.locator('#admin-task-content')).toBeHidden();
    await page.locator('#admin-task-panel-toggle').click();
    await expect(page.locator('#admin-task-content')).toBeVisible();

    const monthToggles = page.locator('[data-admin-task-month-toggle]');
    const monthBodies = page.locator('.admin-task-month-body');
    await expect(monthToggles).toHaveCount(3);
    for (let index = 0; index < await monthToggles.count(); index += 1) {
      await expect(monthToggles.nth(index)).toHaveAttribute('aria-expanded', 'false');
      await expect(monthBodies.nth(index)).toBeHidden();
    }
  });
});
