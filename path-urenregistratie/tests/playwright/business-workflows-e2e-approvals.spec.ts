import { expect, test } from './fixtures/e2eIsolation';
import { useFixedDemoClock } from './fixtures/fixedDemoClock';
import { LoginPage } from './pages/LoginPage';
import { klikTestknop } from './fixtures/testknoppen';

// Afgesplitst van business-workflows-e2e.spec.ts (17 sep, CI-shardbalans): dit
// bestand droeg als geheel het grootste deel bij aan de structureel trage
// shard 8/10 (17-18 min tegen een limiet van 22, zie GIO-WENSEN.md). Playwright
// verdeelt shards op bestand, niet op looptijd per case, dus één bestand met
// acht zware, echte browserflows trekt altijd naar dezelfde shard. Zelfde aanpak
// als eerder bij dashboard.spec.ts -> dashboard-medewerker.spec.ts: de vier
// goedkeurings-/factuurzware cases (E2E-H-004, -005, -007, -008) hier apart,
// de vier lichtere navigatie-/authcases blijven in business-workflows-e2e.spec.ts.

test.beforeEach(async ({ page }) => {
  await useFixedDemoClock(page);
});

async function restoreBaseline(page: import('@playwright/test').Page) {
  await klikTestknop(page, '#quick-reset-demo');
  await expect(page.locator('#modal-title')).toHaveText('Alle lokale wijzigingen wissen?');
  await page.locator('#modal-confirm').click();
  await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
}

async function openAdminTaskMonth(page: import('@playwright/test').Page, periodKey: string) {
  const toggle = page.locator(`[data-admin-task-month-toggle="${periodKey}"]`);
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute('aria-expanded') !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

test('[E2E-H-004] goedkeuring vervangt urencontrole door factuurverzending voor hetzelfde dossier', async ({ page }) => {
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);
  let candidate: { employeeId: number; employeeName: string; periodKey: string; reviewTaskId: string } | null = null;

  await test.step('Given Backoffice een ingediende urenstaat uit de vaste herstelbasis opent', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await restoreBaseline(page);
    candidate = await page.evaluate(() => {
      const task = window.adminOpenTasks().find(item => item.type === 'hours-review' && item.periodKey === '2026-08');
      return task ? {
        employeeId: task.employee.id,
        employeeName: task.employee.name,
        periodKey: task.periodKey,
        reviewTaskId: task.id,
      } : null;
    });
    expect(candidate).not.toBeNull();
  });

  await test.step('When Backoffice die urenstaat goedkeurt', async () => {
    const selected = candidate!;
    await page.locator('button[data-view="approvals"]').click();
    const card = page
      .locator(`article.approval-card[data-approval-period="${selected.periodKey}"]`)
      .filter({ hasText: selected.employeeName });
    await expect(card).toBeVisible();
    await card.locator('[data-approve]').click();
    await expect(card).toHaveCount(0);
  });

  await test.step('Then verdwijnt alleen de urencontrole en verschijnt een factuuractie voor hetzelfde dossier', async () => {
    const selected = candidate!;
    const transition = async () => page.evaluate(({ reviewTaskId, employeeId, periodKey }) => {
      const tasks = window.adminOpenTasks();
      const invoiceTaskId = `invoice-delivery-${periodKey}-${employeeId}`;
      return {
        total: tasks.length,
        reviewStillOpen: tasks.some(task => task.id === reviewTaskId),
        invoiceTask: tasks.find(task => task.id === invoiceTaskId)
          ? { id: invoiceTaskId, type: 'invoice-delivery', actionable: true }
          : null,
      };
    }, selected);
    await expect.poll(transition).toEqual({
      total: 12,
      reviewStillOpen: false,
      invoiceTask: {
        id: `invoice-delivery-${selected.periodKey}-${selected.employeeId}`,
        type: 'invoice-delivery',
        actionable: true,
      },
    });

    await page.locator('button[data-view="invoices"]').click();
    const detailToggle = page.locator('#invoice-detail-toggle');
    if (await detailToggle.isVisible() && await detailToggle.getAttribute('aria-expanded') !== 'true') {
      await detailToggle.click();
    }
    const invoiceRow = page.locator('#invoice-rows tr').filter({ hasText: selected.employeeName });
    await expect(invoiceRow).toBeVisible();
    // Goedkeuren opent de factuurtaak. Afhankelijk van de reeds afgeronde
    // achtergrondread toont deze rij de lokale vervolgstatus of al de
    // serverprojectie zonder PDF; beide leiden naar dezelfde zojuist bewezen
    // invoice-delivery-taak.
    await expect(invoiceRow).toContainText(/Factuur (klaar|ontbreekt)/);
  });
});

