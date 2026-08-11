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
    releaseDashboardApi?.();
  });

  await test.step('Then alle zichtbare totalen blijven gelijk aan de concrete taakregels', async () => {
    await expect.poll(async () => page.locator('#admin-task-list [data-admin-task-row]').count()).toBeGreaterThan(0);
    const concreteTotal = await page.locator('#admin-task-list [data-admin-task-row]').count();
    const backofficeTotal = await page.locator('#admin-task-list [data-admin-task-row].is-actionable').count();
    const employeeTotal = concreteTotal - backofficeTotal;
    await expect(page.locator('#hero-task-total')).toHaveText(`${concreteTotal} open acties`);
    await expect(page.locator('#hero-task-owners')).toHaveText(`Backoffice ${backofficeTotal} + medewerkers ${employeeTotal} = ${concreteTotal}`);
    await expect(page.locator('#metric-actions')).toHaveText(String(backofficeTotal));
    await expect(page.locator('#open-work-queue')).toHaveText(`Bekijk alle ${concreteTotal} open acties`);
    await expect(page.locator('#view-dashboard')).not.toContainText('205');
    await expect(page.locator('#hero-task-total')).not.toContainText('132');
  });
});

test('[DASH-N-008] voorbeeldgegevens herstellen houdt alle werkvoorraadtellers gelijk', async ({ page }) => {
  const loginPage = new LoginPage(page);

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
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties', { timeout: 15_000 });
  });

  await test.step('When voorbeeldgegevens worden hersteld', async () => {
    await page.locator('button[data-view="settings"]').click();
    await page.locator('#reset-demo').click();
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then blijven de concrete taakregels leidend en verschijnt geen oude teller', async () => {
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties', { timeout: 15_000 });
    await expect(page.locator('#hero-task-total')).not.toContainText('132');
  });
});

test('[DASH-N-010] herstel blijft na F5 leidend boven een oude serverstatus', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let businessReadHitsAfterReset = 0;
  let resetCompleted = false;

  await page.route('**/server/api/**', async route => {
    if (resetCompleted && route.request().method() === 'GET') businessReadHitsAfterReset += 1;
    await route.continue();
  });

  await test.step('Given Stasjo is ingelogd in de voorbeeldomgeving', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('When Stasjo Herstel kiest en daarna een open urenactie indient', async () => {
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
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

  await test.step('Then blijft de gewijzigde lokale teller zichtbaar en komt geen oude serversessie terug', async () => {
    await expect(page.locator('#login-screen')).toBeVisible();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-open-task-total')).toHaveText('2 open acties');
    expect(businessReadHitsAfterReset).toBe(0);
    await attachBusinessScreenshot(page, 'GUI smoke · Herstel blijft na F5 leidend');
  });

  await test.step('And Backoffice kan Marc zijn klanturenstaat goedkeuren zonder statusrace', async () => {
    await page.locator('#switch-role').click();
    await expect(page.locator('#login-screen')).toBeVisible();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);

    const julyTasks = page.locator('#admin-task-month-body-2026-07');
    if (await julyTasks.isHidden()) {
      await page.locator('[data-admin-task-month-toggle="2026-07"]').click();
    }
    await page.locator('[data-review-customer-timesheet="1"][data-period-key="2026-07"]').click();
    await expect(page.locator('#modal-title')).toContainText('Marc de Roon');
    await page.locator('#modal-confirm').click();

    await expect(page.locator('#toast')).toContainText('De klanturenstaat van Marc de Roon is goedgekeurd.');
    await expect(page.locator('#toast')).not.toContainText('De status is ondertussen gewijzigd');
    await attachBusinessScreenshot(page, 'GUI smoke · Klanturenstaat goedkeuren zonder statusrace');
  });
});

test('[DASH-H-008] GUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice', async ({ page }) => {
  test.slow(); // Heavy multi-step closeout flow (12 sequential UI actions); triples timeout for slower CI runners.
  const demoPdf = {
    name: 'klanturenstaat.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% GUI closeout test', 'utf8'),
  };

  async function openDemoEmployee(employeeId: number): Promise<void> {
    if (await page.locator('#app-shell').isVisible()) await page.locator('#switch-role').click();
    await expect(page.locator('#login-screen')).toBeVisible();
    await page.locator('#login-employee-trigger').click();
    await expect(page.locator('#login-employee-choices')).toBeVisible();
    await page.locator(`[data-login-account-role="employee"][data-login-account-id="${employeeId}"]`).click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  }

  async function openDemoAdmin(): Promise<void> {
    if (await page.locator('#app-shell').isVisible()) await page.locator('#switch-role').click();
    await expect(page.locator('#login-screen')).toBeVisible();
    await page.locator('#login-admin-trigger').click();
    await expect(page.locator('#login-admin-choices')).toBeVisible();
    await page.locator('[data-login-account-role="admin"]').first().click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  }

  async function chooseMonth(month: string): Promise<void> {
    await page.locator('#period-month-picker').click();
    await expect(page.locator('#period-month-panel')).toBeVisible();
    await page.locator(`[data-period-month="${month}"][data-month-control="#period-month-picker"]`).click();
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
    await expect(page.locator('#admin-task-summary')).toContainText('Backoffice 7 + medewerkers 5 = 12');
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

test('[DASH-H-003] medewerkerdashboard ververst meteen na ureninvoer en themakiezer blijft leesbaar', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await page.route('**/server/api/timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));

  await test.step('Given een medewerker die een urenstaat vult en het thema wisselt', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('html').evaluate((html) => html.setAttribute('data-theme', 'dark'));
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
    await page.locator('#period-month-picker').click();
    await expect(page.locator('#period-month-panel')).toBeVisible();
    await expect(page.locator('#period-month-panel button').first()).toBeVisible();
    await expect(page.locator('#period-month-panel button').first()).toHaveCSS('color', 'rgb(231, 238, 244)');
  });
});

test('[DASH-H-004] terugkeren naar medewerkerdashboard ververst de uren en behoudt maandlabels bij themawissel', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await page.route('**/server/api/timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));

  await test.step('Given een medewerker op donker thema die vanuit dashboard naar uren gaat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('html').evaluate((html) => html.setAttribute('data-theme', 'dark'));
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
    await page.locator('#period-month-picker').click();
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
    await openMonthItems.first().locator('[data-employee-open-month-toggle]').click();
    await openMonthItems.first().locator('[data-employee-open-month-open]').click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
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
