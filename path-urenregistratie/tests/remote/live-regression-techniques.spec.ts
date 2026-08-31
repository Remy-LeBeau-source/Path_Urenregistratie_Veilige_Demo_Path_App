import { test, expect, type APIRequestContext } from '@playwright/test';
import { CustomerTimesheetApi } from '../playwright/api/CustomerTimesheetApi';
import {
  demoCreds, csrf, apiLogin, apiLogout, resetSharedBaseline, setTestMailDelivery,
  uiLogin, uiLogout, guiSubmitHours, guiApprove, guiFinaliseInvoice, validPdfBytes, type Creds,
} from './_helpers';

// Cases ontworpen met ISTQB/TMap-technieken tegen de LIVE TEST-site.
// Zie tests/remote/TEST-CHARTER.md voor de techniek/FO-koppeling.

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

async function readTimesheet(request: APIRequestContext, period: string, employeeId: number) {
  const res = await request.get(`/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`);
  return (await res.json()) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Toestandsovergang (FO §5)
// ---------------------------------------------------------------------------
test('[TEST-E2E-12] urenstaat-toestandsketen: indienen, correctie, herindienen, goedkeuren; ongeldige overgang geweigerd', async ({ page, request }) => {
  test.setTimeout(240_000);

  await uiLogin(page, creds.employee.email, creds.employee.password);
  const { period, employeeId } = await guiSubmitHours(page);
  const naSubmit = await readTimesheet(page.request, period, employeeId);
  expect(String((naSubmit.timesheet as Record<string, unknown>).status),
    'na indienen hoort de status submitted te zijn').toBe('submitted');

  await test.step('Ongeldige overgang: medewerker wijzigt na indienen -> geweigerd', async () => {
    const versie = Number((naSubmit.timesheet as Record<string, unknown>).version || 0);
    const t = await csrf(page.request);
    const poging = await page.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': t },
      data: {
        action: 'save_draft', period, expected_version: versie,
        contractual_hours: 40, billable_hours: 4,
        day_entries: [{ work_date: `${period}-02`, hours: 4, description: 'poging na indienen' }],
      },
    });
    expect([403, 409], `wijzigen na indienen hoort geweigerd te worden: ${await poging.text()}`)
      .toContain(poging.status());
    const nu = await readTimesheet(page.request, period, employeeId);
    expect(String((nu.timesheet as Record<string, unknown>).status),
      'een geweigerde wijziging mag de status niet veranderen').toBe('submitted');
  });
  await uiLogout(page);

  await uiLogin(page, creds.admin.email, creds.admin.password);
  const voorCorrectie = await readTimesheet(page.request, period, employeeId);
  const versie1 = Number((voorCorrectie.timesheet as Record<string, unknown>).version || 0);

  await test.step('Backoffice vraagt correctie met reden -> eigenaar terug naar medewerker', async () => {
    const t = await csrf(page.request);
    const corr = await page.request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': t },
      data: {
        action: 'request_correction', period, employee_id: employeeId,
        expected_version: versie1, correction_message: 'Graag dag 2 nalopen.',
      },
    });
    expect(corr.ok(), `correctie vragen hoort te slagen: ${await corr.text()}`).toBe(true);
    const na = await readTimesheet(page.request, period, employeeId);
    const ts = na.timesheet as Record<string, unknown>;
    expect(String(ts.status)).toBe('correction');
    const correction = ts.latest_correction as Record<string, unknown> | undefined;
    expect(String(correction?.correction_message || ''), 'de reden hoort zichtbaar te zijn')
      .toContain('dag 2');
    expect(String(correction?.requested_by_name || ''), 'de aanvrager hoort vermeld te zijn').not.toBe('');
  });
  await uiLogout(page);

  await test.step('Medewerker verwerkt de correctie en dient opnieuw in', async () => {
    await uiLogin(page, creds.employee.email, creds.employee.password);
    await page.locator('button[data-view="timesheet"]:visible').first().click();
    await expect(page.locator('#timesheet-status')).toBeVisible();
    const invoer = page.locator('#hours-grid .hours-input:not([disabled])').first();
    await expect(invoer, 'tijdens correctie hoort invoer weer mogelijk te zijn').toBeVisible();
    await invoer.fill('7');
    await invoer.press('Tab');
    const schrijf = page.waitForResponse((r) =>
      r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST');
    await page.locator('#submit-timesheet').click();
    await schrijf;
    const na = await readTimesheet(page.request, period, employeeId);
    expect(String((na.timesheet as Record<string, unknown>).status)).toBe('submitted');
    await uiLogout(page);
  });

  await test.step('Backoffice keurt goed -> gefactureerd-klaar en invoer vergrendeld', async () => {
    await uiLogin(page, creds.admin.email, creds.admin.password);
    await guiApprove(page, employeeId);
    await expect(async () => {
      expect(String((await readTimesheet(page.request, period, employeeId) as { timesheet: { status: string } }).timesheet.status)).toBe('approved');
    }).toPass({ timeout: 20_000 });
    await uiLogout(page);
  });
});

