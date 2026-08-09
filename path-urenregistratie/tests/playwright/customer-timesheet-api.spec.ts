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
    const read = await api.read(period, undefined, undefined, { attach: false });
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
  test('[CTS-API-H-001] employee uploadt klanturenstaat, dient in en downloadt; admin kan goedkeuren en resubmit vragen', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';
    let employeeId = 0;
    let assignmentId = 0;

    await test.step('Given de medewerker is ingelogd in auth-modus', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
    });

    await test.step('When de medewerker een concept uploadt en indient', async () => {
      period = await findWritablePeriod(customerApi);

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

      employeeId = Number(submit.body.employee_id || 0);
      assignmentId = Number(submit.body.assignment_id || 0);
      expect(employeeId).toBeGreaterThan(0);
      expect(assignmentId).toBeGreaterThan(0);
    });

    await test.step('Then de medewerker kan het ingediende document teruglezen en downloaden', async () => {
      const readBack = await customerApi.read(period);
      expect(readBack.status).toBe(200);
      expect(readBack.body.ok).toBe(true);
      expect(readBack.body.found).toBe(true);
      expect(readBack.body.customer_timesheet.status).toBe('received');

      const download = await customerApi.download(period);
      expect(download.status).toBe(200);
      expect(download.contentType).toContain('application/pdf');
      expect(download.body.byteLength).toBeGreaterThan(5);
    });

    await test.step('And cleanup: wissel naar administrator-context voor reviewstappen', async () => {
      await authApi.logout();
    });

    await test.step('Given de administrator is ingelogd voor reviewbesluiten', async () => {
      const adminLogin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      expect(adminLogin.user.role).toBe('administrator');
    });

    await test.step('When de administrator approve en request_resubmit uitvoert', async () => {
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
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-N-006] employee kan geen klanturenstaat voor andere medewerker wijzigen', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    await test.step('Given de medewerker is ingelogd', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
    });

    await test.step('When de medewerker schrijft met een andere employee_id', async () => {
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

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-N-007] employee kan geen admin reviewactie uitvoeren op klanturenstaat', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';
    let employeeId = 0;
    let assignmentId = 0;

    await test.step('Given de medewerker is ingelogd met een ingediende klanturenstaat', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');

      period = await findWritablePeriod(customerApi);

      const draft = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'klanturenstaat.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n% review scope', 'utf8'),
        },
      });
      expect(draft.status).toBe(200);

      const submit = await customerApi.write({ action: 'submit', period });
      expect(submit.status).toBe(200);
      expect(submit.body.customer_timesheet.status).toBe('received');
      employeeId = Number(submit.body.employee_id || 0);
      assignmentId = Number(submit.body.assignment_id || 0);
      expect(employeeId).toBeGreaterThan(0);
      expect(assignmentId).toBeGreaterThan(0);
    });

    await test.step('When de medewerker approve probeert uit te voeren', async () => {
      const forbiddenApprove = await customerApi.write({
        action: 'approve',
        period,
        employeeId,
        assignmentId,
      });
      expect(forbiddenApprove.status).toBe(403);
      expect(forbiddenApprove.body.ok).toBe(false);
      expect(forbiddenApprove.body.error).toBe('forbidden-action');
    });

    await test.step('Then de medewerker ook geen request_resubmit mag uitvoeren', async () => {
      const forbiddenResubmit = await customerApi.write({
        action: 'request_resubmit',
        period,
        employeeId,
        assignmentId,
        reviewNote: 'Employee mag dit niet doen',
      });
      expect(forbiddenResubmit.status).toBe(403);
      expect(forbiddenResubmit.body.ok).toBe(false);
      expect(forbiddenResubmit.body.error).toBe('forbidden-action');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-H-004] employee kan mark_skipped registreren en restore_missing terugdraaien', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';

    await test.step('Given de medewerker is ingelogd met een concept klanturenstaat', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');

      period = await findWritablePeriod(customerApi);
      const draft = await customerApi.write({
        action: 'save_draft',
        period,
        file: {
          name: 'klanturenstaat.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n% skip restore', 'utf8'),
        },
      });
      expect(draft.status).toBe(200);
      expect(draft.body.customer_timesheet.status).toBe('draft');
    });

    await test.step('When de medewerker mark_skipped uitvoert met reden', async () => {
      const skipped = await customerApi.write({
        action: 'mark_skipped',
        period,
        reviewNote: 'Al rechtstreeks verstuurd buiten de app',
      });
      expect(skipped.status).toBe(200);
      expect(skipped.body.ok).toBe(true);
      expect(skipped.body.customer_timesheet.status).toBe('skipped');
    });

    await test.step('Then restore_missing zet de status terug naar missing', async () => {
      const restored = await customerApi.write({
        action: 'restore_missing',
        period,
      });
      expect(restored.status).toBe(200);
      expect(restored.body.ok).toBe(true);
      expect(restored.body.customer_timesheet.status).toBe('missing');
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[CTS-API-N-005] employee krijgt 400 bij ongeldig bestandstype', async ({ request }) => {
    const authApi = new AuthApi(request);
    const customerApi = new CustomerTimesheetApi(request);

    let period = '';

    await test.step('Given de medewerker is ingelogd', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
      period = await findWritablePeriod(customerApi);
    });

    await test.step('When de medewerker een tekstbestand uploadt als klanturenstaat', async () => {
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

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });
});

