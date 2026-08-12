import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { InvoiceApi } from './api/InvoiceApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

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

function buildDayEntries(period: string, first: number, second: number) {
  return [
    { workDate: `${period}-01`, hours: first, description: 'Invoice lock test dag 1' },
    { workDate: `${period}-02`, hours: second, description: 'Invoice lock test dag 2' },
  ];
}

async function findWritablePeriod(timesheetApi: TimesheetApi): Promise<string> {
  for (const period of candidatePeriods()) {
    const read = await timesheetApi.read(period, undefined, { attach: false });
    if (read.status !== 200 || !read.body?.ok) {
      continue;
    }

    if (!read.body.found) {
      return period;
    }

    const status = String(read.body.timesheet?.status || '');
    if (status === 'draft' || status === 'correction') {
      return period;
    }
  }

  throw new Error('No writable test period found in 240 candidate months for invoice lock tests.');
}

type SubmittedTimesheet = {
  period: string;
  employeeId: number;
  timesheetId: number;
  version: number;
  billableHours: number;
};

async function createSubmittedTimesheet(request: APIRequestContext, billableHours: number): Promise<SubmittedTimesheet> {
  const authApi = new AuthApi(request);
  const timesheetApi = new TimesheetApi(request);

  await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
  const period = await findWritablePeriod(timesheetApi);

  const draft = await timesheetApi.write({
    action: 'save_draft',
    period,
    contractualHours: 160,
    billableHours,
    leaveHours: 0,
    sicknessHours: 0,
    dayEntries: buildDayEntries(period, billableHours - 1, 1),
  });

  expect(draft.status).toBe(200);
  expect(draft.body.ok).toBe(true);

  const draftVersion = Number(draft.body?.timesheet?.version || 0);
  expect(draftVersion).toBeGreaterThan(0);

  const submit = await timesheetApi.write({
    action: 'submit',
    period,
    expectedVersion: draftVersion,
    contractualHours: 160,
    billableHours,
    leaveHours: 0,
    sicknessHours: 0,
    dayEntries: buildDayEntries(period, billableHours - 1, 1),
  });

  expect(submit.status).toBe(200);
  expect(submit.body.ok).toBe(true);
  expect(submit.body.timesheet.status).toBe('submitted');

  const employeeId = Number(submit.body.employee_id || 0);
  const timesheetId = Number(submit.body?.timesheet?.id || 0);
  const version = Number(submit.body?.timesheet?.version || 0);

  expect(employeeId).toBeGreaterThan(0);
  expect(timesheetId).toBeGreaterThan(0);
  expect(version).toBeGreaterThan(0);

  await authApi.logout();

  return { period, employeeId, timesheetId, version, billableHours };
}

async function approveTimesheet(request: APIRequestContext, data: SubmittedTimesheet) {
  const authApi = new AuthApi(request);
  const timesheetApi = new TimesheetApi(request);

  await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

  const approve = await timesheetApi.approve({
    period: data.period,
    employeeId: data.employeeId,
    expectedVersion: data.version,
  });

  expect(approve.status).toBe(200);
  expect(approve.body.ok).toBe(true);
  expect(approve.body.timesheet.status).toBe('approved');

  const approvedVersion = Number(approve.body?.timesheet?.version || 0);
  expect(approvedVersion).toBeGreaterThan(data.version);

  await authApi.logout();

  return {
    ...data,
    version: approvedVersion,
  };
}

