import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';
import mysql from 'mysql2/promise';
import { AuthApi } from './api/AuthApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

// Zelfde databasetoegang als database-integrity.spec.ts: puur om een telling te
// bevestigen die geen enkele API-respons blootlegt (aantal mailwachtrij-rijen
// per kanaal), nooit om schrijvend in te grijpen.
function dbConfig() {
  const database = String(
    process.env.PATH_APP_DB_NAME || process.env.PLAYWRIGHT_DB_NAME || process.env.DB_NAME || '',
  ).trim();
  return {
    host: process.env.PATH_APP_DB_HOST || process.env.PLAYWRIGHT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.PATH_APP_DB_PORT || process.env.PLAYWRIGHT_DB_PORT || process.env.DB_PORT || 3306),
    user: process.env.PATH_APP_DB_USER || process.env.PLAYWRIGHT_DB_USER || process.env.DB_USER || 'root',
    password: process.env.PATH_APP_DB_PASSWORD || process.env.PLAYWRIGHT_DB_PASSWORD || process.env.DB_PASSWORD || 'root',
    database,
  };
}

// Geschud op dezelfde (timesheet_id, timesheet_version)-sleutel als de echte
// idempotency-check in mail_enqueue_timesheet_final_approval zelf: een urenstaat
// die eerder is goedgekeurd, heropend en opnieuw ingediend deelt zijn
// timesheet_id met die eerdere goedkeuring (zelfde rij, hoger versienummer), dus
// een telling zonder de versie erbij zou een legitieme tweede, latere
// goedkeuringsmail ten onrechte als duplicaat lezen.
async function finalApprovalMailCount(timesheetId: number, timesheetVersion: number): Promise<number> {
  const conn = await mysql.createConnection(dbConfig());
  try {
    const [rows] = await conn.query(
      "SELECT COUNT(*) AS aantal FROM email_deliveries WHERE timesheet_id = ? AND timesheet_version = ? AND channel = 'timesheet_final_approval'",
      [timesheetId, timesheetVersion]
    );
    return Number((rows as Array<{ aantal: number }>)[0]?.aantal ?? 0);
  } finally {
    await conn.end();
  }
}

const CANDIDATE_PERIODS = Array.from({ length: 240 }, (_, index) => {
  const year = 2110 + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
});

function firstWeekdayDatesInPeriod(period: string, count: number): string[] {
  const [year, month] = period.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth && dates.length < count; day += 1) {
    const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = zondag, 6 = zaterdag
    if (dow !== 0 && dow !== 6) {
      dates.push(`${period}-${String(day).padStart(2, '0')}`);
    }
  }
  if (dates.length < count) {
    throw new Error(`Niet genoeg werkdagen gevonden in periode ${period}.`);
  }
  return dates;
}

function buildDayEntries(period: string, first: number, second: number) {
  // De server accepteert sinds de weekendvalidatie (TS-REV-API-N-001) geen
  // zaterdag/zondag meer als work_date, dus de testdata moet altijd op
  // werkdagen binnen de periode vallen i.p.v. de vaste 1e/2e van de maand.
  const [firstDate, secondDate] = firstWeekdayDatesInPeriod(period, 2);
  return [
    { workDate: firstDate, hours: first, description: 'Reviewflow dag 1' },
    { workDate: secondDate, hours: second, description: 'Reviewflow dag 2' },
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

function firstWeekendDateInPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = zondag, 6 = zaterdag
    if (dow === 0 || dow === 6) {
      return `${period}-${String(day).padStart(2, '0')}`;
    }
  }
  throw new Error(`Geen weekenddag gevonden in periode ${period}.`);
}

