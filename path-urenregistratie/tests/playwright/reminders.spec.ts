import { expect, request as playwrightRequest, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import mysql from 'mysql2/promise';
import { AuthApi } from './api/AuthApi';
import { EmailQueueApi } from './api/EmailQueueApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const execFileAsync = promisify(execFile);

// Zelfde databasetoegang als database-integrity.spec.ts: puur voor het
// aflezen van reminder_log na de gedeelde testreset.
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

async function withDb<T>(fn: (conn: mysql.Connection) => Promise<T>): Promise<T> {
  const cfg = dbConfig();
  expect(cfg.database.toLowerCase().endsWith('_test'), `databasenaam moet op _test eindigen, is "${cfg.database}"`).toBe(true);
  const conn = await mysql.createConnection(cfg);
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

type ReminderRunResult = { ok: boolean; now: string; sent: Record<string, number> };

async function runReminders(nowIso: string): Promise<ReminderRunResult> {
  const uitvoer = await execFileAsync('php', ['server/scripts/send-due-reminders.php', `--now=${nowIso}`], {
    cwd: process.cwd(),
    windowsHide: true,
  });
  return JSON.parse(uitvoer.stdout) as ReminderRunResult;
}

const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * send-due-reminders.php interpreteert --now altijd expliciet in
 * Europe/Amsterdam (server/scripts/send-due-reminders.php regel ~294). Op
 * de eigen machine (al in die tijdzone) valt Date#toTimeString()/getDay()
 * daarmee toevallig samen, maar op een CI-runner in UTC scheelt dat het
 * volledige DST-verschil (2 uur in de zomer) — de scheduler ziet dan nooit
 * "nu" als het geconfigureerde moment. Bereken dag en tijd daarom altijd
 * expliciet in Europe/Amsterdam, ongeacht de tijdzone van de testmachine.
 */
function amsterdamWeekdayAndTime(moment: Date): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(moment);
  const lookup = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return {
    day: lookup('weekday').toLowerCase(),
    time: `${lookup('hour')}:${lookup('minute')}`,
  };
}

/**
 * settings.php slaat altijd het complete settings-object op (zo werkt ook de
 * echte instellingenpagina, die nooit een gedeeltelijk formulier stuurt). Om
 * andere bedrijfsvelden niet stil terug te zetten naar hun standaardwaarde,
 * lezen we eerst de actuele company-rij via bootstrap.php en zetten die om
 * naar dezelfde camelCase-velden die settings.php terugverwacht.
 */
async function currentSettingsPayload(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>): Promise<Record<string, unknown>> {
  const response = await ctx.get('/server/api/bootstrap.php');
  const body = await response.json();
  const company = (body.companies as Array<Record<string, unknown>>)[0];
  return {
    organizationName: company.trade_name,
    invoiceNameDisplay: company.invoice_name_display,
    appName: company.app_name,
    supportName: company.support_name ?? '',
    supportEmail: company.support_email ?? '',
    website: company.website ?? '',
    tagline: company.tagline ?? '',
    brandPrimary: company.brand_primary,
    brandAccent: company.brand_accent,
    companyName: company.legal_name,
    kvk: company.chamber_of_commerce_number,
    vat: company.vat_number ?? '',
    iban: company.iban ?? '',
    address: company.address_line ?? '',
    postalCity: [company.postal_code, company.city].filter(Boolean).join(' '),
    phone: company.invoice_phone ?? '',
    invoiceEmail: company.invoice_email ?? '',
    paymentTerm: company.payment_term_days,
    customerTimesheetReminderEnabled: Number(company.customer_timesheet_reminder_enabled) === 1,
    customerTimesheetReminderTime: String(company.customer_timesheet_reminder_time || '15:00:00').slice(0, 5),
    customerTimesheetOverdueWorkdays: company.customer_timesheet_overdue_workdays,
    weeklyReminderEnabled: Number(company.weekly_reminder_enabled) === 1,
    weeklyReminderDay: weekdayNames[Number(company.weekly_reminder_day) % 7] ?? 'friday',
    weeklyReminderTime: String(company.weekly_reminder_time || '14:00:00').slice(0, 5),
    monthEndReminderEnabled: Number(company.month_end_reminder_enabled) === 1,
    monthEndReminderTime: String(company.month_end_reminder_time || '15:00:00').slice(0, 5),
    overdueReminderEnabled: Number(company.overdue_reminder_enabled) === 1,
    overdueReminderTime: String(company.overdue_reminder_time || '09:00:00').slice(0, 5),
    approvalReminderEnabled: Number(company.approval_reminder_enabled) === 1,
    approvalReminderTime: String(company.approval_reminder_time || '10:00:00').slice(0, 5),
    mailSignature: company.mail_signature ?? 'Robot Path IT',
    customerTimesheetSubmissionSubject: company.customer_timesheet_submission_subject ?? '',
    customerTimesheetSubmissionBody: company.customer_timesheet_submission_body ?? '',
    customerTimesheetBrokerSubject: company.customer_timesheet_broker_subject ?? '',
    customerTimesheetBrokerBody: company.customer_timesheet_broker_body ?? '',
    leaveSickEntryEnabled: Number(company.leave_sick_entry_enabled) === 1,
  };
}

/**
 * De hele suite deelt één demodatabase; eerdere cases in dezelfde shard
 * (bv. timesheet-writeflow- of pilot-cases) kunnen toevallig alle actieve
 * medewerkers al uren voor de huidige week hebben laten invullen. Dat is
 * geen regressie van de reminder-scheduler zelf — checkt daarom onafhankelijk
 * (los van send-due-reminders.php) of er nog minstens één medewerker met
 * hour_reminders zonder uren deze week over is, zodat het scenario
 * zichzelf skipt i.p.v. vals-rood te gaan wanneer dat toevallig niet zo is.
 */
async function hasEmployeeWithoutHoursThisWeek(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>, now: Date): Promise<boolean> {
  const timesheetApi = new TimesheetApi(ctx);
  const bootstrap = await (await ctx.get('/server/api/bootstrap.php')).json();
  const employees = (bootstrap.employees as Array<Record<string, unknown>>).filter(employee => Number(employee.active) === 1);
  const periodKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);
  const weekStart = new Date(now);
  const isoDay = (now.getUTCDay() + 6) % 7;
  weekStart.setUTCDate(now.getUTCDate() - isoDay);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  for (const employee of employees) {
    const result = await timesheetApi.read(periodKey, Number(employee.id), { attach: false });
    const entries = (result.body?.timesheet?.day_entries as Array<{ work_date: string; hours: number }> | undefined) ?? [];
    const hasHoursThisWeek = entries.some(entry => weekDates.includes(entry.work_date) && Number(entry.hours) > 0);
    if (!hasHoursThisWeek) return true;
  }
  return false;
}

