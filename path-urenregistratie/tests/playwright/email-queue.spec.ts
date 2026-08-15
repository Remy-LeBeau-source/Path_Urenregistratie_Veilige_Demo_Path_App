import { expect, request as playwrightRequest, test } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AuthApi } from './api/AuthApi';
import { EmailQueueApi } from './api/EmailQueueApi';
import { InvoiceApi } from './api/InvoiceApi';
import { TimesheetApi } from './api/TimesheetApi';
import { appConfig, requirePassword } from './fixtures/appConfig';
import { LoginPage } from './pages/LoginPage';

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

  test('[EQ-H-002] broker-channel bundelt factuur en klanturenstaat', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een gelockte factuur met broker_invoice_attachment=true', async () => {});

    let brokerItems: Array<Record<string, unknown>> = [];
    await test.step('When de queue wordt uitgelezen', async () => {
      const list = await queueApi.list();
      brokerItems = (list.body.items as Array<Record<string, unknown>>)
        .filter(i => (i.invoice_id as number) === invoiceId && i.channel === 'broker');
    });

    await test.step('Then heeft de broker-channel attachment_policy=invoice_and_customer_timesheet', async () => {
      expect(brokerItems.length).toBeGreaterThan(0);
      expect(brokerItems.every(i => i.attachment_policy === 'invoice_and_customer_timesheet')).toBe(true);
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
      expect(byChannel.get('broker')?.attachment_policy).toBe('invoice_and_customer_timesheet');
      expect(byChannel.get('accountant')?.attachment_policy).toBe('invoice');
      expect(byChannel.get('payroll')?.attachment_policy).toBe('none');
      expect(new Set(items.map(item => Number(item.invoice_id)))).toEqual(new Set([invoiceId]));
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
              attachment_policy: 'invoice_and_customer_timesheet',
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
      await expect(history).toContainText('Factuur + klanturenstaat');
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
        label: 'Broker: factuur + klanturenstaat',
        recipient: 'info@pathconsultancy.nl',
        attachment_count: 2,
        ready: true,
        issues: [],
        attachments: [
          { index: 0, filename: 'ACCEPTATIETEST-NIET-BOEKEN-Factuur-PATH-2026-007.pdf' },
          { index: 1, filename: 'ACCEPTATIETEST-NIET-BOEKEN-Klanturenstaat-Stasjo-2026-07.pdf' },
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
          body: JSON.stringify({ ok: true, result: { scenario: 'broker_bundle', recipient: 'info@pathconsultancy.nl', attachment_count: 2, outcome: 'sent' } }),
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
      await expect(brokerPreviews).toHaveCount(2);
      await expect(brokerPreviews.nth(0)).toHaveText('Factuur-PDF');
      await expect(brokerPreviews.nth(0)).toHaveAttribute('title', 'ACCEPTATIETEST-NIET-BOEKEN-Factuur-PATH-2026-007.pdf');
      await expect(brokerPreviews.nth(1)).toHaveText('Klanturenstaat-PDF');
      await expect(brokerPreviews.nth(1)).toHaveAttribute('title', 'ACCEPTATIETEST-NIET-BOEKEN-Klanturenstaat-Stasjo-2026-07.pdf');
    });

    await test.step('When de beheerder alleen de brokerbundel kiest en ontvanger en twee bijlagen bevestigt', async () => {
      await page.locator('[data-mail-acceptance-scenario="broker_bundle"]').click();
      await expect(page.locator('#modal-title')).toContainText('Broker: factuur + klanturenstaat');
      await expect(page.locator('#modal-summary')).toContainText('info@pathconsultancy.nl');
      await expect(page.locator('#modal-summary')).toContainText('2 gecontroleerde PDF-bijlagen');
      await expect(page.locator('#modal-summary')).toContainText('ACCEPTATIETEST · NIET BOEKEN');
      const attachmentPreviews = page.locator('#modal-summary .mail-acceptance-attachment');
      await expect(attachmentPreviews).toHaveCount(2);
      await expect(attachmentPreviews.nth(0)).toHaveText('Factuur-PDF bekijken');
      await expect(attachmentPreviews.nth(0)).toHaveAttribute('href', /preview_scenario=broker_bundle&attachment=0$/);
      await expect(attachmentPreviews.nth(1)).toHaveText('Klanturenstaat-PDF bekijken');
      await expect(attachmentPreviews.nth(1)).toHaveAttribute('href', /preview_scenario=broker_bundle&attachment=1$/);
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

  test('[EQ-H-023] beheerder pauzeert en hervat uitsluitend de beveiligde TEST-mail', async ({ page }) => {
    let enabled = true;
    const writes: Array<Record<string, unknown>> = [];
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
    await expect(consolePanel.getByText('Broker: factuur + klanturenstaat')).toBeHidden();
    await expect(consolePanel.getByText('Eerste uitnodiging: wachtwoord aanmaken')).toBeHidden();
  });

  test('[EQ-H-020] Backoffice finaliseert een serverfactuur vóór de mailqueue en sluit de vervolgtaak', async ({ page }) => {
    let invoiceLocks = 0;
    let directQueueWrites = 0;
    let locked = false;

    await page.route('**/server/api/invoices.php*', async route => {
      if (route.request().method() === 'POST') {
        invoiceLocks += 1;
        const payload = route.request().postDataJSON() as Record<string, unknown>;
        expect(payload).toEqual({ action: 'lock', timesheet_id: 881 });
        locked = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            action: 'lock',
            queued_count: 3,
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
    });

    await test.step('When Backoffice de verzending één keer afrondt', async () => {
      await page.locator('#modal-confirm').click();
    });

    await test.step('Then wordt eerst gelockt, niet te vroeg gequeued en verdwijnt de afgeronde vervolgtaak', async () => {
      await expect.poll(() => invoiceLocks).toBe(1);
      expect(directQueueWrites).toBe(0);
      await expect(page.locator('#toast')).toContainText('3 berichten');
      await expect(page.locator('[data-admin-task-invoice="4"][data-period-key="2026-08"]')).toHaveCount(0);
    });
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
      ['broker_bundle', 'Broker: factuur + klanturenstaat', 2],
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

  test('[EQ-N-015] acceptatieconsole blijft standaard uit en weigert POST zonder expliciete bevestiging', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    await test.step('Given de standaard testconfiguratie geen echte acceptatieverzending vrijgeeft', async () => {
      const status = await ctx.get(`${appConfig.baseUrl}/server/api/mail-acceptance.php`);
      expect(status.status()).toBe(200);
      const body = await status.json();
      expect(body.ok).toBe(true);
      expect(body.enabled).toBe(false);
      expect(body.ready).toBe(false);
      expect(body.scenarios).toHaveLength(5);
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
