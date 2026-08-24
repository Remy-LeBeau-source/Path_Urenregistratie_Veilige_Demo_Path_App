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

  test('[ADM-WR-H-014] een eigen tekst per ontvanger wordt bewaard en een leeg veld blijft erven', async () => {
    // Inheritance is the whole point: an empty override must stay empty, so one
    // edit on the assignment keeps reaching every recipient without an exception.
    // Storing a copy instead would silently freeze that recipient's wording.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const unique = Date.now().toString().slice(-7);
    const eigenOnderwerp = `Alleen voor de boekhouding ${unique} - {factuurnummer}`;
    const eigenTekst = `Beste boekhouding,\n\nFactuur {factuurnummer} voor {medewerker}.\n\nTotaal: EUR {bedrag}.`;

    const before = await (await ctx.get('/server/api/bootstrap.php')).json();

    const write = await postJson(ctx, '/server/api/staff.php', {
      action: 'upsert_employee',
      sendInvitation: false,
      employee: {
        name: `Route Medewerker ${unique}`,
        email: `route-write-${unique}@example.invalid`,
        role: 'Tester',
        startDate: '2026-08-01',
        active: true,
        weeklyHours: 36,
        rate: 80,
        projectCode: `RTE-${unique}`,
        invoiceProject: `Project ${unique}`,
        invoiceTemplate: '{klant}-{jaar}-{maand}',
        mailSubject: 'Opdrachtonderwerp {medewerker} - {maand} {jaar}',
        mailBody: 'Middag,\n\nOpdrachttekst voor {medewerker}.',
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
          // Deliberate exception for one recipient ...
          bookkeeper: { enabled: true, invoiceAttachment: true, mailSubject: eigenOnderwerp, mailBody: eigenTekst },
          // ... and no exception for the other, which must keep inheriting.
          payroll: { enabled: true, invoiceAttachment: false, mailSubject: '', mailBody: '' },
        },
      },
      mailRecipients: before.mail_recipients,
    });
    expect(write.status, JSON.stringify(write.body)).toBe(200);
    const employeeId = Number(write.body.employee_id);

    await test.step('Then draagt alleen de boekhouding een eigen tekst', async () => {
      const after = await (await ctx.get('/server/api/bootstrap.php')).json();
      const assignment = (after.assignments as Array<Record<string, unknown>>)
        .find(item => Number(item.employee_id) === employeeId);
      expect(assignment, 'de opdracht moet bestaan').toBeDefined();
      const routes = (after.assignment_mail_routes as Array<Record<string, unknown>>)
        .filter(item => Number(item.assignment_id) === Number(assignment?.id));
      const boekhouding = routes.find(item => String(item.recipient_key) === 'bookkeeper');
      const salaris = routes.find(item => String(item.recipient_key) === 'payroll');
      expect(boekhouding, 'de boekhoudingsroute moet bestaan').toBeDefined();
      expect(salaris, 'de salarisroute moet bestaan').toBeDefined();
      expect(String(boekhouding?.subject_template)).toBe(eigenOnderwerp);
      expect(String(boekhouding?.body_template)).toBe(eigenTekst);
    });

    await test.step('And blijft de salarisroute leeg, zodat die de opdrachttekst blijft erven', async () => {
      const after = await (await ctx.get('/server/api/bootstrap.php')).json();
      const assignment = (after.assignments as Array<Record<string, unknown>>)
        .find(item => Number(item.employee_id) === employeeId);
      const salaris = (after.assignment_mail_routes as Array<Record<string, unknown>>)
        .filter(item => Number(item.assignment_id) === Number(assignment?.id))
        .find(item => String(item.recipient_key) === 'payroll');
      // Null, not an empty copy: that is what keeps the inheritance alive.
      expect(salaris?.subject_template ?? null, 'een leeg veld mag geen kopie opslaan').toBeNull();
      expect(salaris?.body_template ?? null, 'een leeg veld mag geen kopie opslaan').toBeNull();
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ADM-WR-H-013] onderwerp en begeleidende tekst van een opdracht blijven bewaard', async () => {
    // The screen offers both fields and the form collected them on save, but the
    // server never wrote the columns: an edited subject or text was silently
    // discarded and the seeded value came back on the next reload. Nothing caught
    // that, because every other case reused the values it had just read.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const unique = Date.now().toString().slice(-7);
    const employeeEmail = `tpl-write-${unique}@example.invalid`;
    const onderwerp = `Eigen onderwerp ${unique} - {medewerker} - {maand} {jaar}`;
    const tekst = `Middag,

Eigen tekst ${unique} voor {medewerker} over {maand} {jaar}.

Uren: {uren} uur.`;

    const before = await (await ctx.get('/server/api/bootstrap.php')).json();

    const write = await postJson(ctx, '/server/api/staff.php', {
      action: 'upsert_employee',
      sendInvitation: false,
      employee: {
        name: `Sjabloon Medewerker ${unique}`,
        email: employeeEmail,
        role: 'Tester',
        startDate: '2026-08-01',
        active: true,
        weeklyHours: 36,
        rate: 80,
        projectCode: `TPL-${unique}`,
        invoiceProject: `Project ${unique}`,
        invoiceTemplate: '{klant}-{jaar}-{maand}',
        mailSubject: onderwerp,
        mailBody: tekst,
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
      mailRecipients: before.mail_recipients,
    });
    expect(write.status, JSON.stringify(write.body)).toBe(200);
    const employeeId = Number(write.body.employee_id);
    expect(employeeId).toBeGreaterThan(0);

    await test.step('Then leest de bootstrap exact wat er is ingevuld terug', async () => {
      const after = await (await ctx.get('/server/api/bootstrap.php')).json();
      const assignment = (after.assignments as Array<Record<string, unknown>>)
        .find(item => Number(item.employee_id) === employeeId);
      expect(assignment, 'de opdracht moet bestaan').toBeDefined();
      expect(String(assignment?.invoice_subject_template), 'het onderwerp moet bewaard blijven').toBe(onderwerp);
      expect(String(assignment?.invoice_body_template), 'de begeleidende tekst moet bewaard blijven, inclusief regeleindes').toBe(tekst);
    });

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

    await test.step('Then verschijnt een blokkade-popup en wordt de bestaande medewerker uitgelicht, i.p.v. stil niets te doen', async () => {
      await expect(page.locator('#modal')).toBeVisible();
      await expect(page.locator('#modal-title')).toContainText(employeeName);
      await expect(page.locator('#modal-message')).toContainText('hoort al bij');
      await expect(page.locator('#modal-message')).toContainText('een naam mag wél twee keer');
      await expect(page.locator('#toast')).toContainText('hoort al bij', { timeout: 10_000 });
    });

    await test.step('And "Adres aanpassen" opent het formulier opnieuw met de ingevulde gegevens intact', async () => {
      await expect(page.locator('#modal-confirm')).toHaveText('Adres aanpassen');
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#edit-admin-name')).toHaveValue(`Botsingsbeheerder ${suffix}`);
      await expect(page.locator('#edit-admin-email')).toHaveValue(employeeEmail.toUpperCase());
    });

    await test.step('And na sluiten is er niets aangemaakt en is het bestaande account uitgelicht', async () => {
      await page.locator('#modal-cancel').click();
      await expect(page.locator('#modal')).toBeHidden();
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
    // The block is now surfaced as its own modal; dismiss it before asserting the list.
    await expect(page.locator('#modal-title')).toContainText('hoort al bij');
    await page.locator('#modal-cancel').click();
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
    await expect(page.locator('#modal-title')).toContainText('hoort al bij');
    await page.locator('#modal-cancel').click();
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
    await page.locator('#modal-cancel').click();
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
    await page.locator('#modal-cancel').click();
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

  test('[ADM-WR-N-005] een al bestaande naam blokkeert of waarschuwt niet: alleen het e-mailadres moet uniek zijn', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const duplicateName = 'Joyce van der Steenhoven';
    const suffix = Date.now().toString().slice(-7);
    const newEmail = `joyce-duplicate-${suffix}@example.invalid`;

    await test.step('Given de administrator is ingelogd en Teambeheer heeft geopend', async () => {
      await loginPage.open();
      await loginPage.loginAsAdmin();
      await page.locator('[data-view="employees"]').click();
      await expect(page.locator('#administrator-list')).toContainText(duplicateName);
    });

    await test.step('When een nieuwe beheerder met dezelfde naam maar een uniek adres wordt opgeslagen', async () => {
      await page.locator('#add-admin').click();
      await page.locator('#edit-admin-name').fill(duplicateName);
      await page.locator('#edit-admin-email').fill(newEmail);
      await page.locator('#modal-confirm').click();
    });

    await test.step('Then wordt het account direct aangemaakt, zonder tussenvraag over de naam', async () => {
      await expect(page.locator('#modal')).toBeHidden({ timeout: 10_000 });
      await expect(page.locator('#toast')).toContainText('Beheerder op de server opgeslagen');
      await expect(page.locator('#administrator-list')).toContainText(newEmail);
      await expect(page.locator('#administrator-list .administrator-row', { hasText: duplicateName })).toHaveCount(2);
    });

    await loginPage.logout();
  });

  test('[ADM-WR-N-006] dubbele naam is toegestaan, maar een al gebruikt e-mailadres wordt hard geblokkeerd', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const suffix = Date.now().toString().slice(-7);
    const sharedName = `Botsnaam ${suffix}`;
    const employeeEmail = `botsadres-${suffix}@example.invalid`;

    await test.step('Given er al een beheerder én een medewerker bestaan met verschillende namen', async () => {
      await loginPage.open();
      await loginPage.loginAsAdmin();
      await page.locator('[data-view="employees"]').click();

      await page.locator('#add-admin').click();
      await page.locator('#edit-admin-name').fill(sharedName);
      await page.locator('#edit-admin-email').fill(`admin-${suffix}@example.invalid`);
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal')).toBeHidden();
      await expect(page.locator('#administrator-list')).toContainText(sharedName);

      await page.locator('#add-employee').click();
      await page.locator('#edit-name').fill(`Andere naam ${suffix}`);
      await page.locator('#edit-account-email').fill(employeeEmail);
      await page.locator('#edit-role').fill('Consultant');
      await page.locator('#edit-client').fill('Botsklant');
      await page.locator('#edit-project').fill(`BOTS-${suffix}`);
      await page.locator('#edit-broker').fill('Botsbroker');
      await page.locator('#edit-broker-email').fill('broker@example.invalid');
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal')).toBeHidden();
    });

    await test.step('When een nieuwe beheerder met dezelfde naam én het e-mailadres van de medewerker wordt opgeslagen', async () => {
      await page.locator('#add-admin').click();
      await page.locator('#edit-admin-name').fill(sharedName);
      await page.locator('#edit-admin-email').fill(employeeEmail);
      await page.locator('#modal-confirm').click();
    });

    await test.step('Then komt er geen tussenvraag over de naam en blokkeert de server hard op het al gebruikte e-mailadres', async () => {
      await expect(page.locator('#toast')).toContainText('hoort al bij', { timeout: 10_000 });
      await expect(page.locator('#modal-title')).toContainText('hoort al bij');
      await page.locator('#modal-cancel').click();
      await expect(page.locator('#modal')).toBeHidden();
      await expect(page.locator('#administrator-list .administrator-row', { hasText: sharedName })).toHaveCount(1);
      await expect(page.locator('#employee-grid .employee-card', { hasText: employeeEmail })).toHaveClass(/account-conflict-focus/);
    });

    await loginPage.logout();
  });

  test('[ADM-WR-N-007] actief-accounttotaal klopt op elke stap: exact duplicaat verandert niets, uniek account telt precies 1 op', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const suffix = Date.now().toString().slice(-7);
    const clonedEmployeeName = `KlantAccount ${suffix}`;
    const clonedEmployeeEmail = `gedeeld-${suffix}@example.invalid`;
    const clonedAdminName = `TwaalfKloon ${suffix}`;
    const clonedAdminEmail = `admin-twaalf-${suffix}@example.invalid`;
    const uniqueAdminName = `Volledig Uniek ${suffix}`;
    const uniqueAdminEmail = `totaal-uniek-${suffix}@example.invalid`;

    const activeCount = () => page.locator('#team-active-account-count').innerText().then(Number);
    const adminRowCount = (name: string) => page.locator('#administrator-list .administrator-row', { hasText: name }).count();

    // A fresh Herstel only resets the *local* demo baseline shown before any
    // server write happens; the shared TEST database itself accumulates real
    // rows from every earlier test in this same run (they don't reset each
    // other's server state). So the very first real write in this test can
    // jump the total by more than 1 -- that's expected, not a bug -- because
    // it's the moment the client syncs onto the database's true state. Every
    // step after that first sync is measured relative to what THIS test
    // itself just saw, not to a hardcoded absolute baseline.
    let baseline = 0;

    await test.step('Given de administrator is ingelogd en Teambeheer heeft geopend', async () => {
      await loginPage.open();
      await loginPage.loginAsAdmin();
      await page.locator('#quick-reset-demo').click();
      await page.locator('#modal-confirm').click();
      await page.locator('[data-view="employees"]').click();
      await expect(page.locator('#team-active-account-count')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('When een medewerker en een beheerder worden toegevoegd, telt het totaal telkens precies 1 op t.o.v. daarvóór', async () => {
      await page.locator('#add-employee').click();
      await page.locator('#edit-name').fill(clonedEmployeeName);
      await page.locator('#edit-account-email').fill(clonedEmployeeEmail);
      await page.locator('#edit-role').fill('Consultant');
      await page.locator('#edit-client').fill('Klant');
      await page.locator('#edit-project').fill(`PROJ-${suffix}`);
      await page.locator('#edit-broker').fill('Broker');
      await page.locator('#edit-broker-email').fill('broker@example.invalid');
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal')).toBeHidden();
      // First real write of this test: this is where the client syncs onto
      // the database's true, possibly-accumulated state. Capture it as our
      // own baseline rather than asserting an absolute number.
      baseline = await activeCount();
      expect(await adminRowCount(clonedAdminName)).toBe(0);

      await page.locator('#add-admin').click();
      await page.locator('#edit-admin-name').fill(clonedAdminName);
      await page.locator('#edit-admin-email').fill(clonedAdminEmail);
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal')).toBeHidden();
      expect(await activeCount()).toBe(baseline + 1);
    });

    await test.step('Then verandert een poging met exact hetzelfde e-mailadres het totaal niet', async () => {
      await page.locator('#add-admin').click();
      await page.locator('#edit-admin-name').fill(clonedAdminName);
      await page.locator('#edit-admin-email').fill(clonedEmployeeEmail);
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#toast')).toContainText('hoort al bij', { timeout: 10_000 });
      await expect(page.locator('#modal-title')).toContainText('hoort al bij');
      await page.locator('#modal-cancel').click();
      await expect(page.locator('#modal')).toBeHidden();
      expect(await activeCount()).toBe(baseline + 1);
      expect(await adminRowCount(clonedAdminName)).toBe(1);
    });

    await test.step('And een volledig uniek account telt precies 1 op, zonder dat er verder iets bijkomt', async () => {
      await page.locator('#add-admin').click();
      await page.locator('#edit-admin-name').fill(uniqueAdminName);
      await page.locator('#edit-admin-email').fill(uniqueAdminEmail);
      await page.locator('#modal-confirm').click();
      // No name collision, so no confirmation step -- the modal must close straight away.
      await expect(page.locator('#modal')).toBeHidden({ timeout: 10_000 });
      await expect(page.locator('#toast')).toContainText('Beheerder op de server opgeslagen');
      expect(await activeCount()).toBe(baseline + 2);
      expect(await adminRowCount(uniqueAdminName)).toBe(1);
      expect(await adminRowCount(clonedAdminName)).toBe(1);
    });

    await loginPage.logout();
  });

  test('[ADM-WR-H-012] na Herstel legt Teambeheer uit dat de telling lokaal is en kan de serverstand terug worden gehaald', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const notice = page.locator('#team-account-local-notice');
    const count = () => page.locator('#team-active-account-count').innerText().then(Number);

    let serverCount = 0;

    await test.step('Given Teambeheer de serverstand toont zonder melding', async () => {
      await loginPage.open();
      await loginPage.loginAsAdmin();
      await page.locator('[data-view="employees"]').click();
      await expect(page.locator('#team-active-account-count')).toBeVisible();
      serverCount = await count();
      await expect(notice).toBeHidden();
    });

    await test.step('When de administrator Herstel gebruikt en terugkeert naar Teambeheer', async () => {
      await page.locator('#quick-reset-demo').click();
      await page.locator('#modal-confirm').click();
      await page.locator('[data-view="employees"]').click();
    });

    await test.step('Then verklaart een zichtbare melding dat deze telling niet van de server komt', async () => {
      await expect(notice).toBeVisible();
      await expect(notice).toContainText('lokale voorbeeldweergave');
      await expect(page.locator('#team-account-load-server')).toBeVisible();
    });

    await test.step('And de knop haalt de echte serverstand terug en laat de melding verdwijnen', async () => {
      await page.locator('#team-account-load-server').click();
      await expect(page.locator('#toast')).toContainText('serverstand is geladen', { timeout: 10_000 });
      await expect(notice).toBeHidden();
      expect(await count()).toBe(serverCount);
    });

    await loginPage.logout();
  });

  test('[ADM-WR-H-017] een ontvangerslijst terugsturen zoals hij binnenkwam verandert niets', async () => {
    // De bootstrap geeft een ontvanger als display_name en recipient_category. Het
    // opslaan las alleen name en category. Wie de lijst dus teruggaf zoals hij hem
    // kreeg -- en dat doet elk scherm dat één ontvanger wijzigt en de rest meestuurt --
    // wiste stil de naam, die het e-mailadres werd, en de soort, die terugviel op
    // 'other'. Gevolg: de boekhouder kreeg de algemene mailtekst in plaats van zijn
    // eigen tekst, zonder dat er ergens iets misging. Er ging gewoon een mail uit.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const before = await ctx.get('/server/api/bootstrap.php');
    expect(before.status()).toBe(200);
    const beforeBody = await before.json();
    const ervoor = (beforeBody.mail_recipients ?? []) as Array<Record<string, unknown>>;
    expect(ervoor.length, 'zonder ontvangers zegt deze case niets').toBeGreaterThan(0);

    const metSoort = ervoor.filter(item => String(item.recipient_category) !== 'other');
    expect(metSoort.length, 'er hoort minstens één ontvanger met een eigen soort te zijn')
      .toBeGreaterThan(0);

    // Letterlijk terugsturen wat er binnenkwam, zonder iets te veranderen. Het
    // eindpunt eist een settings-blok, en het schrijft elk veld dat het kent: een
    // half gevuld blok wist de rest. Daarom gaan alle bedrijfsgegevens mee met de
    // waarden die er nu al staan, zodat deze case alleen over de ontvangers gaat en
    // niets achterlaat voor de volgende test.
    const bedrijf = beforeBody.companies[0];
    const opslaan = await postJson(ctx, '/server/api/settings.php', {
      settings: {
        organizationName: String(bedrijf.trade_name || bedrijf.legal_name || ''),
        companyName: String(bedrijf.legal_name || ''),
        invoiceNameDisplay: String(bedrijf.invoice_name_display || 'trade_and_legal'),
        appName: String(bedrijf.app_name || ''),
        supportName: String(bedrijf.support_name || ''),
        supportEmail: String(bedrijf.support_email || ''),
        website: String(bedrijf.website || ''),
        tagline: String(bedrijf.tagline || ''),
        brandPrimary: String(bedrijf.brand_primary || '#0d1b38'),
        brandAccent: String(bedrijf.brand_accent || '#3abd9d'),
        kvk: String(bedrijf.chamber_of_commerce_number || ''),
        vat: String(bedrijf.vat_number || ''),
        iban: String(bedrijf.iban || ''),
        address: String(bedrijf.address_line || ''),
        postalCity: [bedrijf.postal_code || '', bedrijf.city || ''].join(' ').trim(),
        phone: String(bedrijf.invoice_phone || ''),
        invoiceEmail: String(bedrijf.invoice_email || ''),
        paymentTerm: Number(bedrijf.payment_term_days || 30),
        customerTimesheetReminderEnabled: Boolean(bedrijf.customer_timesheet_reminder_enabled),
        customerTimesheetReminderTime: String(bedrijf.customer_timesheet_reminder_time || '15:00').slice(0, 5),
        customerTimesheetOverdueWorkdays: Number(bedrijf.customer_timesheet_overdue_workdays || 2),
        customerTimesheetSubmissionSubject: String(bedrijf.customer_timesheet_submission_subject || ''),
        customerTimesheetSubmissionBody: String(bedrijf.customer_timesheet_submission_body || ''),
        customerTimesheetBrokerSubject: String(bedrijf.customer_timesheet_broker_subject || ''),
        customerTimesheetBrokerBody: String(bedrijf.customer_timesheet_broker_body || ''),
      },
      mailRecipients: ervoor,
    });
    expect(opslaan.status, JSON.stringify(opslaan.body)).toBe(200);
    expect(opslaan.body.ok).toBe(true);

    const after = await ctx.get('/server/api/bootstrap.php');
    expect(after.status()).toBe(200);
    const afterBody = await after.json();

    // Dezelfde rondrit-eis geldt voor de bedrijfsgegevens: wat onveranderd terug
    // gaat, hoort onveranderd terug te komen. Staat dit niet vast, dan laat deze
    // case stilletjes een gewijzigde stand achter voor de volgende test.
    const bedrijfErna = afterBody.companies[0];
    for (const veld of ['support_name', 'support_email', 'website', 'tagline', 'invoice_email']) {
      expect(String(bedrijfErna[veld] ?? ''), veld + ' hoort onveranderd te blijven')
        .toBe(String(bedrijf[veld] ?? ''));
    }

    const erna = (afterBody.mail_recipients ?? []) as Array<Record<string, unknown>>;
    expect(erna.length, 'er mag geen ontvanger bij komen of verdwijnen').toBe(ervoor.length);

    for (const oud of ervoor) {
      const nieuw = erna.find(item => Number(item.id) === Number(oud.id));
      expect(nieuw, 'ontvanger ' + oud.id + ' moet er nog zijn').toBeDefined();
      expect(String(nieuw?.display_name), 'de naam van ' + String(oud.display_name) + ' mag niet veranderen')
        .toBe(String(oud.display_name));
      expect(String(nieuw?.recipient_category), 'de soort van ' + String(oud.display_name) + ' bepaalt de mailtekst en mag niet veranderen')
        .toBe(String(oud.recipient_category));
      expect(String(nieuw?.email), 'het adres van ' + String(oud.display_name) + ' mag niet veranderen')
        .toBe(String(oud.email));
    }

    await authApi.logout();
    await ctx.dispose();
  });

  test('[ADM-WR-H-018] een nieuwe ontvanger komt bij andere medewerkers ongevinkt binnen', async () => {
    // Gio vroeg dit letterlijk: "als ik een ontvanger aanmaak komt het bij iedere
    // medewerker -- maar als ik hem bij een medewerker niet wil?" De lijst is van het
    // bedrijf, dus de rij verschijnt overal. Wat niet mag gebeuren is dat hij daar
    // ook meteen aanstaat: dan gaat er mail naar iemand die jij nooit hebt gekozen,
    // en dat merk je pas in het postvak van de klant.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const uniek = Date.now().toString().slice(-6);
    const sleutel = `alleen-voor-een-${uniek}`;
    const adres = `alleen-voor-een-${uniek}@example.invalid`;

    const before = await (await ctx.get('/server/api/bootstrap.php')).json();
    const medewerkers = (before.employees ?? []) as Array<Record<string, unknown>>;
    expect(medewerkers.length, 'deze case heeft twee medewerkers nodig').toBeGreaterThan(1);

    const accounts = (before.users ?? []) as Array<Record<string, unknown>>;
    const adresVan = (mw: Record<string, unknown>) =>
      String(accounts.find(u => Number(u.id) === Number(mw.user_id))?.email ?? '');

    const eerste = medewerkers[0];
    const tweede = medewerkers[1];
    const bestaandeOntvangers = (before.mail_recipients as Array<Record<string, unknown>>).map(item => ({
      id: String(item.recipient_key || item.id),
      email: String(item.email),
      name: String(item.display_name),
      category: String(item.recipient_category),
      active: true,
    }));

    await test.step('When de beheerder bij een medewerker een nieuwe ontvanger toevoegt', async () => {
      const write = await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: String(eerste.full_name || ''),
          email: adresVan(eerste),
          dbEmployeeId: Number(eerste.id || 0),
          dbUserId: Number(eerste.user_id || 0),
          role: 'Consultant',
          active: true,
          mailRecipientRoutes: { [sleutel]: { enabled: true, invoiceAttachment: false } },
        },
        mailRecipients: [...bestaandeOntvangers,
          { id: sleutel, email: adres, name: `Alleen voor een ${uniek}`, category: 'other', active: true }],
      });
      expect(write.status, JSON.stringify(write.body)).toBe(200);
    });

    try {
      await test.step('Then staat hij bij die medewerker aan', async () => {
        const na = await (await ctx.get('/server/api/bootstrap.php')).json();
        const ontvanger = (na.mail_recipients as Array<Record<string, unknown>>)
          .find(item => String(item.recipient_key) === sleutel);
        expect(ontvanger, 'de nieuwe ontvanger hoort in de bedrijfslijst te staan').toBeDefined();

        const opdrachtVanEerste = (na.assignments as Array<Record<string, unknown>>)
          .find(item => Number(item.employee_id) === Number(eerste.id));
        expect(opdrachtVanEerste, 'de eerste medewerker hoort een opdracht te hebben').toBeDefined();

        const route = (na.assignment_mail_routes as Array<Record<string, unknown>>)
          .find(item => Number(item.assignment_id) === Number(opdrachtVanEerste?.id)
            && Number(item.mail_recipient_id) === Number(ontvanger?.id));
        expect(route, 'bij de medewerker waar je hem toevoegt hoort een route te staan').toBeDefined();
        expect(Number(route?.enabled), 'en die hoort aan te staan').toBe(1);
      });

      await test.step('And staat hij bij een andere medewerker niet aan', async () => {
        // Dit is de eigenlijke garantie. Of de rij daar zichtbaar is doet er niet toe
        // -- of er mail heen gaat wel, en dat hangt aan enabled.
        const na = await (await ctx.get('/server/api/bootstrap.php')).json();
        const ontvanger = (na.mail_recipients as Array<Record<string, unknown>>)
          .find(item => String(item.recipient_key) === sleutel);
        const opdrachtVanTweede = (na.assignments as Array<Record<string, unknown>>)
          .find(item => Number(item.employee_id) === Number(tweede.id));

        if (opdrachtVanTweede) {
          const route = (na.assignment_mail_routes as Array<Record<string, unknown>>)
            .find(item => Number(item.assignment_id) === Number(opdrachtVanTweede.id)
              && Number(item.mail_recipient_id) === Number(ontvanger?.id));
          if (route) {
            expect(Number(route.enabled), 'een nieuwe ontvanger mag bij een andere medewerker niet vanzelf aanstaan')
              .toBe(0);
          }
        }

        // En hard: er hoort nergens anders een ingeschakelde route naar dit adres te
        // bestaan dan bij de medewerker waar hij is toegevoegd.
        const opdrachtVanEerste = (na.assignments as Array<Record<string, unknown>>)
          .find(item => Number(item.employee_id) === Number(eerste.id));
        const aangezet = (na.assignment_mail_routes as Array<Record<string, unknown>>)
          .filter(item => Number(item.mail_recipient_id) === Number(ontvanger?.id) && Number(item.enabled) === 1)
          .map(item => Number(item.assignment_id));
        expect(aangezet, 'alleen de medewerker waar je hem aanvinkt hoort mail naar dit adres te sturen')
          .toEqual([Number(opdrachtVanEerste?.id)]);
      });

      await test.step('And een ontvanger die via Instellingen wordt toegevoegd staat nergens aan', async () => {
        // De tweede manier om er een aan te maken: centraal bij Instellingen, zonder
        // dat er een medewerker in beeld is. Dan hoort er nergens een route te
        // ontstaan -- de rij verschijnt overal, maar uit.
        const sleutelCentraal = `centraal-${uniek}`;
        const adresCentraal = `centraal-${uniek}@example.invalid`;
        const bedrijf = before.companies[0];

        const opslaan = await postJson(ctx, '/server/api/settings.php', {
          settings: {
            organizationName: String(bedrijf.trade_name || bedrijf.legal_name || ''),
            companyName: String(bedrijf.legal_name || ''),
            invoiceNameDisplay: String(bedrijf.invoice_name_display || 'trade_and_legal'),
            appName: String(bedrijf.app_name || ''),
            supportName: String(bedrijf.support_name || ''),
            supportEmail: String(bedrijf.support_email || ''),
            website: String(bedrijf.website || ''),
            tagline: String(bedrijf.tagline || ''),
            brandPrimary: String(bedrijf.brand_primary || '#0d1b38'),
            brandAccent: String(bedrijf.brand_accent || '#3abd9d'),
            kvk: String(bedrijf.chamber_of_commerce_number || ''),
            vat: String(bedrijf.vat_number || ''),
            iban: String(bedrijf.iban || ''),
            address: String(bedrijf.address_line || ''),
            postalCity: [bedrijf.postal_code || '', bedrijf.city || ''].join(' ').trim(),
            phone: String(bedrijf.invoice_phone || ''),
            invoiceEmail: String(bedrijf.invoice_email || ''),
            paymentTerm: Number(bedrijf.payment_term_days || 30),
            customerTimesheetReminderEnabled: Boolean(bedrijf.customer_timesheet_reminder_enabled),
            customerTimesheetReminderTime: String(bedrijf.customer_timesheet_reminder_time || '15:00').slice(0, 5),
            customerTimesheetOverdueWorkdays: Number(bedrijf.customer_timesheet_overdue_workdays || 2),
            customerTimesheetSubmissionSubject: String(bedrijf.customer_timesheet_submission_subject || ''),
            customerTimesheetSubmissionBody: String(bedrijf.customer_timesheet_submission_body || ''),
            customerTimesheetBrokerSubject: String(bedrijf.customer_timesheet_broker_subject || ''),
            customerTimesheetBrokerBody: String(bedrijf.customer_timesheet_broker_body || ''),
          },
          mailRecipients: [...bestaandeOntvangers,
            { id: sleutel, email: adres, name: `Alleen voor een ${uniek}`, category: 'other', active: true },
            { id: sleutelCentraal, email: adresCentraal, name: `Centraal ${uniek}`, category: 'other', active: true }],
        });
        expect(opslaan.status, JSON.stringify(opslaan.body)).toBe(200);

        const na = await (await ctx.get('/server/api/bootstrap.php')).json();
        const centraal = (na.mail_recipients as Array<Record<string, unknown>>)
          .find(item => String(item.recipient_key) === sleutelCentraal);
        expect(centraal, 'de centraal toegevoegde ontvanger hoort te bestaan').toBeDefined();

        const routes = (na.assignment_mail_routes as Array<Record<string, unknown>>)
          .filter(item => Number(item.mail_recipient_id) === Number(centraal?.id) && Number(item.enabled) === 1);
        expect(routes, 'een centraal toegevoegde ontvanger mag bij niemand vanzelf aanstaan').toEqual([]);
      });
    } finally {
      // Gedeelde bedrijfsgegevens: de proefontvanger weer weg.
      await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: String(eerste.full_name || ''),
          email: adresVan(eerste),
          dbEmployeeId: Number(eerste.id || 0),
          dbUserId: Number(eerste.user_id || 0),
          role: 'Consultant',
          active: true,
          mailRecipientRoutes: { [sleutel]: { enabled: false, invoiceAttachment: false } },
        },
        mailRecipients: [...bestaandeOntvangers,
          { id: sleutel, email: adres, name: `Alleen voor een ${uniek}`, category: 'other', active: false }],
      });
      await authApi.logout();
      await ctx.dispose();
    }
  });
});