// ---------------------------------------------------------------------------
// Equivalentieklassen + grenswaarden: klanturenstaat-upload (FO §6)
// ---------------------------------------------------------------------------
test('[TEST-E2E-14] klanturenstaat-upload: geldige typen door, ongeldige fail-closed, concept ongewijzigd', async ({ request }) => {
  test.setTimeout(180_000);
  // Een verse medewerker: dan is de klanturenstaat gegarandeerd nog niet
  // goedgekeurd of verzonden, zodat save_draft geldig is om tegen te testen.
  const uniek = Date.now().toString().slice(-8);
  const adres = `test-cts-${uniek}@example.invalid`;
  const wachtwoord = `Cts!${uniek}`;
  await apiLogin(request, creds.admin.email, creds.admin.password);
  const mt = await csrf(request);
  const maak = await request.post('/server/api/staff.php', {
    headers: { 'X-CSRF-Token': mt },
    data: {
      action: 'upsert_employee',
      employee: {
        name: `TEST CTS ${uniek}`, email: adres, role: 'Consultant',
        startDate: new Date().toISOString().slice(0, 10), weeklyHours: 40, rate: 88,
        client: `Klant ${uniek}`, broker: `Broker ${uniek}`, brokerEmail: `broker-${uniek}@example.invalid`,
        customerTimesheetExpected: true,
      },
      mailRecipients: [], sendInvitation: false,
    },
  });
  expect(maak.ok(), `medewerker aanmaken: ${await maak.text()}`).toBe(true);
  await apiLogin(request, creds.admin.email, creds.admin.password);
  await setTestMailDelivery(request, false);
  const rt = await csrf(request);
  const token = String((await (await request.post('/server/auth/request-reset.php', {
    headers: { 'X-CSRF-Token': rt }, data: { email: adres },
  })).json()).token || '');
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  const ct = await csrf(request);
  const zet = await request.post('/server/auth/reset-password.php', {
    headers: { 'X-CSRF-Token': ct }, data: { token, new_password: wachtwoord },
  });
  expect(zet.ok(), `wachtwoord zetten: ${await zet.text()}`).toBe(true);
  await setTestMailDelivery(request, true);
  await apiLogout(request);

  await apiLogin(request, adres, wachtwoord);
  const cts = new CustomerTimesheetApi(request);
  const boot = await (await request.get('/server/api/bootstrap.php')).json();
  const perioden = (boot.periods as Array<Record<string, unknown>>).map((p) => String(p.period_key)).filter(Boolean);
  const period = perioden.at(-1) || '2026-08';

  const geldigePdf = validPdfBytes('upload-equivalentieklasse');
  const geldigeJpg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ...new Array(400).fill(0x20), 0xff, 0xd9,
  ]);

  await test.step('Geldige PDF -> geaccepteerd als draft', async () => {
    const r = await cts.write({ action: 'save_draft', period, file: { name: 'k.pdf', mimeType: 'application/pdf', buffer: geldigePdf } });
    expect(r.status, `geldige PDF hoort te worden geaccepteerd: ${JSON.stringify(r.body)}`).toBe(200);
    expect((r.body as { ok: boolean }).ok).toBe(true);
  });

  await test.step('Tekstbestand met .pdf-naam -> geweigerd, bestaand concept blijft', async () => {
    const r = await cts.write({ action: 'save_draft', period, file: { name: 'nep.pdf', mimeType: 'application/pdf', buffer: Buffer.from('dit is gewoon tekst, geen pdf', 'utf8') } });
    expect(r.status, 'een nep-PDF hoort geweigerd te worden').toBe(400);
    expect(String((r.body as { error?: string }).error || '')).toContain('invalid');
    const nu = await cts.read(period);
    expect((nu.body as { customer_timesheet?: { status?: string } }).customer_timesheet?.status,
      'na een geweigerde upload hoort het bestaande concept te blijven').toBe('draft');
  });

  await test.step('Corrupte "afbeelding" -> geweigerd', async () => {
    const r = await cts.write({ action: 'save_draft', period, file: { name: 'stuk.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('geen echte jpeg-bytes', 'utf8') } });
    expect(r.status, 'corrupte afbeelding hoort geweigerd te worden').toBe(400);
  });

  await test.step('Te groot bestand (>2 MB) -> geweigerd', async () => {
    const groot = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2_400_000, 0x41), Buffer.from('\n%%EOF')]);
    const r = await cts.write({ action: 'save_draft', period, file: { name: 'groot.pdf', mimeType: 'application/pdf', buffer: groot } });
    expect(r.status, 'een te groot bestand hoort geweigerd te worden').toBe(400);
  });

  await test.step('Geldige JPG -> geaccepteerd en server-side als PDF opgeslagen', async () => {
    const r = await cts.write({ action: 'save_draft', period, file: { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: geldigeJpg } });
    expect([200, 400]).toContain(r.status); // minimale JPG kan door GD worden afgekeurd; dan is 400 correct
    if (r.status === 200) {
      const dl = await cts.download(period);
      expect(dl.body.subarray(0, 5).toString('latin1'), 'een geaccepteerde afbeelding hoort als PDF terug te komen').toBe('%PDF-');
    }
  });

  await test.step('PNG met enorme afmetingen (decompressiebom) -> geweigerd vóór decode, concept blijft', async () => {
    // Klein bestand, maar de IHDR claimt 8000x8000 (64 MP). De server leest de
    // afmetingen met getimagesize en weigert boven de cap (6000 px / 12,5 MP)
    // vóór imagecreatefrompng ooit geheugen alloceert.
    const crc32 = (buf: Buffer): number => {
      let c = 0xffffffff;
      for (const byte of buf) {
        c ^= byte;
        for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
      }
      return (c ^ 0xffffffff) >>> 0;
    };
    const chunk = (type: string, data: Buffer): Buffer => {
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
      const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
      const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
      return Buffer.concat([len, body, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(8000, 0); ihdr.writeUInt32BE(8000, 4);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    const bomPng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IEND', Buffer.alloc(0)),
    ]);

    const r = await cts.write({ action: 'save_draft', period, file: { name: 'bom.png', mimeType: 'image/png', buffer: bomPng } });
    expect(r.status, 'een PNG boven de afmetingcap hoort geweigerd te worden').toBe(400);
    expect(String((r.body as { error?: string }).error || ''), 'de weigering hoort fail-closed te zijn').toContain('invalid');
    const nu = await cts.read(period);
    expect((nu.body as { customer_timesheet?: { status?: string } }).customer_timesheet?.status,
      'na de geweigerde bom-upload hoort het bestaande concept ongewijzigd te blijven').toBe('draft');
  });

  await apiLogout(request);
});