test('[E2E-H-005] klanturenstaatcontrole wordt een brokeractie zonder taakverlies', async ({ page }) => {
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);
  let candidate: { employeeId: number; employeeName: string; periodKey: string; reviewTaskId: string } | null = null;

  await test.step('Given Backoffice een ontvangen klanturenstaat in de vaste herstelbasis heeft', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await restoreBaseline(page);
    candidate = await page.evaluate(() => {
      const task = window.adminOpenTasks().find(item => item.type === 'customer-review');
      return task ? {
        employeeId: task.employee.id,
        employeeName: task.employee.name,
        periodKey: task.periodKey,
        reviewTaskId: task.id,
      } : null;
    });
    expect(candidate).not.toBeNull();
  });

  await test.step('When Backoffice het ontvangen klantdocument goedkeurt', async () => {
    const selected = candidate!;
    await page.locator('#hero-backoffice-filter').click();
    await openAdminTaskMonth(page, selected.periodKey);
    const taskRow = page.locator(`[data-admin-task-row="${selected.reviewTaskId}"]`);
    await expect(taskRow).toContainText(selected.employeeName);
    await taskRow.locator('[data-review-customer-timesheet]').click();
    await expect(page.locator('#modal-title')).toContainText(selected.employeeName);
    await expect(page.locator('#modal-confirm')).toHaveText('Goedkeuren');
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then staat hetzelfde dossier klaar voor de broker en blijft het globale totaal stabiel', async () => {
    const selected = candidate!;
    const transition = async () => page.evaluate(({ reviewTaskId, employeeId, periodKey }) => {
      const tasks = window.adminOpenTasks();
      const brokerTaskId = `customer-broker-${periodKey}-${employeeId}`;
      const brokerTask = tasks.find(task => task.id === brokerTaskId);
      return {
        total: tasks.length,
        reviewStillOpen: tasks.some(task => task.id === reviewTaskId),
        brokerTask: brokerTask
          ? { id: brokerTask.id, type: brokerTask.type, actionable: brokerTask.actionable }
          : null,
      };
    }, selected);
    await expect.poll(transition).toEqual({
      total: 12,
      reviewStillOpen: false,
      brokerTask: {
        id: `customer-broker-${selected.periodKey}-${selected.employeeId}`,
        type: 'customer-broker',
        actionable: true,
      },
    });
    await expect(page.locator('#modal')).toBeVisible();
    await expect(page.locator('#modal-title')).toContainText(/klanturenstaat/i);
    await expect(page.locator('#modal-summary')).toContainText('Bedoelde productieroute');
    await expect(page.locator('#modal-summary')).toContainText('Gesimuleerde TEST-aflevering');
    await expect(page.locator('#modal-summary')).toContainText('giovanno.maatsen@pathconsultancy.nl');
    await expect(page.locator('#modal-summary')).toContainText('geen verzending');
    await expect(page.locator('#modal-summary [data-view-customer-timesheet]')).toHaveText('Klanturenstaat bekijken');
    await page.locator('#modal-close').click();
    await page.locator('#hero-backoffice-filter').click();
    await openAdminTaskMonth(page, selected.periodKey);
    const brokerRow = page.locator(`[data-admin-task-row="customer-broker-${selected.periodKey}-${selected.employeeId}"]`);
    await expect(brokerRow).toContainText('Brokerroute controleren');
    await expect(brokerRow.locator('[data-send-customer-timesheet]')).toBeEnabled();
  });
});

