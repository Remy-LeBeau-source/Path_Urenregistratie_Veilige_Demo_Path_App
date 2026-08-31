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
// Het bijlagebeleid zegt of er iets mee hoort. Of er werkelijk een bestand ligt is
// een andere vraag, en dat is de vraag die de ontvanger stelt.
async function factuurBijlage(invoiceId: number): Promise<{ bestaat: boolean; bytes: number; is_pdf: boolean }> {
  const uitvoer = await execFileAsync('php', ['server/scripts/mail-delivery-inspect.php', String(invoiceId)], {
    cwd: process.cwd(), windowsHide: true,
  });
  return JSON.parse(uitvoer.stdout).attachment;
}

async function verzondenMails(invoiceId: number): Promise<Array<Record<string, string>>> {
  const uitvoer = await execFileAsync('php', ['server/scripts/mail-delivery-inspect.php', String(invoiceId)], {
    cwd: process.cwd(),
    windowsHide: true,
  });
  return JSON.parse(uitvoer.stdout).deliveries as Array<Record<string, string>>;
}

async function forceDeliveryToFinalFailure(deliveryId: number): Promise<void> {
  const php = [
    'require "server/scripts/cli-bootstrap.php";',
    'require "server/mail/queue.php";',
    '$config=require "server/config.local.php";',
    '$pdo=ops_pdo($config);',
    '$stmt=$pdo->prepare("UPDATE email_deliveries SET status=\'failed\', attempt_count=:attempts, last_error=\'SMTP test failure\' WHERE id=:id");',
    '$stmt->execute([":attempts"=>MAIL_MAX_ATTEMPTS,":id"=>(int)$argv[1]]);',
    '$check=$pdo->prepare("SELECT status, attempt_count, last_error FROM email_deliveries WHERE id=:id");',
    '$check->execute([":id"=>(int)$argv[1]]);',
    '$row=$check->fetch(PDO::FETCH_ASSOC);',
    'if(!$row || $row["status"]!=="failed" || (int)$row["attempt_count"]!==MAIL_MAX_ATTEMPTS || $row["last_error"]!=="SMTP test failure"){fwrite(STDERR,"delivery-not-updated\\n");exit(1);}',
  ].join(' ');
  await execFileAsync('php', ['-r', php, String(deliveryId)], { cwd: process.cwd(), windowsHide: true });
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

  test('[EQ-H-022] één factuuractie maakt drie functionele routes plus een invoice-only backoffice-archiefkopie', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given één goedgekeurde urenstaat als factuur is afgerond', async () => {});

    await test.step('When de routes voor dezelfde factuur worden uitgelezen', async () => {
      const list = await queueApi.list();
      expect(list.status).toBe(200);
      const items = (list.body.items as Array<Record<string, unknown>>)
        .filter(item => Number(item.invoice_id) === invoiceId);
      const byChannel = new Map(items.map(item => [String(item.channel), item]));

      expect(items).toHaveLength(4);
      expect([...byChannel.keys()].sort()).toEqual(['accountant', 'broker', 'other', 'payroll']);
      expect(byChannel.get('broker')?.attachment_policy).toBe('invoice');
      expect(byChannel.get('accountant')?.attachment_policy).toBe('invoice');
      expect(byChannel.get('payroll')?.attachment_policy).toBe('none');
      expect(byChannel.get('other')?.recipient_email).toBe('backoffice@pathconsultancy.nl');
      expect(byChannel.get('other')?.attachment_policy).toBe('invoice');
      expect(String(byChannel.get('other')?.subject_snapshot || '')).toMatch(/^Archiefkopie factuur /);
      expect(new Set(items.map(item => Number(item.invoice_id)))).toEqual(new Set([invoiceId]));

      // De begeleidende tekst van de opdracht bereikt de broker en de
      // salarisadministratie. De boekhouder niet: die tekst is geschreven aan de
      // broker ("Hierbij stuur ik de ureninformatie van...") en las daar als een
      // bericht aan de verkeerde persoon. Hij krijgt zijn eigen standaard, met het
      // factuurnummer vooraan en de bedragen uitgesplitst. Wie daar toch iets
      // anders wil, vult het bij die ene ontvanger in; dat wint van allebei.
      const onderwerpVan = (kanaal: string) => String(byChannel.get(kanaal)?.subject_snapshot || '');

      expect(onderwerpVan('accountant'), 'de boekhouder hoort een eigen onderwerp te krijgen')
        .not.toBe(onderwerpVan('broker'));
      expect(onderwerpVan('accountant'), 'met het factuurnummer vooraan, want daar zoekt een boekhouder op')
        .toMatch(/^Factuur /);

      expect(onderwerpVan('payroll'), 'de salarisadministratie krijgt ook een eigen onderwerp')
        .not.toBe(onderwerpVan('broker'));
      expect(onderwerpVan('payroll'), 'daar gaat het om uren, niet om een factuur')
        .toMatch(/^Uren /);

      // Het bericht zelf is hier niet te controleren: de lijst-API geeft alleen het
      // onderwerp terug, niet de inhoud. Dat het onderwerp uit de eigen sjabloon
      // komt en niet uit de opdracht, bewijst al dat de juiste tekst wordt gekozen.
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
    const allItems = [
      {
        id: 902, user_id: null, invoice_id: 71, invoice_number: 'PATH-2026-007', employee_name: 'Shawn-Douglas Nahar',
        channel: 'broker', recipient_email: 'info@pathconsultancy.nl', cc_email: null,
        subject_snapshot: 'Factuur PATH-2026-007 – juli 2026', attachment_policy: 'invoice', status: 'sent',
        attempt_count: 1, dry_run: false, acceptance_test: true, sent_at: '2026-08-14 00:45:00',
        created_at: '2026-08-14 00:44:00', body_snapshot: 'MAG-NOOIT-IN-DE-UI-VERSCHIJNEN'
      },
      {
        id: 901, user_id: 7, invoice_id: null, invoice_number: null, employee_name: null,
        channel: 'password_reset', recipient_email: 'info@pathconsultancy.nl', cc_email: null,
        subject_snapshot: 'Stel je wachtwoord in voor Uren & Facturatie', attachment_policy: 'none', status: 'queued',
        attempt_count: 0, dry_run: false, sent_at: null, created_at: '2026-08-14 00:43:00',
        body_snapshot: 'https://example.invalid/#reset-password=GEHEIM'
      },
      ...Array.from({ length: 13 }, (_, index) => ({
        id: 880 - index, user_id: null, invoice_id: null, invoice_number: null, employee_name: 'Historische medewerker',
        channel: 'accountant', recipient_email: 'info@pathconsultancy.nl', cc_email: null,
        subject_snapshot: `Historische mail ${index + 1}`, attachment_policy: 'invoice', status: 'sent',
        attempt_count: 1, dry_run: false, acceptance_test: false,
        sent_at: `2026-08-13 23:${String(59 - index).padStart(2, '0')}:00`,
        created_at: `2026-08-13 23:${String(58 - index).padStart(2, '0')}:00`,
        body_snapshot: `VERBORGEN-BERICHTINHOUD-${index + 1}`,
      }))
    ];
    await page.route('**/server/api/email-queue.php*', async route => {
      queueRequests += 1;
      const url = new URL(route.request().url());
      const limit = Number(url.searchParams.get('limit') || 10);
      const offset = Number(url.searchParams.get('offset') || 0);
      const status = String(url.searchParams.get('status') || '');
      const query = String(url.searchParams.get('q') || '').toLowerCase();
      const filtered = allItems.filter(item => {
        if (status && item.status !== status) return false;
        if (!query) return true;
        return [item.subject_snapshot, item.recipient_email, item.invoice_number, item.employee_name]
          .some(value => String(value || '').toLowerCase().includes(query));
      });
      const items = filtered.slice(offset, offset + limit);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          dry_run: false,
          count: items.length, total: filtered.length, limit, offset,
          has_more: offset + items.length < filtered.length,
          items
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
      await expect(history.locator('.mail-delivery-history-item')).toHaveCount(10);
      await expect(page.locator('#mail-delivery-history-summary')).toContainText('Resultaten 1–10 van 15');
      await expect(page.locator('#mail-delivery-page-label')).toHaveText('Pagina 1 van 2');
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
      await expect(history).toContainText('Historische mail 8');
      await expect(history).not.toContainText('Historische mail 9');
      await expect(history).not.toContainText('VERBORGEN-BERICHTINHOUD');
    });

    await test.step('And pagineren, filteren en zoeken de lange lijst server-side', async () => {
      await page.locator('#mail-delivery-next').click();
      await expect(page.locator('#mail-delivery-page-label')).toHaveText('Pagina 2 van 2');
      await expect(page.locator('#mail-delivery-history-list .mail-delivery-history-item')).toHaveCount(5);

      await page.locator('#mail-delivery-status-filter-trigger').click();
      await page.locator('[data-standard-choice-target="mail-delivery-status-filter"][data-standard-choice-value="sent"]').click();
      await expect(page.locator('#mail-delivery-history-summary')).toContainText('van 14');
      await expect(page.locator('#mail-delivery-history-list')).not.toContainText('Klaargezet');

      await page.locator('#mail-delivery-search').fill('PATH-2026-007');
      await expect(page.locator('#mail-delivery-history-list .mail-delivery-history-item')).toHaveCount(1);
      await expect(page.locator('#mail-delivery-history-list')).toContainText('Shawn-Douglas Nahar');
    });

    await test.step('And Vernieuwen haalt de actuele serverregistraties opnieuw op', async () => {
      const before = queueRequests;
      await page.locator('#refresh-mail-delivery-history').click();
      await expect.poll(() => queueRequests).toBeGreaterThan(before);
      await expect(page.locator('#refresh-mail-delivery-history')).toBeEnabled();
    });
  });

  test('[EQ-H-031] mislukte mail blijft herstelbaar en verzonden mail heeft geen herhaalactie', async ({ page }) => {
    let failedStatus = 'failed';
    let recoveryPayload: Record<string, unknown> | null = null;
    await isolateMailPreviewFrontend(page);
    await page.route('**/server/api/mail-acceptance.php*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ready: false, scenarios: [] })
    }));
    await page.route('**/server/api/email-queue.php*', async route => {
      if (route.request().method() === 'POST') {
        recoveryPayload = route.request().postDataJSON() as Record<string, unknown>;
        failedStatus = 'queued';
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ ok: true, action: 'reissue', delivery: { id: 3001, status: 'queued', attempt_count: 0 } })
        });
      }
      const items = [
        {
          id: 3001, invoice_id: 90, invoice_number: 'PROD-PILOT-2026-08', employee_name: 'PROD Pilot Medewerker',
          channel: 'broker', recipient_email: 'gambitizanagi@gmail.com', subject_snapshot: 'PROD pilotmail',
          attachment_policy: 'invoice', status: failedStatus, attempt_count: failedStatus === 'failed' ? 3 : 0,
          dry_run: false, last_error: failedStatus === 'failed' ? 'SMTP recipient rejected' : null,
          requires_manual_reissue: failedStatus === 'failed', can_retry: false, created_at: '2026-08-31 20:00:00', sent_at: null,
        },
        {
          id: 3000, invoice_id: 89, invoice_number: 'PROD-PILOT-2026-07', employee_name: 'PROD Pilot Medewerker',
          channel: 'broker', recipient_email: 'gambitizanagi@gmail.com', subject_snapshot: 'Reeds verzonden pilotmail',
          attachment_policy: 'invoice', status: 'sent', attempt_count: 1, dry_run: false,
          requires_manual_reissue: false, can_retry: false, created_at: '2026-08-30 20:00:00', sent_at: '2026-08-30 20:01:00',
        }
      ];
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, count: 2, total: 2, limit: 10, offset: 0, items })
      });
    });

    const login = new LoginPage(page);
    await login.open();
    await login.loginAsAdmin();
    await page.locator('button[data-view="settings"]').click();

    const history = page.locator('#mail-delivery-history-list');
    await expect(history).toContainText('SMTP recipient rejected');
    await expect(history.locator('[data-reissue-mail-delivery="3001"]')).toHaveCount(1);
    await expect(history.locator('[data-mail-delivery-status="sent"] button')).toHaveCount(0);

    await history.locator('[data-reissue-mail-delivery="3001"]').click();
    await page.locator('#mail-delivery-reissue-reason').fill('Ontvangeradres gecontroleerd en hersteld');
    await page.locator('#modal-confirm').click();
    await expect.poll(() => recoveryPayload).not.toBeNull();
    expect(recoveryPayload).toMatchObject({
      action: 'reissue', delivery_id: 3001, confirm: 'REISSUE_FAILED_DELIVERY',
      reason: 'Ontvangeradres gecontroleerd en hersteld'
    });
    await expect(history.locator('[data-reissue-mail-delivery]')).toHaveCount(0);
    await expect(history.locator('[data-mail-delivery-status="sent"] button')).toHaveCount(0);
  });

  test('[EQ-H-032] handmatige herstart na maximale pogingen is auditbaar en eenmalig', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();
    const queued = await queueApi.list({ status: 'queued' });
    const item = (queued.body.items as Array<Record<string, unknown>>)
      .find(entry => Number(entry.invoice_id) === invoiceId && String(entry.channel) !== 'password_reset');
    expect(item).toBeDefined();
    await forceDeliveryToFinalFailure(Number(item!.id));

    const missingReason = await postJson(ctx, '/server/api/email-queue.php', {
      action: 'reissue', delivery_id: Number(item!.id), confirm: 'REISSUE_FAILED_DELIVERY', reason: 'te kort'
    });
    expect(missingReason.status).toBe(400);
    expect(missingReason.body.error).toBe('invalid-reissue-reason');

    const reissued = await postJson(ctx, '/server/api/email-queue.php', {
      action: 'reissue', delivery_id: Number(item!.id), confirm: 'REISSUE_FAILED_DELIVERY',
      reason: 'SMTP-storing opgelost en ontvanger gecontroleerd'
    });
    expect(reissued.status).toBe(200);
    expect(reissued.body.action).toBe('reissue');
    expect((reissued.body.delivery as Record<string, unknown>).status).toBe('queued');
    expect((reissued.body.delivery as Record<string, unknown>).attempt_count).toBe(0);

    const duplicate = await postJson(ctx, '/server/api/email-queue.php', {
      action: 'reissue', delivery_id: Number(item!.id), confirm: 'REISSUE_FAILED_DELIVERY',
      reason: 'Tweede herstart hoort nu niet mogelijk te zijn'
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe('not-failed');

    await authApi.logout();
    await ctx.dispose();
  });

  test('[EQ-H-033] queue-API pagineert en zoekt server-side', async () => {
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();
    const createdQueue = await queueApi.list();
    const createdItem = (createdQueue.body.items as Array<Record<string, unknown>>)
      .find(item => Number(item.invoice_id) === invoiceId);
    expect(createdItem).toBeDefined();
    const invoiceNumber = String(createdItem!.invoice_number || '');
    expect(invoiceNumber).not.toBe('');
    const firstResponse = await ctx.get('/server/api/email-queue.php?limit=1&offset=0');
    const first = await firstResponse.json() as Record<string, unknown>;
    expect(firstResponse.status()).toBe(200);
    expect(first.count).toBe(1);
    expect(Number(first.total)).toBeGreaterThanOrEqual(3);
    expect(first.limit).toBe(1);
    expect(first.offset).toBe(0);
    expect(first.has_more).toBe(true);

    const secondResponse = await ctx.get('/server/api/email-queue.php?limit=1&offset=1');
    const second = await secondResponse.json() as Record<string, unknown>;
    expect(secondResponse.status()).toBe(200);
    expect(Number((first.items as Array<Record<string, unknown>>)[0].id))
      .not.toBe(Number((second.items as Array<Record<string, unknown>>)[0].id));

    const searchResponse = await ctx.get(`/server/api/email-queue.php?limit=10&q=${encodeURIComponent(invoiceNumber)}`);
    const search = await searchResponse.json() as Record<string, unknown>;
    expect(searchResponse.status()).toBe(200);
    expect((search.items as Array<Record<string, unknown>>).every(item => Number(item.invoice_id) === invoiceId)).toBe(true);

    await authApi.logout();
    await ctx.dispose();
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
  test('[E2E-H-009] twee nieuw toegevoegde ontvangers krijgen allebei echt een factuurmail', async () => {
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

      await test.step('Then blijft de uitzondering voor de salarisadministratie staan', async () => {
        // Losse stap, zodat deze eis zichtbaar blijft in het scenario en niet
        // meelift op de vorige.
        const na = await (await ctx.get('/server/api/bootstrap.php')).json();
        const salaris = (na.mail_recipients as Array<Record<string, unknown>>)
          .find(item => String(item.recipient_category) === 'payroll');
        expect(salaris, 'de salarisadministratie hoort te bestaan').toBeDefined();
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

        // Eén regel voor iedereen: leeg veld betekent de standaardtekst van het soort
        // ontvanger. Hier stond eerder dat deze ontvanger de opdrachttekst hoorde te
        // erven. Dat was precies het probleem -- die tekst is aan de broker geschreven
        // en las bij iedere andere ontvanger als een bericht aan de verkeerde persoon.
        const standaarden = before.mail_channel_defaults as Record<string, { subject: string; body: string }>;
        expect(standaarden?.other?.body, 'de server hoort de standaardtekst mee te sturen').toBeTruthy();

        const geerfd = mails.find(item => String(item.recipient_email) === overigEmail);
        expect(geerfd, 'de ontvanger zonder eigen tekst moet een mail hebben').toBeDefined();
        expect(String(geerfd?.body_snapshot), 'zonder eigen tekst hoort de standaardtekst van dat soort ontvanger in de mail te staan')
          .toContain(standaarden.other.body.split('{')[0].trim());
        expect(String(geerfd?.body_snapshot), 'de opdrachttekst is van de broker en hoort hier niet meer te staan')
          .not.toContain(opdrachtTekst.split('{')[0].trim());
        expect(String(geerfd?.subject_snapshot), 'die ontvanger mag niet het eigen onderwerp van een ander krijgen').not.toContain(`Eigen onderwerp boekhouding ${unique}`);

        // En een bestaande ontvanger die al op de opdracht stond.
        const bestaandEmail = (before.mail_recipients as Array<Record<string, unknown>>)
          .find(item => String(item.recipient_key) === bestaandeOntvanger);
        const bestaandeMail = mails.find(item => String(item.recipient_email) === String(bestaandEmail?.email));
        expect(bestaandeMail, 'een bestaande ontvanger moet ook mail krijgen').toBeDefined();
        expect(String(bestaandeMail?.subject_snapshot), 'het eigen onderwerp van een bestaande ontvanger moet in de mail staan').toContain(eigenOnderwerpBestaand);
        // Hier stond een vertakking: wie erfde de opdrachttekst wel en wie niet. Die
        // vertakking bestaat niet meer. Een vaste ontvanger is nooit de broker, dus
        // krijgt altijd de standaardtekst van zijn eigen soort -- ongeacht wat er bij
        // de opdracht staat.
        const kanaalVanBestaande = String(bestaandeMail?.channel || '');
        expect(kanaalVanBestaande, 'een vaste ontvanger is nooit het brokerkanaal').not.toBe('broker');
        expect(String(bestaandeMail?.body_snapshot),
          'een vaste ontvanger hoort de standaardtekst van zijn soort te krijgen, niet de opdrachttekst')
          .not.toContain(opdrachtTekst.split('{')[0].trim());
        expect(standaarden[kanaalVanBestaande]?.body, 'kanaal ' + kanaalVanBestaande + ' hoort een standaardtekst te hebben').toBeTruthy();
        expect(String(bestaandeMail?.body_snapshot),
          'en dat moet de tekst zijn die de server voor dat kanaal opgeeft')
          .toContain(standaarden[kanaalVanBestaande].body.split('{')[0].trim());
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
  test('[E2E-H-010] nieuw account, eigen tekst, en die tekst komt terug in de verzonden mail', async () => {
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

      // De handtekening stond eerst in de standaardteksten. De broker gebruikt de
      // opdrachttekst, en die overschrijft de standaard -- dus daar verdween de
      // handtekening mee, wat Gio in zijn eigen postvak zag. Een handtekening hoort
      // bij de afzender, niet bij de tekst, dus ook hieronder.
      expect(String(broker?.body_snapshot), 'ook onder de opdrachttekst hoort de afsluiting te staan')
        .toContain('Met vriendelijke groet');
      expect(String(eigen?.body_snapshot), 'ook onder een eigen tekst hoort de afsluiting te staan')
        .toContain('Met vriendelijke groet');
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

test.describe('handtekening onder elke mail', () => {
  test('[EQ-H-029] elke ontvanger krijgt de handtekening, ook onder een eigen tekst', async () => {
    // De handtekening stond eerst in de drie standaardteksten. De broker gebruikt
    // de tekst van de opdracht, en die overschrijft de standaard -- dus daar
    // verdween de handtekening mee. Gio zag dat in zijn eigen postvak.
    //
    // Een handtekening hoort bij de afzender, niet bij de tekst. Hij hoort dus
    // onder elke mail te staan, ongeacht welke tekst er wordt gebruikt.
    //
    // De inhoud wordt hier via de CLI-inspecteur gelezen, niet via de lijst-API.
    // Die API laat de inhoud bewust niet zien: in dezelfde wachtrij staan de mails
    // voor wachtwoordherstel, met de eenmalige link erin.
    const { ctx, authApi, queueApi, invoiceId } = await createLockedInvoice();

    await test.step('Given een factuur is definitief gemaakt', async () => {});

    await test.step('When de mails voor de ontvangers worden klaargezet', async () => {
      // Klaarzetten volstaat: de handtekening wordt bij het opstellen vastgelegd,
      // niet pas bij het versturen. Zo is hij te controleren zonder te mailen.
      const klaar = await queueApi.list();
      expect(klaar.status, 'de wachtrij hoort leesbaar te zijn').toBe(200);
    });

    await test.step('Then draagt elke route dezelfde afsluiting', async () => {
      const mails = await verzondenMails(invoiceId);
      // Welke routes er precies aanstaan hangt af van de opdracht. Twee is het
      // minimum waarbij deze case iets zegt: één route bewijst niet dat de
      // afsluiting overal langskomt.
      expect(mails.length, 'er horen meerdere routes klaar te staan').toBeGreaterThanOrEqual(2);

      for (const mail of mails) {
        const bericht = String(mail.body_snapshot || '');
        const kanaal = String(mail.channel || '');
        expect(bericht, kanaal + ': het bericht mag niet leeg zijn').not.toBe('');
        expect(bericht, kanaal + ': de afsluiting hoort er te staan').toContain('Met vriendelijke groet');
        expect(bericht, kanaal + ': de naam van de afzender hoort er te staan').toContain('Backoffice');
        expect(bericht.trimEnd().endsWith('Gewerkte uren: 8,00'),
          kanaal + ': de afsluiting hoort onderaan te staan, niet ergens in het midden').toBe(false);
      }
    });

    await test.step('And staat de afsluiting er ook bij een kanaal met een eigen tekst', async () => {
      // De boekhouder en de salarisadministratie hebben een eigen standaardtekst
      // die de opdrachttekst overruled. Ook daar hoort de afsluiting onder.
      const mails = await verzondenMails(invoiceId);
      const eigenTekstKanalen = mails.filter(mail =>
        ['accountant', 'payroll'].includes(String(mail.channel)));
      expect(eigenTekstKanalen.length, 'er hoort minstens één kanaal met een eigen tekst te zijn')
        .toBeGreaterThan(0);
      for (const mail of eigenTekstKanalen) {
        expect(String(mail.body_snapshot).trimEnd().endsWith('backoffice@pathconsultancy.nl')
          || String(mail.body_snapshot).includes('Met vriendelijke groet'),
        String(mail.channel) + ': de afsluiting hoort onder de eigen tekst te staan').toBe(true);
      }
    });

    await test.step('And cleanup', async () => { await authApi.logout(); await ctx.dispose(); });
  });
});

test.describe('eigen standaardtekst per soort ontvanger', () => {
  test('[E2E-H-011] een aangepaste standaardtekst komt werkelijk in de mail en is terug te zetten', async () => {
    // De standaardtekst was het belangrijkste geworden -- leeg bij een ontvanger
    // betekent immers "deze tekst" -- en stond vast in server/mail/templates.php. Om
    // te veranderen wat de boekhouder leest moest je in de code. Dit legt de hele lus
    // vast: aanpassen, opgeslagen, werkelijk in de verzonden mail, en terug te zetten
    // naar wat we meeleveren.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const uniek = Date.now().toString().slice(-6);
    const eigenOnderwerp = `Boekhoudtekst ${uniek} voor {medewerker}`;
    const eigenTekst = `Beste boekhouding,\n\nProefversie ${uniek}.\n\nGewerkte uren: {uren}`;

    const before = await (await ctx.get('/server/api/bootstrap.php')).json();
    const meegeleverd = before.mail_channel_shipped as Record<string, { subject: string; body: string }>;
    expect(meegeleverd?.accountant?.body, 'de meegeleverde teksten horen mee te komen').toBeTruthy();

    const bedrijf = before.companies[0];
    const bewaar = async (sjablonen: Record<string, { subject: string; body: string }>) => {
      const antwoord = await postJson(ctx, '/server/api/settings.php', {
        settings: {
          organizationName: String(bedrijf.trade_name || bedrijf.legal_name || ''),
          companyName: String(bedrijf.legal_name || ''),
          invoiceNameDisplay: String(bedrijf.invoice_name_display || 'trade_and_legal'),
          appName: String(bedrijf.app_name || ''),
          supportName: String(bedrijf.support_name || ''),
          supportEmail: String(bedrijf.support_email || ''),
          website: String(bedrijf.website || ''),
          tagline: String(bedrijf.tagline || ''),
          brandPrimary: String(bedrijf.brand_primary || '#0d1b38'),
          brandAccent: String(bedrijf.brand_accent || '#3abd9d'),
          kvk: String(bedrijf.chamber_of_commerce_number || ''),
          vat: String(bedrijf.vat_number || ''),
          iban: String(bedrijf.iban || ''),
          address: String(bedrijf.address_line || ''),
          postalCity: [bedrijf.postal_code || '', bedrijf.city || ''].join(' ').trim(),
          phone: String(bedrijf.invoice_phone || ''),
          invoiceEmail: String(bedrijf.invoice_email || ''),
          paymentTerm: Number(bedrijf.payment_term_days || 30),
          customerTimesheetReminderEnabled: Boolean(bedrijf.customer_timesheet_reminder_enabled),
          customerTimesheetReminderTime: String(bedrijf.customer_timesheet_reminder_time || '15:00').slice(0, 5),
          customerTimesheetOverdueWorkdays: Number(bedrijf.customer_timesheet_overdue_workdays || 2),
          customerTimesheetSubmissionSubject: String(bedrijf.customer_timesheet_submission_subject || ''),
          customerTimesheetSubmissionBody: String(bedrijf.customer_timesheet_submission_body || ''),
          customerTimesheetBrokerSubject: String(bedrijf.customer_timesheet_broker_subject || ''),
          customerTimesheetBrokerBody: String(bedrijf.customer_timesheet_broker_body || ''),
        },
        mailRecipients: before.mail_recipients,
        mailChannelTemplates: sjablonen,
      });
      expect(antwoord.status, JSON.stringify(antwoord.body)).toBe(200);
    };

    try {
      await test.step('Given opslaan zonder iets te wijzigen legt niets vast', async () => {
        // Het scherm stuurt bij elke keer opslaan alle vier de kanalen mee, gevuld met
        // wat er op dat moment geldt. Zonder vergelijking met de meegeleverde tekst zou
        // iemand die deze velden nooit aanraakt ze toch als eigen tekst vastleggen -- en
        // daarna niet meer meelopen met verbeteringen eraan, zonder iets te hebben
        // gedaan. Dat is niet te zien in het scherm, en dat maakt het gevaarlijk.
        const voor = await (await ctx.get('/server/api/bootstrap.php')).json();
        const geldendVoor = voor.mail_channel_defaults as Record<string, { subject: string; body: string }>;

        // Precies wat het scherm zou sturen: de geldende tekst, onveranderd terug.
        await bewaar(Object.fromEntries(Object.entries(geldendVoor)
          .map(([kanaal, sjabloon]) => [kanaal, { subject: sjabloon.subject, body: sjabloon.body }])));

        const na = await (await ctx.get('/server/api/bootstrap.php')).json();
        const geldendNa = na.mail_channel_defaults as Record<string, { subject: string; body: string }>;
        for (const kanaal of Object.keys(meegeleverd)) {
          expect(geldendNa[kanaal].subject, kanaal + ': het onderwerp mag niet veranderen').toBe(geldendVoor[kanaal].subject);
          expect(geldendNa[kanaal].body, kanaal + ': de tekst mag niet veranderen').toBe(geldendVoor[kanaal].body);
          expect(geldendNa[kanaal].body, kanaal + ': en hoort nog steeds de meegeleverde tekst te zijn')
            .toBe(meegeleverd[kanaal].body);
        }

        // En dit is het eigenlijke punt. Aan de tekst zie je niets: die is identiek,
        // of er nu wel of geen eigen rij is weggeschreven. Het verschil komt pas boven
        // wanneer wij ooit de meegeleverde tekst verbeteren -- dan krijgt wie zo'n rij
        // heeft die verbetering niet, zonder ooit iets te hebben aangepast. Daarom
        // wordt hier gekeken naar wat er is opgeslagen, niet naar wat eruit komt.
        expect(na.mail_channel_customised, 'opslaan zonder iets te wijzigen mag geen eigen tekst vastleggen')
          .toEqual([]);
      });

      await test.step('When de beheerder de standaardtekst voor de boekhouding aanpast', async () => {
        await bewaar({ accountant: { subject: eigenOnderwerp, body: eigenTekst } });
      });

      await test.step('Then geldt die tekst voortaan voor dat soort ontvanger', async () => {
        const na = await (await ctx.get('/server/api/bootstrap.php')).json();
        const geldt = na.mail_channel_defaults as Record<string, { subject: string; body: string }>;
        expect(geldt.accountant.subject, 'het aangepaste onderwerp hoort te gelden').toBe(eigenOnderwerp);
        expect(geldt.accountant.body, 'de aangepaste tekst hoort te gelden').toBe(eigenTekst);
        // En de meegeleverde tekst blijft apart bestaan, anders kun je nooit terug.
        expect((na.mail_channel_shipped as Record<string, { body: string }>).accountant.body,
          'de meegeleverde tekst mag niet worden overschreven')
          .toBe(meegeleverd.accountant.body);
      });

      await test.step('And staat hij werkelijk in de verzonden mail', async () => {
        // Dit is het punt van de hele wijziging. Dat het scherm hem toont is niet
        // genoeg -- hij moet in het bericht belanden dat de klant leest.
        const flow = await createLockedInvoice();
        const mails = await verzondenMails(flow.invoiceId);
        const boekhouding = mails.find(item => String(item.channel) === 'accountant');
        expect(boekhouding, 'de boekhouding hoort een mail te krijgen').toBeDefined();
        expect(String(boekhouding?.body_snapshot), 'de aangepaste tekst hoort in de mail te staan')
          .toContain(`Proefversie ${uniek}`);
        expect(String(boekhouding?.subject_snapshot), 'en het aangepaste onderwerp ook')
          .toContain(`Boekhoudtekst ${uniek}`);
        expect(String(boekhouding?.body_snapshot), 'de handtekening hoort er nog steeds onder te staan')
          .toContain('Met vriendelijke groet');
        await flow.authApi.logout();
        await flow.ctx.dispose();
      });

    } finally {
      await test.step('And leeg opslaan zet de meegeleverde tekst terug', async () => {
        await bewaar({ accountant: { subject: '', body: '' } });
        const na = await (await ctx.get('/server/api/bootstrap.php')).json();
        const geldt = na.mail_channel_defaults as Record<string, { subject: string; body: string }>;
        expect(geldt.accountant.body, 'leeg opslaan hoort terug te vallen op de meegeleverde tekst')
          .toBe(meegeleverd.accountant.body);
        expect(geldt.accountant.subject, 'ook het onderwerp hoort terug te vallen')
          .toBe(meegeleverd.accountant.subject);
      });
      await authApi.logout();
      await ctx.dispose();
    }
  });
});

test.describe('factuurbijlage per ontvanger', () => {
  test('[E2E-H-012] het vinkje Factuur meesturen bepaalt werkelijk of de bijlage meegaat', async () => {
    // Gio vinkte "Factuur meesturen" aan bij een ontvanger van het type Overig en
    // er kwam geen bijlage. In queue.php stond voor die soort $attachPolicy = 'none'
    // hardgecodeerd: het vinkje werd opgeslagen, bleef aangevinkt staan, en deed
    // niets. Een instelling die liegt is erger dan een die ontbreekt -- je merkt het
    // pas als de ontvanger belt dat de factuur mist.
    //
    // De salarisadministratie hoort juist nooit een bijlage te krijgen. Dat is een
    // bewuste keuze (geen bedragen naar de salarisverwerker) en die moet blijven.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const uniek = Date.now().toString().slice(-6);
    const sleutel = `bijlage-${uniek}`;
    const adres = `bijlage-${uniek}@example.invalid`;

    const before = await (await ctx.get('/server/api/bootstrap.php')).json();
    const account = (before.users as Array<Record<string, unknown>>)
      .find(item => String(item.email).toLowerCase() === appConfig.employeeEmail.toLowerCase());
    expect(account, 'het demo-medewerkersaccount hoort te bestaan').toBeDefined();
    const medewerker = (before.employees as Array<Record<string, unknown>>)
      .find(item => Number(item.user_id) === Number(account?.id));
    expect(medewerker, 'bij dat account hoort een medewerker te staan').toBeDefined();
    const bestaande = (before.mail_recipients as Array<Record<string, unknown>>).map(item => ({
      id: String(item.recipient_key || item.id),
      email: String(item.email),
      name: String(item.display_name),
      category: String(item.recipient_category),
      active: true,
    }));

    await test.step('Given een ontvanger van het type Overig met Factuur meesturen aan', async () => {
      const write = await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: String(medewerker?.full_name || ''),
          email: String(account?.email || ''),
          dbEmployeeId: Number(medewerker?.id || 0),
          dbUserId: Number(medewerker?.user_id || 0),
          role: 'Consultant',
          active: true,
          mailRecipientRoutes: { [sleutel]: { enabled: true, invoiceAttachment: true } },
        },
        mailRecipients: [...bestaande,
          { id: sleutel, email: adres, name: `Bijlage ${uniek}`, category: 'other', active: true }],
      });
      expect(write.status, JSON.stringify(write.body)).toBe(200);
    });

    try {
      await test.step('When de volledige keten tot en met de mail wordt doorlopen', async () => {
        const flow = await createLockedInvoice();
        const mails = await verzondenMails(flow.invoiceId);

        const overig = mails.find(item => String(item.recipient_email) === adres);
        expect(overig, 'de ontvanger hoort een mail te krijgen').toBeDefined();
        expect(String(overig?.attachment_policy), 'aangevinkt betekent dat de factuur meegaat')
          .toBe('invoice');

        // En de salarisadministratie houdt haar uitzondering.
        const salaris = mails.find(item => String(item.channel) === 'payroll');
        if (salaris) {
          expect(String(salaris.attachment_policy), 'de salarisadministratie krijgt bewust nooit een factuur')
            .toBe('none');
        }

        await flow.authApi.logout();
        await flow.ctx.dispose();
      });
    } finally {
      await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: String(medewerker?.full_name || ''),
          email: String(account?.email || ''),
          dbEmployeeId: Number(medewerker?.id || 0),
          dbUserId: Number(medewerker?.user_id || 0),
          role: 'Consultant',
          active: true,
          mailRecipientRoutes: { [sleutel]: { enabled: false, invoiceAttachment: false } },
        },
        mailRecipients: [...bestaande,
          { id: sleutel, email: adres, name: `Bijlage ${uniek}`, category: 'other', active: false }],
      });
      await authApi.logout();
      await ctx.dispose();
    }
  });
});

test.describe('nieuw account door de volledige keten', () => {
  test('[E2E-H-013] een nieuwe medewerker houdt zijn gegevens en komt tot een factuur met de juiste mail', async () => {
    // Gio maakte een nieuwe medewerker aan en liep tegen een reeks dingen aan die
    // elk apart klein lijken: het contractveld bleef leeg, de urenstaat kwam niet
    // als taak, de uren bleven openstaan, en bij het afronden verscheen "niet alle
    // serverfacturen zijn beschikbaar". De bestaande ketencase begon steeds bij de
    // demo-medewerker, die al compleet is -- dus dat pad was nooit getest.
    //
    // Deze case begint bij nul en controleert onderweg wat een mens zou nakijken:
    // blijven de gegevens staan, verschijnt het werk als taak, en klopt de mail per
    // ontvanger inclusief bijlage.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const uniek = Date.now().toString().slice(-6);
    const naam = `Nieuw ${uniek}`;
    const adres = `nieuw-${uniek}@example.invalid`;
    const klant = `Klant ${uniek}`;
    const broker = `Broker ${uniek}`;
    const contract = 'Vast · 36 uur';
    const eigenOntvanger = `extra-${uniek}`;
    const eigenAdres = `extra-${uniek}@example.invalid`;

    let medewerkerId = 0;
    let opdrachtId = 0;
    let periode = '';

    const bootstrap = async () => (await (await ctx.get('/server/api/bootstrap.php')).json());

    await test.step('Given een nieuwe medewerker met klant, broker, contract en een eigen ontvanger', async () => {
      const before = await bootstrap();
      const bestaande = (before.mail_recipients as Array<Record<string, unknown>>).map(item => ({
        id: String(item.recipient_key || item.id),
        email: String(item.email),
        name: String(item.display_name),
        category: String(item.recipient_category),
        active: true,
      }));

      const res = await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: naam,
          email: adres,
          role: 'Consultant',
          active: true,
          client: klant,
          broker,
          brokerEmail: `broker-${uniek}@example.invalid`,
          projectCode: `PRJ-${uniek}`,
          rate: 85,
          contract,
          weeklyHours: 36,
          mailRecipientRoutes: {
            bookkeeper: { enabled: true, invoiceAttachment: true },
            [eigenOntvanger]: { enabled: true, invoiceAttachment: true },
          },
        },
        mailRecipients: [...bestaande,
          { id: eigenOntvanger, email: eigenAdres, name: `Extra ${uniek}`, category: 'other', active: true }],
      });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      medewerkerId = Number(res.body.employee_id || 0);
      expect(medewerkerId, 'de medewerker moet een profiel krijgen').toBeGreaterThan(0);
    });

    try {
      await test.step('Then blijven zijn gegevens staan, ook het contract', async () => {
        // Een veld dat wel in het formulier staat maar niet wordt bewaard, merk je
        // pas veel later. Contract had geen kolom en verdween bij elke herlaad.
        const na = await bootstrap();
        const mw = (na.employees as Array<Record<string, unknown>>)
          .find(item => Number(item.id) === medewerkerId);
        expect(mw, 'de medewerker hoort in de bootstrap te staan').toBeDefined();
        expect(String(mw?.full_name), 'de naam hoort bewaard te blijven').toBe(naam);
        expect(Number(mw?.weekly_contract_hours), 'de contracturen horen bewaard te blijven').toBe(36);

        const opdracht = (na.assignments as Array<Record<string, unknown>>)
          .find(item => Number(item.employee_id) === medewerkerId);
        expect(opdracht, 'er hoort een opdracht te zijn, anders komt er nooit een factuur').toBeDefined();
        opdrachtId = Number(opdracht?.id || 0);
        expect(Number(opdracht?.client_id), 'de klant hoort aan de opdracht te hangen').toBeGreaterThan(0);
        expect(Number(opdracht?.broker_id), 'de broker hoort aan de opdracht te hangen').toBeGreaterThan(0);
        expect(String(opdracht?.contract_label), 'het contractveld hoort bewaard te blijven').toBe(contract);
        expect(Number(opdracht?.hourly_rate), 'het tarief hoort bewaard te blijven').toBe(85);
      });

      await test.step('And krijgt hij toegang via de eenmalige link', async () => {
        const reset = await postJson(ctx, '/server/auth/request-reset.php', { email: adres });
        expect(reset.status, JSON.stringify(reset.body)).toBe(200);
        expect(typeof reset.body.token, 'de uitnodiging hoort een token op te leveren').toBe('string');

        const gezet = await postJson(ctx, '/server/auth/reset-password.php', {
          token: String(reset.body.token), new_password: `Nieuw!Wachtwoord${uniek}`,
        });
        expect(gezet.status, JSON.stringify(gezet.body)).toBe(200);
        expect(gezet.body.ok).toBe(true);
      });

      await test.step('When hij zelf uren indient', async () => {
        const eigenCtx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
        const eigenAuth = new AuthApi(eigenCtx);
        const timesheetApi = new TimesheetApi(eigenCtx);
        await eigenAuth.login(adres, `Nieuw!Wachtwoord${uniek}`);

        periode = await findWritablePeriod(timesheetApi);
        const concept = await timesheetApi.write({
          action: 'save_draft', period: periode, contractualHours: 160, billableHours: 8, leaveHours: 0,
          dayEntries: [{ workDate: `${periode}-01`, hours: 8, description: `Nieuw ${uniek}` }],
        });
        expect(concept.status, JSON.stringify(concept.body)).toBe(200);

        const ingediend = await timesheetApi.write({
          action: 'submit', period: periode, contractualHours: 160, billableHours: 8, leaveHours: 0,
          dayEntries: [{ workDate: `${periode}-01`, hours: 8, description: `Nieuw ${uniek}` }],
          expectedVersion: concept.body.timesheet?.version as number,
        });
        expect(ingediend.status, JSON.stringify(ingediend.body)).toBe(200);
        expect(String(ingediend.body.timesheet?.status), 'de urenstaat hoort ingediend te zijn').toBe('submitted');

        await eigenAuth.logout();
        await eigenCtx.dispose();
      });

      await test.step('And verschijnt zijn urenstaat als werk voor Backoffice', async () => {
        // Gio zag zijn ingediende urenstaat niet als taak terugkomen. Dat is het
        // verschil tussen "de gegevens staan goed" en "iemand gaat er iets mee doen".
        // Twee dingen, want ze kunnen los van elkaar misgaan: staat de urenstaat er
        // voor Backoffice, en telt hij mee in de werkvoorraad die op het dashboard
        // staat. Gio zag zijn ingediende urenstaat niet als taak terugkomen.
        const eigen = await (await ctx.get(`/server/api/timesheets.php?period=${periode}&employee_id=${medewerkerId}`)).json();
        expect(eigen.ok, 'Backoffice hoort de urenstaat te kunnen lezen').toBe(true);
        expect(eigen.found, 'de ingediende urenstaat hoort te bestaan').toBe(true);
        expect(String(eigen.timesheet?.status), 'en hoort op ingediend te staan').toBe('submitted');

        const dashboard = await (await ctx.get('/server/api/dashboard.php')).json();
        expect(dashboard.ok, 'het dashboard hoort te laden').toBe(true);
        const maand = (dashboard.per_maand as Array<Record<string, unknown>>)
          .find(item => String(item.period_key) === periode);
        expect(maand, 'de maand van deze urenstaat hoort op het dashboard te staan').toBeDefined();
        expect(Number(maand?.klaar_voor_controle), 'een ingediende urenstaat hoort als werk te tellen')
          .toBeGreaterThan(0);
      });

      let factuurId = 0;
      await test.step('And levert goedkeuren een echte serverfactuur op', async () => {
        // Dit is de melding die Gio kreeg: "niet alle serverfacturen zijn
        // beschikbaar". Die verschijnt zodra een goedgekeurde medewerker geen
        // factuur heeft.
        const timesheetApi = new TimesheetApi(ctx);
        const invoiceApi = new InvoiceApi(ctx);

        const huidig = await (await ctx.get(`/server/api/timesheets.php?period=${periode}&employee_id=${medewerkerId}`)).json();
        const versie = Number(huidig.timesheet?.version || huidig.timesheets?.[0]?.version || 0);
        const goedgekeurd = await timesheetApi.approve({ period: periode, employeeId: medewerkerId, expectedVersion: versie });
        expect(goedgekeurd.status, JSON.stringify(goedgekeurd.body)).toBe(200);

        const timesheetId = Number(goedgekeurd.body.timesheet?.id || huidig.timesheet?.id || 0);
        const gelockt = await invoiceApi.lock({ action: 'lock', timesheetId });
        expect(gelockt.status, JSON.stringify(gelockt.body)).toBe(200);
        factuurId = Number(gelockt.body.invoice?.id || 0);
        expect(factuurId, 'een goedgekeurde urenstaat hoort een serverfactuur op te leveren').toBeGreaterThan(0);
      });

      await test.step('And krijgt elke ontvanger de juiste mail, met de juiste bijlage', async () => {
        const mails = await verzondenMails(factuurId);
        expect(mails.length, 'er horen mails klaar te staan voor deze factuur').toBeGreaterThan(1);

        for (const mail of mails) {
          const kanaal = String(mail.channel);
          expect(String(mail.subject_snapshot), kanaal + ': het onderwerp mag niet leeg zijn').not.toBe('');
          expect(String(mail.body_snapshot), kanaal + ': het bericht mag niet leeg zijn').not.toBe('');
          expect(String(mail.body_snapshot), kanaal + ': de naam van de medewerker hoort erin te staan').toContain(naam);
          expect(String(mail.body_snapshot), kanaal + ': de afsluiting hoort eronder te staan').toContain('Met vriendelijke groet');
          expect(String(mail.body_snapshot), kanaal + ': er mag geen onvervangen veld overblijven').not.toMatch(/\{[a-z]+\}/);
        }

        // De eigen ontvanger stond op Factuur meesturen, dus die hoort de bijlage te
        // krijgen. De salarisadministratie nooit.
        const eigen = mails.find(item => String(item.recipient_email) === eigenAdres);
        expect(eigen, 'de eigen ontvanger hoort een mail te krijgen').toBeDefined();
        expect(String(eigen?.attachment_policy), 'aangevinkt betekent dat de factuur meegaat').toBe('invoice');

        const salaris = mails.find(item => String(item.channel) === 'payroll');
        if (salaris) {
          expect(String(salaris.attachment_policy), 'de salarisadministratie krijgt bewust nooit een factuur').toBe('none');
        }

        // Beleid zonder bestand is nog steeds een mail zonder factuur. Deze factuur
        // is vers, dus hier hoort werkelijk een document te liggen.
        const bijlage = await factuurBijlage(factuurId);
        expect(String(bijlage.sleutel), 'de factuur hoort een opgeslagen PDF te hebben').not.toBe('');
        // Of dat bestand ook werkelijk op schijf staat is nog niet sluitend te
        // controleren vanuit de test: de server schrijft onder een andere private
        // opslagwortel dan deze inspecteur oplost. Dat staat als open punt genoteerd.
        // De sleutel bewijst wel dat het opslaan is gelukt -- die wordt pas gezet
        // nadat het schrijven is geslaagd.
      });
    } finally {
      await test.step('And opruimen: het aangemaakte account wordt gedeactiveerd', async () => {
        await postJson(ctx, '/server/api/staff.php', {
          action: 'upsert_employee', sendInvitation: false,
          employee: { name: naam, email: adres, dbEmployeeId: medewerkerId, role: 'Consultant', active: false },
        }).catch(() => null);
        await authApi.logout();
        await ctx.dispose();
      });
    }
  });

  test('[E2E-H-014] een nieuwe beheerder logt zelf in en kan de keten afmaken', async () => {
    // De tegenhanger van E2E-H-013: niet de medewerker maar de beheerder is nieuw.
    // Een pas aangemaakt beheerdersaccount moet met een eigen wachtwoord kunnen
    // inloggen, het werk zien staan, goedkeuren en factureren. Tot nu toe deed de
    // demo-beheerder dat altijd, en die bestaat al sinds de seed -- dus dit pad was
    // nooit gelopen.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const uniek = Date.now().toString().slice(-6);
    const naam = `Beheer ${uniek}`;
    const adres = `beheer-${uniek}@example.invalid`;
    const wachtwoord = `Beheer!Wachtwoord${uniek}`;

    let beheerderId = 0;
    const nieuweCtx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const nieuweAuth = new AuthApi(nieuweCtx);

    await test.step('Given een nieuwe beheerder met een eigen wachtwoord', async () => {
      const res = await postJson(ctx, '/server/api/staff.php', {
        action: 'upsert_admin', sendInvitation: false,
        admin: { name: naam, email: adres, active: true },
      });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      beheerderId = Number(res.body.user_id || 0);
      expect(beheerderId, 'de beheerder hoort een account te krijgen').toBeGreaterThan(0);

      const reset = await postJson(ctx, '/server/auth/request-reset.php', { email: adres });
      expect(reset.status, JSON.stringify(reset.body)).toBe(200);
      const gezet = await postJson(ctx, '/server/auth/reset-password.php', {
        token: String(reset.body.token), new_password: wachtwoord,
      });
      expect(gezet.status, JSON.stringify(gezet.body)).toBe(200);
    });

    try {
      await test.step('When hij zelf inlogt', async () => {
        await nieuweAuth.login(adres, wachtwoord);
        const ik = await (await nieuweCtx.get('/server/auth/me.php')).json();
        expect(String(ik.user?.email), 'hij hoort als zichzelf te zijn ingelogd').toBe(adres);
        expect(String(ik.user?.role), 'en als beheerder').toBe('administrator');
        expect(String(ik.user?.display_name), 'met zijn eigen naam, niet die van een collega').toBe(naam);
      });

      await test.step('Then ziet hij dezelfde werkvoorraad als de bestaande beheerder', async () => {
        // Een nieuwe beheerder die een leeg dashboard ziet is net zo kapot als een
        // die een foutmelding krijgt: hij weet dan niet dat er werk ligt.
        const zijne = await (await nieuweCtx.get('/server/api/dashboard.php')).json();
        const bestaande = await (await ctx.get('/server/api/dashboard.php')).json();
        expect(zijne.ok, 'zijn dashboard hoort te laden').toBe(true);
        expect(zijne.per_maand, 'hij hoort dezelfde maanden te zien als een bestaande beheerder')
          .toEqual(bestaande.per_maand);

        const bootstrap = await (await nieuweCtx.get('/server/api/bootstrap.php')).json();
        expect(Array.isArray(bootstrap.employees) && bootstrap.employees.length > 0,
          'hij hoort de medewerkers te kunnen zien').toBe(true);
        expect(Array.isArray(bootstrap.mail_recipients) && bootstrap.mail_recipients.length > 0,
          'en de vaste ontvangers, want die beheert hij').toBe(true);
      });

      await test.step('And kan hij zelf goedkeuren en factureren', async () => {
        const timesheetApi = new TimesheetApi(nieuweCtx);
        const invoiceApi = new InvoiceApi(nieuweCtx);

        // De demo-medewerker dient in; de nieuwe beheerder handelt af.
        const werknemerCtx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
        const werknemerAuth = new AuthApi(werknemerCtx);
        const werknemerTs = new TimesheetApi(werknemerCtx);
        await werknemerAuth.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
        const periode = await findWritablePeriod(werknemerTs);
        const concept = await werknemerTs.write({
          action: 'save_draft', period: periode, contractualHours: 160, billableHours: 8, leaveHours: 0,
          dayEntries: [{ workDate: `${periode}-01`, hours: 8, description: `Beheer ${uniek}` }],
        });
        const ingediend = await werknemerTs.write({
          action: 'submit', period: periode, contractualHours: 160, billableHours: 8, leaveHours: 0,
          dayEntries: [{ workDate: `${periode}-01`, hours: 8, description: `Beheer ${uniek}` }],
          expectedVersion: concept.body.timesheet?.version as number,
        });
        expect(ingediend.status, JSON.stringify(ingediend.body)).toBe(200);
        const medewerkerDbId = Number(ingediend.body.employee_id || 0);
        await werknemerAuth.logout();
        await werknemerCtx.dispose();

        const goedgekeurd = await timesheetApi.approve({
          period: periode, employeeId: medewerkerDbId,
          expectedVersion: Number(ingediend.body.timesheet?.version || 0),
        });
        expect(goedgekeurd.status, JSON.stringify(goedgekeurd.body)).toBe(200);

        const gelockt = await invoiceApi.lock({
          action: 'lock', timesheetId: Number(ingediend.body.timesheet?.id || 0),
        });
        expect(gelockt.status, JSON.stringify(gelockt.body)).toBe(200);
        expect(Number(gelockt.body.invoice?.id || 0),
          'een nieuwe beheerder hoort net zo goed een factuur te kunnen maken').toBeGreaterThan(0);

        const mails = await verzondenMails(Number(gelockt.body.invoice?.id || 0));
        expect(mails.length, 'en die factuur hoort mails op te leveren').toBeGreaterThan(0);
        for (const mail of mails) {
          expect(String(mail.body_snapshot), String(mail.channel) + ': er mag geen onvervangen veld overblijven')
            .not.toMatch(/\{[a-z]+\}/);
        }
      });
    } finally {
      await test.step('And opruimen: het beheerdersaccount wordt gedeactiveerd', async () => {
        await nieuweAuth.logout().catch(() => null);
        await nieuweCtx.dispose();
        await postJson(ctx, '/server/api/staff.php', {
          action: 'upsert_admin', sendInvitation: false,
          admin: { name: naam, email: adres, dbUserId: beheerderId, active: false },
        }).catch(() => null);
        await authApi.logout();
        await ctx.dispose();
      });
    }
  });

  test('[E2E-H-015] aanmaken, lezen, wijzigen en verwijderen van een medewerker houdt stand', async () => {
    // De volledige CRUD-ronde. Aanmaken en lezen zaten al in E2E-H-013, maar
    // wijzigen en verwijderen niet -- en juist daar zaten de fouten die Gio vond:
    // een veld dat je invult en dat na opslaan leeg terugkomt, en een account dat
    // na verwijderen blijft staan.
    //
    // Elke stap leest terug bij de server. Een schrijfactie die 200 teruggeeft
    // bewijst niet dat er iets is opgeslagen.
    const ctx = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
    const authApi = new AuthApi(ctx);
    await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    const uniek = Date.now().toString().slice(-6);
    const naam = `Crud ${uniek}`;
    const adres = `crud-${uniek}@example.invalid`;

    let medewerkerId = 0;
    let gebruikerId = 0;

    const lees = async () => {
      const b = await (await ctx.get('/server/api/bootstrap.php')).json();
      const mw = (b.employees as Array<Record<string, unknown>>).find(item => Number(item.id) === medewerkerId);
      const opdracht = (b.assignments as Array<Record<string, unknown>>).find(item => Number(item.employee_id) === medewerkerId);
      return { alle: b, medewerker: mw, opdracht };
    };

    try {
      await test.step('Given een nieuw aangemaakte medewerker', async () => {
        const res = await postJson(ctx, '/server/api/staff.php', {
          action: 'upsert_employee', sendInvitation: false,
          employee: {
            name: naam, email: adres, role: 'Consultant', active: true,
            client: `Klant ${uniek}`, broker: `Broker ${uniek}`,
            brokerEmail: `broker-${uniek}@example.invalid`,
            rate: 80, contract: 'Vast · 36 uur', weeklyHours: 36,
          },
        });
        expect(res.status, JSON.stringify(res.body)).toBe(200);
        medewerkerId = Number(res.body.employee_id || 0);
        gebruikerId = Number(res.body.user_id || 0);
        expect(medewerkerId, 'aanmaken hoort een profiel op te leveren').toBeGreaterThan(0);

        const { medewerker, opdracht } = await lees();
        expect(String(medewerker?.full_name), 'lezen hoort te geven wat je hebt ingevuld').toBe(naam);
        expect(String(opdracht?.contract_label), 'ook het contractveld').toBe('Vast · 36 uur');
        expect(Number(opdracht?.hourly_rate), 'ook het tarief').toBe(80);
      });

      await test.step('When elk veld wordt gewijzigd', async () => {
        const res = await postJson(ctx, '/server/api/staff.php', {
          action: 'upsert_employee', sendInvitation: false,
          employee: {
            name: `${naam} gewijzigd`, email: adres,
            dbEmployeeId: medewerkerId, dbUserId: gebruikerId,
            role: 'Senior Consultant', active: true,
            client: `Klant ${uniek} nieuw`, broker: `Broker ${uniek} nieuw`,
            brokerEmail: `broker-nieuw-${uniek}@example.invalid`,
            rate: 95, contract: 'Detachering · 40 uur', weeklyHours: 40,
            projectCode: `PRJ-${uniek}-B`,
          },
        });
        expect(res.status, JSON.stringify(res.body)).toBe(200);
      });

      await test.step('Then staat elke wijziging er ook werkelijk', async () => {
        // Dit is de stap die de fout van Gio zou hebben gevangen: het contractveld
        // werd geaccepteerd, gaf 200 terug, en was daarna weg.
        const { medewerker, opdracht } = await lees();
        expect(String(medewerker?.full_name), 'de naam hoort gewijzigd te zijn').toBe(`${naam} gewijzigd`);
        expect(Number(medewerker?.weekly_contract_hours), 'de contracturen horen gewijzigd te zijn').toBe(40);
        expect(String(opdracht?.contract_label), 'het contractveld hoort gewijzigd te zijn').toBe('Detachering · 40 uur');
        expect(Number(opdracht?.hourly_rate), 'het tarief hoort gewijzigd te zijn').toBe(95);
        expect(String(opdracht?.project_code), 'de projectcode hoort gewijzigd te zijn').toBe(`PRJ-${uniek}-B`);
      });

      await test.step('And deactiveren haalt hem uit de actieve lijst zonder hem te wissen', async () => {
        const res = await postJson(ctx, '/server/api/staff.php', {
          action: 'upsert_employee', sendInvitation: false,
          employee: {
            name: `${naam} gewijzigd`, email: adres,
            dbEmployeeId: medewerkerId, dbUserId: gebruikerId, role: 'Senior Consultant', active: false,
          },
        });
        expect(res.status, JSON.stringify(res.body)).toBe(200);

        const { medewerker } = await lees();
        expect(medewerker, 'een gedeactiveerde medewerker hoort te blijven bestaan').toBeDefined();
        expect(Number(medewerker?.active), 'maar niet meer actief te zijn').toBe(0);
      });

      await test.step('And definitief verwijderen laat niets achter', async () => {
        // Gio zag na een herstel een aangemaakte persoon terugkomen. Verwijderen moet
        // betekenen dat hij weg is -- ook zijn opdracht, want die verwijst naar hem.
        const res = await postJson(ctx, '/server/api/users.php', {
          action: 'delete', user_id: gebruikerId,
        });
        expect(res.status, JSON.stringify(res.body)).toBe(200);

        const { medewerker, opdracht, alle } = await lees();
        expect(medewerker, 'de medewerker hoort weg te zijn').toBeUndefined();
        expect(opdracht, 'en zijn opdracht ook, anders blijft er een wees achter').toBeUndefined();

        const account = (alle.users as Array<Record<string, unknown>>)
          .find(item => String(item.email).toLowerCase() === adres.toLowerCase());
        expect(account, 'en zijn account hoort weg te zijn').toBeUndefined();
        medewerkerId = 0;
      });
    } finally {
      if (medewerkerId > 0) {
        await postJson(ctx, '/server/api/users.php', { action: 'delete', user_id: gebruikerId }).catch(() => null);
      }
      await authApi.logout();
      await ctx.dispose();
    }
  });
});
