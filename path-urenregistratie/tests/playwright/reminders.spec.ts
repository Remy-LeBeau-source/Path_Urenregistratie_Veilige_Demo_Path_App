import { expect, request as playwrightRequest, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AuthApi } from './api/AuthApi';
import { EmailQueueApi } from './api/EmailQueueApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

const execFileAsync = promisify(execFile);

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
 * De server bepaalt due-momenten expliciet in Europe/Amsterdam
 * (send-due-reminders.php). De testrunner's systeemtijdzone verschilt per
 * omgeving (lokaal Windows toevallig Amsterdam, GitHub Actions-runners UTC)
 * -- `Date#getDay()`/`toTimeString()` gebruiken die systeemtijdzone en gaven
 * daardoor op CI een andere weekdag/tijd dan wat de server verwachtte.
 * Expliciet naar Europe/Amsterdam formatteren, ongeacht de runner-tijdzone.
 */
function amsterdamWeekdayAndTime(date: Date): { weekday: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return {
    weekday: String(lookup.weekday || '').toLowerCase(),
    time: `${lookup.hour}:${lookup.minute}`,
  };
}

/**
 * Kalenderdatum (YYYY-MM-DD) van $date zoals die in Europe/Amsterdam valt.
 */
function amsterdamDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/**
 * De zeven kalenderdata (YYYY-MM-DD) van de ISO-week (maandag t/m zondag)
 * waarin $date in Europe/Amsterdam valt.
 *
 * Bewust niet met Date#getUTCDay()/getUTCDate(): rond middernacht UTC is het
 * in de zomer al 01:00-02:00 in Amsterdam, dus een UTC-gebaseerde weekgrens
 * kan een andere week aanwijzen dan de server (die altijd expliciet
 * Europe/Amsterdam gebruikt, zie send-due-reminders.php). Ankeren op 12:00
 * UTC van de Amsterdamse kalenderdag voorkomt dat dagrekenen zelf weer over
 * een DST-grens heen springt.
 */
const isoWeekdayByShortName: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function amsterdamWeekDates(date: Date): string[] {
  const todayKey = amsterdamDateKey(date);
  const shortName = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Amsterdam', weekday: 'short' }).format(date);
  const isoWeekday = isoWeekdayByShortName[shortName] ?? 1;
  const anchor = new Date(`${todayKey}T12:00:00Z`);
  const monday = new Date(anchor);
  monday.setUTCDate(anchor.getUTCDate() - (isoWeekday - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/**
 * De hele suite deelt één demodatabase; eerdere cases in dezelfde shard
 * kunnen toevallig alle actieve medewerkers al uren voor de huidige week
 * hebben laten invullen. Dat is geen regressie van de reminder-scheduler
 * zelf -- checkt daarom onafhankelijk (los van send-due-reminders.php) of er
 * nog minstens één medewerker met hour_reminders zonder uren deze week over
 * is, zodat het scenario zichzelf skipt i.p.v. vals-rood te gaan wanneer dat
 * toevallig niet zo is.
 */
async function hasEmployeeWithoutHoursThisWeek(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>, now: Date): Promise<boolean> {
  const timesheetApi = new TimesheetApi(ctx);
  const bootstrap = await (await ctx.get('/server/api/bootstrap.php')).json();
  const employees = (bootstrap.employees as Array<Record<string, unknown>>).filter(employee => Number(employee.active) === 1);
  const periodKey = amsterdamDateKey(now).slice(0, 7);
  const weekDates = amsterdamWeekDates(now);

  for (const employee of employees) {
    const result = await timesheetApi.read(periodKey, Number(employee.id), { attach: false });
    const entries = (result.body?.timesheet?.day_entries as Array<{ work_date: string; hours: number }> | undefined) ?? [];
    const hasHoursThisWeek = entries.some(entry => weekDates.includes(entry.work_date) && Number(entry.hours) > 0);
    if (!hasHoursThisWeek) return true;
  }
  return false;
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
    customerTimesheetSubmissionSubject: company.customer_timesheet_submission_subject ?? '',
    customerTimesheetSubmissionBody: company.customer_timesheet_submission_body ?? '',
    customerTimesheetBrokerSubject: company.customer_timesheet_broker_subject ?? '',
    customerTimesheetBrokerBody: company.customer_timesheet_broker_body ?? '',
    leaveSickEntryEnabled: Number(company.leave_sick_entry_enabled) === 1,
  };
}

test.describe('serverplanning herinneringen', () => {
  test('[REM-H-001] wekelijkse herinnering verstuurt eenmalig een reminder-mail aan medewerkers zonder uren deze week', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    const queueApi = new EmailQueueApi(ctx);

    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const now = new Date();
    const nowIso = now.toISOString();
    const { weekday: amsterdamWeekday, time: amsterdamTime } = amsterdamWeekdayAndTime(now);

    test.skip(!(await hasEmployeeWithoutHoursThisWeek(ctx, now)), 'Alle actieve medewerkers hebben deze week al uren staan door eerdere cases in dezelfde gedeelde demodatabase; dit scenario valt nu niet te bewijzen.');

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
            weeklyReminderDay: amsterdamWeekday,
            weeklyReminderTime: amsterdamTime,
          },
        },
      });
      expect(response.status()).toBe(200);
    });

    let firstRun!: ReminderRunResult;
    await test.step('When de scheduler voor het eerst draait', async () => {
      firstRun = await runReminders(nowIso);
      expect(firstRun.ok).toBe(true);
    });

    await test.step('Then staat er minstens één reminder-mail in de queue voor de medewerker', async () => {
      expect(firstRun.sent.weekly).toBeGreaterThan(0);
      const list = await queueApi.list();
      const reminders = (list.body.items as Array<Record<string, unknown>>)
        .filter(item => String(item.channel || '') === 'reminder');
      expect(reminders.length).toBeGreaterThan(0);
      expect(reminders[0].status).toBe('queued');
      expect(String(reminders[0].subject_snapshot || '')).toMatch(/uren/i);
    });

    await test.step('And een tweede run binnen dezelfde week verstuurt niets extra (idempotent)', async () => {
      const secondRun = await runReminders(nowIso);
      expect(secondRun.ok).toBe(true);
      expect(secondRun.sent.weekly).toBe(0);
    });

    await test.step('And cleanup', async () => {
      await authApi.logout();
      await ctx.dispose();
    });
  });
});