test('[E2E-H-007] taakgestuurde goedkeuring blijft na serververversing afgerond', async ({ page }) => {
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);
  const employeeId = 1;
  const periodKey = '2026-08';
  const reviewTaskId = `hours-review-${periodKey}-${employeeId}`;
  const invoiceTaskId = `invoice-delivery-${periodKey}-${employeeId}`;
  let serverStatus: 'submitted' | 'approved' = 'submitted';
  let serverVersion = 70;
  let approveWrites = 0;
  let targetReads = 0;

  const timesheetPayload = () => ({
    id: 97001,
    status: serverStatus,
    contractual_hours: 168,
    billable_hours: 16,
    leave_hours: 0,
    sickness_hours: 0,
    employee_note: null,
    review_note: null,
    day_entries: [
      { work_date: `${periodKey}-03`, hours: 8, description: 'Servergestuurde goedkeuring dag 1' },
      { work_date: `${periodKey}-04`, hours: 8, description: 'Servergestuurde goedkeuring dag 2' },
    ],
    submitted_at: '2026-08-31T12:00:00Z',
    approved_at: serverStatus === 'approved' ? '2026-08-31T12:05:00Z' : null,
    approved_by: serverStatus === 'approved' ? 100 : null,
    version: serverVersion,
    latest_correction: null,
    correction_history: [],
  });

  await page.route('**/server/api/timesheets.php**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (method === 'GET') {
      const url = new URL(request.url());
      const requestedEmployee = Number(url.searchParams.get('employee_id') || 0);
      const requestedPeriod = String(url.searchParams.get('period') || '');
      if (requestedEmployee === employeeId && requestedPeriod === periodKey) {
        targetReads += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            found: true,
            period: periodKey,
            employee_id: employeeId,
            timesheet: timesheetPayload(),
          }),
        });
        return;
      }
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

    if (method === 'POST') {
      const payload = request.postDataJSON() as {
        action?: string;
        employee_id?: number;
        period?: string;
        expected_version?: number;
      };
      if (
        payload.action === 'approve'
        && Number(payload.employee_id) === employeeId
        && String(payload.period) === periodKey
      ) {
        expect(Number(payload.expected_version)).toBe(serverVersion);
        approveWrites += 1;
        serverStatus = 'approved';
        serverVersion += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            period: periodKey,
            employee_id: employeeId,
            timesheet: timesheetPayload(),
            audit_event: 'timesheet.approved',
          }),
        });
        return;
      }
    }

    await route.continue();
  });

  await test.step('Given een servergestuurde urencontrole in de Backoffice-werkvoorraad staat', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect.poll(() => page.evaluate((taskId) => (
      window.adminOpenTasks().some(task => task.id === taskId)
    ), reviewTaskId)).toBe(true);
    await page.locator('#hero-backoffice-filter').click();
    await openAdminTaskMonth(page, periodKey);
    await expect(page.locator(`[data-admin-task-row="${reviewTaskId}"]`)).toBeVisible();
  });

  await test.step('When Backoffice via de taakmodal goedkeurt', async () => {
    const taskRow = page.locator(`[data-admin-task-row="${reviewTaskId}"]`);
    await taskRow.locator('[data-review]').click();
    await expect(page.locator('#modal-title')).toContainText('Marc de Roon');
    await page.locator('#modal-confirm').click();
    await expect.poll(() => approveWrites).toBe(1);
    expect(serverStatus).toBe('approved');
  });

  await test.step('Then blijft de controle na volledige server-readback weg en staat de factuurtaak open', async () => {
    const taskTransition = async () => page.evaluate(({ reviewId, invoiceId }) => {
      const tasks = window.adminOpenTasks();
      return {
        reviewOpen: tasks.some(task => task.id === reviewId),
        invoiceOpen: tasks.some(task => task.id === invoiceId && task.actionable),
      };
    }, { reviewId: reviewTaskId, invoiceId: invoiceTaskId });

    await expect.poll(taskTransition).toEqual({ reviewOpen: false, invoiceOpen: true });
    const readsBeforeRefresh = targetReads;
    await page.evaluate(async ({ key, id }) => {
      await (window as typeof window & {
        refreshTimesheetReadApi: (periodKey: string, employeeId: number, force: boolean) => Promise<unknown>;
      }).refreshTimesheetReadApi(key, id, true);
    }, { key: periodKey, id: employeeId });
    await expect.poll(() => targetReads).toBeGreaterThan(readsBeforeRefresh);
    await expect.poll(taskTransition).toEqual({ reviewOpen: false, invoiceOpen: true });
    expect(approveWrites).toBe(1);
  });
});

