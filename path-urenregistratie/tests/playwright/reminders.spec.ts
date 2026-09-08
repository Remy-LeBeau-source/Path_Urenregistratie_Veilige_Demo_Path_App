import { expect, request as playwrightRequest, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AuthApi } from './api/AuthApi';
import { EmailQueueApi } from './api/EmailQueueApi';
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