test('[ADM-WR-H-015] onderwerp, tekst en een eigen tekst per ontvanger blijven na F5 in het scherm staan', async ({ page }) => {
  // ADM-WR-H-013 en H-014 bewijzen de opslag via de API. Dit loopt de route die de
  // beheerder echt neemt: het formulier openen, typen, opslaan, F5. Precies die
  // route was stuk -- het scherm bood de velden aan en de server gooide ze weg.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsAdmin();
  await page.locator('[data-view="employees"]').click();

  const uniek = Date.now().toString().slice(-6);
  const onderwerp = `Opdrachtonderwerp ${uniek} - {medewerker} - {maand} {jaar}`;
  const tekst = `Middag,\n\nOpdrachttekst ${uniek} voor {medewerker} over {maand} {jaar}.`;
  const eigenOnderwerp = `Alleen boekhouding ${uniek} - {factuurnummer}`;

  const openEerste = async () => {
    await page.locator('[data-edit-routing]').first().click();
    await expect(page.locator('#edit-subject')).toBeVisible();
  };

  const opslaan = async () => {
    const response = page.waitForResponse(item => item.url().includes('/server/api/staff.php') && item.request().method() === 'POST');
    await page.locator('#modal-confirm').click();
    const res = await response;
    const tekstBody = await res.text();
    expect(res.status(), 'opslaan mag niet falen als alleen teksten wijzigen: ' + tekstBody).toBe(200);
  };

  await openEerste();

  const origineelOnderwerp = await page.locator('#edit-subject').inputValue();
  const origineelTekst = await page.locator('#edit-body').inputValue();
  const eersteOntvanger = page.locator('[data-mail-recipient-subject]').first();
  const ontvangerId = await eersteOntvanger.getAttribute('data-mail-recipient-subject');
  const origineelEigen = await eersteOntvanger.inputValue();

  try {
    await test.step('Given het formulier de twee velden toont, ook bij een nieuwe ontvanger', async () => {
      // Zonder deze velden kan een beheerder pas na opslaan en heropenen afwijken.
      await expect(page.locator('#edit-new-recipient-subject'), 'een nieuwe ontvanger moet meteen een eigen onderwerp kunnen krijgen').toBeAttached();
      await expect(page.locator('#edit-new-recipient-body'), 'een nieuwe ontvanger moet meteen een eigen tekst kunnen krijgen').toBeAttached();
    });

    await test.step('When onderwerp, tekst en een eigen tekst voor een ontvanger worden ingevuld', async () => {
      await page.locator('#edit-subject').fill(onderwerp);
      await page.locator('#edit-body').fill(tekst);
      await eersteOntvanger.fill(eigenOnderwerp);
      await opslaan();
    });

    await test.step('Then staat alles er na een F5 nog steeds', async () => {
      await page.reload();
      await page.locator('[data-view="employees"]').click();
      await openEerste();
      await expect(page.locator('#edit-subject'), 'het onderwerp moet bewaard blijven').toHaveValue(onderwerp);
      await expect(page.locator('#edit-body'), 'de begeleidende tekst moet bewaard blijven').toHaveValue(tekst);
      await expect(
        page.locator(`[data-mail-recipient-subject="${ontvangerId}"]`),
        'de eigen tekst van deze ontvanger moet bewaard blijven'
      ).toHaveValue(eigenOnderwerp);
    });

    await test.step('And opslaan werkt ook als er verder niets aan het account verandert', async () => {
      // Dit was de rowCount-bug: een opslag die het gebruikersrecord niet wijzigt
      // gaf "gebruiker niet gevonden".
      await opslaan();
    });
  } finally {
    await page.reload();
    await page.locator('[data-view="employees"]').click();
    await openEerste();
    await page.locator('#edit-subject').fill(origineelOnderwerp);
    await page.locator('#edit-body').fill(origineelTekst);
    await page.locator(`[data-mail-recipient-subject="${ontvangerId}"]`).fill(origineelEigen);
    await opslaan();
  }
});