test('[INV-H-004] admin lockt approved timesheet naar definitieve immutable factuur', async ({ request }) => {
  const invoiceApi = new InvoiceApi(request);
  const authApi = new AuthApi(request);

  const submitted = await test.step('Given een medewerker een urenstaat heeft ingediend in een herhaalbare testperiode', async () => {
    return createSubmittedTimesheet(request, 12);
  });

  const approved = await test.step('And een administrator die urenstaat goedkeurt', async () => {
    return approveTimesheet(request, submitted);
  });

  let lockResponse: Awaited<ReturnType<InvoiceApi['lock']>>;

  await test.step('When de administrator de factuur finaliseert met lock-actie', async () => {
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    lockResponse = await invoiceApi.lock({
      action: 'lock',
      timesheetId: approved.timesheetId,
      subtotal: 1,
      vatAmount: 1,
      total: 1,
    });
  });

  await test.step('Then worden nummer bedragen en locked_at server-side vastgelegd en blijft client-manipulatie zonder effect', async () => {
    expect(lockResponse!.status).toBe(200);
    expect(lockResponse!.body.ok).toBe(true);
    expect(lockResponse!.body.audit_event).toBe('invoice.locked');
    expect(String(lockResponse!.body.invoice.invoice_number || '').length).toBeGreaterThan(3);
    expect(String(lockResponse!.body.invoice.locked_at || '').length).toBeGreaterThan(10);
    expect(lockResponse!.body.invoice.status).toBe('ready');
    expect(lockResponse!.body.timesheet.status).toBe('invoiced');

    const invoices = await invoiceApi.readByPeriod(approved.period);
    expect(invoices.status).toBe(200);
    const item = (invoices.body.items || []).find((row: any) => Number(row.timesheet_id) === approved.timesheetId);
    expect(item).toBeTruthy();

    const expectedSubtotal = Number((Number(item.billable_hours) * Number(item.hourly_rate)).toFixed(2));
    const expectedVat = Number((expectedSubtotal * Number(item.vat_percentage) / 100).toFixed(2));
    const expectedTotal = Number((expectedSubtotal + expectedVat).toFixed(2));

    expect(Number(item.subtotal)).toBe(expectedSubtotal);
    expect(Number(item.vat_amount)).toBe(expectedVat);
    expect(Number(item.total)).toBe(expectedTotal);
    expect(Number(item.subtotal)).not.toBe(1);
    expect(Number(item.vat_amount)).not.toBe(1);
    expect(Number(item.total)).not.toBe(1);
  });

  await test.step('And de administrator kan de server-side gegenereerde factuur-PDF downloaden', async () => {
    const invoiceId = Number(lockResponse!.body.invoice.id);
    expect(invoiceId).toBeGreaterThan(0);

    const download = await invoiceApi.downloadPdf(invoiceId);
    expect(download.status).toBe(200);
    expect(download.contentType).toContain('application/pdf');
    expect(download.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(download.body.subarray(-16).toString('latin1')).toContain('%%EOF');
  });

  await test.step('And cleanup de administrator-sessie wordt afgesloten', async () => {
    await authApi.logout();
  });
});

test('[INV-N-008] anonieme gebruiker kan factuur niet locken', async ({ request }) => {
  const invoiceApi = new InvoiceApi(request);

  await test.step('Given er is geen actieve sessie', async () => {
    // Isolated context zonder login wordt in helper afgedwongen.
  });

  await test.step('When een lock-actie zonder sessie wordt verstuurd', async () => {
    const response = await invoiceApi.lockWithoutSession({ action: 'lock', timesheetId: 11 });
    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toBe('not-authenticated');
  });
});

test('[INV-N-009] medewerker mag factuur niet finaliseren', async ({ request }) => {
  const authApi = new AuthApi(request);
  const invoiceApi = new InvoiceApi(request);

  await test.step('Given de medewerker is ingelogd', async () => {
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
  });

  await test.step('When de medewerker een lock-actie verstuurt', async () => {
    const response = await invoiceApi.lock({ action: 'lock', timesheetId: 11 });
    expect(response.status).toBe(403);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toBe('forbidden-action');
  });

  await test.step('And cleanup de sessie wordt afgesloten', async () => {
    await authApi.logout();
  });
});

test('[INV-N-010] niet-goedgekeurde urenstaat kan niet worden gelockt', async ({ request }) => {
  const authApi = new AuthApi(request);
  const invoiceApi = new InvoiceApi(request);

  const submitted = await test.step('Given een ingediende maar niet-goedgekeurde urenstaat', async () => {
    return createSubmittedTimesheet(request, 10);
  });

  await test.step('When de administrator de factuur probeert te finaliseren', async () => {
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    const response = await invoiceApi.lock({ action: 'lock', timesheetId: submitted.timesheetId });
    expect(response.status).toBe(409);
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toBe('timesheet-not-approved');
  });

  await test.step('And cleanup de administrator-sessie wordt afgesloten', async () => {
    await authApi.logout();
  });
});

test('[INV-N-011] tweede lock-oproep op dezelfde factuur wordt geblokkeerd', async ({ request }) => {
  const authApi = new AuthApi(request);
  const invoiceApi = new InvoiceApi(request);

  const submitted = await createSubmittedTimesheet(request, 11);
  const approved = await approveTimesheet(request, submitted);

  await test.step('Given een administrator met een approved urenstaat', async () => {
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  });

  let first: Awaited<ReturnType<InvoiceApi['lock']>>;
  await test.step('When de eerste lock-oproep succesvol is', async () => {
    first = await invoiceApi.lock({ action: 'lock', timesheetId: approved.timesheetId });
    expect(first.status).toBe(200);
    expect(first.body.ok).toBe(true);
  });

  await test.step('Then wordt een tweede lock-oproep geweigerd en ontstaat geen duplicaat', async () => {
    const second = await invoiceApi.lock({ action: 'lock', timesheetId: approved.timesheetId });
    expect(second.status).toBe(409);
    expect(second.body.ok).toBe(false);
    expect(second.body.error).toBe('invoice-already-locked');
  });

  await test.step('And cleanup de administrator-sessie wordt afgesloten', async () => {
    await authApi.logout();
  });
});

test('[INV-N-012] gelijktijdige lock-requests leveren exact één winnaar', async () => {
  const setupContext = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  const submitted = await createSubmittedTimesheet(setupContext, 9);
  const approved = await approveTimesheet(setupContext, submitted);
  await setupContext.dispose();

  const ctxA = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  const ctxB = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });

  try {
    const authA = new AuthApi(ctxA);
    const authB = new AuthApi(ctxB);
    await authA.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    await authB.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const invoiceA = new InvoiceApi(ctxA);
    const invoiceB = new InvoiceApi(ctxB);

    const [resA, resB] = await Promise.all([
      invoiceA.lock({ action: 'lock', timesheetId: approved.timesheetId }),
      invoiceB.lock({ action: 'lock', timesheetId: approved.timesheetId }),
    ]);

    const statuses = [resA.status, resB.status].sort((left, right) => left - right);
    expect(statuses).toEqual([200, 409]);
  } finally {
    await ctxA.dispose();
    await ctxB.dispose();
  }
});

test('[INV-N-013] anonieme gebruiker kan factuur-PDF niet downloaden', async ({ request }) => {
  const invoiceApi = new InvoiceApi(request);
  const authApi = new AuthApi(request);

  const invoiceId = await test.step('Given een administrator een factuur heeft gefinaliseerd', async () => {
    const submitted = await createSubmittedTimesheet(request, 7);
    const approved = await approveTimesheet(request, submitted);

    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    const lockResponse = await invoiceApi.lock({ action: 'lock', timesheetId: approved.timesheetId });
    expect(lockResponse.status).toBe(200);
    await authApi.logout();

    return Number(lockResponse.body.invoice.id);
  });

  await test.step('When een anonieme gebruiker de factuur-PDF probeert te downloaden', async () => {
    const isolated = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    try {
      const anonymousInvoiceApi = new InvoiceApi(isolated);
      const response = await anonymousInvoiceApi.downloadPdf(invoiceId);
      expect(response.status).toBe(401);
    } finally {
      await isolated.dispose();
    }
  });
});

