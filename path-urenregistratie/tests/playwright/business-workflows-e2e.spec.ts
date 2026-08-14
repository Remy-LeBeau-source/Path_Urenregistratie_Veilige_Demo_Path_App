import { expect, test } from '@playwright/test';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

type JsonBody = Record<string, unknown>;

async function postAuth(page: import('@playwright/test').Page, path: string, body: JsonBody) {
  const csrfResponse = await page.request.get('/server/auth/csrf.php');
  const csrfBody = await csrfResponse.json() as { csrf_token?: string };
  const response = await page.request.post(path, {
    headers: { 'X-CSRF-Token': String(csrfBody.csrf_token || '') },
    data: body,
  });
  return { status: response.status(), body: await response.json() as JsonBody };
}

async function restoreBaseline(page: import('@playwright/test').Page) {
  await page.locator('#quick-reset-demo').click();
  await expect(page.locator('#modal-title')).toHaveText('Alle lokale wijzigingen wissen?');
  await page.locator('#modal-confirm').click();
  await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
}

test('[E2E-H-001] herstelbasis houdt globale werkvoorraad stabiel bij maand- en filterwissels', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given Backoffice de vaste herstelbasis met twaalf open acties opent', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await restoreBaseline(page);
    await expect(page.locator('#hero-backoffice-count')).toHaveText('7');
    await expect(page.locator('#hero-employee-count')).toHaveText('5');
  });

  const taskSnapshot = async () => page.evaluate(() => {
    const tasks = window.adminOpenTasks();
    return {
      ids: tasks.map(task => task.id).sort(),
      total: tasks.length,
      actionable: tasks.filter(task => task.actionable).length,
      waiting: tasks.filter(task => !task.actionable).length,
    };
  });
  const baseline = await taskSnapshot();

  await test.step('When Backoffice van augustus naar juli en terug naar augustus wisselt', async () => {
    await page.locator('#period-prev').click();
    await expect(page.locator('#period-label')).toHaveText('Juli 2026');
    await page.locator('#period-next').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
  });

  await test.step('Then blijven totaal, eigenaarschap en taakidentiteiten ongewijzigd', async () => {
    await expect.poll(taskSnapshot).toEqual(baseline);
    expect(baseline).toMatchObject({ total: 12, actionable: 7, waiting: 5 });
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
    await expect(page.locator('#dashboard-work-count')).toHaveAttribute(
      'aria-label',
      '12 open acties: 7 bij Backoffice, 5 wacht op medewerkers',
    );
  });

  await test.step('And de eigenaarfilters tonen uitsluitend hun zeven en vijf concrete acties', async () => {
    await page.locator('#hero-backoffice-filter').click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(7);
    await expect(page.locator('#admin-task-list .admin-task-row.is-waiting')).toHaveCount(0);

    await page.locator('[data-admin-task-filter="waiting"]').click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(5);
    await expect(page.locator('#admin-task-list .admin-task-row.is-actionable')).toHaveCount(0);
  });
});

test('[E2E-H-002] rolwissel werkt zonder F5 en herstel blijft uitsluitend voor Backoffice', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const employeePassword = requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD');
  const adminPassword = requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD');

  await test.step('Given de TEST-login met accountkeuzes zichtbaar is', async () => {
    await loginPage.open();
    await expect(page.locator('#login-employee-trigger')).toBeVisible();
    await expect(page.locator('#login-admin-trigger')).toBeVisible();
  });

  await test.step('When Stasjo via de medewerkerskeuze wordt geselecteerd', async () => {
    await page.locator('#login-employee-trigger').click();
    await page.locator('#login-employee-choices [data-login-account-role="employee"]').filter({ hasText: 'Stasjo van Bakel' }).click();
  });

  await test.step('Then staan zijn testcredentials direct klaar en is Herstel na inloggen verborgen', async () => {
    await expect(page.locator('#auth-login-email')).toHaveValue('stasjo@example.invalid');
    await expect(page.locator('#auth-login-password')).toHaveValue(employeePassword);
    await page.locator('#auth-login-submit').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#quick-reset-demo')).toBeHidden();
    await expect(page.locator('button[data-view="settings"]')).toBeHidden();
  });

  await test.step('When naar Joyce als beheerder wordt gewisseld zonder pagina-herlaad', async () => {
    await loginPage.logout();
    await page.locator('#login-admin-trigger').click();
    await page.locator('#login-admin-choices [data-login-account-role="admin"]').filter({ hasText: 'Joyce van der Steenhoven' }).click();
  });

  await test.step('Then wisselen de credentials direct en krijgt Backoffice de herstelbediening', async () => {
    await expect(page.locator('#auth-login-email')).toHaveValue('joyce@example.invalid');
    await expect(page.locator('#auth-login-password')).toHaveValue(adminPassword);
    await page.locator('#auth-login-submit').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#quick-reset-demo')).toBeVisible();
  });
});