test('[E2E-H-008] urencontrole vraagt na oude versie opnieuw op en maakt daarna toch goedkeuren af', async ({ page }) => {
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);
  const employeeId = 1;
  const periodKey = '2026-08';
  const reviewTaskId = `hours-review-${periodKey}-${employeeId}`;
  let serverStatus: 'submitted' | 'approved' = 'submitted';
  let serverVersion = 70;
  let staleVersionMode = true;
  let approveWrites = 0;

  const timesheetPayload = () => ({
    id: 97002,
    status: serverStatus,
    contractual_hours: 168,
    billable_hours: 16,
    leave_hours: 0,
    sickness_hours: 0,
    employee_note: null,
    review_note: null,
    day_entries: [
      { work_date: `${periodKey}-03`, hours: 8, description: 'Versie-refresh goedkeuringsflow dag 1' },
      { work_date: `${periodKey}-04`, hours: 8, description: 'Versie-refresh goedkeuringsflow dag 2' },
    ],
    submitted_at: '2026-08-31T12:00:00Z',
    approved_at: serverStatus === 'approved' ? '2026-08-31T12:05:00Z' : null,
    approved_by: serverStatus === 'approved' ? 100 : null,
    version: staleVersionMode ? 0 : serverVersion,
    latest_correction: null,
    correction_history: [],
  });

  await page.route('**/server/api/timesheets.php**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (method === 'GET') {
      const url = new URL(request.url());
      const requestedEmployee = Number(url.searchParams.get('employee_id') || 0);
      const requestedPeriod = String(url.searchParams.get('period') || '');
      if (requestedEmployee === employeeId && requestedPeriod === periodKey) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            found: true,
            period: periodKey,
            employee_id: employeeId,
            timesheet: timesheetPayload(),
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, found: false, period: requestedPeriod, employee_id: requestedEmployee, timesheet: null }),
      });
      return;
    }

    if (method === 'POST') {
      const payload = request.postDataJSON() as { action?: string; employee_id?: number; period?: string; expected_version?: number };
      if (payload.action === 'approve' && Number(payload.employee_id) === employeeId && String(payload.period) === periodKey) {
        expect(Number(payload.expected_version)).toBe(serverVersion);
        approveWrites += 1;
        serverStatus = 'approved';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            period: periodKey,
            employee_id: employeeId,
            timesheet: timesheetPayload(),
            audit_event: 'timesheet.approved',
          }),
        });
        return;
      }
    }

    await route.continue();
  });

  await test.step('Given een urencontrole eerst met een oude lokale versie opent', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect.poll(() => page.evaluate((taskId) => window.adminOpenTasks().some(task => task.id === taskId), reviewTaskId)).toBe(true);
    await page.locator('#hero-backoffice-filter').click();
    await openAdminTaskMonth(page, periodKey);
    await page.locator(`[data-admin-task-row="${reviewTaskId}"] [data-review]`).click();
    await expect(page.locator('#modal-title')).toContainText('Marc de Roon');
    await expect(page.locator('#modal-confirm')).toHaveText('Goedkeuren');
  });

  await test.step('When Backoffice de confirm drukt na het vrijgeven van de versieverversing', async () => {
    staleVersionMode = false;
    await page.locator('#modal-confirm').click();
    await expect.poll(() => approveWrites).toBe(1);
  });

  await test.step('Then wordt de urencontrole goedgekeurd en verdwijnt de taak', async () => {
    await expect(page.locator('#toast')).toContainText('Marc de Roon is goedgekeurd voor Augustus 2026');
    await expect.poll(() => page.evaluate((taskId) => window.adminOpenTasks().some(task => task.id === taskId), reviewTaskId)).toBe(false);
  });
});
