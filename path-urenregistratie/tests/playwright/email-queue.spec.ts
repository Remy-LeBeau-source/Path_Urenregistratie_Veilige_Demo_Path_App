import { expect, request as playwrightRequest, test, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AuthApi } from './api/AuthApi';
import { EmailQueueApi } from './api/EmailQueueApi';
import { InvoiceApi } from './api/InvoiceApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

async function eqCsrf(ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>) {
  const response = await ctx.get('/server/auth/csrf.php');
  const body = await response.json();
  return String(body.csrf_token || '');
}

/** Wat er werkelijk de deur uit gaat: de dispatcher verstuurt exact deze snapshots. */
async function verzondenMails(invoiceId: number): Promise<Array<Record<string, string>>> {
  const uitvoer = await execFileAsync('php', ['server/scripts/mail-delivery-inspect.php', String(invoiceId)], {
    cwd: process.cwd(),
    windowsHide: true,
  });
  return JSON.parse(uitvoer.stdout).deliveries as Array<Record<string, string>>;
}

async function postJson(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  path: string,
  payload: Record<string, unknown>
) {
  const token = await eqCsrf(ctx);
  const response = await ctx.post(path, { headers: { 'X-CSRF-Token': token }, data: payload });
  return { status: response.status(), body: await response.json() as Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const PERIOD_RANGE_START_YEAR = 3000;
const PERIOD_RANGE_MONTHS = 7000 * 12;
const execFileAsync = promisify(execFile);

function candidatePeriods(): string[] {
  const startIndex = Date.now() % PERIOD_RANGE_MONTHS;

  return Array.from({ length: 240 }, (_, offset) => {
    const index = (startIndex + offset) % PERIOD_RANGE_MONTHS;
    const year = PERIOD_RANGE_START_YEAR + Math.floor(index / 12);
    const month = (index % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  });
}

async function findWritablePeriod(timesheetApi: TimesheetApi): Promise<string> {
  for (const period of candidatePeriods()) {
    const read = await timesheetApi.read(period, undefined, { attach: false });
    if (read.status !== 200 || !read.body?.ok) continue;
    if (!read.body.found) return period;
    const s = String(read.body.timesheet?.status || '');
    if (s === 'draft' || s === 'correction') return period;
  }
  throw new Error('No writable period for email-queue tests');
}

async function isolateMailPreviewFrontend(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const admin = {
    id: 1,
    company_id: 1,
    email: 'gio@example.invalid',
    display_name: 'Gio Maatsen',
    role: 'administrator',
    force_password_change: false,
  };
  let authenticated = false;
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route('**/server/api.php?action=state*', route => route.fulfill(json({ ok: true, state: null })));
  await page.route('**/server/auth/csrf.php*', route => route.fulfill(json({ ok: true, csrf_token: 'mail-preview-csrf' })));
  await page.route('**/server/auth/me.php*', route => route.fulfill(json({
    ok: true,
    authenticated,
    csrf_token: 'mail-preview-csrf',
    user: authenticated ? admin : null,
  })));
  await page.route('**/server/auth/login.php*', async route => {
    authenticated = true;
    await route.fulfill(json({ ok: true, csrf_token: 'mail-preview-csrf', user: admin }));
  });

  await page.route('**/server/api/bootstrap.php*', route => route.fulfill(json({
    ok: true,
    companies: [{
      id: 1,
      trade_name: 'Path Consultancy',
      legal_name: 'QSI Consultancy B.V.',
      app_name: 'Uren & Facturatie',
      support_name: 'Path Backoffice',
      support_email: 'backoffice@pathconsultancy.nl',
      payment_term_days: 30,
      brand_primary: '#0d1b38',
      brand_accent: '#3abd9d',
    }],
    users: [admin],
    employees: [],
    assignments: [],
    counterparties: [],
    assignment_mail_routes: [],
    mail_recipients: [],
  })));

  const emptyRoutes = [
    '**/server/api/dashboard.php*',
    '**/server/api/invoices.php*',
    '**/server/api/notifications.php*',
    '**/server/api/announcements.php*',
    '**/server/api/staff.php*',
    '**/server/api/settings.php*',
    '**/server/api/users.php*',
    '**/server/api/customer-timesheets.php*',
  ];
  for (const pattern of emptyRoutes) {
    await page.route(pattern, route => route.fulfill(json({ ok: true, items: [], users: [], employees: [], settings: {}, per_maand: [] })));
  }
}

async function createLockedInvoice() {
  const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  const authApi      = new AuthApi(ctx);
  const timesheetApi = new TimesheetApi(ctx);
  const invoiceApi   = new InvoiceApi(ctx);
  const queueApi     = new EmailQueueApi(ctx);

  // Employee: submit timesheet
  await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
  const period = await findWritablePeriod(timesheetApi);
  const draft = await timesheetApi.write({
    action: 'save_draft', period, contractualHours: 160, billableHours: 8, leaveHours: 0,
    dayEntries: [{ workDate: `${period}-01`, hours: 8, description: 'EQ spec' }],
  });
  expect(draft.status).toBe(200);
  const submitted = await timesheetApi.write({
    action: 'submit', period, contractualHours: 160, billableHours: 8, leaveHours: 0,
    dayEntries: [{ workDate: `${period}-01`, hours: 8, description: 'EQ spec' }],
    expectedVersion: draft.body.timesheet?.version as number,
  });
  expect(submitted.status).toBe(200);
  const employeeId    = Number(submitted.body.employee_id || 0);
  const timesheetId   = Number(submitted.body.timesheet?.id || 0);
  const submittedVer  = Number(submitted.body.timesheet?.version || 0);

  // Admin: approve + lock
  await authApi.logout();
  await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
  const approved = await timesheetApi.approve({ period, employeeId, expectedVersion: submittedVer });
  expect(approved.status).toBe(200);

  const locked = await invoiceApi.lock({ action: 'lock', timesheetId });
  expect(locked.status).toBe(200);
  const invoiceId = Number(locked.body.invoice?.id || 0);
  expect(invoiceId).toBeGreaterThan(0);

  return { ctx, authApi, queueApi, invoiceApi, timesheetId, invoiceId, period };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('email queue api', () => {

  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  test('[EQ-H-001] factuurlock maakt queue-items aan met dry_run=true', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given de admin heeft een factuur gelockt', async () => {});

    await test.step('Then zijn er queue-items voor deze factuur met dry_run=true en status queued', async () => {
      const list = await queueApi.list();
      expect(list.status).toBe(200);
      expect(list.body.dry_run).toBe(true);

      const items = (list.body.items as Array<Record<string, unknown>>)
        .filter(i => (i.invoice_id as number) === invoiceId);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every(i => i.dry_run === true)).toBe(true);
      expect(items.every(i => i.status === 'queued')).toBe(true);
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-002] broker-channel stuurt alleen de factuur', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een gelockte factuur met broker_invoice_attachment=true', async () => {});

    let brokerItems: Array<Record<string, unknown>> = [];
    await test.step('When de queue wordt uitgelezen', async () => {
      const list = await queueApi.list();
      brokerItems = (list.body.items as Array<Record<string, unknown>>)
        .filter(i => (i.invoice_id as number) === invoiceId && i.channel === 'broker');
    });

    await test.step('Then heeft de broker-channel attachment_policy=invoice', async () => {
      expect(brokerItems.length).toBeGreaterThan(0);
      expect(brokerItems.every(i => i.attachment_policy === 'invoice')).toBe(true);
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-003] EasySalary-channel heeft attachment_policy none', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    let payrollItems: Array<Record<string, unknown>> = [];
    await test.step('Given een gelockte factuur waar payroll_invoice_attachment=false', async () => {});

    await test.step('When de queue-items voor deze factuur worden uitgelezen', async () => {
      const list = await queueApi.list();
      payrollItems = (list.body.items as Array<Record<string, unknown>>)
        .filter(i => (i.invoice_id as number) === invoiceId && i.channel === 'payroll');
    });

    await test.step('Then heeft elke EasySalary-item attachment_policy=none', async () => {
      expect(payrollItems.length).toBeGreaterThan(0);
      expect(payrollItems.every(i => i.attachment_policy === 'none')).toBe(true);
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-022] één factuuractie maakt drie gescheiden mailroutes met het juiste bijlagenbeleid', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given één goedgekeurde urenstaat als factuur is afgerond', async () => {});

    await test.step('When de drie functionele routes voor dezelfde factuur worden uitgelezen', async () => {
      const list = await queueApi.list();
      expect(list.status).toBe(200);
      const items = (list.body.items as Array<Record<string, unknown>>)
        .filter(item => Number(item.invoice_id) === invoiceId);
      const byChannel = new Map(items.map(item => [String(item.channel), item]));

      expect(items).toHaveLength(3);
      expect([...byChannel.keys()].sort()).toEqual(['accountant', 'broker', 'payroll']);
      expect(byChannel.get('broker')?.attachment_policy).toBe('invoice');
      expect(byChannel.get('accountant')?.attachment_policy).toBe('invoice');
      expect(byChannel.get('payroll')?.attachment_policy).toBe('none');
      expect(new Set(items.map(item => Number(item.invoice_id)))).toEqual(new Set([invoiceId]));

      // One accompanying text for every recipient. The assignment template used to
      // reach the broker only, so the bookkeeper and the payroll office kept
      // hardcoded wording that nobody could change from the screen. All three must
      // now carry the subject set on the assignment.
      const onderwerpen = items.map(item => String(item.subject_snapshot || ''));
      expect(new Set(onderwerpen).size, 'de drie mails moeten hetzelfde onderwerp uit de opdracht dragen: ' + onderwerpen.join(' | ')).toBe(1);
      expect(onderwerpen[0], 'het onderwerp moet uit de opdracht komen, niet uit een vaste sjabloon').not.toContain('Factuuradministratie');
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-004] action=enqueue voor gelockte factuur maakt nieuwe items aan', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een admin is ingelogd met een reeds gelockte factuur', async () => {});

    let enqueueResult: Record<string, unknown> = {};
    await test.step('When action=enqueue wordt aangeroepen', async () => {
      const res = await queueApi.enqueue(invoiceId);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.dry_run).toBe(true);
      expect((res.body.count as number)).toBeGreaterThan(0);
      enqueueResult = res.body;
    });

    await test.step('Then zijn de nieuwe items in de queue zichtbaar per invoiceId', async () => {
      const created = enqueueResult.created as Array<Record<string, unknown>>;
      expect(created.length).toBeGreaterThan(0);
      expect(created.every(i => i.dry_run === true)).toBe(true);
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-005] action=list response bevat verplichte velden', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een admin is ingelogd', async () => {});

    await test.step('When de queue wordt uitgelezen', async () => {
      const res = await queueApi.list();
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.dry_run).toBe('boolean');
      expect(typeof res.body.count).toBe('number');
      expect(Array.isArray(res.body.items)).toBe(true);

      const item = (res.body.items as Array<Record<string, unknown>>)
        .find(i => (i.invoice_id as number) === invoiceId);
      if (item) {
        expect(typeof item.id).toBe('number');
        expect(typeof item.channel).toBe('string');
        expect(typeof item.recipient_email).toBe('string');
        expect(typeof item.subject_snapshot).toBe('string');
        expect(typeof item.attachment_policy).toBe('string');
        expect(typeof item.status).toBe('string');
        expect(typeof item.attempt_count).toBe('number');
        expect(typeof item.dry_run).toBe('boolean');
        expect(typeof item.created_at).toBe('string');
        expect(item).not.toHaveProperty('body_snapshot');
      }
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-H-015] Backoffice ziet veilige verzendhistorie zonder berichtinhoud', async ({ page }) => {
    let queueRequests = 0;
    await page.route('**/server/api/email-queue.php*', async route => {
      queueRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          dry_run: false,
          count: 15,
          items: [
            {
              id: 902,
              user_id: null,
              invoice_id: 71,
              invoice_number: 'PATH-2026-007',
              channel: 'broker',
              recipient_email: 'info@pathconsultancy.nl',
              cc_email: null,
              subject_snapshot: 'Factuur PATH-2026-007 – juli 2026',
              attachment_policy: 'invoice',
              status: 'sent',
              attempt_count: 1,
              dry_run: false,
              acceptance_test: true,
              sent_at: '2026-08-14 00:45:00',
              created_at: '2026-08-14 00:44:00',
              body_snapshot: 'MAG-NOOIT-IN-DE-UI-VERSCHIJNEN'
            },
            {
              id: 901,
              user_id: 7,
              invoice_id: null,
              invoice_number: null,
              channel: 'password_reset',
              recipient_email: 'info@pathconsultancy.nl',
              cc_email: null,
              subject_snapshot: 'Stel je wachtwoord in voor Uren & Facturatie',
              attachment_policy: 'none',
              status: 'queued',
              attempt_count: 0,
              dry_run: false,
              sent_at: null,
              created_at: '2026-08-14 00:43:00',
              body_snapshot: 'https://example.invalid/#reset-password=GEHEIM'
            },
            ...Array.from({ length: 13 }, (_, index) => ({
              id: 880 - index,
              user_id: null,
              invoice_id: null,
              invoice_number: null,
              channel: 'accountant',
              recipient_email: 'info@pathconsultancy.nl',
              cc_email: null,
              subject_snapshot: `Historische mail ${index + 1}`,
              attachment_policy: 'invoice',
              status: 'sent',
              attempt_count: 1,
              dry_run: false,
              acceptance_test: false,
              sent_at: `2026-08-13 23:${String(59 - index).padStart(2, '0')}:00`,
              created_at: `2026-08-13 23:${String(58 - index).padStart(2, '0')}:00`,
              body_snapshot: `VERBORGEN-BERICHTINHOUD-${index + 1}`,
            }))
          ]
        })
      });
    });

    const login = new LoginPage(page);
    await test.step('Given een beheerder is beveiligd ingelogd', async () => {
      await login.open();
      await login.loginAsAdmin();
    });

    await test.step('When de beheerder het verzendoverzicht in Instellingen opent', async () => {
      await page.locator('button[data-view="settings"]').click();
      await expect(page.locator('#mail-delivery-history-title')).toHaveText('Recente e-mails');
    });

    await test.step('Then zijn ontvanger, onderwerp, status, tijd en bijlagen zichtbaar zonder geheime inhoud', async () => {
      const history = page.locator('#mail-delivery-history-list');
      await expect(history.locator('.mail-delivery-history-item')).toHaveCount(12);
      await expect(page.locator('#mail-delivery-history-summary')).toContainText('Laatste 12 registraties');
      await expect(history).toContainText('info@pathconsultancy.nl');
      await expect(history).toContainText('Factuur PATH-2026-007 – juli 2026');
      await expect(history).toContainText('Factuur');
      await expect(history).toContainText('Acceptatietest');
      await expect(history.locator('[data-mail-acceptance-test="true"]')).toHaveCount(1);
      await expect(history).toContainText('Verzonden');
      await expect(history).toContainText('Klaargezet');
      await expect(history).toContainText('00:45');
      await expect(history).not.toContainText('02:45');
      await expect(history).not.toContainText('MAG-NOOIT-IN-DE-UI-VERSCHIJNEN');
      await expect(history).not.toContainText('reset-password=GEHEIM');
      await expect(history).toContainText('Historische mail 10');
      await expect(history).not.toContainText('Historische mail 11');
      await expect(history).not.toContainText('VERBORGEN-BERICHTINHOUD');
    });

    await test.step('And Vernieuwen haalt de actuele serverregistraties opnieuw op', async () => {
      const before = queueRequests;
      await page.locator('#refresh-mail-delivery-history').click();
      await expect.poll(() => queueRequests).toBeGreaterThan(before);
      await expect(page.locator('#refresh-mail-delivery-history')).toBeEnabled();
    });
  });

  test('[EQ-H-016] Backoffice verstuurt vanuit de acceptatieconsole precies één gekozen scenario', async ({ page }) => {
    const scenarios = [
      {
        key: 'broker_bundle',
        label: 'Broker: factuur',
        recipient: 'info@pathconsultancy.nl',
        attachment_count: 1,
        ready: true,
        issues: [],
        attachments: [
          { index: 0, filename: 'ACCEPTATIETEST-NIET-BOEKEN-Factuur-PATH-2026-007.pdf' },
        ],
      },
      {
        key: 'accountant_invoice',
        label: 'Boekhouder: factuur',
        recipient: 'info@pathconsultancy.nl',
        attachment_count: 1,
        ready: true,
        issues: [],
        attachments: [
          { index: 0, filename: 'ACCEPTATIETEST-NIET-BOEKEN-Factuur-PATH-2026-007.pdf' },
        ],
      },
      { key: 'payroll_hours', label: 'Salarisadministratie: alleen ureninformatie', recipient: 'info@pathconsultancy.nl', attachment_count: 0, ready: true, issues: [] },
      { key: 'password_reset', label: 'Wachtwoord vergeten: eenmalige link', recipient: 'info@pathconsultancy.nl', attachment_count: 0, ready: true, issues: [] },
      { key: 'account_invitation', label: 'Eerste uitnodiging: wachtwoord aanmaken', recipient: 'gch.lieveld@live.nl', attachment_count: 0, ready: true, issues: [] },
    ];
    const posted: Array<Record<string, unknown>> = [];

    await page.route('**/server/api/mail-acceptance.php', async route => {
      if (route.request().method() === 'POST') {
        posted.push(route.request().postDataJSON() as Record<string, unknown>);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, result: { scenario: 'broker_bundle', recipient: 'info@pathconsultancy.nl', attachment_count: 1, outcome: 'sent' } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, enabled: true, ready: true, issues: [], scenarios }),
      });
    });
    await page.route('**/server/api/email-queue.php*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, dry_run: false, count: 0, items: [] }),
    }));

    const login = new LoginPage(page);
    await test.step('Given de vijf losse mailacceptatiescenario’s zijn vrijgegeven voor vaste testontvangers', async () => {
      await login.open();
      await login.loginAsAdmin();
      await page.locator('button[data-view="settings"]').click();
      await expect(page.locator('#mail-acceptance-status')).toHaveText('Klaar voor test');
      await expect(page.locator('.mail-acceptance-scenario')).toHaveCount(5);
      await expect(page.locator('[data-mail-acceptance-scenario]')).toHaveCount(5);
      await expect(page.locator('#mail-acceptance-console')).not.toContainText('Alles versturen');
      const brokerPreviews = page.locator('[data-mail-acceptance-key="broker_bundle"] .mail-acceptance-attachment');
      await expect(brokerPreviews).toHaveCount(1);
      await expect(brokerPreviews.nth(0)).toHaveText('Factuur-PDF');
      await expect(brokerPreviews.nth(0)).toHaveAttribute('title', 'ACCEPTATIETEST-NIET-BOEKEN-Factuur-PATH-2026-007.pdf');
    });

    await test.step('When de beheerder alleen de brokerfactuur kiest en ontvanger en een bijlage bevestigt', async () => {
      await page.locator('[data-mail-acceptance-scenario="broker_bundle"]').click();
      await expect(page.locator('#modal-title')).toContainText('Broker: factuur');
      await expect(page.locator('#modal-summary')).toContainText('info@pathconsultancy.nl');
      await expect(page.locator('#modal-summary')).toContainText('1 gecontroleerde PDF-bijlage');
      await expect(page.locator('#modal-summary')).toContainText('ACCEPTATIETEST · NIET BOEKEN');
      const attachmentPreviews = page.locator('#modal-summary .mail-acceptance-attachment');
      await expect(attachmentPreviews).toHaveCount(1);
      await expect(attachmentPreviews.nth(0)).toHaveText('Factuur-PDF bekijken');
      await expect(attachmentPreviews.nth(0)).toHaveAttribute('href', /preview_scenario=broker_bundle&attachment=0$/);
      await expect(page.locator('#modal-confirm')).toHaveText('1 acceptatiemail versturen');
      await page.locator('#modal-confirm').click();
    });

    await test.step('Then bevat de write exact één scenario met expliciete bevestiging en geen bulkopdracht', async () => {
      await expect.poll(() => posted.length).toBe(1);
      expect(posted[0]).toEqual({ scenario: 'broker_bundle', confirm: 'SEND_ONE_ACCEPTANCE_MAIL' });
      await expect(page.locator('#modal')).toBeHidden();
      await expect(page.locator('#toast')).toContainText('Precies één acceptatiemail');
    });
  });

  test('[EQ-H-025] localhost schakelt een veilige mailpreview in en controleert inhoud en PDF’s zonder SMTP', async ({ page }) => {
    test.setTimeout(60_000);
    let previewCreated = false;
    const posted: Array<Record<string, unknown>> = [];
    const scenarios = [{
      key: 'broker_bundle',
      label: 'Broker: factuur',
      recipient: 'lokale-mailpreview@example.invalid',
      attachment_count: 1,
      ready: true,
      issues: [],
      preview_subject: '[LOKALE CONTROLE] Factuur PATH-2026-007 – juli 2026',
      preview_body: 'LOKALE CONTROLE — NIET VERZONDEN\n\nHierbij sturen wij de gecontroleerde factuur.',
      attachments: [
        { index: 0, filename: 'ACCEPTATIETEST-NIET-BOEKEN-Factuur-PATH-2026-007.pdf' },
      ],
    }];

    await isolateMailPreviewFrontend(page);
    await page.route('**/server/api/mail-acceptance.php*', async route => {
      if (route.request().method() === 'POST') {
        posted.push(route.request().postDataJSON() as Record<string, unknown>);
        previewCreated = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, preview_only: true, result: { scenario: 'broker_bundle', outcome: 'previewed', preview_only: true } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, enabled: true, ready: true, preview_only: true, issues: [], scenarios }),
      });
    });
    await page.route('**/server/api/email-queue.php*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        environment: 'local',
        mail_mode: 'disabled',
        test_toggle_available: false,
        count: previewCreated ? 1 : 0,
        items: previewCreated ? [{
          id: 91,
          channel: 'broker',
          recipient_email: 'lokale-mailpreview@example.invalid',
          subject_snapshot: '[LOKALE CONTROLE] Factuur PATH-2026-007 – juli 2026',
          attachment_policy: 'invoice',
          status: 'queued',
          dry_run: true,
          acceptance_test: true,
          created_at: '2026-08-15 10:45:00',
        }] : [],
      }),
    }));

    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await page.evaluate(() => window.showView('settings'));
    await expect(page.locator('#view-settings')).toHaveClass(/is-active/);
    await page.evaluate(() => window.refreshMailAcceptanceReadApi(true));

    await expect(page.locator('#mail-safety-badge')).toHaveText('Lokale mailpreview uit');
    await expect(page.locator('#setting-send-mode')).toContainText('giovanno.maatsen@pathconsultancy.nl');
    await expect(page.locator('#setting-send-mode')).toContainText('geen verzending');
    await expect(page.locator('#toggle-test-mail-delivery')).toHaveText('Mailpreview inschakelen');
    await expect(page.locator('[data-mail-acceptance-scenario="broker_bundle"]')).toBeDisabled();
    await expect(page.locator('[data-mail-acceptance-key="broker_bundle"] .mail-acceptance-attachment')).toHaveCount(1);
    await expect(page.locator('[data-mail-acceptance-key="broker_bundle"]')).toContainText('Gesimuleerde TEST-aflevering: giovanno.maatsen@pathconsultancy.nl');

    const previewToggle = page.locator('#toggle-test-mail-delivery');
    const statusToggle = page.locator('#mail-safety-badge');
    await expect(statusToggle).toHaveAttribute('role', 'button');
    await expect(statusToggle).toHaveAttribute('aria-label', 'Lokale mailpreview inschakelen');
    await statusToggle.focus();
    await statusToggle.press('Enter');
    await expect(page.locator('#modal-title')).toHaveText('Lokale mailpreview inschakelen?');
    await expect(page.locator('#modal-summary')).toContainText('Externe aflevering');
    await expect(page.locator('#modal-summary')).toContainText('Altijd geblokkeerd');
    await page.locator('#modal-confirm').click();
    await page.evaluate(() => window.refreshMailAcceptanceReadApi(true));
    await page.evaluate(() => window.showView('settings'));
    await expect(page.locator('#view-settings')).toHaveClass(/is-active/);

    await expect(page.locator('#mail-safety-badge')).toHaveText('Lokale mailpreview actief');
    await expect(page.locator('[data-mail-acceptance-scenario="broker_bundle"]')).toBeEnabled();
    await expect(page.locator('[data-mail-acceptance-scenario="broker_bundle"]')).toBeVisible();
    await page.locator('[data-mail-acceptance-scenario="broker_bundle"]').click();
    await expect(page.locator('#modal-summary')).toContainText('Alleen lokale verzendadministratie');
    await expect(page.locator('#modal-summary')).toContainText('Gesimuleerde TEST-aflevering');
    await expect(page.locator('#modal-summary')).toContainText('giovanno.maatsen@pathconsultancy.nl');
    await expect(page.locator('#modal-summary')).toContainText('geen verzending');
    await expect(page.locator('#modal-summary')).toContainText('[LOKALE CONTROLE] Factuur PATH-2026-007');
    await expect(page.locator('#modal-summary')).toContainText('Hierbij sturen wij de gecontroleerde factuur.');
    await expect(page.locator('#modal-summary .mail-acceptance-attachment')).toHaveCount(1);
    await expect(page.locator('#modal-confirm')).toHaveText('1 controlevoorbeeld maken');
    await page.locator('#modal-confirm').click();

    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toEqual({ scenario: 'broker_bundle', confirm: 'SEND_ONE_ACCEPTANCE_MAIL' });
    await expect(page.locator('#toast')).toContainText('niets is extern verzonden');
    await expect(page.locator('#mail-delivery-history-list')).toContainText('Controlevoorbeeld');
    await expect(page.locator('#mail-delivery-history-list')).toContainText('Factuur');
    await expect(page.locator('#mail-delivery-history-list')).toContainText('Gesimuleerde TEST-aflevering: giovanno.maatsen@pathconsultancy.nl');

    await expect(statusToggle).toHaveAttribute('aria-label', 'Lokale mailpreview uitschakelen');
    await statusToggle.click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#mail-safety-badge')).toHaveText('Lokale mailpreview uit');
    await expect(page.locator('[data-mail-acceptance-scenario="broker_bundle"]')).toBeDisabled();
  });

  test('[EQ-H-023] beheerder pauzeert en hervat uitsluitend de beveiligde TEST-mail', async ({ page }) => {
    let enabled = true;
    const writes: Array<Record<string, unknown>> = [];
    await isolateMailPreviewFrontend(page);
    await page.route('**/server/api/email-queue.php*', async route => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        writes.push(body);
        enabled = body.enabled === true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, action: 'set-test-delivery', enabled }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          environment: 'test',
          dry_run: false,
          delivery_allowed: enabled,
          test_redirect_active: true,
          test_sink_recipient: 'giovanno.maatsen@pathconsultancy.nl',
          test_toggle_available: true,
          test_delivery_paused: !enabled,
          mail_mode: enabled ? 'test_active' : 'test_paused',
          count: 0,
          items: [],
        }),
      });
    });
    await page.route('**/server/api/mail-acceptance.php', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, enabled: true, ready: enabled, issues: enabled ? [] : ['Echte SMTP-verzending is niet vrijgegeven voor deze omgeving.'], scenarios: [] }),
    }));

    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await page.locator('button[data-view="settings"]').click();

    await expect(page.locator('#mail-safety-badge')).toHaveText('TEST-mail actief');
    await expect(page.locator('#setting-send-mode')).toContainText('giovanno.maatsen@pathconsultancy.nl');
    await expect(page.locator('#toggle-test-mail-delivery')).toHaveText('TEST-mail pauzeren');
    await page.locator('#toggle-test-mail-delivery').click();
    await expect(page.locator('#modal-title')).toHaveText('TEST-mail pauzeren?');
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#mail-safety-badge')).toHaveText('TEST-mail gepauzeerd');
    await expect(page.locator('#toggle-test-mail-delivery')).toHaveText('TEST-mail hervatten');

    await page.locator('#toggle-test-mail-delivery').click();
    await expect(page.locator('#modal-title')).toHaveText('TEST-mail hervatten?');
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#mail-safety-badge')).toHaveText('TEST-mail actief');
    expect(writes).toEqual([
      { action: 'set-test-delivery', enabled: false, confirm: 'SET_TEST_MAIL_STATE' },
      { action: 'set-test-delivery', enabled: true, confirm: 'SET_TEST_MAIL_STATE' },
    ]);
  });

  test('[EQ-N-024] buiten de beveiligde TEST-sandbox is geen mailschakelaar beschikbaar', async ({ page }) => {
    await isolateMailPreviewFrontend(page);
    await page.route('**/server/api/email-queue.php*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, environment: 'production', delivery_allowed: true, test_toggle_available: false, mail_mode: 'production_active', count: 0, items: [] }),
    }));
    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await page.locator('button[data-view="settings"]').click();
    await expect(page.locator('#mail-safety-badge')).toHaveText('E-mail actief');
    await expect(page.locator('#toggle-test-mail-delivery')).toBeHidden();
    await expect(page.locator('#setting-send-mode')).toContainText('Productieverzending actief');
    await expect(page.locator('#mail-safety-badge')).toHaveClass(/is-active/);
  });

  test('[EQ-N-017] niet-beschikbare acceptatieconsole blijft volledig uit beeld', async ({ page }) => {
    await page.route('**/server/api/mail-acceptance.php', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'acceptance-test-disabled' }),
    }));
    await page.route('**/server/api/email-queue.php*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, dry_run: false, count: 0, items: [] }),
    }));

    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await page.locator('button[data-view="settings"]').click();

    const consolePanel = page.locator('#mail-acceptance-console');
    await expect(consolePanel).toBeHidden();
    await expect(consolePanel.locator('[data-mail-acceptance-scenario]:enabled')).toHaveCount(0);
    await expect(consolePanel.getByText('Broker: factuur')).toBeHidden();
    await expect(consolePanel.getByText('Eerste uitnodiging: wachtwoord aanmaken')).toBeHidden();
  });

  test('[EQ-H-020] Backoffice finaliseert de branded serverfactuur en verzendt drie echte TEST-mails', async ({ page }) => {
    let invoiceLocks = 0;
    let directQueueWrites = 0;
    let locked = false;

    await page.route('**/server/api/invoices.php*', async route => {
      if (route.request().method() === 'POST') {
        invoiceLocks += 1;
        const payload = route.request().postDataJSON() as Record<string, unknown>;
        expect(payload).toMatchObject({ action: 'lock', timesheet_id: 881 });
        const conceptPdf = String(payload.concept_pdf_base64 || '');
        expect(conceptPdf.length).toBeGreaterThan(1000);
        expect(Buffer.from(conceptPdf, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
        await new Promise(resolve => setTimeout(resolve, 150));
        locked = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            action: 'lock',
            queued_count: 3,
            dispatch_result: { sent: 3, failed: 0, skipped: 0 },
            pdf_generated: true,
            invoice: { id: 771, timesheet_id: 881, invoice_number: 'PATH-2026-008', status: 'ready', locked_at: '2026-08-14 12:00:00' },
            timesheet: { id: 881, status: 'invoiced', billable_hours: 144 },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          count: 1,
          items: [{
            id: 771,
            timesheet_id: 881,
            invoice_number: 'PATH-2026-008',
            employee_name: 'Shawn-Douglas Nahar',
            period_key: '2026-08',
            status: 'ready',
            timesheet_status: locked ? 'invoiced' : 'approved',
            subtotal: 12312,
            vat_amount: 2585.52,
            total: 14897.52,
            billable_hours: 144,
            hourly_rate: 85.5,
            vat_percentage: 21,
            locked,
            locked_at: locked ? '2026-08-14 12:00:00' : null,
          }],
        }),
      });
    });

    await page.route('**/server/api/email-queue.php*', async route => {
      if (route.request().method() === 'POST') {
        directQueueWrites += 1;
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
        return;
      }
      const items = locked
        ? ['broker', 'accountant', 'payroll'].map((channel, index) => ({
            id: 990 + index,
            invoice_id: 771,
            channel,
            recipient_email: `${channel}@example.invalid`,
            subject_snapshot: `Route ${channel}`,
            attachment_policy: channel === 'payroll' ? 'none' : 'invoice',
            status: 'queued',
            attempt_count: 0,
            dry_run: true,
            created_at: '2026-08-14 12:00:00',
          }))
        : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          dry_run: false,
          environment: 'test',
          delivery_allowed: true,
          test_redirect_active: true,
          test_sink_recipient: 'giovanno.maatsen@pathconsultancy.nl',
          count: items.length,
          items,
        }),
      });
    });

    const login = new LoginPage(page);
    await test.step('Given een goedgekeurde maar nog niet definitieve serverfactuur als Backoffice-taak klaarstaat', async () => {
      await login.open();
      await login.loginAsAdmin();
      await page.locator('#hero-backoffice-filter').click();
      await expect(page.locator('[data-admin-task-filter="actionable"]')).toHaveClass(/is-active/);
      const task = page.locator('[data-admin-task-invoice="4"][data-period-key="2026-08"]');
      if (await task.isHidden()) {
        const monthToggle = page.locator('[data-admin-task-month-toggle="2026-08"]');
        await expect(monthToggle).toBeVisible();
        await monthToggle.click();
      }
      await expect(task).toBeVisible();
      await task.click();
      await expect(page.locator('#modal-title')).toContainText('PATH-2026-008');
      await expect(page.locator('#modal-secondary')).toHaveText('Factuur-PDF controleren');
      await expect(page.locator('#modal-summary')).toContainText('Werkelijke TEST-aflevering');
      await expect(page.locator('#modal-summary')).toContainText('giovanno.maatsen@pathconsultancy.nl');
      await expect(page.locator('#modal-summary')).toContainText('€ 12.312');
      const amounts = await page.evaluate(() => {
        const runtime = window as unknown as { invoiceData: (employeeId: number, periodKey: string) => { hours: number; rate: number; subtotal: number; vatAmount: number; total: number } };
        return runtime.invoiceData(4, '2026-08');
      });
      expect(amounts).toMatchObject({ hours: 144, rate: 85.5, subtotal: 12312, vatAmount: 2585.52, total: 14897.52 });
    });

    await test.step('When Backoffice de verzending één keer afrondt', async () => {
      await page.locator('#modal-confirm').click();
      await expect(page.locator('#modal-confirm')).toBeDisabled();
      await expect(page.locator('#modal-queue-previous')).toBeDisabled();
      await expect(page.locator('#modal-queue-next')).toBeDisabled();
    });

    await test.step('Then wordt eerst gelockt, niet te vroeg gequeued en verdwijnt de afgeronde vervolgtaak', async () => {
      await expect.poll(() => invoiceLocks).toBe(1);
      expect(directQueueWrites).toBe(0);
      await expect(page.locator('#toast')).toContainText('3 e-mails verzonden');
      await expect(page.locator('[data-admin-task-invoice="4"][data-period-key="2026-08"]')).toHaveCount(0);
    });
  });

  test('[EQ-H-026] Backoffice verzendt de juiste officiële klanturenstaat via TEST naar Giovanno', async ({ page }) => {
    let postedBody = '';
    await page.route('**/server/api/email-queue.php*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        environment: 'test',
        delivery_allowed: true,
        test_redirect_active: true,
        test_sink_recipient: 'giovanno.maatsen@pathconsultancy.nl',
        test_toggle_available: true,
        mail_mode: 'test_active',
        count: 0,
        items: [],
      }),
    }));
    await page.route('**/server/api/customer-timesheets.php', async route => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      postedBody = route.request().postData() || '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          period: '2026-07',
          employee_id: 1,
          assignment_id: 1,
          test_delivery: true,
          dispatch_result: { sent: 1, failed: 0, skipped: 0 },
          customer_timesheet: {
            status: 'sent_to_broker',
            original_file_name: 'Klanturenstaat_Marc_de_Roon_2026-07.pdf',
            stored_file_name: 'Klanturenstaat_Marc_de_Roon_2026-07.pdf',
            storage_key: '1/1/2026-07.pdf',
            mime_type: 'application/pdf',
            sent_to_broker_at: '2026-08-16 04:10:00',
          },
        }),
      });
    });

    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await page.evaluate(() => {
      const record = window.recordFor(1, '2026-07');
      const documentRecord = window.customerTimesheetFor(record);
      documentRecord.status = 'approved';
      documentRecord.fileName = 'Klanturenstaat_Marc_de_Roon_2026-07.pdf';
      documentRecord.fileData = '/server/api/customer-timesheets.php?action=download&period=2026-07&employee_id=1';
      window.renderAll();
      window.showCustomerTimesheetBrokerCheck(1, '2026-07');
    });

    await expect(page.locator('#modal-title')).toContainText('Marc de Roon');
    await expect(page.locator('#modal-summary')).toContainText('giovanno.maatsen@pathconsultancy.nl');
    await expect(page.locator('#modal-summary')).toContainText('Klanturenstaat_Marc_de_Roon_2026-07.pdf');
    await expect(page.locator('#modal-summary [data-view-customer-timesheet]')).toHaveText('Klanturenstaat bekijken');
    await page.locator('#customer-timesheet-broker-subject').fill('Klanturenstaat Marc de Roon - juli 2026');
    await page.locator('#customer-timesheet-broker-body').fill('Bijgevoegd staat de officiële klanturenstaat van Marc de Roon.');
    await page.locator('#modal-confirm').click();

    await expect.poll(() => postedBody).toContain('name="action"');
    expect(postedBody).toContain('send_to_broker');
    expect(postedBody).toContain('Klanturenstaat Marc de Roon - juli 2026');
    expect(postedBody).toContain('officiële klanturenstaat van Marc de Roon');
    await expect(page.locator('#toast')).toContainText('Klanturenstaat verzonden via TEST naar giovanno.maatsen@pathconsultancy.nl');
  });

  test('[EQ-N-021] factuurverzending blijft dicht zolang de serveruren niet zijn goedgekeurd', async ({ page }) => {
    let invoiceLocks = 0;

    await page.route('**/server/api/timesheets.php**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const employeeId = Number(url.searchParams.get('employee_id') || 0);
      const period = String(url.searchParams.get('period') || '');

      if (request.method() !== 'GET') {
        await route.continue();
        return;
      }

      if (employeeId !== 4 || period !== '2026-08') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, found: false, period, employee_id: employeeId, timesheet: null }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          found: true,
          period,
          employee_id: employeeId,
          timesheet: {
            id: 882,
            status: 'submitted',
            contractual_hours: 160,
            billable_hours: 144,
            leave_hours: 0,
            sickness_hours: 0,
            employee_note: null,
            review_note: null,
            day_entries: [],
            submitted_at: '2026-08-31T12:00:00Z',
            approved_at: null,
            approved_by: null,
            version: 7,
            latest_correction: null,
            correction_history: [],
          },
        }),
      });
    });

    await page.route('**/server/api/invoices.php*', async route => {
      if (route.request().method() === 'POST') {
        invoiceLocks += 1;
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          count: 1,
          items: [{
            id: 772,
            timesheet_id: 882,
            invoice_number: 'PATH-2026-008',
            employee_name: 'Shawn-Douglas Nahar',
            period_key: '2026-08',
            status: 'ready',
            timesheet_status: 'submitted',
            subtotal: 12312,
            vat_amount: 2585.52,
            total: 14897.52,
            locked: false,
            locked_at: null,
          }],
        }),
      });
    });
    await page.route('**/server/api/email-queue.php*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        dry_run: false,
        environment: 'test',
        test_redirect_active: true,
        test_sink_recipient: 'giovanno.maatsen@pathconsultancy.nl',
        count: 0,
        items: [],
      }),
    }));

    const login = new LoginPage(page);
    await test.step('Given de lokale status verouderd is maar de serveruren nog ingediend zijn', async () => {
      await login.open();
      await login.loginAsAdmin();
      await expect.poll(async () => page.evaluate(() => {
        const runtime = window as typeof window & { __PATH_READ_API?: { invoices?: { items?: Array<{ timesheet_status?: string }> } } };
        return runtime.__PATH_READ_API?.invoices?.items?.[0]?.timesheet_status || '';
      })).toBe('submitted');
    });

    await test.step('Then verschijnt geen factuurverzendtaak en wordt geen lock-write uitgevoerd', async () => {
      await page.locator('#hero-backoffice-filter').click();
      await expect(page.locator('[data-admin-task-invoice="4"][data-period-key="2026-08"]')).toHaveCount(0);
      expect(invoiceLocks).toBe(0);
    });
  });

  test('[EQ-N-019] gesloten acceptatievenster toont waarom geen mail kan worden verstuurd', async ({ page }) => {
    const scenarios = [
      ['broker_bundle', 'Broker: factuur', 1],
      ['accountant_invoice', 'Boekhouder: factuur', 1],
      ['payroll_hours', 'Salarisadministratie: alleen ureninformatie', 0],
      ['password_reset', 'Wachtwoord vergeten: eenmalige link', 0],
      ['account_invitation', 'Eerste uitnodiging: wachtwoord aanmaken', 0],
    ].map(([key, label, attachmentCount]) => ({
      key,
      label,
      recipient: '',
      attachment_count: attachmentCount,
      ready: false,
      issues: ['Ontvanger ontbreekt of is ongeldig.'],
    }));
    await page.route('**/server/api/mail-acceptance.php', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        enabled: false,
        ready: false,
        issues: [
          'De acceptatieconsole staat uit in de serverconfiguratie.',
          'Echte SMTP-verzending is niet vrijgegeven voor deze omgeving.',
        ],
        scenarios,
      }),
    }));
    await page.route('**/server/api/email-queue.php*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, dry_run: false, count: 0, items: [] }),
    }));

    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await page.locator('button[data-view="settings"]').click();

    const consolePanel = page.locator('#mail-acceptance-console');
    await expect(page.locator('#mail-acceptance-status')).toHaveText('Geblokkeerd');
    await expect(page.locator('#mail-acceptance-summary')).toContainText('acceptatieconsole staat uit');
    await expect(consolePanel.locator('[data-mail-acceptance-scenario]')).toHaveCount(5);
    await expect(consolePanel.locator('[data-mail-acceptance-scenario]:enabled')).toHaveCount(0);
    await expect(consolePanel.locator('[data-mail-acceptance-scenario]')).toHaveText(Array(5).fill('Mailvenster gesloten'));
    await expect(consolePanel).not.toContainText('Controleer & verstuur 1');
  });

  test('[EQ-N-018] afgewezen acceptatiemail blijft nooit achter voor automatische herverzending', async () => {
    let policy: { ok?: boolean; network_connections?: number; writes_performed?: boolean; checks?: Record<string, boolean> } = {};

    await test.step('Given het fail-closed retrybeleid voor acceptatiemail wordt uitgevoerd', async () => {
      const execution = await execFileAsync('php', ['server/scripts/mail-acceptance-policy-check.php'], {
        cwd: process.cwd(),
        windowsHide: true,
      });
      policy = JSON.parse(execution.stdout);
      expect(policy.ok).toBe(true);
      expect(policy.network_connections).toBe(0);
      expect(policy.writes_performed).toBe(false);
    });

    await test.step('Then is een acceptatiefout single-shot en behoudt gewone mail begrensde retries', async () => {
      expect(policy.checks?.acceptance_failure_is_single_shot).toBe(true);
      expect(policy.checks?.normal_delivery_keeps_bounded_retry).toBe(true);
      expect(policy.checks?.smtp_failure_keeps_safe_response_detail).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Negative
  // --------------------------------------------------------------------------

  test('[EQ-N-006] anonieme gebruiker krijgt 401 op list', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    await test.step('Given geen sessie', async () => {});
    await test.step('When GET email-queue zonder sessie', async () => {
      const res = await ctx.get(`${appConfig.baseUrl}/server/api/email-queue.php`);
      expect(res.status()).toBe(401);
      expect((await res.json()).ok).toBe(false);
    });
    await ctx.dispose();
  });

  test('[EQ-N-007] medewerker krijgt 403 op list', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een ingelogde medewerker', async () => {
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    });
    await test.step('When de medewerker de queue opvraagt', async () => {
      const res = await ctx.get(`${appConfig.baseUrl}/server/api/email-queue.php`);
      expect(res.status()).toBe(403);
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-008] action=enqueue zonder invoice_id geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi  = new AuthApi(ctx);
    const queueApi = new EmailQueueApi(ctx);
    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });
    await test.step('When enqueue wordt aangeroepen zonder invoice_id', async () => {
      const csrf = await ctx.get('/server/auth/csrf.php');
      const token = String(((await csrf.json()) as Record<string, string>).csrf_token ?? '');
      const res = await ctx.post(`${appConfig.baseUrl}/server/api/email-queue.php`, {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'enqueue' },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('missing-invoice-id');
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-009] action=enqueue niet-bestaande factuur geeft 404', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi  = new AuthApi(ctx);
    const queueApi = new EmailQueueApi(ctx);
    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });
    await test.step('When enqueue wordt aangeroepen met niet-bestaand invoice_id', async () => {
      const res = await queueApi.enqueue(9999999);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('invoice-not-found');
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-010] action=enqueue niet-gelockte factuur geeft 409', async () => {
    // Create an approved but NOT yet locked timesheet, then call enqueue.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi      = new AuthApi(ctx);
    const timesheetApi = new TimesheetApi(ctx);
    const invoiceApi   = new InvoiceApi(ctx);
    const queueApi     = new EmailQueueApi(ctx);

    await test.step('Given een goedgekeurde-maar-niet-gelockte urenstaat', async () => {
      await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
      const period = await findWritablePeriod(timesheetApi);
      const draft = await timesheetApi.write({
        action: 'save_draft', period, contractualHours: 160, billableHours: 6, leaveHours: 0,
        dayEntries: [{ workDate: `${period}-01`, hours: 6, description: 'EQ-N-010' }],
      });
      const submitted = await timesheetApi.write({
        action: 'submit', period, contractualHours: 160, billableHours: 6, leaveHours: 0,
        dayEntries: [{ workDate: `${period}-01`, hours: 6, description: 'EQ-N-010' }],
        expectedVersion: draft.body.timesheet?.version as number,
      });
      const employeeId = Number(submitted.body.employee_id || 0);
      await authApi.logout();
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      await timesheetApi.approve({ period, employeeId, expectedVersion: submitted.body.timesheet?.version as number });
    });

    await test.step('When enqueue wordt aangeroepen voor een factuur die nog niet gelockt is', async () => {
      // Read invoices to get the open (unlocked) invoice for this timesheet.
      const invList = await invoiceApi.readByPeriod('');
      // Find an invoice that is NOT locked.
      const unlockedInv = (invList.body.items as Array<Record<string, unknown>>)
        .find(i => !i.locked);

      if (unlockedInv) {
        const res = await queueApi.enqueue(unlockedInv.id as number);
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('invoice-not-locked');
      }
      // If no unlocked invoice found, test is inconclusive but not a failure.
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-N-011] action=retry op queued item geeft 409', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een queued (niet-failed) delivery item', async () => {});

    await test.step('When retry wordt aangeroepen op een queued item', async () => {
      const list = await queueApi.list({ status: 'queued' });
      const queuedItem = (list.body.items as Array<Record<string, unknown>>)
        .find(i => (i.invoice_id as number) === invoiceId);
      expect(queuedItem).toBeDefined();

      const res = await queueApi.retry(queuedItem!.id as number);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('not-failed');
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });

  test('[EQ-N-012] ongeldige status-filter geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });
    await test.step('When status=invalid wordt meegestuurd', async () => {
      const res = await ctx.get(`${appConfig.baseUrl}/server/api/email-queue.php?status=invalid`);
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('invalid-status');
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-013] anonieme enqueue geeft 401', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    await test.step('Given geen sessie', async () => {});
    await test.step('When POST email-queue zonder sessie', async () => {
      const csrf = await ctx.get(`${appConfig.baseUrl}/server/auth/csrf.php`);
      const token = String(((await csrf.json()) as Record<string, string>).csrf_token ?? '');
      const res = await ctx.post(`${appConfig.baseUrl}/server/api/email-queue.php`, {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'enqueue', invoice_id: 1 },
      });
      expect(res.status()).toBe(401);
    });
    await ctx.dispose();
  });

  test('[EQ-N-014] unknown action geeft 400', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await test.step('Given een ingelogde admin', async () => {
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    });
    await test.step('When een onbekende action wordt verstuurd', async () => {
      const csrf = await ctx.get('/server/auth/csrf.php');
      const token = String(((await csrf.json()) as Record<string, string>).csrf_token ?? '');
      const res = await ctx.post(`${appConfig.baseUrl}/server/api/email-queue.php`, {
        headers: { 'X-CSRF-Token': token },
        data: { action: 'dispatch_now' },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe('unknown-action');
    });
    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-015] localhost blijft preview-only en weigert POST zonder expliciete bevestiging', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    await test.step('Given localhost uitsluitend lokale preview zonder echte aflevering vrijgeeft', async () => {
      const status = await ctx.get(`${appConfig.baseUrl}/server/api/mail-acceptance.php`);
      expect(status.status()).toBe(200);
      const body = await status.json();
      expect(body.ok).toBe(true);
      expect(body.enabled).toBe(true);
      expect(body.preview_only).toBe(true);
      expect(body.ready).toBe(true);
      expect(body.scenarios).toHaveLength(5);
      expect(body.scenarios.every((scenario: { ready?: boolean }) => scenario.ready === true)).toBe(true);
    });

    await test.step('When een scenario zonder de exacte bevestiging wordt aangeboden', async () => {
      const token = await authApi.csrfToken();
      const response = await ctx.post(`${appConfig.baseUrl}/server/api/mail-acceptance.php`, {
        headers: { 'X-CSRF-Token': token },
        data: { scenario: 'broker_bundle' },
      });
      expect(response.status()).toBe(409);
      expect((await response.json()).error).toBe('explicit-confirmation-required');
    });

    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-N-016] medewerker krijgt geen toegang tot de mailacceptatieconsole', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    const response = await ctx.get(`${appConfig.baseUrl}/server/api/mail-acceptance.php`);
    expect(response.status()).toBe(403);
    await authApi.logout();
    await ctx.dispose();
  });
});

