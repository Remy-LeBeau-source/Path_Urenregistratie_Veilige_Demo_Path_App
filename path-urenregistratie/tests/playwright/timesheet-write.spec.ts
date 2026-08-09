import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const CANDIDATE_PERIODS = Array.from({ length: 240 }, (_, index) => {
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

  throw new Error('No writable test period found in 240 candidate months.');
}

test.describe('timesheet write api', () => {
  test('[TS-API-H-001] employee save draft, read back, submit, audit en gesloten status guard', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    await test.step('Given de medewerker is ingelogd', async () => {
      const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(login.user.role).toBe('employee');
    });

    const period = await test.step('When een herhaalbare schrijfbare testperiode is geselecteerd', async () => findWritablePeriod(timesheetApi));

    await test.step('Then save_draft werkt en zet status op draft', async () => {
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
      expect(Number(draftWrite.body.timesheet.version)).toBeGreaterThan(0);
      expect(draftWrite.body.audit_event).toBe('timesheet.draft_saved');
    });

    await test.step('Then read back van draft bevat dagregels en auditdata', async () => {
      const readBackDraft = await timesheetApi.read(period);
      expect(readBackDraft.status).toBe(200);
      expect(readBackDraft.body.ok).toBe(true);
      expect(readBackDraft.body.found).toBe(true);
      expect(readBackDraft.body.timesheet.status).toBe('draft');
      expect(Array.isArray(readBackDraft.body.timesheet.day_entries)).toBe(true);
      expect(readBackDraft.body.timesheet.day_entries).toHaveLength(2);
      expect(Array.isArray(readBackDraft.body.timesheet.correction_history)).toBe(true);
      expect(readBackDraft.body.last_audit.event_type).toBe('timesheet.draft_saved');
    });

    await test.step('When submit wordt uitgevoerd met expected_version', async () => {
      const beforeSubmit = await timesheetApi.read(period);
      const currentVersion = Number(beforeSubmit.body?.timesheet?.version || 0);

      const submitWrite = await timesheetApi.write({
        action: 'submit',
        period,
        expectedVersion: currentVersion,
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
      expect(Number(submitWrite.body.timesheet.version)).toBeGreaterThan(currentVersion);
      expect(submitWrite.body.audit_event).toBe('timesheet.submitted');

      const readBackSubmitted = await timesheetApi.read(period);
      expect(readBackSubmitted.status).toBe(200);
      expect(readBackSubmitted.body.ok).toBe(true);
      expect(readBackSubmitted.body.found).toBe(true);
      expect(readBackSubmitted.body.timesheet.status).toBe('submitted');
      expect(readBackSubmitted.body.last_audit.event_type).toBe('timesheet.submitted');
    });

    await test.step('Then een gesloten status kan niet opnieuw als draft worden opgeslagen', async () => {
      const submitted = await timesheetApi.read(period);
      const submittedVersion = Number(submitted.body?.timesheet?.version || 0);

      const lockedWrite = await timesheetApi.write({
        action: 'save_draft',
        period,
        expectedVersion: submittedVersion,
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

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[TS-API-N-010] employee mag geen andere medewerker schrijven', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    await test.step('Given een ingelogde medewerker', async () => {
      const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(login.user.role).toBe('employee');
    });

    await test.step('When de medewerker een andere employee_id probeert te schrijven', async () => {
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
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[TS-API-N-011] write zonder csrf geeft 403', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    await test.step('Given een ingelogde medewerker', async () => {
      const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(login.user.role).toBe('employee');
    });

    await test.step('When de write zonder CSRF-token wordt verstuurd', async () => {
      const noCsrf = await timesheetApi.writeWithoutCsrf({
        action: 'save_draft',
        period: '2099-10',
        contractualHours: 160,
        billableHours: 8,
        dayEntries: buildDayEntries('2099-10', 4, 4),
      });

      expect(noCsrf.status).toBe(403);
      expect(noCsrf.body.ok).toBe(false);
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[TS-API-N-003] write zonder sessie geeft 401', async ({ request }) => {
    const timesheetApi = new TimesheetApi(request);

    await test.step('Given er is geen actieve sessie', async () => {
      // Deze helper gebruikt een geïsoleerde request-context zonder login.
    });

    await test.step('When een write zonder sessie wordt verstuurd', async () => {
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
  });

  test('[TS-API-N-004] ongeldige payload geeft 400', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    await test.step('Given een ingelogde medewerker', async () => {
      const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(login.user.role).toBe('employee');
    });

    await test.step('When de medewerker een ongeldige payload verstuurt', async () => {
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
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });
});

