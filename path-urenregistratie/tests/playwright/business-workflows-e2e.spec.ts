import { expect, test } from './fixtures/e2eIsolation';
import { request as playwrightRequest } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { useFixedDemoClock } from './fixtures/fixedDemoClock';
import { LoginPage } from './pages/LoginPage';
import { openUrenactieVanMaand } from './fixtures/klassiekDashboard';
import { klikTestknop, sluitTestknoppen } from './fixtures/testknoppen';

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
    await sluitTestknoppen(page);
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
    // Desktop-Klassiek: chip "Augustus · correctie" in Vandaag; elders de
    // knop "Open correctie" in Open acties per maand. Zie fixtures/klassiekDashboard.ts.
    await openUrenactieVanMaand(page, '2026-08', { chip: 'correctie', knop: 'Open correctie' });
    await expect(page.locator('#timesheet-status')).toHaveText('Correctie nodig');
    await expect(page.locator('#hours-grid .hours-input:not([disabled])').first()).toBeVisible();
    await page.locator('[data-hours-week-scope="all"]').click();
    await expect(page.locator('#submit-timesheet')).toContainText('opnieuw indienen');
    await page.locator('#submit-timesheet').click();
    await page.locator('#modal-confirm').click();
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