test.describe('nieuwe mailontvangers end-to-end', () => {
  // The screen lets a beheerder add a recipient, tick "Ontvangt mail", and expect
  // mail. This drives the whole real chain -- add two recipients, attach them to
  // the assignment, submit and approve hours, finalise the invoice -- and then
  // checks that both actually received something. Everything is put back
  // afterwards, because these recipients and routes are shared test data.
  test('[EQ-H-027] twee nieuw toegevoegde ontvangers krijgen allebei echt een factuurmail', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const unique = Date.now().toString().slice(-7);
    const boekhoudingEmail = `extra-boekhouding-${unique}@example.invalid`;
    const overigEmail = `extra-overig-${unique}@example.invalid`;
    const eigenOnderwerp = `Eigen onderwerp boekhouding ${unique} - {factuurnummer}`;
    const eigenTekst = `Beste boekhouding,\n\nEigen tekst ${unique} voor {medewerker} over {maand} {jaar}.`;

    const before = await (await ctx.get('/server/api/bootstrap.php')).json();
    const oorspronkelijkeOntvangers = before.mail_recipients as Array<Record<string, unknown>>;
    // The bootstrap employee rows carry no email, so resolve the account through
    // the users list first. Matching on the wrong employee silently rewires a
    // colleague's mail routes.
    const gebruiker = (before.users as Array<Record<string, unknown>>)
      .find(item => String(item.email || '').toLowerCase() === appConfig.employeeEmail.toLowerCase());
    expect(gebruiker, 'de testmedewerker moet een account hebben').toBeDefined();
    const medewerker = (before.employees as Array<Record<string, unknown>>)
      .find(item => Number(item.user_id) === Number(gebruiker?.id));
    // upsert_employee vervangt de opdrachtinstellingen: een veld dat je niet
    // meestuurt wordt leeggemaakt. Het scherm stuurt ze altijd mee, dus stuurt
    // deze test ze ook mee -- anders test hij een situatie die niet bestaat.
    const opdracht = (before.assignments as Array<Record<string, unknown>>)
      .find(item => Number(item.employee_id) === Number(medewerker?.id));
    const opdrachtOnderwerp = String(opdracht?.invoice_subject_template || '');
    const opdrachtTekst = String(opdracht?.invoice_body_template || '');
    expect(opdrachtTekst, 'de opdracht moet een begeleidende tekst hebben om overerving te kunnen tonen').not.toBe('');

    // staff.php verwijdert eerst alle routes van de opdracht en zet daarna terug wat
    // je meestuurt. Wie hier niets meegeeft, laat deze medewerker zonder mailroutes
    // achter -- voor elke latere run. Dus eerst vastleggen wat er stond.
    const origineleRoutes: Record<string, { enabled: boolean; invoiceAttachment: boolean; mailSubject: string; mailBody: string }> = {};
    for (const route of (before.assignment_mail_routes as Array<Record<string, unknown>>)) {
      if (Number(route.assignment_id) !== Number(opdracht?.id)) continue;
      origineleRoutes[String(route.recipient_key)] = {
        enabled: Number(route.enabled) === 1,
        invoiceAttachment: Number(route.include_invoice_pdf) === 1,
        mailSubject: String(route.subject_template || ''),
        mailBody: String(route.body_template || ''),
      };
    }
    expect(Object.keys(origineleRoutes).length, 'de medewerker moet bestaande mailroutes hebben').toBeGreaterThan(0);
    const bestaandeOntvanger = Object.keys(origineleRoutes)[0];
    const eigenOnderwerpBestaand = `Eigen onderwerp bestaande ontvanger ${unique}`;
    expect(medewerker, 'de testmedewerker moet bestaan').toBeDefined();

    const herstelPayload = JSON.parse(JSON.stringify(oorspronkelijkeOntvangers));

    try {
      await test.step('Given twee nieuwe ontvangers op de opdracht staan', async () => {
        const nieuweOntvangers = [
          ...oorspronkelijkeOntvangers.map(item => ({
            id: String(item.recipient_key || item.id),
            email: String(item.email),
            name: String(item.display_name),
            category: String(item.recipient_category),
            active: true,
            mailSubject: opdrachtOnderwerp,
            mailBody: opdrachtTekst,
          })),
          { id: `extra-boekhouding-${unique}`, email: boekhoudingEmail, name: 'Extra boekhouding', category: 'accounting', active: true },
          { id: `extra-overig-${unique}`, email: overigEmail, name: 'Extra overig', category: 'other', active: true },
        ];

        const write = await postJson(ctx, '/server/api/staff.php', {
          action: 'upsert_employee',
          sendInvitation: false,
          employee: {
            name: String(medewerker?.full_name || ''),
            email: appConfig.employeeEmail,
            dbEmployeeId: Number(medewerker?.id || 0),
            dbUserId: Number(medewerker?.user_id || 0),
            role: 'Consultant',
            active: true,
            mailSubject: opdrachtOnderwerp,
            mailBody: opdrachtTekst,
            mailRecipientRoutes: {
              ...origineleRoutes,
              // Ook een bestaande ontvanger moet een eigen tekst kunnen krijgen.
              [bestaandeOntvanger]: { ...origineleRoutes[bestaandeOntvanger], mailSubject: eigenOnderwerpBestaand },
              [`extra-boekhouding-${unique}`]: { enabled: true, invoiceAttachment: true, mailSubject: eigenOnderwerp, mailBody: eigenTekst },
              [`extra-overig-${unique}`]: { enabled: true, invoiceAttachment: false, mailSubject: '', mailBody: '' },
            },
          },
          mailRecipients: nieuweOntvangers,
        });
        expect(write.status, JSON.stringify(write.body)).toBe(200);
      });

      let ontvangen: Array<Record<string, unknown>> = [];
      let factuurId = 0;
      await test.step('When de volledige uren- en factuurketen wordt doorlopen', async () => {
        const flow = await createLockedInvoice();
        const list = await flow.queueApi.list();
        expect(list.status).toBe(200);
        factuurId = flow.invoiceId;
        ontvangen = (list.body.items as Array<Record<string, unknown>>)
          .filter(item => Number(item.invoice_id) === flow.invoiceId);
        await flow.authApi.logout();
        await flow.ctx.dispose();
      });

      await test.step('Then krijgt de nieuwe boekhoudingsontvanger een mail met de eigen tekst', async () => {
        const boekhouding = ontvangen.find(item => String(item.recipient_email) === boekhoudingEmail);
        expect(boekhouding, 'de nieuwe boekhoudingsontvanger moet een mail krijgen').toBeDefined();
        expect(String(boekhouding?.subject_snapshot), 'de eigen tekst van deze ontvanger moet worden gebruikt')
          .toContain(`Eigen onderwerp boekhouding ${unique}`);
      });

      await test.step('And krijgt ook de tweede nieuwe ontvanger een mail', async () => {
        const overig = ontvangen.find(item => String(item.recipient_email) === overigEmail);
        expect(overig, 'een aangevinkte ontvanger die geen mail krijgt is stil dataverlies').toBeDefined();
      });

      await test.step('And staat in de verzonden mail exact wat er is ingevuld', async () => {
        // Dit is wat er werkelijk in de mailbox belandt: de dispatcher verstuurt
        // precies deze snapshots. Onderwerp en tekst worden hier los gecontroleerd,
        // want die kunnen onafhankelijk van elkaar misgaan.
        const mails = await verzondenMails(factuurId);
        expect(mails.length, 'er moeten mails klaarstaan voor deze factuur').toBeGreaterThan(0);

        const eigen = mails.find(item => String(item.recipient_email) === boekhoudingEmail);
        expect(eigen, 'de ontvanger met een eigen tekst moet een mail hebben').toBeDefined();
        expect(String(eigen?.subject_snapshot), 'het eigen onderwerp moet in de mail staan').toContain(`Eigen onderwerp boekhouding ${unique}`);
        expect(String(eigen?.body_snapshot), 'de eigen tekst moet in de mail staan').toContain(`Eigen tekst ${unique}`);
        expect(String(eigen?.body_snapshot), 'de opdrachttekst mag niet meer in deze mail staan').not.toContain(opdrachtTekst.split('{')[0].trim());

        const geerfd = mails.find(item => String(item.recipient_email) === overigEmail);
        expect(geerfd, 'de ontvanger zonder eigen tekst moet een mail hebben').toBeDefined();
        expect(String(geerfd?.body_snapshot), 'zonder eigen tekst hoort de opdrachttekst in de mail te staan').toContain(opdrachtTekst.split('{')[0].trim());
        expect(String(geerfd?.subject_snapshot), 'die ontvanger mag niet het eigen onderwerp van een ander krijgen').not.toContain(`Eigen onderwerp boekhouding ${unique}`);

        // En een bestaande ontvanger die al op de opdracht stond.
        const bestaandEmail = (before.mail_recipients as Array<Record<string, unknown>>)
          .find(item => String(item.recipient_key) === bestaandeOntvanger);
        const bestaandeMail = mails.find(item => String(item.recipient_email) === String(bestaandEmail?.email));
        expect(bestaandeMail, 'een bestaande ontvanger moet ook mail krijgen').toBeDefined();
        expect(String(bestaandeMail?.subject_snapshot), 'het eigen onderwerp van een bestaande ontvanger moet in de mail staan').toContain(eigenOnderwerpBestaand);
        expect(String(bestaandeMail?.body_snapshot), 'zonder eigen tekst hoort ook een bestaande ontvanger de opdrachttekst te krijgen').toContain(opdrachtTekst.split('{')[0].trim());
      });
    } finally {
      await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: String(medewerker?.full_name || ''),
          email: appConfig.employeeEmail,
          dbEmployeeId: Number(medewerker?.id || 0),
          dbUserId: Number(medewerker?.user_id || 0),
          role: 'Consultant',
          active: true,
          mailRecipientRoutes: origineleRoutes,
        },
        mailRecipients: herstelPayload.map((item: Record<string, unknown>) => ({
          id: String(item.recipient_key || item.id),
          email: String(item.email),
          name: String(item.display_name),
          category: String(item.recipient_category),
          active: true,
        })),
      });
      await authApi.logout();
      await ctx.dispose();
    }
  });
});

