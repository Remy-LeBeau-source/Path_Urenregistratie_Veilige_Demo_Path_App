import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

async function getCSRF(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const r = await ctx.get('/server/auth/csrf.php');
  const body = await r.json();
  return String(body.csrf_token || '');
}

async function postJson(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  path: string,
  payload: Record<string, unknown>
) {
  const token = await getCSRF(ctx);
  const response = await ctx.post(path, {
    headers: { 'X-CSRF-Token': token },
    data: payload,
  });

  return {
    status: response.status(),
    body: await response.json(),
  };
}

test.describe('admin write endpoints', () => {
  test('[ADM-WR-H-001] admin kan company/settings server-led opslaan', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const before = await ctx.get('/server/api/bootstrap.php');
    expect(before.status()).toBe(200);
    const beforeBody = await before.json();
    const company = beforeBody.companies[0];

    const uniqueSuffix = Date.now().toString().slice(-6);
    const savePayload = {
      settings: {
        organizationName: `Path Test ${uniqueSuffix}`,
        appName: 'Uren & Facturatie',
        supportName: 'Backoffice',
        supportEmail: 'backoffice@pathconsultancy.nl',
        brandPrimary: '#0d1b38',
        brandAccent: '#3abd9d',
        companyName: company.legal_name,
        invoiceNameDisplay: company.invoice_name_display || 'trade_and_legal',
        kvk: company.chamber_of_commerce_number || '12345678',
        vat: company.vat_number || 'NL123456789B01',
        iban: company.iban || 'NL00BANK0123456789',
        address: company.address_line || 'Voorbeeldstraat 1',
        postalCity: [company.postal_code || '1234 AB', company.city || 'Rotterdam'].join(' '),
        phone: company.invoice_phone || '0646328283',
        invoiceEmail: company.invoice_email || 'backoffice@pathconsultancy.nl',
        paymentTerm: Number(company.payment_term_days || 30),
        customerTimesheetReminderEnabled: true,
        customerTimesheetReminderTime: '15:00',
        customerTimesheetOverdueWorkdays: 2,
      },
      mailRecipients: beforeBody.mail_recipients,
    };

    const save = await postJson(ctx, '/server/api/settings.php', savePayload);
    expect(save.status, JSON.stringify(save.body)).toBe(200);
    expect(save.body.ok).toBe(true);

    const after = await ctx.get('/server/api/bootstrap.php');
    expect(after.status()).toBe(200);
    const afterBody = await after.json();
    const afterCompany = afterBody.companies[0];
    expect(afterCompany.trade_name).toBe(`Path Test ${uniqueSuffix}`);
    expect(afterCompany.invoice_name_display).toBe(company.invoice_name_display || 'trade_and_legal');

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ADM-WR-H-002] admin kan beheerder server-led aanmaken en wijzigen', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const unique = Date.now().toString().slice(-7);
    const email = `admin-write-${unique}@example.invalid`;

    const create = await postJson(ctx, '/server/api/staff.php', {
      action: 'upsert_admin',
      admin: {
        name: `API Admin ${unique}`,
        email,
        active: true,
      },
    });

    expect(create.status, JSON.stringify(create.body)).toBe(200);
    expect(create.body.ok).toBe(true);
    expect(Number(create.body.user_id)).toBeGreaterThan(0);
    expect(create.body.invitation_queued).toBe(false);
    expect(create.body.invitation_pending).toBe(true);

    const userId = Number(create.body.user_id);

    const update = await postJson(ctx, '/server/api/staff.php', {
      action: 'upsert_admin',
      admin: {
        dbUserId: userId,
        name: `API Admin ${unique} Updated`,
        email,
        active: true,
      },
    });

    expect(update.status, JSON.stringify(update.body)).toBe(200);
    expect(update.body.ok).toBe(true);
    expect(update.body.invitation_queued).toBe(false);
    expect(update.body.invitation_pending).toBe(true);

    const bootstrap = await ctx.get('/server/api/bootstrap.php');
    const bootstrapBody = await bootstrap.json();
    const found = (bootstrapBody.users as Array<{ id: number; email: string; display_name: string; role: string }>).find(
      user => user.id === userId
    );
    expect(found).toBeDefined();
    expect(found?.role).toBe('administrator');
    expect(found?.display_name).toContain('Updated');

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ADM-WR-H-003] admin kan medewerker server-led aanmaken en bootstrap ziet deze terug', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);

    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const unique = Date.now().toString().slice(-7);
    const employeeEmail = `employee-write-${unique}@example.invalid`;
    const employeeName = `API Medewerker ${unique}`;

    const bootstrapBefore = await ctx.get('/server/api/bootstrap.php');
    const beforeBody = await bootstrapBefore.json();

    const write = await postJson(ctx, '/server/api/staff.php', {
      action: 'upsert_employee',
      sendInvitation: false,
      employee: {
        name: employeeName,
        email: employeeEmail,
        role: 'Tester',
        startDate: '2026-08-01',
        active: true,
        weeklyHours: 36,
        rate: 80,
        projectCode: `PROJ-${unique}`,
        invoiceProject: `Project ${unique}`,
        invoiceTemplate: '{klant}-{jaar}-{maand}',
        client: 'ItaQ Consultancy',
        broker: 'ItaQ Consultancy',
        brokerEmail: 'broker@example.invalid',
        brokerMailEnabled: true,
        brokerInvoiceAttachment: true,
        bookkeeperInvoiceAttachment: true,
        payrollInvoiceAttachment: false,
        customerTimesheetExpected: true,
        customerTimesheetDueWorkday: 5,
        customerTimesheetBrokerEnabled: false,
        customerTimesheetUseBrokerEmail: true,
        customerTimesheetBrokerEmail: 'broker@example.invalid',
        invoiceWithoutCustomerTimesheetAllowed: true,
        mailRecipientRoutes: {
          bookkeeper: { enabled: true, invoiceAttachment: true },
          payroll: { enabled: true, invoiceAttachment: false },
        },
      },
      mailRecipients: beforeBody.mail_recipients,
    });

    expect(write.status, JSON.stringify(write.body)).toBe(200);
    expect(write.body.ok).toBe(true);
    expect(Number(write.body.employee_id)).toBeGreaterThan(0);
    expect(write.body.invitation_queued).toBe(false);
    expect(write.body.invitation_pending).toBe(true);

    const bootstrapAfter = await ctx.get('/server/api/bootstrap.php');
    const afterBody = await bootstrapAfter.json();
    const foundEmployee = (afterBody.employees as Array<{ id: number; full_name: string; user_id: number }>).find(
      employee => employee.id === Number(write.body.employee_id)
    );
    expect(foundEmployee).toBeDefined();
    expect(foundEmployee?.full_name).toBe(employeeName);

    const foundUser = (afterBody.users as Array<{ id: number; email: string; role: string; password_ready: number }>).find(
      user => user.id === Number(write.body.user_id)
    );
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(employeeEmail);
    expect(foundUser?.role).toBe('employee');
    expect(Number(foundUser?.password_ready)).toBe(0);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ADM-WR-N-001] dubbel accountadres geeft veilige metadata van het bestaande bedrijfsaccount', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const duplicateEmail = appConfig.adminEmail.toUpperCase();
    const employeeWrite = await postJson(ctx, '/server/api/staff.php', {
      action: 'upsert_employee',
      sendInvitation: false,
      employee: { name: 'Dubbele medewerker', email: duplicateEmail },
      mailRecipients: [],
    });
    const adminWrite = await postJson(ctx, '/server/api/staff.php', {
      action: 'upsert_admin',
      sendInvitation: false,
      admin: { name: 'Dubbele beheerder', email: duplicateEmail, active: true },
    });

    for (const result of [employeeWrite, adminWrite]) {
      expect(result.status).toBe(409);
      expect(result.body.ok).toBe(false);
      expect(result.body.error).toBe('email-already-in-use');
      expect(result.body.message).toContain('hoort al bij');
      expect(result.body.existing_account).toMatchObject({
        role: 'administrator',
        active: true,
      });
      expect(Number(result.body.existing_account?.user_id)).toBeGreaterThan(0);
      expect(JSON.stringify(result.body)).not.toContain('SQLSTATE');
      expect(JSON.stringify(result.body)).not.toContain('users.email');
    }

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ADM-WR-N-003] beheerder aanmaken met het e-mailadres van een bestaande medewerker wordt geweigerd', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const suffix = Date.now().toString().slice(-7);
    const employeeEmail = `bestaande-medewerker-${suffix}@example.invalid`;

    const employeeWrite = await postJson(ctx, '/server/api/staff.php', {
      action: 'upsert_employee',
      sendInvitation: false,
      employee: { name: `Bestaande medewerker ${suffix}`, email: employeeEmail, role: 'Consultant', client: 'Klant', project: `PROJ-${suffix}`, broker: 'Broker', brokerEmail: 'broker@example.invalid' },
      mailRecipients: [],
    });
    expect(employeeWrite.status, JSON.stringify(employeeWrite.body)).toBe(200);
    expect(employeeWrite.body.ok).toBe(true);

    const adminWrite = await postJson(ctx, '/server/api/staff.php', {
      action: 'upsert_admin',
      sendInvitation: false,
      admin: { name: 'Nieuwe beheerder met bestaand adres', email: employeeEmail.toUpperCase(), active: true },
    });

    expect(adminWrite.status).toBe(409);
    expect(adminWrite.body.ok).toBe(false);
    expect(adminWrite.body.error).toBe('email-already-in-use');
    expect(adminWrite.body.message).toContain('hoort al bij');
    expect(adminWrite.body.existing_account).toMatchObject({ role: 'employee', active: true });
    expect(Number(adminWrite.body.existing_account?.user_id)).toBeGreaterThan(0);
    expect(JSON.stringify(adminWrite.body)).not.toContain('SQLSTATE');

    const bootstrapAfter = await ctx.get('/server/api/bootstrap.php');
    const afterBody = await bootstrapAfter.json();
    const adminRowsWithThisEmail = (afterBody.users as Array<{ email: string; role: string }>)
      .filter(user => String(user.email).toLowerCase() === employeeEmail.toLowerCase() && user.role === 'administrator');
    expect(adminRowsWithThisEmail).toHaveLength(0);

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ADM-WR-N-004] beheerder aanmaken met het e-mailadres van een bestaande medewerker toont een duidelijke melding (geen silent failure)', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('[data-view="employees"]').click();

    const suffix = Date.now().toString().slice(-7);
    const employeeName = `Botsingsmedewerker ${suffix}`;
    const employeeEmail = `botsing-${suffix}@example.invalid`;

    await test.step('Given er al een medewerker met een vast e-mailadres bestaat', async () => {
      await page.locator('#add-employee').click();
      await page.locator('#edit-name').fill(employeeName);
      await page.locator('#edit-account-email').fill(employeeEmail);
      await page.locator('#edit-role').fill('Consultant');
      await page.locator('#edit-client').fill('Botsingsklant');
      await page.locator('#edit-project').fill(`BOTS-${suffix}`);
      await page.locator('#edit-broker').fill('Botsingsbroker');
      await page.locator('#edit-broker-email').fill('broker@example.invalid');
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal')).toBeHidden();
      await expect(page.locator('#employee-grid')).toContainText(employeeName);
    });

    await test.step('When een beheerder wordt aangemaakt met exact datzelfde adres', async () => {
      await page.locator('#add-admin').click();
      await page.locator('#edit-admin-name').fill(`Botsingsbeheerder ${suffix}`);
      await page.locator('#edit-admin-email').fill(employeeEmail.toUpperCase());
      await page.locator('#modal-confirm').click();
    });

    await test.step('Then verschijnt een duidelijke toast en wordt de bestaande medewerker uitgelicht, i.p.v. stil niets te doen', async () => {
      await expect(page.locator('#modal')).toBeHidden();
      await expect(page.locator('#toast')).toContainText('hoort al bij', { timeout: 10_000 });
      await expect(page.locator(`[data-employee-account-id]:has-text("${employeeName}")`)).toHaveClass(/account-conflict-focus/);
      await expect(page.locator('#administrator-list')).not.toContainText(`Botsingsbeheerder ${suffix}`);
    });

    await loginPage.logout();
  });

  test('[ADM-WR-N-002] dubbel accountadres opent het bestaande account zonder duplicaat', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('[data-view="employees"]').click();

    const adminRows = page.locator('#administrator-list .administrator-row');
    const employeeCards = page.locator('#employee-grid .employee-card');
    const adminCountBefore = await adminRows.count();
    const employeeCountBefore = await employeeCards.count();
    const duplicateEmail = appConfig.adminEmail.toUpperCase();

    await page.locator('#add-admin').click();
    await page.locator('#edit-admin-name').fill('Dubbele beheerder');
    await page.locator('#edit-admin-email').fill(duplicateEmail);
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#toast')).toContainText('hoort al bij');
    await expect(page.locator('#modal')).toBeHidden();
    await expect(adminRows).toHaveCount(adminCountBefore);
    await expect(adminRows.filter({ hasText: appConfig.adminEmail })).toHaveClass(/account-conflict-focus/);
    await expect(page.locator('body')).not.toContainText('SQLSTATE');
    await expect(page.locator('body')).not.toContainText('users.email');

    await page.locator('#add-employee').click();
    await page.locator('#edit-name').fill('Dubbele medewerker');
    await page.locator('#edit-account-email').fill(duplicateEmail);
    await page.locator('#edit-broker-email').fill('broker@example.invalid');
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#toast')).toContainText('hoort al bij');
    await expect(page.locator('#modal')).toBeHidden();
    await expect(employeeCards).toHaveCount(employeeCountBefore);
    await expect(adminRows.filter({ hasText: appConfig.adminEmail })).toHaveClass(/account-conflict-focus/);
    await expect(page.locator('body')).not.toContainText('SQLSTATE');
    await expect(page.locator('body')).not.toContainText('users.email');

    await loginPage.logout();
  });

  test('[ADM-WR-H-004] admin slaat medewerker zonder SMTP veilig op met toegang in afwachting', async ({ page }) => {
    let submittedPayload: Record<string, unknown> | null = null;

    await page.route('**/server/api/bootstrap.php', async route => {
      const response = await route.fetch();
      const body = await response.json();
      body.capabilities = { password_reset_delivery: false };
      await route.fulfill({ response, json: body });
    });
    await page.route('**/server/api/staff.php', async route => {
      submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          user_id: 91001,
          employee_id: 92001,
          assignment_id: 93001,
          invitation_queued: false,
          invitation_pending: true,
        }),
      });
    });

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('[data-view="employees"]').click();
    await page.locator('#add-employee').click();

    await expect(page.locator('#modal-confirm')).toHaveText('Medewerker opslaan');
    await expect(page.locator('#edit-invite')).toBeDisabled();
    await expect(page.locator('#edit-invite')).not.toBeChecked();
    await expect(page.locator('#modal-summary')).toContainText('Uitnodiging volgt zodra e-mail is ingeschakeld');

    const suffix = Date.now().toString().slice(-7);
    await page.locator('#edit-name').fill(`Productie Medewerker ${suffix}`);
    await page.locator('#edit-account-email').fill(`productie-medewerker-${suffix}@example.invalid`);
    await page.locator('#edit-role').fill('Consultant');
    await page.locator('#edit-client').fill('Productieklant');
    await page.locator('#edit-project').fill(`PROD-${suffix}`);
    await page.locator('#edit-broker').fill('Productiebroker');
    await page.locator('#edit-broker-email').fill('broker@example.invalid');
    await page.locator('#modal-confirm').click();

    await expect.poll(() => submittedPayload).not.toBeNull();
    expect(submittedPayload?.action).toBe('upsert_employee');
    expect(submittedPayload?.sendInvitation).toBe(false);
    await expect(page.locator('#modal')).toBeHidden();
    await expect(page.locator('#toast')).toContainText('Medewerker opgeslagen zonder toegang');

    await loginPage.logout();
  });

  test('[ADM-WR-H-005] productie toont uitsluitend serveraccounts en opent medewerkerformulier bovenaan', async ({ page }) => {
    await page.route('**/server/api/bootstrap.php', async route => {
      const response = await route.fetch();
      const body = await response.json();
      const administrator = (body.users as Array<Record<string, unknown>>).find(user => user.role === 'administrator');
      body.users = administrator ? [administrator] : [];
      body.employees = [];
      body.assignments = [];
      body.counterparties = [];
      body.assignment_mail_routes = [];
      body.mail_recipients = [];
      body.capabilities = { password_reset_delivery: false };
      await route.fulfill({ response, json: body });
    });

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect.poll(() => page.evaluate(() => window.__PATH_READ_API_SOURCE.bootstrap)).toBe('api');

    await page.evaluate(() => {
      window.localAccountToolsAllowed = () => false;
      window.applyLoginPresentation(false);
      window.refreshBootstrapReadApi(true);
    });

    await expect(page.locator('#employee-grid .employee-card')).toHaveCount(0);
    await expect(page.locator('#employee-grid')).toContainText('Geen medewerkers binnen dit filter');
    await expect(page.locator('#team-active-account-count')).toHaveText('1');
    await expect(page.locator('#administrator-list .administrator-row')).toHaveCount(1);
    await expect(page.locator('#view-employees')).not.toContainText('Marc de Roon');
    await expect(page.locator('#view-employees')).not.toContainText('Stasjo van Bakel');
    await expect(page.locator('#quick-reset-demo')).toBeHidden();
    await expect(page.locator('#reset-demo')).toBeHidden();

    await page.locator('[data-view="employees"]').click();
    await page.locator('#add-employee').click();
    await expect(page.locator('#edit-name')).toBeFocused();
    await expect(page.locator('#edit-account-email')).toHaveValue('');
    await expect(page.locator('#edit-broker-email')).toHaveValue('');
    await expect(page.locator('#edit-customer-timesheet-broker-email')).toHaveValue('');
    await expect.poll(() => page.locator('.modal').evaluate(element => element.scrollTop)).toBe(0);
    await expect(page.locator('#modal-summary')).toContainText('Uitnodiging volgt zodra e-mail is ingeschakeld');

    await page.locator('#modal-close').click();
    await loginPage.logout();
  });

  test('[ADM-WR-H-006] deactiveren verplaatst medewerker direct en leeg account kan worden verwijderd', async ({ page }) => {
    let userActive = true;
    let userDeleted = false;
    let employeeName = '';

    await page.route('**/server/api/bootstrap.php', async route => {
      const response = await route.fetch();
      const body = await response.json();
      const users = body.users as Array<Record<string, unknown>>;
      const employees = body.employees as Array<Record<string, unknown>>;
      const administrator = users.find(user => user.role === 'administrator');
      const employeeUser = users.find(user => user.role === 'employee');
      const employee = employees.find(item => Number(item.user_id) === Number(employeeUser?.id));
      employeeName = String(employee?.full_name || 'Testmedewerker');

      body.users = [administrator, ...(!userDeleted && employeeUser ? [{ ...employeeUser, active: userActive ? 1 : 0 }] : [])].filter(Boolean);
      body.employees = !userDeleted && employee ? [{ ...employee, active: 1 }] : [];
      body.assignments = !userDeleted && employee
        ? (body.assignments as Array<Record<string, unknown>>).filter(item => Number(item.employee_id) === Number(employee.id))
        : [];
      body.capabilities = { password_reset_delivery: false };
      await route.fulfill({ response, json: body });
    });
    await page.route('**/server/api/users.php', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const payload = route.request().postDataJSON() as { action?: string; user_id?: number };
      if (payload.action === 'deactivate') userActive = false;
      if (payload.action === 'delete') userDeleted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, action: payload.action, user_id: payload.user_id }),
      });
    });

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.evaluate(async () => {
      window.localAccountToolsAllowed = () => false;
      window.applyLoginPresentation(false);
      await window.refreshBootstrapReadApi(true);
    });
    await page.locator('[data-view="employees"]').click();

    await test.step('Given de server een actief gebruikersaccount en actief medewerkersprofiel teruggeeft', async () => {
      await expect(page.locator('#employee-grid .employee-card')).toHaveCount(1);
      await expect(page.locator('#employee-grid')).toContainText(employeeName);
      await expect(page.locator('[data-toggle-employee]')).toHaveText('Deactiveren');
    });

    await test.step('When de beheerder de medewerker deactiveert', async () => {
      await page.locator('[data-toggle-employee]').click();
      await expect(page.locator('#modal-confirm')).toHaveText('Deactiveren');
      await page.locator('#modal-confirm').click();
    });

    await test.step('Then verdwijnt de medewerker uit Actief en staat deze onder Inactief', async () => {
      await expect(page.locator('#modal')).toBeHidden();
      await expect(page.locator('#employee-grid .employee-card')).toHaveCount(0);
      await page.locator('[data-employee-scope="inactive"]').click();
      await expect(page.locator('#employee-grid .employee-card')).toHaveCount(1);
      await expect(page.locator('[data-toggle-employee]')).toHaveText('Opnieuw activeren');
      await expect(page.locator('[data-delete-employee]')).toHaveText('Definitief verwijderen');
    });

    await test.step('And definitief verwijderen haalt het lege account uit Teambeheer', async () => {
      await page.locator('[data-delete-employee]').click();
      await expect(page.locator('#modal-confirm')).toHaveText('Definitief verwijderen');
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal')).toBeHidden();
      await expect(page.locator('#employee-grid .employee-card')).toHaveCount(0);
      await expect(page.locator('#employee-grid')).toContainText('Geen medewerkers binnen dit filter');
    });

    await loginPage.logout();
  });

  test('[ADM-WR-H-007] serverwrite na Herstel verschijnt direct in Teambeheer', async ({ page }) => {
    let adminSaved = false;
    let employeeSaved = false;

    await page.route('**/server/api/bootstrap.php', async route => {
      const response = await route.fetch();
      const body = await response.json();
      const companyId = Number(body.companies?.[0]?.id || 1);
      if (adminSaved) {
        body.users.push({
          id: 99001, company_id: companyId, email: 'nieuw-admin@example.invalid', display_name: 'Nieuwe beheerder',
          role: 'administrator', active: 1, password_ready: 0,
        });
      }
      if (employeeSaved) {
        body.users.push({
          id: 99002, company_id: companyId, email: 'nieuw-employee@example.invalid', display_name: 'Nieuwe medewerker',
          role: 'employee', active: 1, password_ready: 0,
        });
        body.employees.push({
          id: 99003, company_id: companyId, user_id: 99002, full_name: 'Nieuwe medewerker',
          job_title: 'Consultant', weekly_contract_hours: 36, employment_start_date: '2026-08-01', active: 1,
        });
      }
      body.capabilities = { password_reset_delivery: false };
      await route.fulfill({ response, json: body });
    });
    await page.route('**/server/api/staff.php', async route => {
      const payload = route.request().postDataJSON() as { action?: string };
      if (payload.action === 'upsert_admin') adminSaved = true;
      if (payload.action === 'upsert_employee') employeeSaved = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload.action === 'upsert_admin'
          ? { ok: true, user_id: 99001, invitation_queued: false, invitation_pending: true }
          : { ok: true, user_id: 99002, employee_id: 99003, assignment_id: 99004, invitation_queued: false, invitation_pending: true }),
      });
    });

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('path-uren-demo-v07-final:local-reset-authoritative'))).toBe('1');
    await page.locator('[data-view="employees"]').click();

    await page.locator('#add-admin').click();
    await page.locator('#edit-admin-name').fill('Nieuwe beheerder');
    await page.locator('#edit-admin-email').fill('nieuw-admin@example.invalid');
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#modal')).toBeHidden();
    await expect(page.locator('#administrator-list')).toContainText('Nieuwe beheerder');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('path-uren-demo-v07-final:local-reset-authoritative'))).toBeNull();

    await page.locator('#add-employee').click();
    await page.locator('#edit-name').fill('Nieuwe medewerker');
    await page.locator('#edit-account-email').fill('nieuw-employee@example.invalid');
    await page.locator('#edit-role').fill('Consultant');
    await page.locator('#edit-broker-email').fill('broker@example.invalid');
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#modal')).toBeHidden();
    await expect(page.locator('#employee-grid')).toContainText('Nieuwe medewerker');
    await expect(page.locator('#employee-grid')).toContainText('nieuw-employee@example.invalid');

    await loginPage.logout();
  });

  test('[ADM-WR-H-008] bestaande beheerder en medewerker worden na Herstel direct terug in Teambeheer getoond', async ({ page }) => {
    const existingAdminEmail = 'bestaande-beheerder@example.invalid';
    const existingAdminName = 'Bestaande beheerder';
    const existingEmployeeEmail = 'bestaande-medewerker@example.invalid';
    const existingEmployeeName = 'Bestaande medewerker';

    await page.route('**/server/api/bootstrap.php', async route => {
      const response = await route.fetch();
      const body = await response.json();
      const companyId = Number(body.companies?.[0]?.id || 1);
      body.users.push({
        id: 99101, company_id: companyId, email: existingAdminEmail, display_name: existingAdminName,
        role: 'administrator', active: 1, password_ready: 0,
      });
      body.users.push({
        id: 99102, company_id: companyId, email: existingEmployeeEmail, display_name: existingEmployeeName,
        role: 'employee', active: 0, password_ready: 0,
      });
      body.employees.push({
        id: 99103, company_id: companyId, user_id: 99102, employee_number: 'REG-99103',
        full_name: existingEmployeeName, job_title: 'Consultant', employment_type: 'employee',
        weekly_contract_hours: 36, employment_start_date: '2026-08-01', active: 1,
      });
      body.capabilities = { password_reset_delivery: false };
      await route.fulfill({ response, json: body });
    });
    await page.route('**/server/api/staff.php', async route => {
      const payload = route.request().postDataJSON() as { action?: string };
      const employeeConflict = payload.action === 'upsert_employee';
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'email-already-in-use',
          message: employeeConflict
            ? `Dit e-mailadres hoort al bij ${existingEmployeeName} (inactieve medewerker). Het bestaande account is voor je geopend.`
            : `Dit e-mailadres hoort al bij ${existingAdminName} (actieve beheerder). Het bestaande account is voor je geopend.`,
          existing_account: employeeConflict
            ? { user_id: 99102, employee_id: 99103, display_name: existingEmployeeName, role: 'employee', active: false }
            : { user_id: 99101, employee_id: null, display_name: existingAdminName, role: 'administrator', active: true },
        }),
      });
    });

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('path-uren-demo-v07-final:local-reset-authoritative'))).toBe('1');
    await page.locator('[data-view="employees"]').click();
    await expect(page.locator('#administrator-list')).not.toContainText(existingAdminName);
    await expect(page.locator('#employee-grid')).not.toContainText(existingEmployeeName);

    await page.locator('#add-employee').click();
    await page.locator('#edit-name').fill(existingEmployeeName);
    await page.locator('#edit-account-email').fill(existingEmployeeEmail);
    await page.locator('#edit-broker-email').fill('broker@example.invalid');
    await page.locator('#modal-confirm').click();

    await expect(page.locator('#toast')).toContainText(`hoort al bij ${existingEmployeeName}`);
    await expect(page.locator('#modal')).toBeHidden();
    await expect(page.locator('[data-employee-scope="inactive"]')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-grid')).toContainText(existingEmployeeName);
    await expect(page.locator('#employee-grid')).toContainText(existingEmployeeEmail);
    await expect(page.locator('#employee-grid .employee-card').filter({ hasText: existingEmployeeEmail })).toHaveClass(/account-conflict-focus/);
    await expect(page.locator('#administrator-list')).toContainText(existingAdminName);
    await expect(page.locator('#administrator-list')).toContainText(existingAdminEmail);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('path-uren-demo-v07-final:local-reset-authoritative'))).toBeNull();

    await page.locator('#add-admin').click();
    await page.locator('#edit-admin-name').fill(existingAdminName);
    await page.locator('#edit-admin-email').fill(existingAdminEmail);
    await page.locator('#modal-confirm').click();

    await expect(page.locator('#toast')).toContainText(`hoort al bij ${existingAdminName}`);
    await expect(page.locator('#modal')).toBeHidden();
    await expect(page.locator('#administrator-list .administrator-row').filter({ hasText: existingAdminEmail })).toHaveClass(/account-conflict-focus/);

    await loginPage.logout();
  });

  test('[ADM-WR-H-009] goedkeuringsloop volgt logische maand/medewerker-volgorde', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await test.step('Given de administrator is ingelogd en reset naar vaste baseline', async () => {
      await loginPage.open();
      await loginPage.loginAsAdmin();
      await page.locator('#quick-reset-demo').click();
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    });

    await test.step('When actionable admin tasks bestaan in de workflow', async () => {
      // Verify that the dashboard shows actionable tasks (Backoffice actions)
      const actionableCount = await page.locator('.admin-task-row.is-actionable').count();
      expect(actionableCount).toBeGreaterThan(0);
    });

    await test.step('Then zijn taken chronologisch gesorteerd (validatie van fix)', async () => {
      // Get all task rows and extract their period keys from data attributes
      const taskRows = await page.locator('[data-admin-task-row]').all();
      expect(taskRows.length).toBeGreaterThan(0);
      
      // Extract period keys from task IDs (format: "type-periodKey-employeeId")
      const periodKeys: string[] = [];
      for (const row of taskRows) {
        const taskId = await row.getAttribute('data-admin-task-row');
        if (taskId) {
          // Task ID format: "type-YYYY-MM-employeeId", extract YYYY-MM
          const match = taskId.match(/\d{4}-\d{2}/);
          if (match) periodKeys.push(match[0]);
        }
      }
      
      // Verify chronological ordering: each period should be >= previous period
      for (let i = 1; i < periodKeys.length; i++) {
        expect(periodKeys[i].localeCompare(periodKeys[i-1])).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test('[ADM-WR-H-010] server-led aangemaakte beheerder en medewerker overleven een echte paginaherlading', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const suffix = Date.now().toString().slice(-7);
    const adminName = `Reload Beheerder ${suffix}`;
    const adminEmail = `reload-admin-${suffix}@example.invalid`;
    const employeeName = `Reload Medewerker ${suffix}`;
    const employeeEmail = `reload-employee-${suffix}@example.invalid`;

    await test.step('Given de administrator een nieuwe beheerder en medewerker server-led opslaat (geen gemockte API)', async () => {
      await loginPage.open();
      await loginPage.loginAsAdmin();
      await page.locator('[data-view="employees"]').click();

      await page.locator('#add-admin').click();
      await page.locator('#edit-admin-name').fill(adminName);
      await page.locator('#edit-admin-email').fill(adminEmail);
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal')).toBeHidden();
      await expect(page.locator('#administrator-list')).toContainText(adminName);

      await page.locator('#add-employee').click();
      await page.locator('#edit-name').fill(employeeName);
      await page.locator('#edit-account-email').fill(employeeEmail);
      await page.locator('#edit-role').fill('Consultant');
      await page.locator('#edit-client').fill('Reloadklant');
      await page.locator('#edit-project').fill(`RELOAD-${suffix}`);
      await page.locator('#edit-broker').fill('Reloadbroker');
      await page.locator('#edit-broker-email').fill('broker@example.invalid');
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal')).toBeHidden();
      await expect(page.locator('#employee-grid')).toContainText(employeeName);
    });

    await test.step('When de pagina echt opnieuw wordt geladen (F5), niet alleen opnieuw gerenderd', async () => {
      await page.reload();
      await expect(page.locator('#login-screen')).toBeHidden({ timeout: 15_000 });
      await page.locator('[data-view="employees"]').click();
    });

    await test.step('Then blijven de nieuwe beheerder en medewerker zichtbaar in Teambeheer', async () => {
      await expect(page.locator('#administrator-list')).toContainText(adminName, { timeout: 10_000 });
      await expect(page.locator('#employee-grid')).toContainText(employeeName, { timeout: 10_000 });
    });

    await loginPage.logout();
  });

  test('[ADM-WR-H-011] een echte paginaherlading blijft op het geopende scherm i.p.v. terug te springen naar Dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await test.step('Given de administrator Instellingen heeft geopend', async () => {
      await loginPage.open();
      await loginPage.loginAsAdmin();
      await page.locator('[data-view="settings"]').click();
      await expect(page.locator('#view-settings')).toHaveClass(/is-active/);
      await expect(page).toHaveURL(/#settings$/);
    });

    await test.step('When de pagina echt opnieuw wordt geladen (F5)', async () => {
      await page.reload();
      await expect(page.locator('#login-screen')).toBeHidden({ timeout: 15_000 });
    });

    await test.step('Then blijft Instellingen actief in plaats van terug te vallen op Dashboard', async () => {
      await expect(page.locator('#view-settings')).toHaveClass(/is-active/, { timeout: 10_000 });
      await expect(page.locator('#view-dashboard')).not.toHaveClass(/is-active/);
    });

    await loginPage.logout();
  });
});
