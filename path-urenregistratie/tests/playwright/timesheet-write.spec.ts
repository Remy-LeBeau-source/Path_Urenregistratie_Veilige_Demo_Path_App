import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const CANDIDATE_PERIODS = Array.from({ length: 24 }, (_, index) => {
  const year = 2099 + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
});

function buildDayEntries(period: string, first: number, second: number) {
  return [
    { workDate: `${period}-01`, hours: first, description: 'Playwright dag 1' },
    { workDate: `${period}-02`, hours: second, description: 'Playwright dag 2' },
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

  throw new Error('No writable test period found in 24 candidate months.');
}

test.describe('timesheet write api', () => {
  test('employee save draft, read back, submit, audit en gesloten status guard', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    await test.step('login employee', async () => {
      const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(login.user.role).toBe('employee');
    });

    const period = await test.step('kies herhaalbare testperiode', async () => findWritablePeriod(timesheetApi));

    await test.step('save_draft werkt', async () => {
      const draftWrite = await timesheetApi.write({
        action: 'save_draft',
        period,
        contractualHours: 160,
        billableHours: 12,
        leaveHours: 0,
        sicknessHours: 0,
        dayEntries: buildDayEntries(period, 8, 4),
      });

      expect(draftWrite.status).toBe(200);
      expect(draftWrite.body.ok).toBe(true);
      expect(draftWrite.body.timesheet.status).toBe('draft');
      expect(draftWrite.body.audit_event).toBe('timesheet.draft_saved');
    });

    await test.step('read back draft werkt', async () => {
      const readBackDraft = await timesheetApi.read(period);
      expect(readBackDraft.status).toBe(200);
      expect(readBackDraft.body.ok).toBe(true);
      expect(readBackDraft.body.found).toBe(true);
      expect(readBackDraft.body.timesheet.status).toBe('draft');
      expect(readBackDraft.body.last_audit.event_type).toBe('timesheet.draft_saved');
    });

    await test.step('submit werkt met audit event', async () => {
      const submitWrite = await timesheetApi.write({
        action: 'submit',
        period,
        contractualHours: 160,
        billableHours: 14,
        leaveHours: 0,
        sicknessHours: 0,
        dayEntries: buildDayEntries(period, 8, 6),
      });

      expect(submitWrite.status).toBe(200);
      expect(submitWrite.body.ok).toBe(true);
      expect(submitWrite.body.timesheet.status).toBe('submitted');
      expect(submitWrite.body.timesheet.submitted_at).toBeTruthy();
      expect(submitWrite.body.audit_event).toBe('timesheet.submitted');

      const readBackSubmitted = await timesheetApi.read(period);
      expect(readBackSubmitted.status).toBe(200);
      expect(readBackSubmitted.body.ok).toBe(true);
      expect(readBackSubmitted.body.found).toBe(true);
      expect(readBackSubmitted.body.timesheet.status).toBe('submitted');
      expect(readBackSubmitted.body.last_audit.event_type).toBe('timesheet.submitted');
    });

    await test.step('gesloten status kan niet opnieuw worden gewijzigd', async () => {
      const lockedWrite = await timesheetApi.write({
        action: 'save_draft',
        period,
        contractualHours: 160,
        billableHours: 10,
        leaveHours: 0,
        sicknessHours: 0,
        dayEntries: buildDayEntries(period, 5, 5),
      });

      expect(lockedWrite.status).toBe(409);
      expect(lockedWrite.body.ok).toBe(false);
      expect(lockedWrite.body.error).toBe('timesheet-already-submitted');
    });

    await authApi.logout();
  });

  test('employee mag geen andere medewerker schrijven', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');

    const forbidden = await timesheetApi.write({
      action: 'save_draft',
      period: '2099-11',
      employeeId: 1,
      contractualHours: 160,
      billableHours: 8,
      dayEntries: buildDayEntries('2099-11', 4, 4),
    });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.ok).toBe(false);
    expect(forbidden.body.error).toBe('forbidden-employee-scope');

    await authApi.logout();
  });

  test('write zonder csrf geeft 403', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');

    const noCsrf = await timesheetApi.writeWithoutCsrf({
      action: 'save_draft',
      period: '2099-10',
      contractualHours: 160,
      billableHours: 8,
      dayEntries: buildDayEntries('2099-10', 4, 4),
    });

    expect(noCsrf.status).toBe(403);
    expect(noCsrf.body.ok).toBe(false);

    await authApi.logout();
  });

  test('write zonder sessie geeft 401', async ({ request }) => {
    const timesheetApi = new TimesheetApi(request);

    const noSession = await timesheetApi.writeWithoutSession({
      action: 'save_draft',
      period: '2099-09',
      contractualHours: 160,
      billableHours: 8,
      dayEntries: buildDayEntries('2099-09', 4, 4),
    });

    expect(noSession.status).toBe(401);
    expect(noSession.body.ok).toBe(false);
    expect(noSession.body.error).toBe('not-authenticated');
  });

  test('ongeldige payload geeft 400', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');

    const invalidPayload = await timesheetApi.write({
      action: 'save_draft',
      period: '2099-08',
      contractualHours: 160,
      billableHours: 8,
      dayEntries: [
        { workDate: '2099-08-01', hours: 30 },
      ],
    });

    expect(invalidPayload.status).toBe(400);
    expect(invalidPayload.body.ok).toBe(false);
    expect(invalidPayload.body.error).toBe('invalid-payload');

    await authApi.logout();
  });
});