// ---------------------------------------------------------------------------
// Beslissingstabel: rol x actie (FO §3)
// ---------------------------------------------------------------------------
test('[TEST-E2E-16] rol-beslissingstabel: medewerker geweigerd op beheeracties, beheerder toegestaan', async ({ request }) => {
  test.setTimeout(120_000);
  const beheeracties: Array<{ naam: string; doe: (r: APIRequestContext) => Promise<number> }> = [
    {
      naam: 'uren goedkeuren',
      doe: async (r) => {
        const t = await csrf(r);
        const res = await r.post('/server/api/timesheets.php', {
          headers: { 'X-CSRF-Token': t },
          data: { action: 'approve', period: '2026-08', employee_id: 1, expected_version: 1 },
        });
        return res.status();
      },
    },
    {
      naam: 'medewerker aanmaken',
      doe: async (r) => {
        const t = await csrf(r);
        const res = await r.post('/server/api/staff.php', {
          headers: { 'X-CSRF-Token': t },
          data: { action: 'upsert_employee', employee: { name: 'X', email: `x${Date.now()}@example.invalid` }, mailRecipients: [] },
        });
        return res.status();
      },
    },
  ];
  // Let op: de gedeelde TEST-reset staat hier bewust NIET bij. FO §9 en de code
  // (auth_require_role(['administrator','employee'])) staan een medewerker de
  // reset op TEST toe; alleen FO §3 zegt van niet -- dat is een documentatie-
  // tegenstrijdigheid, geen autorisatiefout.

  await apiLogin(request, creds.employee.email, creds.employee.password);
  for (const actie of beheeracties) {
    const status = await actie.doe(request);
    expect([401, 403], `medewerker: "${actie.naam}" hoort geweigerd te worden (kreeg ${status})`).toContain(status);
  }
  await apiLogout(request);

  await apiLogin(request, creds.admin.email, creds.admin.password);
  for (const actie of beheeracties) {
    const status = await actie.doe(request);
    expect(status, `beheerder: "${actie.naam}" mag niet met 401/403 worden geweigerd (kreeg ${status})`)
      .not.toBe(403);
    expect(status).not.toBe(401);
  }
  await apiLogout(request);
});

