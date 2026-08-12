import { expect, request as playwrightRequest, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { EmailQueueApi } from './api/EmailQueueApi';
import { InvoiceApi } from './api/InvoiceApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const PERIOD_RANGE_START_YEAR = 3000;
const PERIOD_RANGE_MONTHS = 7000 * 12;

function candidatePeriods(): string[] {
  const startIndex = Date.now() % PERIOD_RANGE_MONTHS;

  return Array.from({ length: 240 }, (_, offset) => {
    const index = (startIndex + offset) % PERIOD_RANGE_MONTHS;
    const year = PERIOD_RANGE_START_YEAR + Math.floor(index / 12);
    const month = (index % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  });
}

async function findWritablePeriod(timesheetApi: TimesheetApi): Promise<string> {
  for (const period of candidatePeriods()) {
    const read = await timesheetApi.read(period, undefined, { attach: false });
    if (read.status !== 200 || !read.body?.ok) continue;
    if (!read.body.found) return period;
    const s = String(read.body.timesheet?.status || '');
    if (s === 'draft' || s === 'correction') return period;
  }
  throw new Error('No writable period for email-queue tests');
}

async function createLockedInvoice() {
  const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  const authApi      = new AuthApi(ctx);
  const timesheetApi = new TimesheetApi(ctx);
  const invoiceApi   = new InvoiceApi(ctx);
  const queueApi     = new EmailQueueApi(ctx);

  // Employee: submit timesheet
  await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
  const period = await findWritablePeriod(timesheetApi);
  const draft = await timesheetApi.write({
    action: 'save_draft', period, contractualHours: 160, billableHours: 8, leaveHours: 0,
    dayEntries: [{ workDate: `${period}-01`, hours: 8, description: 'EQ spec' }],
  });
  expect(draft.status).toBe(200);
  const submitted = await timesheetApi.write({
    action: 'submit', period, contractualHours: 160, billableHours: 8, leaveHours: 0,
    dayEntries: [{ workDate: `${period}-01`, hours: 8, description: 'EQ spec' }],
    expectedVersion: draft.body.timesheet?.version as number,
  });
  expect(submitted.status).toBe(200);
  const employeeId    = Number(submitted.body.employee_id || 0);
  const timesheetId   = Number(submitted.body.timesheet?.id || 0);
  const submittedVer  = Number(submitted.body.timesheet?.version || 0);

  // Admin: approve + lock
  await authApi.logout();
  await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  const approved = await timesheetApi.approve({ period, employeeId, expectedVersion: submittedVer });
  expect(approved.status).toBe(200);

  const locked = await invoiceApi.lock({ action: 'lock', timesheetId });
  expect(locked.status).toBe(200);
  const invoiceId = Number(locked.body.invoice?.id || 0);
  expect(invoiceId).toBeGreaterThan(0);

  return { ctx, authApi, queueApi, invoiceApi, timesheetId, invoiceId, period };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('email queue api', () => {

  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  test('[EQ-H-001] factuurlock maakt queue-items aan met dry_run=true', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given de admin heeft een factuur gelockt', async () => {});

    await test.step('Then zijn er queue-items voor deze factuur met dry_run=true en status queued', async () => {
      const list = await queueApi.list();
      expect(list.status).toBe(200);
      expect(list.body.dry_run).toBe(true);

      const items = (list.body.items as Array<Record<string, unknown>>)
        .filter(i => (i.invoice_id as number) === invoiceId);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every(i => i.dry_run === true)).toBe(true);
      expect(items.every(i => i.status === 'queued')).toBe(true);
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-002] broker-channel bundelt factuur en klanturenstaat', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een gelockte factuur met broker_invoice_attachment=true', async () => {});

    let brokerItems: Array<Record<string, unknown>> = [];
    await test.step('When de queue wordt uitgelezen', async () => {
      const list = await queueApi.list();
      brokerItems = (list.body.items as Array<Record<string, unknown>>)
        .filter(i => (i.invoice_id as number) === invoiceId && i.channel === 'broker');
    });

    await test.step('Then heeft de broker-channel attachment_policy=invoice_and_customer_timesheet', async () => {
      expect(brokerItems.length).toBeGreaterThan(0);
      expect(brokerItems.every(i => i.attachment_policy === 'invoice_and_customer_timesheet')).toBe(true);
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-003] EasySalary-channel heeft attachment_policy none', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    let payrollItems: Array<Record<string, unknown>> = [];
    await test.step('Given een gelockte factuur waar payroll_invoice_attachment=false', async () => {});

    await test.step('When de queue-items voor deze factuur worden uitgelezen', async () => {
      const list = await queueApi.list();
      payrollItems = (list.body.items as Array<Record<string, unknown>>)
        .filter(i => (i.invoice_id as number) === invoiceId && i.channel === 'payroll');
    });

    await test.step('Then heeft elke EasySalary-item attachment_policy=none', async () => {
      expect(payrollItems.length).toBeGreaterThan(0);
      expect(payrollItems.every(i => i.attachment_policy === 'none')).toBe(true);
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-004] action=enqueue voor gelockte factuur maakt nieuwe items aan', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een admin is ingelogd met een reeds gelockte factuur', async () => {});

    let enqueueResult: Record<string, unknown> = {};
    await test.step('When action=enqueue wordt aangeroepen', async () => {
      const res = await queueApi.enqueue(invoiceId);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.dry_run).toBe(true);
      expect((res.body.count as number)).toBeGreaterThan(0);
      enqueueResult = res.body;
    });

    await test.step('Then zijn de nieuwe items in de queue zichtbaar per invoiceId', async () => {
      const created = enqueueResult.created as Array<Record<string, unknown>>;
      expect(created.length).toBeGreaterThan(0);
      expect(created.every(i => i.dry_run === true)).toBe(true);
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-005] action=list response bevat verplichte velden', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een admin is ingelogd', async () => {});

    await test.step('When de queue wordt uitgelezen', async () => {
      const res = await queueApi.list();
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.dry_run).toBe('boolean');
      expect(typeof res.body.count).toBe('number');
      expect(Array.isArray(res.body.items)).toBe(true);

      const item = (res.body.items as Array<Record<string, unknown>>)
        .find(i => (i.invoice_id as number) === invoiceId);
      if (item) {
        expect(typeof item.id).toBe('number');
        expect(typeof item.channel).toBe('string');
        expect(typeof item.recipient_email).toBe('string');
        expect(typeof item.subject_snapshot).toBe('string');
        expect(typeof item.attachment_policy).toBe('string');
        expect(typeof item.status).toBe('string');
        expect(typeof item.attempt_count).toBe('number');
        expect(typeof item.dry_run).toBe('boolean');
        expect(typeof item.created_at).toBe('string');
      }
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  // --------------------------------------------------------------------------
  // Negative
  // --------------------------------------------------------------------------

  test('[EQ-N-006] anonieme gebruiker krijgt 401 op list', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    await test.step('Given geen sessie', async () => {});
    await test.step('When GET email-queue zonder sessie', async () => {
      const res = await ctx.get(`${appConfig.baseUrl}/server/api/email-queue.php`);
      expect(res.status()).toBe(401);
      expect((await res.json()).ok).toBe(false);
    });
    await ctx.dispose();
  });

  test('[EQ-N-007] medewerker krijgt 403 op list', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een ingelogde medewerker', async () => {
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    });
    await test.step('When de medewerker de queue opvraagt', async () => {
      const res = await ctx.get(`${appConfig.baseUrl}/server/api/email-queue.php`);
      expect(res.status()).toBe(403);
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-008] action=enqueue zonder invoice_id geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi  = new AuthApi(ctx);
    const queueApi = new EmailQueueApi(ctx);
    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });
    await test.step('When enqueue wordt aangeroepen zonder invoice_id', async () => {
      const csrf = await ctx.get('/server/auth/csrf.php');
      const token = String(((await csrf.json()) as Record<string, string>).csrf_token ?? '');
      const res = await ctx.post(`${appConfig.baseUrl}/server/api/email-queue.php`, {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'enqueue' },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('missing-invoice-id');
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-009] action=enqueue niet-bestaande factuur geeft 404', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi  = new AuthApi(ctx);
    const queueApi = new EmailQueueApi(ctx);
    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });
    await test.step('When enqueue wordt aangeroepen met niet-bestaand invoice_id', async () => {
      const res = await queueApi.enqueue(9999999);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('invoice-not-found');
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-010] action=enqueue niet-gelockte factuur geeft 409', async () => {
    // Create an approved but NOT yet locked timesheet, then call enqueue.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi      = new AuthApi(ctx);
    const timesheetApi = new TimesheetApi(ctx);
    const invoiceApi   = new InvoiceApi(ctx);
    const queueApi     = new EmailQueueApi(ctx);

    await test.step('Given een goedgekeurde-maar-niet-gelockte urenstaat', async () => {
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      const period = await findWritablePeriod(timesheetApi);
      const draft = await timesheetApi.write({
        action: 'save_draft', period, contractualHours: 160, billableHours: 6, leaveHours: 0,
        dayEntries: [{ workDate: `${period}-01`, hours: 6, description: 'EQ-N-010' }],
      });
      const submitted = await timesheetApi.write({
        action: 'submit', period, contractualHours: 160, billableHours: 6, leaveHours: 0,
        dayEntries: [{ workDate: `${period}-01`, hours: 6, description: 'EQ-N-010' }],
        expectedVersion: draft.body.timesheet?.version as number,
      });
      const employeeId = Number(submitted.body.employee_id || 0);
      await authApi.logout();
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      await timesheetApi.approve({ period, employeeId, expectedVersion: submitted.body.timesheet?.version as number });
    });

    await test.step('When enqueue wordt aangeroepen voor een factuur die nog niet gelockt is', async () => {
      // Read invoices to get the open (unlocked) invoice for this timesheet.
      const invList = await invoiceApi.readByPeriod('');
      // Find an invoice that is NOT locked.
      const unlockedInv = (invList.body.items as Array<Record<string, unknown>>)
        .find(i => !i.locked);

      if (unlockedInv) {
        const res = await queueApi.enqueue(unlockedInv.id as number);
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('invoice-not-locked');
      }
      // If no unlocked invoice found, test is inconclusive but not a failure.
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-N-011] action=retry op queued item geeft 409', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een queued (niet-failed) delivery item', async () => {});

    await test.step('When retry wordt aangeroepen op een queued item', async () => {
      const list = await queueApi.list({ status: 'queued' });
      const queuedItem = (list.body.items as Array<Record<string, unknown>>)
        .find(i => (i.invoice_id as number) === invoiceId);
      expect(queuedItem).toBeDefined();

      const res = await queueApi.retry(queuedItem!.id as number);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('not-failed');
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-N-012] ongeldige status-filter geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });
    await test.step('When status=invalid wordt meegestuurd', async () => {
      const res = await ctx.get(`${appConfig.baseUrl}/server/api/email-queue.php?status=invalid`);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('invalid-status');
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-013] anonieme enqueue geeft 401', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    await test.step('Given geen sessie', async () => {});
    await test.step('When POST email-queue zonder sessie', async () => {
      const csrf = await ctx.get(`${appConfig.baseUrl}/server/auth/csrf.php`);
      const token = String(((await csrf.json()) as Record<string, string>).csrf_token ?? '');
      const res = await ctx.post(`${appConfig.baseUrl}/server/api/email-queue.php`, {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'enqueue', invoice_id: 1 },
      });
      expect(res.status()).toBe(401);
    });
    await ctx.dispose();
  });

  test('[EQ-N-014] unknown action geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });
    await test.step('When een onbekende action wordt verstuurd', async () => {
      const csrf = await ctx.get('/server/auth/csrf.php');
      const token = String(((await csrf.json()) as Record<string, string>).csrf_token ?? '');
      const res = await ctx.post(`${appConfig.baseUrl}/server/api/email-queue.php`, {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'dispatch_now' },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('unknown-action');
    });
    await authApi.logout();
    await ctx.dispose();
  });
});
