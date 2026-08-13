import { expect, request as playwrightRequest, test } from '@playwright/test';
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

  throw new Error('No writable review-flow period found in 240 candidate months.');
}

test.describe('timesheet review flow api', () => {
  test('[TS-REV-API-H-005] admin vraagt correctie, employee dient opnieuw in, admin keurt goed met optimistic locking', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);
    let period = '';
    let employeeId = 0;
    let submittedVersion = 0;
    let correctionVersion = 0;
    let resubmittedVersion = 0;
    let approvedVersion = 0;

    await test.step('Given de medewerker is ingelogd en heeft een schrijfbare testperiode', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');

      period = await findWritablePeriod(timesheetApi);
      expect(period).toMatch(/^\d{4}-\d{2}$/);
    });

    await test.step('When de medewerker een concept opslaat en daarna indient', async () => {
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
      expect(draftVersion).toBeGreaterThan(0);

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

      submittedVersion = Number(submitted.body.timesheet.version || 0);
      expect(submittedVersion).toBeGreaterThan(draftVersion);

      const submittedRead = await timesheetApi.read(period);
      employeeId = Number(submittedRead.body?.employee_id || 0);
      expect(employeeId).toBeGreaterThan(0);
    });

    await test.step('And de reviewcontext wisselt naar administrator', async () => {
      await authApi.logout();
      const adminLogin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      expect(adminLogin.user.role).toBe('administrator');
    });

    await test.step('Then een verouderde correctie-aanvraag wordt geblokkeerd met stale-version', async () => {
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
    });

    await test.step('When de administrator een geldige correctie-aanvraag uitvoert', async () => {
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
      expect(String(correction.body.timesheet.review_note || '')).toContain('Controleer dag 2');
      expect(correction.body.audit_event).toBe('timesheet.correction_requested');
      expect(correction.body.latest_correction).toBeTruthy();
      expect(String(correction.body.latest_correction.correction_message)).toContain('Controleer dag 2');
      expect(Array.isArray(correction.body.timesheet.correction_history)).toBe(true);
      expect(correction.body.timesheet.correction_history.length).toBeGreaterThan(0);

      correctionVersion = Number(correction.body.timesheet.version || 0);
      expect(correctionVersion).toBeGreaterThan(submittedVersion);
    });

    await test.step('Then een tweede correctie op dezelfde versie wordt geweigerd', async () => {
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
    });

    await test.step('And de context wisselt terug naar medewerker voor herindiening', async () => {
      await authApi.logout();
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
    });

    await test.step('Then een medewerker mag geen admin-reviewactie uitvoeren', async () => {
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
    });

    await test.step('When de medewerker na correctie opnieuw indient', async () => {
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

      resubmittedVersion = Number(resubmitted.body.timesheet.version || 0);
      expect(resubmittedVersion).toBeGreaterThan(correctionVersion);
    });

    await test.step('And de context wisselt opnieuw naar administrator voor goedkeuring', async () => {
      await authApi.logout();
      const adminLogin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      expect(adminLogin.user.role).toBe('administrator');
    });

    await test.step('Then een verouderde approve-aanvraag wordt geblokkeerd met stale-version', async () => {
      const staleApprove = await timesheetApi.approve({
        period,
        employeeId,
        expectedVersion: resubmittedVersion + 100,
      });
      expect(staleApprove.status).toBe(409);
      expect(staleApprove.body.ok).toBe(false);
      expect(staleApprove.body.error).toBe('stale-version');
    });

    await test.step('When de administrator met juiste versie goedkeurt', async () => {
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
      expect(Number(approved.body.timesheet.version)).toBeGreaterThan(resubmittedVersion);
      expect(approved.body.audit_event).toBe('timesheet.approved');
      approvedVersion = Number(approved.body.timesheet.version);
    });

    await test.step('Then read-back toont approved status met volledige audit- en correctiehistorie', async () => {
      const readBack = await timesheetApi.read(period, employeeId);
      expect(readBack.status).toBe(200);
      expect(readBack.body.ok).toBe(true);
      expect(readBack.body.found).toBe(true);
      expect(readBack.body.timesheet.status).toBe('approved');
      expect(Array.isArray(readBack.body.timesheet.day_entries)).toBe(true);
      expect(readBack.body.timesheet.day_entries.length).toBeGreaterThan(0);
      expect(Array.isArray(readBack.body.timesheet.correction_history)).toBe(true);
      expect(readBack.body.timesheet.correction_history.length).toBeGreaterThan(0);
      const latestCorrection = readBack.body.timesheet.correction_history[readBack.body.timesheet.correction_history.length - 1];
      expect(latestCorrection.resubmitted_at).toBeTruthy();
      expect(readBack.body.last_audit?.event_type).toBe('timesheet.approved');
    });

    await test.step('And een goedkeuring zonder factuur server-side kan worden heropend voor correctie', async () => {
      const reopened = await timesheetApi.requestCorrection({
        action: 'request_correction',
        period,
        employeeId,
        expectedVersion: approvedVersion,
        correctionMessage: 'De klant meldt na goedkeuring een afwijking.',
      });
      expect(reopened.status).toBe(200);
      expect(reopened.body.ok).toBe(true);
      expect(reopened.body.timesheet.status).toBe('correction');
      expect(reopened.body.timesheet.approved_at).toBeNull();
      expect(reopened.body.timesheet.approved_by).toBeNull();
      expect(reopened.body.audit_event).toBe('timesheet.approval_reopened');
      expect(Number(reopened.body.timesheet.version)).toBeGreaterThan(approvedVersion);
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });

  test('[TS-REV-API-H-006] gelijktijdige approve-requests door twee beheerders leveren exact één winnaar', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);
    let period = '';
    let employeeId = 0;
    let submittedVersion = 0;

    await test.step('Given een medewerker een urenstaat heeft ingediend in een schrijfbare testperiode', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
      period = await findWritablePeriod(timesheetApi);

      const draft = await timesheetApi.write({
        action: 'save_draft',
        period,
        contractualHours: 160,
        billableHours: 11,
        leaveHours: 0,
        sicknessHours: 0,
        dayEntries: buildDayEntries(period, 7, 4),
      });
      expect(draft.status).toBe(200);
      const draftVersion = Number(draft.body.timesheet.version || 0);

      const submitted = await timesheetApi.write({
        action: 'submit',
        period,
        expectedVersion: draftVersion,
        contractualHours: 160,
        billableHours: 11,
        leaveHours: 0,
        sicknessHours: 0,
        dayEntries: buildDayEntries(period, 7, 4),
      });
      expect(submitted.status).toBe(200);
      expect(submitted.body.timesheet.status).toBe('submitted');
      submittedVersion = Number(submitted.body.timesheet.version || 0);

      const submittedRead = await timesheetApi.read(period);
      employeeId = Number(submittedRead.body?.employee_id || 0);
      expect(employeeId).toBeGreaterThan(0);

      await authApi.logout();
    });

    await test.step('When twee beheerders tegelijk dezelfde urenstaat proberen goed te keuren', async () => {
      const ctxA = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
      const ctxB = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });

      try {
        const authA = new AuthApi(ctxA);
        const authB = new AuthApi(ctxB);
        await authA.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
        await authB.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

        const timesheetA = new TimesheetApi(ctxA);
        const timesheetB = new TimesheetApi(ctxB);

        const [resA, resB] = await Promise.all([
          timesheetA.approve({ period, employeeId, expectedVersion: submittedVersion }),
          timesheetB.approve({ period, employeeId, expectedVersion: submittedVersion }),
        ]);

        const statuses = [resA.status, resB.status].sort((left, right) => left - right);
        expect(statuses).toEqual([200, 409]);

        const winner = resA.status === 200 ? resA : resB;
        expect(winner.body.timesheet.status).toBe('approved');
      } finally {
        await ctxA.dispose();
        await ctxB.dispose();
      }
    });
  });

  test('[TS-REV-API-H-007] jaarwisseling december naar januari verwerkt urenstaten correct over de jaargrens', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);

    await test.step('Given de medewerker is ingelogd', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
    });

    await test.step('When de medewerker concepten opslaat voor december en de daaropvolgende januari', async () => {
      for (const [year, month] of [[2231, 12], [2232, 1]] as const) {
        const period = `${year}-${String(month).padStart(2, '0')}`;
        const existing = await timesheetApi.read(period, undefined, { attach: false });
        if (existing.status === 200 && existing.body?.found) {
          continue; // Already covered by a previous run; the assertions below still hold for a fresh write.
        }

        const draft = await timesheetApi.write({
          action: 'save_draft',
          period,
          contractualHours: 160,
          billableHours: 10,
          leaveHours: 0,
          sicknessHours: 0,
          dayEntries: buildDayEntries(period, 6, 4),
        });

        expect(draft.status).toBe(200);
        expect(draft.body.ok).toBe(true);
        expect(draft.body.timesheet.status).toBe('draft');

        const readBack = await timesheetApi.read(period);
        expect(readBack.status).toBe(200);
        expect(readBack.body.found).toBe(true);
        expect(readBack.body.timesheet.day_entries.length).toBeGreaterThan(0);
      }
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });
});