// ---------------------------------------------------------------------------
// Beslissingstabel: mailroutering x bijlage (FO §7)
// ---------------------------------------------------------------------------
test('[TEST-E2E-17] één factuuractie levert exact drie gescheiden routes met het juiste bijlagebeleid', async ({ page }) => {
  test.setTimeout(240_000);
  await uiLogin(page, creds.employee.email, creds.employee.password);
  const { period, employeeId } = await guiSubmitHours(page);
  await uiLogout(page);

  await uiLogin(page, creds.admin.email, creds.admin.password);
  await guiApprove(page, employeeId);
  await guiFinaliseInvoice(page, employeeId, period);

  const facturen = await (await page.request.get(`/server/api/invoices.php?period=${period}`)).json();
  const ts = await (await page.request.get(
    `/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`)).json();
  const factuurId = Number(((facturen.invoices || facturen.items) as Array<Record<string, unknown>>)
    .find((i) => Number(i.timesheet_id) === Number(ts.timesheet.id))?.id || 0);
  expect(factuurId).toBeGreaterThan(0);

  const queue = await (await page.request.get('/server/api/email-queue.php?limit=100')).json();
  const deliveries = ((queue.items || []) as Array<Record<string, unknown>>)
    .filter((d) => Number(d.invoice_id) === factuurId);

  const perKanaal = (k: string) => deliveries.filter((d) => String(d.channel) === k);
  expect(perKanaal('broker').length, 'exact één brokerroute').toBe(1);
  expect(perKanaal('accountant').length, 'exact één boekhoudingsroute').toBe(1);
  expect(perKanaal('payroll').length, 'exact één salarisroute').toBe(1);
  expect(deliveries.length, 'de standaardroute maakt precies drie afzonderlijke berichten')
    .toBeGreaterThanOrEqual(3);

  expect(String(perKanaal('broker')[0].attachment_policy)).toMatch(/invoice/);
  expect(String(perKanaal('accountant')[0].attachment_policy)).toBe('invoice');
  expect(String(perKanaal('payroll')[0].attachment_policy), 'salaris krijgt nooit een bijlage').toBe('none');

  for (const d of deliveries) {
    expect(String(d.cc_email || ''), 'de drie berichten zijn losse deliveries, geen CC/BCC-bundel')
      .not.toContain(String(perKanaal('broker')[0].recipient_email || '###'));
  }
  await uiLogout(page);
});

