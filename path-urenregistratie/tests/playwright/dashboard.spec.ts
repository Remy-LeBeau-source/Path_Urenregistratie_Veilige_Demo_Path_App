import { expect, test } from '@playwright/test';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { attachBusinessScreenshot } from './reporting/uiAttachments';

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

test('[DASH-N-007] gecachete oude open-acties teller wordt niet als actuele teller getoond', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een oude serverstate met 132 open acties en vertraagde dashboard API', async () => {
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

    let releaseDashboardApi: (() => void) | null = null;
    const dashboardGate = new Promise<void>(resolve => {
      releaseDashboardApi = resolve;
    });

    await page.route('**/server/api/dashboard.php*', async route => {
      await dashboardGate;
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

    await expect(page.locator('#hero-task-total')).not.toContainText('132');
    releaseDashboardApi?.();
  });

  await test.step('Then na laden staat exact de serverwaarde als eindstatus zonder refresh', async () => {
    await expect(page.locator('#hero-task-total')).toHaveText('7 open acties', { timeout: 15_000 });
    await expect(page.locator('#hero-task-owners')).toHaveText('Backoffice 4 + medewerkers 3 = 7');
    await expect(page.locator('#metric-actions')).toHaveText('4');
    await expect(page.locator('#hero-task-total')).not.toContainText('132');
  });
});

test('[DASH-N-008] voorbeeldgegevens herstellen overschrijft in auth-modus de DB teller niet', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given auth-modus met oude fallback-state en serverwerkvoorraad van 7', async () => {
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
    await expect(page.locator('#hero-task-total')).toHaveText('7 open acties', { timeout: 15_000 });
  });

  await test.step('When voorbeeldgegevens worden hersteld', async () => {
    await page.locator('button[data-view="settings"]').click();
    await page.locator('#reset-demo').click();
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then blijft de serverwaarde leidend en verschijnt geen oude 132 teller', async () => {
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#hero-task-total')).toHaveText('7 open acties', { timeout: 15_000 });
    await expect(page.locator('#hero-task-total')).not.toContainText('132');
  });
});