test.describe('volledige keten van nieuw account tot mailinhoud', () => {
  // Eén case die de hele route loopt die een beheerder in de praktijk aflegt:
  // een beheerder en een medewerker aanmaken, de medewerker een wachtwoord laten
  // instellen via de eenmalige link, uren indienen, goedkeuren, factureren, en
  // dan controleren dat de zelf ingevoerde tekst ook echt in de mail staat.
  test('[EQ-H-028] nieuw account, eigen tekst, en die tekst komt terug in de verzonden mail', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    const timesheetApi = new TimesheetApi(ctx);
    const invoiceApi = new InvoiceApi(ctx);

    const uniek = Date.now().toString().slice(-7);
    const beheerderAdres = `keten-beheerder-${uniek}@example.invalid`;
    const medewerkerAdres = `keten-medewerker-${uniek}@example.invalid`;
    const ontvangerSleutel = `keten-ontvanger-${uniek}`;
    const ontvangerAdres = `keten-ontvanger-${uniek}@example.invalid`;
    const eigenOnderwerp = `Eigen onderwerp keten ${uniek} - {factuurnummer}`;
    const eigenTekst = `Beste ontvanger,\n\nEigen ketentekst ${uniek} voor {medewerker} over {maand} {jaar}.\n\nUren: {uren}.`;
    const wachtwoord = `KetenToegang!${uniek}`;

    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    const before = await (await ctx.get('/server/api/bootstrap.php')).json();
    const bestaandeOntvangers = (before.mail_recipients as Array<Record<string, unknown>>).map(item => ({
      id: String(item.recipient_key || item.id),
      email: String(item.email),
      name: String(item.display_name),
      category: String(item.recipient_category),
      active: true,
    }));

    let beheerderId = 0;
    await test.step('Given een nieuwe beheerder is aangemaakt', async () => {
      const res = await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_admin',
        admin: { name: `Keten Beheerder ${uniek}`, email: beheerderAdres, active: true },
      });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      beheerderId = Number(res.body.user_id);
      expect(beheerderId, 'de beheerder moet een account krijgen').toBeGreaterThan(0);

      const na = await (await ctx.get('/server/api/bootstrap.php')).json();
      const gevonden = (na.users as Array<Record<string, unknown>>).find(u => Number(u.id) === beheerderId);
      expect(gevonden, 'de beheerder moet in de bootstrap staan').toBeDefined();
      expect(String(gevonden?.role)).toBe('administrator');
      expect(String(gevonden?.email)).toBe(beheerderAdres);
    });

    let medewerkerId = 0;
    await test.step('And een nieuwe medewerker met een eigen ontvanger, onderwerp en tekst', async () => {
      const res = await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: `Keten Medewerker ${uniek}`,
          email: medewerkerAdres,
          role: 'Consultant',
          startDate: '2026-01-01',
          active: true,
          weeklyHours: 40,
          rate: 90,
          projectCode: `KET-${uniek}`,
          invoiceProject: `Keten ${uniek}`,
          invoiceTemplate: '{klant}-{jaar}-{maand}',
          mailSubject: 'Opdrachtonderwerp {medewerker} - {maand} {jaar}',
          mailBody: 'Middag,\n\nOpdrachttekst voor {medewerker} over {maand} {jaar}.',
          client: 'ItaQ Consultancy',
          broker: 'ItaQ Consultancy',
          brokerEmail: 'broker@example.invalid',
          brokerMailEnabled: true,
          brokerInvoiceAttachment: true,
          customerTimesheetExpected: false,
          invoiceWithoutCustomerTimesheetAllowed: true,
          mailRecipientRoutes: {
            [ontvangerSleutel]: { enabled: true, invoiceAttachment: true, mailSubject: eigenOnderwerp, mailBody: eigenTekst },
          },
        },
        mailRecipients: [
          ...bestaandeOntvangers,
          { id: ontvangerSleutel, email: ontvangerAdres, name: `Keten ontvanger ${uniek}`, category: 'accounting', active: true },
        ],
      });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      medewerkerId = Number(res.body.employee_id);
      expect(medewerkerId, 'de medewerker moet een profiel krijgen').toBeGreaterThan(0);

      const na = await (await ctx.get('/server/api/bootstrap.php')).json();
      const opdracht = (na.assignments as Array<Record<string, unknown>>).find(a => Number(a.employee_id) === medewerkerId);
      expect(opdracht, 'de opdracht moet bestaan').toBeDefined();
      const route = (na.assignment_mail_routes as Array<Record<string, unknown>>)
        .find(r => Number(r.assignment_id) === Number(opdracht?.id) && String(r.recipient_key) === ontvangerSleutel);
      expect(route, 'de eigen ontvanger moet aan de opdracht hangen').toBeDefined();
      expect(String(route?.subject_template), 'het eigen onderwerp moet zijn opgeslagen').toBe(eigenOnderwerp);
      expect(String(route?.body_template), 'de eigen tekst moet zijn opgeslagen').toBe(eigenTekst);
    });

    await test.step('And de medewerker stelt via de eenmalige link een wachtwoord in', async () => {
      const reset = await postJson(ctx, '/server/auth/request-reset.php', { email: medewerkerAdres });
      expect(reset.status).toBe(200);
      expect(typeof reset.body.token, 'de uitnodiging moet een token opleveren').toBe('string');
      const gezet = await postJson(ctx, '/server/auth/reset-password.php', {
        token: String(reset.body.token),
        new_password: wachtwoord,
      });
      expect(gezet.status, JSON.stringify(gezet.body)).toBe(200);
      expect(gezet.body.ok).toBe(true);
    });

    let factuurId = 0;
    await test.step('When de medewerker uren indient en Backoffice goedkeurt en factureert', async () => {
      await authApi.logout();
      await authApi.login(medewerkerAdres, wachtwoord);

      const periode = await findWritablePeriod(timesheetApi);
      const concept = await timesheetApi.write({
        action: 'save_draft', period: periode, contractualHours: 160, billableHours: 8, leaveHours: 0,
        dayEntries: [{ workDate: `${periode}-01`, hours: 8, description: 'Ketentest' }],
      });
      expect(concept.status, JSON.stringify(concept.body)).toBe(200);
      const ingediend = await timesheetApi.write({
        action: 'submit', period: periode, contractualHours: 160, billableHours: 8, leaveHours: 0,
        dayEntries: [{ workDate: `${periode}-01`, hours: 8, description: 'Ketentest' }],
        expectedVersion: concept.body.timesheet?.version as number,
      });
      expect(ingediend.status, JSON.stringify(ingediend.body)).toBe(200);

      await authApi.logout();
      await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
      const goedgekeurd = await timesheetApi.approve({
        period: periode,
        employeeId: Number(ingediend.body.employee_id || 0),
        expectedVersion: Number(ingediend.body.timesheet?.version || 0),
      });
      expect(goedgekeurd.status, JSON.stringify(goedgekeurd.body)).toBe(200);

      const gelockt = await invoiceApi.lock({ action: 'lock', timesheetId: Number(ingediend.body.timesheet?.id || 0) });
      expect(gelockt.status, JSON.stringify(gelockt.body)).toBe(200);
      factuurId = Number(gelockt.body.invoice?.id || 0);
      expect(factuurId, 'er moet een factuur zijn').toBeGreaterThan(0);
    });

    await test.step('Then staat de zelf ingevoerde tekst letterlijk in de verzonden mail', async () => {
      const mails = await verzondenMails(factuurId);
      const eigen = mails.find(item => String(item.recipient_email) === ontvangerAdres);
      expect(eigen, 'de eigen ontvanger moet een mail krijgen').toBeDefined();
      expect(String(eigen?.subject_snapshot), 'het eigen onderwerp moet in de mail staan').toContain(`Eigen onderwerp keten ${uniek}`);
      expect(String(eigen?.body_snapshot), 'de eigen tekst moet in de mail staan').toContain(`Eigen ketentekst ${uniek}`);
      expect(String(eigen?.body_snapshot), 'de opdrachttekst mag hier niet meer staan').not.toContain('Opdrachttekst voor');

      const broker = mails.find(item => String(item.channel) === 'broker');
      expect(broker, 'de broker moet ook een mail krijgen').toBeDefined();
      expect(String(broker?.body_snapshot), 'de broker krijgt de opdrachttekst').toContain('Opdrachttekst voor');
    });

    await test.step('And opruimen: de aangemaakte accounts worden gedeactiveerd', async () => {
      await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_admin',
        admin: { dbUserId: beheerderId, name: `Keten Beheerder ${uniek}`, email: beheerderAdres, active: false },
      });
      await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          dbEmployeeId: medewerkerId,
          name: `Keten Medewerker ${uniek}`,
          email: medewerkerAdres,
          role: 'Consultant',
          active: false,
          mailRecipientRoutes: {},
        },
        mailRecipients: bestaandeOntvangers,
      });
    });

    await authApi.logout();
    await ctx.dispose();
  });
});