test.describe('timesheet review flow api', () => {
  async function correctieMeldingenVoorPeriode(request: APIRequestContext, period: string) {
    const res = await request.get('/server/api/notifications.php?limit=50');
    const body = await res.json();
    const items = (body.items ?? []) as Array<{ notification_type: string; period_key: string | null; read_at: string | null; message: string }>;
    return items.filter((item) => item.notification_type === 'correction_required' && item.period_key === period);
  }

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

    await test.step('Then een correctie-aanvraag zonder toelichting wordt door de server geweigerd (sectie 20: UI-verbergen is geen autorisatie)', async () => {
      // De klantinterface schakelt "Terugsturen" pas in zodra het tekstveld
      // niet leeg is (showCorrectionEditor in app.js), maar dat is puur
      // gemak -- een directe API-aanroep mag een lege toelichting niet
      // stilzwijgend accepteren. Bewijst timesheet_correction_message()
      // in server/api/timesheets.php onafhankelijk van de client.
      const zonderToelichting = await timesheetApi.requestCorrection({
        action: 'request_correction',
        period,
        employeeId,
        expectedVersion: submittedVersion,
        correctionMessage: '',
      });
      expect(zonderToelichting.status).toBe(400);
      expect(zonderToelichting.body.ok).toBe(false);
      expect(zonderToelichting.body.error).toBe('invalid-payload');
      expect(String(zonderToelichting.body.message || '')).toContain('Correctiebericht is verplicht');

      const nogSteedsSubmitted = await timesheetApi.read(period, employeeId);
      expect(nogSteedsSubmitted.body.timesheet.status).toBe('submitted');
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

    await test.step('Then heeft de medewerker een echte, ongelezen "Correctie gevraagd"-melding voor deze periode', async () => {
      // Vóór deze fix ontstond hier geen enkele meldingsregel: alleen de demoseed kende
      // "Correctie gevraagd", de echte actie liet de medewerker dit nergens zien (bel of
      // Berichten bleven leeg). Gevonden door Gio (16 sep) via een verouderde seed-melding
      // die naar een allang vergrendelde maand wees, omdat er nooit een mechanisme bestond
      // om zo'n melding aan te maken of op te ruimen.
      const meldingen = await correctieMeldingenVoorPeriode(request, period);
      expect(meldingen.length, `precies één ongelezen correctiemelding voor ${period}`).toBe(1);
      expect(meldingen[0].read_at).toBeNull();
      expect(meldingen[0].message).toContain('Controleer dag 2');
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

    await test.step('Then is de "Correctie gevraagd"-melding opgeruimd: de medewerker heeft er al iets aan gedaan', async () => {
      // Nog steeds in de sessie van de medewerker (die zojuist opnieuw indiende), dus dit
      // is precies het perspectief waarin de melding eerder voor altijd ongelezen bleef.
      const meldingen = await correctieMeldingenVoorPeriode(request, period);
      expect(meldingen.every((item) => item.read_at !== null), 'geen enkele correctiemelding voor deze periode staat nog ongelezen').toBe(true);
    });

    await test.step('And de context wisselt opnieuw naar administrator voor goedkeuring', async () => {
      await authApi.logout();
      const adminLogin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      expect(adminLogin.user.role).toBe('administrator');
    });

    let reviewTimesheetId = 0;

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

    await test.step('And heeft de geweigerde poging geen goedkeuringsmail in de wachtrij gezet', async () => {
      // Sluit de open GIO-WENSEN-vraag af: mail_enqueue_timesheet_final_approval
      // is een SELECT-dan-INSERT zonder eigen databaseslot, dus in theorie een
      // race als hij ooit buiten de versievergrendeling om bereikbaar zou zijn.
      // Er is precies één aanroeper in de hele server (timesheets.php, na de
      // versiegeslote UPDATE) -- deze stap bewijst dat de geweigerde, verouderde
      // poging hierboven de mailfunctie nooit bereikte: nul rijen in de
      // wachtrij voor dit kanaal, ook al gaf de server al 409 terug.
      // Geteld op de versie die de echte goedkeuring hieronder zal opleveren
      // (huidige versie + 1, want de UPDATE zet version = version + 1): een
      // eerdere, andere goedkeuringscyclus van dezelfde urenstaat (heropend en
      // opnieuw ingediend) deelt de timesheet_id maar niet dit versienummer, en
      // moet dus niet als vals-positief meetellen.
      const readAfterStale = await timesheetApi.read(period, employeeId);
      reviewTimesheetId = Number(readAfterStale.body.timesheet.id || 0);
      expect(reviewTimesheetId).toBeGreaterThan(0);
      expect(await finalApprovalMailCount(reviewTimesheetId, resubmittedVersion + 1)).toBe(0);
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

    await test.step('And staat er nu precies één goedkeuringsmail in de wachtrij voor déze goedkeuringsversie', async () => {
      expect(await finalApprovalMailCount(reviewTimesheetId, approvedVersion)).toBe(1);
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

    await test.step('Then krijgt de medewerker ook bij een heropening ná goedkeuring een nieuwe, ongelezen melding', async () => {
      // Een heropening na goedkeuring (approval_reopened) is voor de medewerker dezelfde
      // vraag als een gewone correctie: controleer dit en dien opnieuw in. Geen aparte
      // uitzondering dus in de fix.
      await authApi.logout();
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');
      const meldingen = await correctieMeldingenVoorPeriode(request, period);
      const ongelezen = meldingen.filter((item) => item.read_at === null);
      expect(ongelezen.length, 'precies één nieuwe ongelezen correctiemelding na de heropening').toBe(1);
      expect(ongelezen[0].message).toContain('afwijking');
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

        // Sluit de open GIO-WENSEN-vraag af onder échte gelijktijdigheid (niet
        // alleen na elkaar zoals TS-REV-API-H-005): mail_enqueue_timesheet_final_approval
        // is zelf een SELECT-dan-INSERT zonder eigen databaseslot, maar de enige
        // aanroeper in de server ligt achter de versiegesloten UPDATE hierboven.
        // Twee tegelijk verstuurde verzoeken met dezelfde expected_version mogen
        // dus nooit allebei een goedkeuringsmail voor deze exacte, net ontstane
        // versie in de wachtrij zetten. Geteld op (timesheet_id, versie) samen,
        // niet op timesheet_id alleen: de eerste gekozen periode in een lokale
        // volledige suite kan al een eerdere, legitieme goedkeuringscyclus van
        // een vorige case hebben gehad, met een eigen, andere versie.
        const timesheetId = Number(winner.body.timesheet.id || 0);
        const winnerVersion = Number(winner.body.timesheet.version || 0);
        expect(timesheetId).toBeGreaterThan(0);
        expect(winnerVersion).toBeGreaterThan(0);
        expect(await finalApprovalMailCount(timesheetId, winnerVersion)).toBe(1);
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

  test('[TS-REV-API-N-002] elke verboden statusovergang wordt geweigerd en laat de urenstaat ongemoeid', async ({ request }) => {
    // Toestandsovergangstest: de urenstaat kent draft, submitted, approved en correction.
    // De toegestane overgangen zijn getest in TS-REV-API-H-005; deze case dekt de andere
    // kant van de tabel af, de overgangen die niet mogen. De server bewaakt ze los van het
    // scherm, want een slot dat alleen in de browser zit is geen slot. Zonder deze case
    // zou een later versoepelde bewaking pas in productie opvallen.
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);
    let period = '';
    let employeeId = 0;
    let versie = 0;

    const stand = async () => {
      const gelezen = await timesheetApi.read(period, employeeId || undefined);
      expect(gelezen.status).toBe(200);
      return { status: String(gelezen.body?.timesheet?.status || ''), versie: Number(gelezen.body?.timesheet?.version || 0) };
    };

    await test.step('Given een concept van een medewerker in een eigen periode', async () => {
      const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(login.user.role).toBe('employee');
      period = await findWritablePeriod(timesheetApi);
      const concept = await timesheetApi.write({
        action: 'save_draft', period,
        contractualHours: 160, billableHours: 12, leaveHours: 0, sicknessHours: 0,
        dayEntries: buildDayEntries(period, 8, 4),
      });
      expect(concept.status).toBe(200);
      expect(concept.body.timesheet.status).toBe('draft');
      versie = Number(concept.body.timesheet.version || 0);
      const gelezen = await timesheetApi.read(period);
      employeeId = Number(gelezen.body?.employee_id || 0);
      expect(employeeId).toBeGreaterThan(0);
    });

    await test.step('When de beheerder een concept probeert goed te keuren of te laten corrigeren, then weigert de server beide', async () => {
      await authApi.logout();
      const adminLogin = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      expect(adminLogin.user.role).toBe('administrator');

      for (const [label, actie] of [['goedkeuren', 'approve'], ['correctie vragen', 'request_correction']] as const) {
        const res = await timesheetApi.write({
          action: actie, period, employeeId, expectedVersion: versie,
          contractualHours: 160, billableHours: 12, leaveHours: 0, sicknessHours: 0,
          dayEntries: buildDayEntries(period, 8, 4),
          correctionMessage: actie === 'request_correction' ? 'Mag niet vanuit concept' : undefined,
        });
        expect(res.status, `${label} vanuit concept: status`).toBe(409);
        expect(res.body.error, `${label} vanuit concept: error`).toBe('invalid-timesheet-transition');
      }
      const na = await stand();
      expect(na, 'een geweigerde overgang mag niets veranderen').toEqual({ status: 'draft', versie });
    });

    await test.step('And blijft goedkeuren geweigerd zodra de maand al is goedgekeurd', async () => {
      await authApi.logout();
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      const ingediend = await timesheetApi.write({
        action: 'submit', period, expectedVersion: versie,
        contractualHours: 160, billableHours: 12, leaveHours: 0, sicknessHours: 0,
        dayEntries: buildDayEntries(period, 8, 4),
      });
      expect(ingediend.status).toBe(200);
      expect(ingediend.body.timesheet.status).toBe('submitted');

      await authApi.logout();
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const goedgekeurd = await timesheetApi.write({ action: 'approve', period, employeeId, expectedVersion: Number(ingediend.body.timesheet.version || 0), contractualHours: 160, billableHours: 12, leaveHours: 0, sicknessHours: 0, dayEntries: buildDayEntries(period, 8, 4) });
      expect(goedgekeurd.status).toBe(200);
      expect(goedgekeurd.body.timesheet.status).toBe('approved');
      const naGoedkeuren = await stand();

      const nogmaals = await timesheetApi.write({ action: 'approve', period, employeeId, expectedVersion: naGoedkeuren.versie, contractualHours: 160, billableHours: 12, leaveHours: 0, sicknessHours: 0, dayEntries: buildDayEntries(period, 8, 4) });
      expect(nogmaals.status, 'twee keer goedkeuren').toBe(409);
      expect(nogmaals.body.error).toBe('invalid-timesheet-transition');
      expect(await stand(), 'een tweede goedkeuring mag niets veranderen').toEqual(naGoedkeuren);
    });

    await test.step('And mag de medewerker een goedgekeurde maand niet opnieuw indienen of als concept overschrijven', async () => {
      await authApi.logout();
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      const voor = await stand();

      for (const actie of ['submit', 'save_draft'] as const) {
        const res = await timesheetApi.write({
          action: actie, period, expectedVersion: voor.versie,
          contractualHours: 160, billableHours: 16, leaveHours: 0, sicknessHours: 0,
          dayEntries: buildDayEntries(period, 8, 8),
        });
        expect([403, 409], `${actie} op een goedgekeurde maand hoort geweigerd te worden (status ${res.status})`).toContain(res.status);
        expect(res.body.ok, `${actie}: ok-vlag`).toBe(false);
      }
      expect(await stand(), 'een goedgekeurde maand blijft ongemoeid').toEqual(voor);
      await authApi.logout();
    });
  });

  test('[TS-REV-API-N-001] server weigert een dagregel op zaterdag of zondag, ook als de aanroep de client omzeilt', async ({ request }) => {
    const authApi = new AuthApi(request);
    const timesheetApi = new TimesheetApi(request);
    let period = '';
    let weekendDate = '';

    await test.step('Given de medewerker is ingelogd en heeft een schrijfbare testperiode', async () => {
      const employeeLogin = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      expect(employeeLogin.user.role).toBe('employee');

      period = await findWritablePeriod(timesheetApi);
      expect(period).toMatch(/^\d{4}-\d{2}$/);
      weekendDate = firstWeekendDateInPeriod(period);
    });

    await test.step('When de medewerker rechtstreeks via de API een dagregel op een weekenddag probeert op te slaan', async () => {
      // De UI genereert het weekraster structureel zonder weekenddagen
      // (periodFromKey() in assets/app.js), dus dit pad kan een gebruiker
      // via het scherm niet bereiken -- de test omzeilt de client bewust
      // om de servervalidatie in timesheet_parse_day_entries() te bewijzen.
      const attempt = await timesheetApi.write({
        action: 'save_draft',
        period,
        contractualHours: 160,
        billableHours: 4,
        leaveHours: 0,
        sicknessHours: 0,
        dayEntries: [{ workDate: weekendDate, hours: 4, description: 'Weekend mag niet' }],
      });

      await test.step('Then wijst de server het verzoek af met een duidelijke foutmelding', async () => {
        expect(attempt.status).toBe(400);
        expect(attempt.body.ok).toBe(false);
        expect(attempt.body.error).toBe('invalid-payload');
        expect(attempt.body.message).toBe('Uren kunnen alleen op een werkdag (ma-vr) worden geboekt.');
      });
    });

    await test.step('And cleanup: sessie sluiten voor testisolatie', async () => {
      await authApi.logout();
    });
  });
});

