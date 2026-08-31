import { expect, test } from './fixtures/e2eIsolation';
import { request as playwrightRequest } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { useFixedDemoClock } from './fixtures/fixedDemoClock';
import { LoginPage } from './pages/LoginPage';

type JsonBody = Record<string, unknown>;

test.beforeEach(async ({ page }) => {
  await useFixedDemoClock(page);
});

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

async function openAdminTaskMonth(page: import('@playwright/test').Page, periodKey: string) {
  const toggle = page.locator(`[data-admin-task-month-toggle="${periodKey}"]`);
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute('aria-expanded') !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
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

test('[E2E-H-002] rolwissel werkt zonder F5 en herstel blijft beschikbaar voor iedere rol op LOCAL/TEST', async ({ page }) => {
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

  await test.step('Then staan zijn testcredentials direct klaar en blijft Herstel ook voor hem beschikbaar op LOCAL/TEST', async () => {
    await expect(page.locator('#auth-login-email')).toHaveValue('stasjo@example.invalid');
    await expect(page.locator('#auth-login-password')).toHaveValue(employeePassword);
    await page.locator('#auth-login-submit').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#quick-reset-demo')).toBeVisible();
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
    await openAdminTaskMonth(page, '2026-08');
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

test('[E2E-H-006] eenmalige wachtwoordlink geeft toegang en blokkeert hergebruik', async ({ page }) => {
  test.setTimeout(90_000);

  // Deze case draaide op het GEDEELDE demo-account: hij veranderde daar het
  // wachtwoord en zette het achteraf terug. Dat is twee keer misgegaan.
  //
  // Het reseteindpunt staat drie aanvragen per kwartier toe. Twee aanvragen per
  // uitvoering maal drie browserprojecten is zes -- dus tegen het derde project is
  // de limiet op, komt het herstel niet meer door, en logt geen enkele latere case
  // meer in als deze medewerker. Op mobile-safari viel daardoor E2E-H-007 om met
  // "E-mailadres of wachtwoord is onjuist", zonder dat daar iets mis was.
  //
  // De oplossing is niet nóg een vangnet om het herstel heen, maar het gedeelde
  // account niet meer aanraken: deze case maakt zijn eigen wegwerpmedewerker.
  const uniek = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  const eigenAdres = `resetproef-${uniek}@example.invalid`;
  const eigenNaam = `Resetproef ${uniek}`;
  const nieuwWachtwoord = `E2eTijdelijk!${uniek}`;

  let gebruikerId = 0;
  let medewerkerId = 0;
  let token = '';

  const beheer = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  const beheerAuth = new AuthApi(beheer);
  const beheerPost = async (pad: string, data: JsonBody) => {
    const csrf = await (await beheer.get('/server/auth/csrf.php')).json() as { csrf_token?: string };
    const res = await beheer.post(pad, { headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') }, data });
    return { status: res.status(), body: await res.json() as JsonBody };
  };

  try {
    await test.step('Given een eigen wegwerpmedewerker een resetlink aanvraagt', async () => {
      await beheerAuth.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const aangemaakt = await beheerPost('/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: { name: eigenNaam, email: eigenAdres, role: 'Consultant', active: true },
      });
      expect(aangemaakt.status, JSON.stringify(aangemaakt.body)).toBe(200);
      gebruikerId = Number(aangemaakt.body.user_id || 0);
      medewerkerId = Number(aangemaakt.body.employee_id || 0);
      expect(gebruikerId, 'de wegwerpmedewerker hoort een account te krijgen').toBeGreaterThan(0);

      const response = await postAuth(page, '/server/auth/request-reset.php', { email: eigenAdres });
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.token).toMatch(/^[a-f0-9]{64}$/);
      token = String(response.body.token);
    });

    await test.step('When de medewerker via de link een sterk nieuw wachtwoord instelt', async () => {
      await page.goto(`${appConfig.baseUrl}/index.html#reset-password=${token}`);
      await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
      await page.locator('#auth-reset-new-password').fill(nieuwWachtwoord);
      await page.locator('#auth-reset-confirm-password').fill(nieuwWachtwoord);
      await page.locator('#auth-reset-complete-submit').click();
      await expect(page.locator('#auth-reset-complete-feedback')).toContainText('Je wachtwoord is ingesteld');
    });

    await test.step('Then werkt het nieuwe wachtwoord en is dezelfde link niet opnieuw bruikbaar', async () => {
      const hergebruik = await postAuth(page, '/server/auth/reset-password.php', { token, new_password: nieuwWachtwoord });
      expect(hergebruik.status, 'een gebruikte link mag niet nog eens werken').toBe(409);
      expect(hergebruik.body.error).toBe('token-already-used');

      await page.locator('#auth-reset-goto-login').click();
      await expect(page.locator('#auth-login-form')).toBeVisible();

      await page.locator('#auth-login-email').fill(eigenAdres);
      await page.locator('#auth-login-password').fill(nieuwWachtwoord);
      await page.locator('#auth-login-submit').click();
      await expect(page.locator('#view-employee-dashboard'), 'met het nieuwe wachtwoord hoort hij binnen te zijn')
        .toHaveClass(/is-active/);

      // En hij is werkelijk zichzelf, niet een collega uit de gedeelde stand.
      const ik = await (await page.request.get('/server/auth/me.php')).json() as JsonBody;
      const gebruiker = ik.user as Record<string, unknown> | undefined;
      expect(String(gebruiker?.email), 'hij hoort als zichzelf ingelogd te zijn').toBe(eigenAdres);
    });

    await test.step('And het gedeelde demo-account is niet aangeraakt', async () => {
      // De eigenlijke winst van deze wijziging: wat hierboven gebeurt, mag geen
      // enkel gevolg hebben voor het account waar alle andere cases op leunen.
      // Eerst de wegwerpmedewerker uitloggen: zolang die sessie staat is het
      // inlogscherm verborgen en meet je niets.
      await postAuth(page, '/server/auth/logout.php', {});
      const gedeeld = new LoginPage(page);
      await gedeeld.open();
      await gedeeld.loginAsEmployee();
      await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    });
  } finally {
    await postAuth(page, '/server/auth/logout.php', {}).catch(() => null);
    if (gebruikerId > 0) {
      await beheerPost('/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: { name: eigenNaam, email: eigenAdres, dbEmployeeId: medewerkerId, dbUserId: gebruikerId, role: 'Consultant', active: false },
      }).catch(() => null);
      await beheerPost('/server/api/users.php', { action: 'delete', user_id: gebruikerId }).catch(() => null);
    }
    await beheerAuth.logout().catch(() => null);
    await beheer.dispose();
  }
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