test('[E2E-H-003] herindiening verplaatst dezelfde actie van medewerker naar Backoffice', async ({ page }) => {
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);

  await test.step('Given de herstelbasis Stasjo een correctieactie en Backoffice zeven acties geeft', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await restoreBaseline(page);
    await expect(page.locator('#hero-backoffice-count')).toHaveText('7');
    await expect(page.locator('#hero-employee-count')).toHaveText('5');
  });

  await test.step('When Stasjo zijn correctie opent en opnieuw indient', async () => {
    await loginPage.logout();
    await loginPage.loginAsEmployee();
    const august = page.locator('[data-employee-open-month="2026-08"]');
    await expect(august).toBeVisible();
    const augustBody = august.locator('.employee-open-month-body');
    if (await augustBody.isHidden()) {
      await august.locator('[data-employee-open-month-toggle]').click();
    }
    const action = august.locator('[data-employee-open-action="hours"]');
    await expect(action).toContainText('Open correctie');
    await expect(action).toHaveAttribute('data-period-key', '2026-08');
    await action.click();
    await expect(page.locator('#timesheet-status')).toHaveText('Correctie nodig');
    await expect(page.locator('#hours-grid .hours-input:not([disabled])').first()).toBeVisible();
    await expect(page.locator('#submit-timesheet')).toContainText('opnieuw indienen');
    await page.locator('#submit-timesheet').click();
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
  });

  await test.step('Then krijgt Backoffice direct de vervolgcontrole zonder verlies van het globale totaal', async () => {
    await loginPage.logout();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
    await expect(page.locator('#hero-backoffice-count')).toHaveText('8');
    await expect(page.locator('#hero-employee-count')).toHaveText('4');

    const followUp = page.locator('[data-admin-task-row="hours-review-2026-08-2"]');
    await page.locator('#hero-backoffice-filter').click();
    await expect(followUp).toBeVisible();
    await expect(followUp).toContainText('Stasjo van Bakel');
    await expect(followUp).toContainText('Uren controleren');
    await expect(followUp.locator('[data-review="2"]')).toBeEnabled();
    await expect(page.locator('[data-admin-task-month="2026-08"] .admin-task-month-heading')).toContainText('Augustus 2026');

    const followUpContract = await page.evaluate(() => {
      const task = window.adminOpenTasks().find(item =>
        item.employee.id === 2 && item.periodKey === '2026-08' && item.type === 'hours-review'
      );
      return task ? { employeeId: task.employee.id, periodKey: task.periodKey, type: task.type, actionable: task.actionable } : null;
    });
    expect(followUpContract).toEqual({ employeeId: 2, periodKey: '2026-08', type: 'hours-review', actionable: true });
  });
});

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
    await expect(invoiceRow).toContainText('Factuur klaar');
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
    await page.locator('#modal-close').click();
    await page.locator('#hero-backoffice-filter').click();
    const brokerRow = page.locator(`[data-admin-task-row="customer-broker-${selected.periodKey}-${selected.employeeId}"]`);
    await expect(brokerRow).toContainText('Brokerroute controleren');
    await expect(brokerRow.locator('[data-send-customer-timesheet]')).toBeEnabled();
  });
});

test('[E2E-H-006] eenmalige wachtwoordlink geeft toegang en blokkeert hergebruik', async ({ page }) => {
  test.setTimeout(60_000);
  const originalPassword = requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD');
  const temporaryPassword = 'E2eTijdelijk!2026';
  let changed = false;
  let token = '';

  try {
    await test.step('Given een actieve medewerker een resetlink aanvraagt', async () => {
      const response = await postAuth(page, '/server/auth/request-reset.php', { email: appConfig.employeeEmail });
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.token).toMatch(/^[a-f0-9]{64}$/);
      token = String(response.body.token);
    });

    await test.step('When de medewerker via de link een sterk nieuw wachtwoord instelt', async () => {
      await page.goto(`${appConfig.baseUrl}/index.html#reset-password=${token}`);
      await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
      await page.locator('#auth-reset-new-password').fill(temporaryPassword);
      await page.locator('#auth-reset-confirm-password').fill(temporaryPassword);
      await page.locator('#auth-reset-complete-submit').click();
      await expect(page.locator('#auth-reset-complete-feedback')).toHaveText('Je wachtwoord is ingesteld. Je kunt nu inloggen.');
      changed = true;
    });

    await test.step('Then werkt het nieuwe wachtwoord en is dezelfde link niet opnieuw bruikbaar', async () => {
      const reused = await postAuth(page, '/server/auth/reset-password.php', { token, new_password: temporaryPassword });
      expect(reused.status).toBe(409);
      expect(reused.body.error).toBe('token-already-used');

      await page.locator('#auth-login-email').fill(appConfig.employeeEmail);
      await page.locator('#auth-login-password').fill(temporaryPassword);
      await page.locator('#auth-login-submit').click();
      await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    });
  } finally {
    if (changed) {
      const restore = await postAuth(page, '/server/auth/request-reset.php', { email: appConfig.employeeEmail });
      if (typeof restore.body.token === 'string') {
        await postAuth(page, '/server/auth/reset-password.php', {
          token: restore.body.token,
          new_password: originalPassword,
        });
      }
    }
  }
});
