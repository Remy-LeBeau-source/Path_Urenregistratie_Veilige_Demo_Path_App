import { test, expect, type APIRequestContext } from '@playwright/test';
import { TeamManagementPage } from '../playwright/pages/TeamManagementPage';
import {
  demoCreds, csrf, apiLogin, apiLogout, resetSharedBaseline, setTestMailDelivery,
  uiLogin, uiLogout, guiSubmitHours, guiApprove, finaliseViaConceptUpload, assertConceptInvoicePdf,
  type Creds,
} from './_helpers';

// De definitieve factuur hoort de jsPDF-conceptfactuur te zijn (branded, geen
// CONCEPT-markering) -- voor elke demo-medewerker en voor een via het
// beheer-scherm aangemaakte medewerker. Muteert gedeelde TEST-data; afterAll
// herstelt de baseline.

const ECHT_FACTUURNUMMER = /^[A-Za-z][A-Za-z-]*-\d{4}-(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)$/;
const DUMMY_FACTUURNUMMER = /^PATH-\d{4}-\d{3}$/i;

let creds: Creds;

test.beforeAll(async ({ request }) => {
  creds = await demoCreds(request);
});

test.afterAll(async ({ request }) => {
  await apiLogin(request, creds.admin.email, creds.admin.password);
  await setTestMailDelivery(request, true).catch(() => undefined);
  await apiLogout(request);
  await resetSharedBaseline(request, creds);
});

async function invoiceForTimesheet(request: APIRequestContext, period: string, employeeId: number) {
  const facturen = await (await request.get(`/server/api/invoices.php?period=${period}`)).json();
  const lijst = (facturen.invoices || facturen.items || []) as Array<Record<string, unknown>>;
  const ts = await (await request.get(
    `/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`)).json();
  const timesheetId = Number(ts.timesheet?.id || 0);
  return lijst.find((i) => Number(i.timesheet_id) === timesheetId) as Record<string, unknown> | undefined;
}

test('[TEST-E2E-10] elke bestaande factuur heeft een echt nummer en geen CONCEPT-markering in de PDF', async ({ page }) => {
  test.setTimeout(240_000);
  await uiLogin(page, creds.admin.email, creds.admin.password);

  const boot = await (await page.request.get('/server/api/bootstrap.php')).json();
  const perioden = (boot.periods as Array<Record<string, unknown>>).map((p) => String(p.period_key)).filter(Boolean);
  let metNummer = 0;
  let metPdf = 0;

  for (const periode of perioden) {
    const res = await (await page.request.get(`/server/api/invoices.php?period=${periode}`)).json();
    for (const inv of ((res.invoices || res.items || []) as Array<Record<string, unknown>>)) {
      const nr = String(inv.invoice_number || '');
      if (nr === '') continue;
      metNummer++;
      expect(nr, `${periode}: factuurnummer volgt de per-opdracht nummering`).toMatch(ECHT_FACTUURNUMMER);
      expect(nr, `${periode}: geen generieke dummy-nummering`).not.toMatch(DUMMY_FACTUURNUMMER);
      const dl = await page.request.get(`/server/api/invoices.php?action=download&invoice_id=${inv.id}`);
      if (dl.status() !== 200) continue; // concept-facturen hebben nog geen PDF
      metPdf++;
      const bytes = Buffer.from(await dl.body());
      expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(bytes.toString('latin1'),
        `${nr}: de definitieve factuur mag geen CONCEPT- of CONCEPTVOORBEELD-markering dragen`)
        .not.toMatch(/CONCEPT ?- ?NIET VERZONDEN|CONCEPTVOORBEELD/);
    }
  }
  expect(metNummer, 'er horen bestaande facturen te zijn om te controleren').toBeGreaterThan(0);
  expect(metPdf, 'minstens één factuur hoort een downloadbare PDF te hebben').toBeGreaterThan(0);
  await uiLogout(page);
});

