import { test, expect } from '@playwright/test';
import {
  demoCreds, csrf, apiLogin, apiLogout, resetSharedBaseline, setTestMailDelivery,
  uiLogin, uiLogout, guiSubmitHours, guiApprove, guiFinaliseInvoice, type Creds,
} from './_helpers';

// Mailroutering tegen de LIVE TEST-site. Zie tests/remote/TEST-CHARTER.md.
// Muteert gedeelde TEST-data; afterAll zet de baseline terug.

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

test('[TEST-E2E-25] Overig-ontvanger: het vinkje Factuur meesturen bepaalt op de live site of de bijlage meegaat', async ({ page, request }) => {
  test.setTimeout(240_000);

  // Lokaal gedekt door E2E-H-012; TEST-E2E-17 raakt alleen broker/boekhouding/
  // salaris. Deze case dekt het "Overig"-kanaal en de include-invoice-pdf-toggle
  // op de echte deploy: het vinkje werd ooit opgeslagen maar deed niets
  // (hardgecodeerde attachment policy 'none' in queue.php).
  const stamp = Date.now().toString().slice(-7);
  const aanKey = `overig-aan-${stamp}`;
  const uitKey = `overig-uit-${stamp}`;
  const aanMail = `overig-aan-${stamp}@example.invalid`;
  const uitMail = `overig-uit-${stamp}@example.invalid`;

  await test.step('Given twee Overig-ontvangers bij de medewerker, één met Factuur meesturen aan en één uit', async () => {
    await apiLogin(request, creds.admin.email, creds.admin.password);
    const boot = await (await request.get('/server/api/bootstrap.php')).json();
    const account = (boot.users as Array<Record<string, unknown>>)
      .find((u) => String(u.email).toLowerCase() === creds.employee.email.toLowerCase());
    expect(account, 'het demo-medewerkersaccount hoort te bestaan').toBeTruthy();
    const medewerker = (boot.employees as Array<Record<string, unknown>>)
      .find((e) => Number(e.user_id) === Number(account!.id));
    expect(medewerker, 'bij dat account hoort een medewerker te staan').toBeTruthy();
    const bestaande = (boot.mail_recipients as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.recipient_key || r.id),
      email: String(r.email),
      name: String(r.display_name),
      category: String(r.recipient_category),
      active: true,
    }));

    const upsert = await request.post('/server/api/staff.php', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf(request) },
      data: {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: String(medewerker!.full_name || ''),
          email: String(account!.email || ''),
          dbEmployeeId: Number(medewerker!.id || 0),
          dbUserId: Number(medewerker!.user_id || 0),
          role: 'Consultant',
          active: true,
          mailRecipientRoutes: {
            [aanKey]: { enabled: true, invoiceAttachment: true },
            [uitKey]: { enabled: true, invoiceAttachment: false },
          },
        },
        mailRecipients: [
          ...bestaande,
          { id: aanKey, email: aanMail, name: `Overig aan ${stamp}`, category: 'other', active: true },
          { id: uitKey, email: uitMail, name: `Overig uit ${stamp}`, category: 'other', active: true },
        ],
      },
    });
    expect(upsert.ok(), `Overig-routes instellen hoort te slagen: ${await upsert.text()}`).toBe(true);
    await apiLogout(request);
  });

  let factuurId = 0;
  await test.step('When de volledige factuurketen via de GUI wordt afgerond', async () => {
    await uiLogin(page, creds.employee.email, creds.employee.password);
    const { period, employeeId } = await guiSubmitHours(page);
    await uiLogout(page);

    await uiLogin(page, creds.admin.email, creds.admin.password);
    await guiApprove(page, employeeId);
    await guiFinaliseInvoice(page, employeeId, period);

    const facturen = await (await page.request.get(`/server/api/invoices.php?period=${period}`)).json();
    const ts = await (await page.request.get(
      `/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`)).json();
    factuurId = Number(((facturen.invoices || facturen.items) as Array<Record<string, unknown>>)
      .find((i) => Number(i.timesheet_id) === Number(ts.timesheet.id))?.id || 0);
    expect(factuurId, 'er hoort een definitieve factuur te zijn').toBeGreaterThan(0);
  });

  await test.step('Then gaat de factuur mee naar de aangevinkte Overig-ontvanger en niet naar de uitgevinkte', async () => {
    const queue = await (await page.request.get('/server/api/email-queue.php?limit=100')).json();
    const deliveries = ((queue.items || []) as Array<Record<string, unknown>>)
      .filter((d) => Number(d.invoice_id) === factuurId);

    const aanLevering = deliveries.find((d) => String(d.recipient_email) === aanMail);
    const uitLevering = deliveries.find((d) => String(d.recipient_email) === uitMail);

    expect(aanLevering, 'de Overig-ontvanger met vinkje aan hoort een mail te krijgen').toBeTruthy();
    expect(String(aanLevering!.attachment_policy),
      'Factuur meesturen aangevinkt betekent dat de factuur-PDF meegaat').toMatch(/invoice/);
    expect(uitLevering, 'de Overig-ontvanger met vinkje uit hoort óók een mail te krijgen').toBeTruthy();
    expect(String(uitLevering!.attachment_policy),
      'Factuur meesturen uitgevinkt betekent geen bijlage').toBe('none');

    const salaris = deliveries.find((d) => String(d.channel) === 'payroll');
    if (salaris) {
      expect(String(salaris.attachment_policy),
        'de salarisadministratie krijgt bewust nooit een factuur').toBe('none');
    }
    await uiLogout(page);
  });
});