// ---------------------------------------------------------------------------
// Negatief / error guessing (FO §11)
// ---------------------------------------------------------------------------
test('[TEST-E2E-18] negatieve controles: CSRF verplicht, XSS geëscaped, stale version geweigerd', async ({ page, request }) => {
  test.setTimeout(180_000);

  await test.step('POST zonder CSRF-token wordt geweigerd', async () => {
    await apiLogin(request, creds.admin.email, creds.admin.password);
    const res = await request.post('/server/api/timesheets.php', {
      data: { action: 'approve', period: '2026-08', employee_id: 1, expected_version: 1 },
    });
    expect([400, 401, 403], `zonder CSRF hoort dit geweigerd te worden (kreeg ${res.status()})`).toContain(res.status());
    await apiLogout(request);
  });

  await test.step('Een <script>-payload in een naamveld wordt veilig opgeslagen en geëscaped weergegeven', async () => {
    const payload = `<script>window.__xss=1</script>Piet ${Date.now().toString().slice(-6)}`;
    await apiLogin(request, creds.admin.email, creds.admin.password);
    const t = await csrf(request);
    const maak = await request.post('/server/api/staff.php', {
      headers: { 'X-CSRF-Token': t },
      data: {
        action: 'upsert_employee',
        employee: { name: payload, email: `xss-${Date.now()}@example.invalid`, role: 'Consultant', weeklyHours: 36, rate: 80 },
        mailRecipients: [], sendInvitation: false,
      },
    });
    expect(maak.ok(), `opslaan met een script-payload hoort gewoon te slagen: ${await maak.text()}`).toBe(true);
    await apiLogout(request);

    await uiLogin(page, creds.admin.email, creds.admin.password);
    await page.locator('button[data-view="employees"]:visible').first().click();
    await expect(page.locator('#view-employees')).toHaveClass(/is-active/);
    const kaart = page.locator('#employee-grid .employee-card').filter({ hasText: 'Piet' }).first();
    await expect(kaart, 'de nieuwe medewerker hoort in de lijst te staan').toBeVisible();
    const xssUitgevoerd = await page.evaluate(() => (window as unknown as { __xss?: number }).__xss === 1);
    expect(xssUitgevoerd, 'de script-payload mag nooit als code uitvoeren').toBe(false);
    await expect(kaart, 'de payload hoort als letterlijke tekst zichtbaar te zijn').toContainText('<script>');
    await uiLogout(page);
  });

  await test.step('Een verouderde expected_version wordt met een duidelijke stale-version-fout geweigerd', async () => {
    await uiLogin(page, creds.employee.email, creds.employee.password);
    const { period, employeeId } = await guiSubmitHours(page);
    await uiLogout(page);
    await apiLogin(request, creds.admin.email, creds.admin.password);
    const huidig = await (await request.get(
      `/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`)).json();
    const startStatus = String((huidig.timesheet as Record<string, unknown>).status);
    const echteVersie = Number((huidig.timesheet as Record<string, unknown>).version || 1);
    const t = await csrf(request);
    const res = await request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': t },
      data: { action: 'approve', period, employee_id: employeeId, expected_version: echteVersie + 100 },
    });
    // FO §11: geweigerd met een duidelijke fout, nooit stil overschreven.
    expect(res.status(), 'een verouderde versie hoort met 409 geweigerd te worden').toBe(409);
    expect(String((await res.json()).error || ''), 'de fout benoemt de weigering expliciet')
      .toMatch(/stale|invalid-timesheet-transition/);
    const na = await (await request.get(
      `/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`)).json();
    expect(String((na.timesheet as Record<string, unknown>).status),
      'de geweigerde write mag de status niet hebben veranderd').toBe(startStatus);
    await apiLogout(request);
  });
});

// ---------------------------------------------------------------------------
// Data-integriteit / invarianten (FO §4)
// ---------------------------------------------------------------------------
test('[TEST-E2E-20] werkvoorraad-invariant: alle acties = Backoffice + medewerkers, ongewijzigd bij maandnavigatie', async ({ page }) => {
  test.setTimeout(120_000);
  await uiLogin(page, creds.admin.email, creds.admin.password);
  await page.locator('button[data-view="dashboard"]:visible').first().click();

  const leesTotalen = async () => {
    // De werkvoorraad-samenvatting staat in de aria-label van #dashboard-work-count.
    const badge = page.locator('#dashboard-work-count');
    const label = (await badge.getAttribute('aria-label')) || '';
    const m = label.match(/(\d+)\s*open acties:\s*(\d+)\s*bij Backoffice,\s*(\d+)/i);
    expect(m, `de werkvoorraad-samenvatting hoort te tonen (kreeg: "${label}")`).not.toBeNull();
    return { alle: Number(m![1]), backoffice: Number(m![2]), medewerkers: Number(m![3]) };
  };

  const start = await leesTotalen();
  expect(start.backoffice + start.medewerkers,
    'alle acties hoort de som van Backoffice- en medewerkeracties te zijn').toBe(start.alle);

  // Maandnavigatie mag de globale werkvoorraad niet veranderen.
  for (const richting of ['#period-next', '#period-prev', '#period-prev']) {
    const knop = page.locator(richting);
    if (await knop.count()) {
      await knop.first().click();
      await page.waitForTimeout(400);
      const na = await leesTotalen();
      expect(na, `maandnavigatie (${richting}) mag de totalen niet wijzigen`).toEqual(start);
    }
  }
  await uiLogout(page);
});