test('[TEST-E2E-11] nieuwe medewerker via het beheer-scherm: volledige flow tot de jsPDF-conceptfactuur', async ({ page, request }) => {
  test.setTimeout(300_000);
  const uniek = Date.now().toString().slice(-8);
  const staart = uniek.slice(-3);
  const naam = `TEST GUI ${uniek}`;
  const adres = `test-gui-${uniek}@example.invalid`;
  const wachtwoord = `GuiFlow!${uniek}`;
  const template = `GUI${staart}-{jaar}-{maand}`;

  await apiLogin(request, creds.admin.email, creds.admin.password);
  await setTestMailDelivery(request, false);
  try {
    await uiLogin(page, creds.admin.email, creds.admin.password);
    const team = new TeamManagementPage(page);
    await team.open();
    const write = await team.addEmployee({
      name: naam, email: adres, role: 'Consultant', weeklyHours: 40, rate: 92,
      client: `TEST Klant ${uniek}`, broker: `TEST Broker ${uniek}`,
      brokerEmail: `test-broker-${uniek}@example.invalid`,
      brokerEnabled: true, brokerInvoiceAttachment: true, sendInvitation: false,
    });
    expect(write.body.ok, 'de beheerder hoort de medewerker via het scherm op te slaan').toBe(true);
    const employeeId = Number(write.body.employee_id || 0);
    expect(employeeId).toBeGreaterThan(0);

    // Eigen factuurnummer-sjabloon zetten.
    const boot = await (await page.request.get('/server/api/bootstrap.php')).json();
    const csrfToken = await csrf(page.request);
    const settingsSave = await page.request.post('/server/api/staff.php', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {
        action: 'upsert_employee',
        employee: {
          name: naam, email: adres, role: 'Consultant',
          dbEmployeeId: employeeId, dbUserId: Number(write.body.user_id || 0),
          invoiceTemplate: template, weeklyHours: 40, rate: 92,
        },
        mailRecipients: boot.mail_recipients || [], sendInvitation: false,
      },
    });
    expect(settingsSave.ok(), `factuursjabloon zetten: ${await settingsSave.text()}`).toBe(true);
    await uiLogout(page);

    await apiLogin(request, creds.admin.email, creds.admin.password);
    const rt = await csrf(request);
    const token = String((await (await request.post('/server/auth/request-reset.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': rt }, data: { email: adres },
    })).json()).token || '');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    await apiLogout(request);

    await page.goto(`/index.html#reset-password=${token}`);
    await page.locator('#auth-reset-new-password').fill(wachtwoord);
    await page.locator('#auth-reset-confirm-password').fill(wachtwoord);
    await page.locator('#auth-reset-complete-submit').click();
    await expect(page.locator('#auth-reset-complete-feedback')).toContainText('Je wachtwoord is ingesteld');

    await uiLogin(page, adres, wachtwoord);
    const { period } = await guiSubmitHours(page);
    await expect(page.locator('#timesheet-status')).toHaveText('Ingediend');
    await uiLogout(page);

    await uiLogin(page, creds.admin.email, creds.admin.password);
    await guiApprove(page, employeeId);
    const ts = await (await page.request.get(
      `/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`)).json();
    const timesheetId = Number(ts.timesheet.id || 0);
    expect(timesheetId).toBeGreaterThan(0);
    expect(String(ts.timesheet.status), 'de urenstaat hoort goedgekeurd te zijn').toBe('approved');

    // Afronden langs exact het GUI-pad: de browser maakt de jsPDF-conceptfactuur
    // en die wordt de definitieve factuur.
    await finaliseViaConceptUpload(page, employeeId, period, timesheetId);

    const factuur = await invoiceForTimesheet(page.request, period, employeeId);
    expect(factuur, 'er hoort een definitieve factuur te zijn').toBeTruthy();
    const nr = String(factuur!.invoice_number);
    expect(nr, 'het factuurnummer volgt het eigen opdracht-sjabloon')
      .toMatch(new RegExp(`^GUI${staart}-\\d{4}-[a-z]+$`));
    expect(nr, 'geen generieke dummy-nummering').not.toMatch(DUMMY_FACTUURNUMMER);
    await assertConceptInvoicePdf(page, Number(factuur!.id));
    await uiLogout(page);
  } finally {
    await apiLogin(request, creds.admin.email, creds.admin.password);
    await setTestMailDelivery(request, true);
    await apiLogout(request);
  }
});
