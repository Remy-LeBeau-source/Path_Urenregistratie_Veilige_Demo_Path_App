import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

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

    const bootstrapAfter = await ctx.get('/server/api/bootstrap.php');
    const afterBody = await bootstrapAfter.json();
    const foundEmployee = (afterBody.employees as Array<{ id: number; full_name: string; user_id: number }>).find(
      employee => employee.id === Number(write.body.employee_id)
    );
    expect(foundEmployee).toBeDefined();
    expect(foundEmployee?.full_name).toBe(employeeName);

    const foundUser = (afterBody.users as Array<{ id: number; email: string; role: string }>).find(
      user => user.id === Number(write.body.user_id)
    );
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(employeeEmail);
    expect(foundUser?.role).toBe('employee');

    await authApi.logout();
    await ctx.dispose();
  });
});
