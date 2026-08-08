import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { CustomerTimesheetApi } from './api/CustomerTimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const CANDIDATE_PERIODS = Array.from({ length: 240 }, (_, index) => {
  const year = 2130 + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
});

async function findWritablePeriod(api: CustomerTimesheetApi): Promise<string> {
  for (const period of CANDIDATE_PERIODS) {
    const read = await api.read(period);
    if (read.status !== 200 || !read.body?.ok) {
      continue;
    }

    if (!read.body.found) {
      return period;
    }

    const status = String(read.body.customer_timesheet?.status || '');
    if (['missing', 'draft', 'resubmit', 'received', 'skipped'].includes(status)) {
      return period;
    }
  }

  throw new Error('No writable customer-timesheet period found in 240 candidate months.');
}

test.describe('customer timesheet api', () => {
  test('[CTS-API-001] employee uploadt klanturenstaat, dient in en downloadt; admin kan goedkeuren en resubmit vragen', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(employeeLogin.user.role).toBe('employee');

    const period = await findWritablePeriod(customerApi);

    const draft = await customerApi.write({
      action: 'save_draft',
      period,
      file: {
        name: 'klanturenstaat.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n% test klanturenstaat', 'utf8'),
      },
    });

    expect(draft.status).toBe(200);
    expect(draft.body.ok).toBe(true);
    expect(draft.body.customer_timesheet.status).toBe('draft');

    const submit = await customerApi.write({
      action: 'submit',
      period,
    });

    expect(submit.status).toBe(200);
    expect(submit.body.ok).toBe(true);
    expect(submit.body.customer_timesheet.status).toBe('received');

    const employeeId = Number(submit.body.employee_id || 0);
    const assignmentId = Number(submit.body.assignment_id || 0);
    expect(employeeId).toBeGreaterThan(0);
    expect(assignmentId).toBeGreaterThan(0);

    const readBack = await customerApi.read(period);
    expect(readBack.status).toBe(200);
    expect(readBack.body.ok).toBe(true);
    expect(readBack.body.found).toBe(true);
    expect(readBack.body.customer_timesheet.status).toBe('received');

    const download = await customerApi.download(period);
    expect(download.status).toBe(200);
    expect(download.contentType).toContain('application/pdf');
    expect(download.body.byteLength).toBeGreaterThan(5);

    await authApi.logout();

    const adminLogin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    expect(adminLogin.user.role).toBe('administrator');

    const approve = await customerApi.write({
      action: 'approve',
      period,
      employeeId,
      assignmentId,
    });
    expect(approve.status).toBe(200);
    expect(approve.body.ok).toBe(true);
    expect(approve.body.customer_timesheet.status).toBe('approved');

    const resubmit = await customerApi.write({
      action: 'request_resubmit',
      period,
      employeeId,
      assignmentId,
      reviewNote: 'Upload graag de definitieve versie met handtekening.',
    });
    expect(resubmit.status).toBe(200);
    expect(resubmit.body.ok).toBe(true);
    expect(resubmit.body.customer_timesheet.status).toBe('resubmit');
    expect(String(resubmit.body.customer_timesheet.review_note || '')).toContain('definitieve versie');

    await authApi.logout();

    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

    const invalidUpload = await customerApi.write({
      action: 'save_draft',
      period,
      file: {
        name: 'not-allowed.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('geen geldig type', 'utf8'),
      },
    });

    expect(invalidUpload.status).toBe(400);
    expect(invalidUpload.body.ok).toBe(false);
    expect(invalidUpload.body.error).toBe('invalid-upload');
  });

  test('[CTS-API-002] employee kan geen klanturenstaat voor andere medewerker wijzigen', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(employeeLogin.user.role).toBe('employee');

    const period = await findWritablePeriod(customerApi);

    const forbidden = await customerApi.write({
      action: 'save_draft',
      period,
      employeeId: 999999,
      file: {
        name: 'klanturenstaat.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n% scope test', 'utf8'),
      },
    });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.ok).toBe(false);
    expect(forbidden.body.error).toBe('forbidden-employee-scope');
  });
});
