import { test, expect, type APIRequestContext } from '@playwright/test';
import { TeamManagementPage } from '../playwright/pages/TeamManagementPage';
import {
  demoCreds, csrf, apiLogin, apiLogout, resetSharedBaseline, setTestMailDelivery,
  uiLogin, uiLogout, guiSubmitHours, guiApprove, guiFinaliseInvoice, assertConceptInvoicePdf,
  type Creds,
} from './_helpers';

// De echte factuur-afronding via de GUI-knop "Controle afronden": de browser
// maakt de jsPDF-conceptfactuur en stuurt die als de definitieve factuur mee.
// Voor elke demo-medewerker, en voor twee zelf aangemaakte medewerkers (via de
// API en via het beheer-scherm). Muteert gedeelde TEST-data; afterAll herstelt.

const DEMO_EMPLOYEES = [
  'marc@example.invalid',
  'stasjo@example.invalid',
  'brian@example.invalid',
  'shawn@example.invalid',
];
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

test('[TEST-E2E-10] factuur voor elke demo-medewerker via de echte GUI-afronding', async ({ page }) => {
  test.setTimeout(300_000);

  for (const email of DEMO_EMPLOYEES) {
    await uiLogin(page, email, creds.employee.password);
    const { period, employeeId } = await guiSubmitHours(page);
    expect(employeeId, `${email} hoort een medewerkerprofiel te hebben`).toBeGreaterThan(0);
    await uiLogout(page);

    await uiLogin(page, creds.admin.email, creds.admin.password);
    await guiApprove(page, employeeId);
    await guiFinaliseInvoice(page, employeeId, period);

    const factuur = await invoiceForTimesheet(page.request, period, employeeId);
    expect(factuur, `${email}: er hoort een definitieve factuur te zijn`).toBeTruthy();
    const nr = String(factuur!.invoice_number);
    expect(nr, `${email}: factuurnummer volgt de per-opdracht nummering`).toMatch(ECHT_FACTUURNUMMER);
    expect(nr, `${email}: geen generieke dummy-nummering`).not.toMatch(DUMMY_FACTUURNUMMER);
    await assertConceptInvoicePdf(page, Number(factuur!.id));
    await uiLogout(page);
  }
});

test('[TEST-E2E-11] nieuwe medewerker via het beheer-scherm en de volledige flow tot jsPDF-conceptfactuur', async ({ page, request }) => {
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
    // --- beheerder maakt de medewerker aan via het beheer-scherm ---
    await uiLogin(page, creds.admin.email, creds.admin.password);
    const team = new TeamManagementPage(page);
    await team.open();
    const write = await team.addEmployee({
      name: naam,
      email: adres,
      role: 'Consultant',
      weeklyHours: 40,
      rate: 92,
      client: `TEST Klant ${uniek}`,
      broker: `TEST Broker ${uniek}`,
      brokerEmail: `test-broker-${uniek}@example.invalid`,
      invoiceProject: `PRJ-${uniek}`,
      brokerEnabled: true,
      brokerInvoiceAttachment: true,
      customerTimesheetExpected: true,
      sendInvitation: false,
    });
    expect(write.body.ok, 'de beheerder hoort de medewerker via het scherm op te slaan').toBe(true);
    const employeeId = Number(write.body.employee_id || 0);
    expect(employeeId).toBeGreaterThan(0);

    // Het eigen factuurnummer-sjabloon zetten (niet elk formulierveld is via
    // addEmployee gedekt); dit hoort de per-opdracht nummering te bepalen.
    const boot = await (await page.request.get('/server/api/bootstrap.php')).json();
    const assignment = (boot.assignments as Array<Record<string, unknown>>)
      .find((a) => Number(a.employee_id) === employeeId);
    const csrfToken = await csrf(page.request);
    const settingsSave = await page.request.post('/server/api/staff.php', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {
        action: 'upsert_employee',
        employee: {
          name: naam, email: adres, role: 'Consultant',
          dbEmployeeId: employeeId, dbUserId: Number(write.body.user_id || 0),
          invoiceTemplate: template,
          weeklyHours: 40, rate: 92,
        },
        mailRecipients: boot.mail_recipients || [],
        sendInvitation: false,
      },
    });
    expect(settingsSave.ok(), `factuursjabloon zetten hoort te slagen: ${await settingsSave.text()}`).toBe(true);
    void assignment;
    await uiLogout(page);

    // --- eenmalige link -> medewerker zet wachtwoord en logt in ---
    await apiLogin(request, creds.admin.email, creds.admin.password);
    const rt = await csrf(request);
    const reset = await request.post('/server/auth/request-reset.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': rt },
      data: { email: adres },
    });
    const token = String((await reset.json()).token || '');
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

    // --- beheerder keurt goed en rondt de verzending af via de GUI ---
    await uiLogin(page, creds.admin.email, creds.admin.password);
    await guiApprove(page, employeeId);
    await guiFinaliseInvoice(page, employeeId, period);

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