test.describe('serverplanning herinneringen', () => {
  test('[REM-H-001] wekelijkse herinnering verstuurt eenmalig een reminder-mail aan medewerkers zonder uren deze week', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    const queueApi = new EmailQueueApi(ctx);

    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const now = new Date();
    const nowIso = now.toISOString();
    const { day: nowDayAmsterdam, time: nowTimeAmsterdam } = amsterdamWeekdayAndTime(now);

    test.skip(!(await hasEmployeeWithoutHoursThisWeek(ctx, now)), 'Alle actieve medewerkers hebben deze week al uren staan door eerdere cases in dezelfde gedeelde demodatabase; dit scenario valt nu niet te bewijzen.');

    // De hele suite deelt één demodatabase; andere cases kunnen intussen alle
    // bestaande medewerkers al uren voor de huidige (echte) week hebben laten
    // invullen. In plaats van te gissen welke bestaande medewerker toevallig
    // nog niets heeft, maken we een eigen, verse medewerker aan die per
    // definitie nooit uren heeft gehad -- deterministisch, ongeacht wat
    // andere tests intussen aan de gedeelde data doen.
    const unique = Date.now().toString().slice(-8);
    const freshEmail = `rem-h-001-${unique}@example.invalid`;
    const csrfForEmployee = await ctx.get('/server/auth/csrf.php');
    const employeeToken = String(((await csrfForEmployee.json()) as { csrf_token?: string }).csrf_token ?? '');
    const createEmployee = await ctx.post('/server/api/staff.php', {
      headers: { 'X-CSRF-Token': employeeToken },
      data: {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: `REM-H-001 Medewerker ${unique}`,
          email: freshEmail,
          role: 'Tester',
          startDate: '2020-01-01',
          active: true,
          weeklyHours: 36,
          rate: 0,
        },
      },
    });
    expect(createEmployee.status()).toBe(200);
    const createdEmployeeBody = await createEmployee.json();
    expect(createdEmployeeBody.ok).toBe(true);
    const gebruikerId = Number(createdEmployeeBody.user_id || 0);
    const medewerkerId = Number(createdEmployeeBody.employee_id || 0);
    const instellingenVooraf = await currentSettingsPayload(ctx);

    // Opruimen, ook als een stap hieronder faalt. Eerder bleef de wegwerp-
    // medewerker actief staan en de wekelijkse herinnering op "nu" staan. Elke
    // latere beheerderslogin haalde voor die medewerker alle maanden op (vanaf
    // 2020), wat een volledige lokale run merkbaar trager maakte (TW-1, 19 sep).
    // startDate gaat mee: zonder valt de server terug op vandaag en weigert hij
    // het deactiveren met 409 (employment-start-hides-history).
    try {
    await test.step('Given de wekelijkse herinnering staat aan voor nu (vandaag, huidige tijd, Europe/Amsterdam)', async () => {
      const csrf = await ctx.get('/server/auth/csrf.php');
      const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
      const settings = await currentSettingsPayload(ctx);
      const response = await ctx.post('/server/api/settings.php', {
        headers: { 'X-CSRF-Token': token },
        data: {
          settings: {
            ...settings,
            weeklyReminderEnabled: true,
            weeklyReminderDay: nowDayAmsterdam,
            weeklyReminderTime: nowTimeAmsterdam,
          },
        },
      });
      expect(response.status()).toBe(200);
    });

    let firstRun!: ReminderRunResult;
    await test.step('When de scheduler voor het eerst draait', async () => {
      // Root cause van de vroegere CI-only flakiness (nooit lokaal
      // reproduceerbaar): de Playwright-harness stuurt de webserver via
      // PATH_APP_DB_NAME/PLAYWRIGHT_DB_NAME naar een geisoleerde testdatabase,
      // maar server/scripts/cli-bootstrap.php (waar deze scheduler op leunt)
      // las alleen het statische server/config.local.php en keek zo naar een
      // andere, grotendeels lege database dan de webserver die de medewerker
      // net had aangemaakt. Gefixt door ops_database_config() dezelfde env-
      // var-precedentie te geven als auth_db_from_config() in session.php.
      firstRun = await runReminders(nowIso);
      expect(firstRun.ok).toBe(true);
    });

    await test.step('Then staat er een reminder-mail in de queue voor de nieuwe medewerker', async () => {
      expect(firstRun.sent.weekly).toBeGreaterThan(0);
      // Zoek gericht: eerdere specs kunnen meer dan de standaardpagina van
      // tien deliveries hebben aangemaakt en items met gelijke timestamps
      // hebben geen gegarandeerde onderlinge volgorde.
      const list = await queueApi.list({ query: freshEmail, limit: 100 });
      const reminders = (list.body.items as Array<Record<string, unknown>>)
        .filter(item => String(item.channel || '') === 'reminder' && item.recipient_email === freshEmail);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].status).toBe('queued');
      expect(String(reminders[0].subject_snapshot || '')).toMatch(/uren/i);
    });

    await test.step('And een tweede run binnen dezelfde week verstuurt niets extra (idempotent)', async () => {
      const secondRun = await runReminders(nowIso);
      expect(secondRun.ok).toBe(true);
      expect(secondRun.sent.weekly).toBe(0);
    });

    } finally {
      const csrf = await ctx.get('/server/auth/csrf.php');
      const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
      const terug = await ctx.post('/server/api/settings.php', { headers: { 'X-CSRF-Token': token }, data: { settings: instellingenVooraf } }).catch(() => null);
      expect.soft(terug?.status(), 'opruimen: de oorspronkelijke herinneringsinstellingen horen terug te staan').toBe(200);
      if (gebruikerId > 0) {
        const opgeruimd = await ctx.post('/server/api/staff.php', {
          headers: { 'X-CSRF-Token': token },
          data: {
            action: 'upsert_employee',
            sendInvitation: false,
            employee: {
              name: `REM-H-001 Medewerker ${unique}`, email: freshEmail, role: 'Tester', startDate: '2020-01-01',
              dbEmployeeId: medewerkerId, dbUserId: gebruikerId, active: false, weeklyHours: 36, rate: 0,
            },
          },
        }).catch(() => null);
        expect.soft(opgeruimd?.status(), 'opruimen: de wegwerpmedewerker hoort gedeactiveerd te worden').toBe(200);
      }
      await authApi.logout().catch(() => null);
      await ctx.dispose();
    }
  });

  test('[REM-H-002] de gedeelde testreset maakt reminder_log echt leeg, zodat een eerder verstuurde herinnering daarna opnieuw kan', async () => {
    // Gemeld door herontwerp (19 sep): 2.0.132 voegde reminder_log toe aan de
    // TRUNCATE-lijst in server/lib/test-reset.php (de enige tabel met een
    // foreign key die de demoseed daarvoor niet leegmaakte), maar niets
    // bewaakte dat -- grep op reminder_log in tests/ gaf niets. Zonder die
    // regel blijft een eerder verstuurde herinnering geregistreerd staan terwijl
    // de gebruiker waarnaar hij verwijst opnieuw is aangemaakt met een ander id,
    // óf (bij een deterministisch hergebruikt id) blokkeert hij een latere,
    // legitieme verzending via de unieke sleutel (user_id, reminder_type, period_key).
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const now = new Date();
    const nowIso = now.toISOString();
    const { day: nowDayAmsterdam, time: nowTimeAmsterdam } = amsterdamWeekdayAndTime(now);
    const instellingenVooraf = await currentSettingsPayload(ctx);

    try {
      await test.step('Given de wekelijkse herinnering staat aan voor nu en is al eenmaal verstuurd (reminder_log heeft minstens één rij)', async () => {
        const csrf = await ctx.get('/server/auth/csrf.php');
        const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
        const settings = await currentSettingsPayload(ctx);
        const response = await ctx.post('/server/api/settings.php', {
          headers: { 'X-CSRF-Token': token },
          data: { settings: { ...settings, weeklyReminderEnabled: true, weeklyReminderDay: nowDayAmsterdam, weeklyReminderTime: nowTimeAmsterdam } },
        });
        expect(response.status()).toBe(200);

        const firstRun = await runReminders(nowIso);
        expect(firstRun.ok).toBe(true);

        const aantalVoorReset = await withDb(async conn => {
          const [rows] = await conn.query('SELECT COUNT(*) AS aantal FROM reminder_log');
          return Number((rows as Array<{ aantal: number }>)[0]?.aantal ?? 0);
        });
        expect(aantalVoorReset, 'vóór de reset hoort er minstens één reminder_log-rij te staan').toBeGreaterThan(0);
      });

      await test.step('When de gedeelde testreset draait', async () => {
        const csrf = await ctx.get('/server/auth/csrf.php');
        const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
        const resetResponse = await ctx.post('/server/api/test-reset.php', {
          headers: { 'X-CSRF-Token': token },
          data: { confirm: 'RESET_SHARED_TEST_BASELINE' },
        });
        const resetBody = await resetResponse.text();
        expect(resetResponse.ok(), `TEST-reset gaf HTTP ${resetResponse.status()}: ${resetBody}`).toBe(true);
      });

      await test.step('Then is reminder_log echt leeg', async () => {
        const aantalNaReset = await withDb(async conn => {
          const [rows] = await conn.query('SELECT COUNT(*) AS aantal FROM reminder_log');
          return Number((rows as Array<{ aantal: number }>)[0]?.aantal ?? 0);
        });
        expect(aantalNaReset, 'reminder_log hoort na de gedeelde testreset leeg te zijn').toBe(0);
      });

      await test.step('And kan dezelfde herinnering (opnieuw ingeschakeld na de reset) opnieuw echt verstuurd worden', async () => {
        const csrf = await ctx.get('/server/auth/csrf.php');
        const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
        const settingsNaReset = await currentSettingsPayload(ctx);
        const response = await ctx.post('/server/api/settings.php', {
          headers: { 'X-CSRF-Token': token },
          data: { settings: { ...settingsNaReset, weeklyReminderEnabled: true, weeklyReminderDay: nowDayAmsterdam, weeklyReminderTime: nowTimeAmsterdam } },
        });
        expect(response.status()).toBe(200);

        const runNaReset = await runReminders(nowIso);
        expect(runNaReset.ok).toBe(true);
        expect(runNaReset.sent.weekly, 'na een echt lege reminder_log hoort de herinnering opnieuw te versturen, niet stil overgeslagen te worden').toBeGreaterThan(0);
      });
    } finally {
      const csrf = await ctx.get('/server/auth/csrf.php');
      const token = String(((await csrf.json()) as { csrf_token?: string }).csrf_token ?? '');
      const terug = await ctx.post('/server/api/settings.php', { headers: { 'X-CSRF-Token': token }, data: { settings: instellingenVooraf } }).catch(() => null);
      expect.soft(terug?.status(), 'opruimen: de oorspronkelijke herinneringsinstellingen horen terug te staan').toBe(200);
      await authApi.logout().catch(() => null);
      await ctx.dispose();
    }
  });
});
