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
        phone: company.invoice_phone || '06 21 46 91 72',
        invoiceEmail: company.invoice_email || 'info@pathconsultancy.nl',
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
});