test('[ADM-WR-H-016] de routevinkjes van een opdracht blijven na opslaan en F5 staan zoals gezet', async ({ page }) => {
  // Gemeld vanaf TEST: het brokervinkje liet zich wel omzetten en opslaan gaf 200,
  // maar na een herlaad stond het weer aan. De server bewaarde het correct en gaf
  // het ook terug; de frontend las het alleen nooit terug en zette het profiel
  // telkens hard op de standaardwaarde. Vier andere schakelaars hadden hetzelfde.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsAdmin();
  await page.locator('[data-view="employees"]').click();

  const openEerste = async () => {
    await page.locator('[data-edit-routing]').first().click();
    await expect(page.locator('#edit-broker-enabled')).toBeVisible();
  };

  const opslaan = async () => {
    const response = page.waitForResponse(item => item.url().includes('/server/api/staff.php') && item.request().method() === 'POST');
    await page.locator('#modal-confirm').click();
    expect((await response).status()).toBe(200);
  };

  await openEerste();
  const origineel = await page.locator('#edit-broker-enabled').isChecked();

  try {
    await test.step('When het brokervinkje wordt omgezet en opgeslagen', async () => {
      await page.locator('#edit-broker-enabled').setChecked(!origineel);
      await opslaan();
    });

    await test.step('Then staat het na een herlaad nog steeds zo', async () => {
      await page.reload();
      await page.locator('[data-view="employees"]').click();
      await openEerste();
      await expect(
        page.locator('#edit-broker-enabled'),
        'een uitgezet brokervinkje mag na een herlaad niet vanzelf terugspringen'
      ).toBeChecked({ checked: !origineel });
    });
  } finally {
    await page.reload();
    await page.locator('[data-view="employees"]').click();
    await openEerste();
    await page.locator('#edit-broker-enabled').setChecked(origineel);
    await opslaan();
  }
});
