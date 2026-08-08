import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const CANDIDATE_PERIODS = Array.from({ length: 240 }, (_, index) => {
  const year = 2110 + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
});

function buildDayEntries(period: string, first: number, second: number) {
  return [
    { workDate: `${period}-01`, hours: first, description: 'Reviewflow dag 1' },
    { workDate: `${period}-02`, hours: second, description: 'Reviewflow dag 2' },
  ];
}

async function findWritablePeriod(timesheetApi: TimesheetApi): Promise<string> {
  for (const period of CANDIDATE_PERIODS) {
    const read = await timesheetApi.read(period);
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

  throw new Error('No writable review-flow period found in 240 candidate months.');
}

test.describe('timesheet review flow api', () => {
  test('admin vraagt correctie, employee dient opnieuw in, admin keurt goed met optimistic locking', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(employeeLogin.user.role).toBe('employee');

    const period = await findWritablePeriod(timesheetApi);

    const initialDraft = await timesheetApi.write({
      action: 'save_draft',
      period,
      contractualHours: 160,
      billableHours: 12,
      leaveHours: 0,
      sicknessHours: 0,
      dayEntries: buildDayEntries(period, 8, 4),
    });
    expect(initialDraft.status).toBe(200);
    expect(initialDraft.body.ok).toBe(true);
    expect(initialDraft.body.timesheet.status).toBe('draft');

    const draftVersion = Number(initialDraft.body.timesheet.version || 0);

    const submitted = await timesheetApi.write({
      action: 'submit',
      period,
      expectedVersion: draftVersion,
      contractualHours: 160,
      billableHours: 14,
      leaveHours: 0,
      sicknessHours: 0,
      dayEntries: buildDayEntries(period, 8, 6),
    });
    expect(submitted.status).toBe(200);
    expect(submitted.body.ok).toBe(true);
    expect(submitted.body.timesheet.status).toBe('submitted');

    const submittedVersion = Number(submitted.body.timesheet.version || 0);
    const submittedRead = await timesheetApi.read(period);
    const employeeId = Number(submittedRead.body?.employee_id || 0);
    expect(employeeId).toBeGreaterThan(0);

    await authApi.logout();

    const adminLogin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    expect(adminLogin.user.role).toBe('administrator');

    const staleCorrection = await timesheetApi.requestCorrection({
      action: 'request_correction',
      period,
      employeeId,
      expectedVersion: submittedVersion + 100,
      correctionMessage: 'Controleer dag 2 nog eens.',
    });
    expect(staleCorrection.status).toBe(409);
    expect(staleCorrection.body.ok).toBe(false);
    expect(staleCorrection.body.error).toBe('stale-version');

    const correction = await timesheetApi.requestCorrection({
      action: 'request_correction',
      period,
      employeeId,
      expectedVersion: submittedVersion,
      correctionMessage: 'Controleer dag 2 nog eens.',
    });
    expect(correction.status).toBe(200);
    expect(correction.body.ok).toBe(true);
    expect(correction.body.timesheet.status).toBe('correction');
    expect(correction.body.audit_event).toBe('timesheet.correction_requested');
    expect(correction.body.latest_correction).toBeTruthy();
    expect(String(correction.body.latest_correction.correction_message)).toContain('Controleer dag 2');

    const correctionVersion = Number(correction.body.timesheet.version || 0);

    const invalidSecondCorrection = await timesheetApi.requestCorrection({
      action: 'request_correction',
      period,
      employeeId,
      expectedVersion: correctionVersion,
      correctionMessage: 'Nogmaals corrigeren',
    });
    expect(invalidSecondCorrection.status).toBe(409);
    expect(invalidSecondCorrection.body.ok).toBe(false);
    expect(invalidSecondCorrection.body.error).toBe('invalid-timesheet-transition');

    await authApi.logout();

    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));

    const forbiddenReviewByEmployee = await timesheetApi.requestCorrection({
      action: 'request_correction',
      period,
      employeeId,
      expectedVersion: correctionVersion,
      correctionMessage: 'Dit mag niet als employee',
    });
    expect(forbiddenReviewByEmployee.status).toBe(403);
    expect(forbiddenReviewByEmployee.body.ok).toBe(false);
    expect(forbiddenReviewByEmployee.body.error).toBe('forbidden-action');

    const resubmitted = await timesheetApi.write({
      action: 'submit',
      period,
      expectedVersion: correctionVersion,
      contractualHours: 160,
      billableHours: 13,
      leaveHours: 0,
      sicknessHours: 0,
      dayEntries: buildDayEntries(period, 8, 5),
    });
    expect(resubmitted.status).toBe(200);
    expect(resubmitted.body.ok).toBe(true);
    expect(resubmitted.body.timesheet.status).toBe('submitted');
    expect(resubmitted.body.audit_event).toBe('timesheet.resubmitted');

    const resubmittedVersion = Number(resubmitted.body.timesheet.version || 0);

    await authApi.logout();

    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const staleApprove = await timesheetApi.approve({
      period,
      employeeId,
      expectedVersion: resubmittedVersion + 100,
    });
    expect(staleApprove.status).toBe(409);
    expect(staleApprove.body.ok).toBe(false);
    expect(staleApprove.body.error).toBe('stale-version');

    const approved = await timesheetApi.approve({
      period,
      employeeId,
      expectedVersion: resubmittedVersion,
    });
    expect(approved.status).toBe(200);
    expect(approved.body.ok).toBe(true);
    expect(approved.body.timesheet.status).toBe('approved');
    expect(approved.body.timesheet.approved_at).toBeTruthy();
    expect(approved.body.timesheet.approved_by).toBeTruthy();
    expect(approved.body.audit_event).toBe('timesheet.approved');

    const readBack = await timesheetApi.read(period, employeeId);
    expect(readBack.status).toBe(200);
    expect(readBack.body.ok).toBe(true);
    expect(readBack.body.found).toBe(true);
    expect(readBack.body.timesheet.status).toBe('approved');
    expect(Array.isArray(readBack.body.timesheet.correction_history)).toBe(true);
    expect(readBack.body.timesheet.correction_history.length).toBeGreaterThan(0);
    expect(readBack.body.timesheet.correction_history[0].resubmitted_at).toBeTruthy();

    await authApi.logout();
  });
});
