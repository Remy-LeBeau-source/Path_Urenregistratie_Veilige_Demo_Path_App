import { expect, test } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { ReadApi } from './api/ReadApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

test('[ROLE-N-003] zonder sessie geeft protected API 401', async ({ request }) => {
  await test.step('Given er is geen actieve sessie', async () => {
    // Geen login: request-context is anoniem.
  });

  await test.step('When bootstrap dashboard en invoices anoniem worden opgevraagd', async () => {
    for (const endpoint of [
      '/server/api/bootstrap.php',
      '/server/api/dashboard.php',
      '/server/api/invoices.php',
    ]) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('not-authenticated');
    }
  });
});

test('[ROLE-H-001] admin ziet volledige data', async ({ request }) => {
  const authApi = new AuthApi(request);
  const readApi = new ReadApi(request);

  await test.step('Given de administrator is ingelogd', async () => {
    const login = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    expect(login.user.role).toBe('administrator');
  });

  await test.step('When de administrator bootstrapdata opvraagt', async () => {
    const bootstrap = await readApi.bootstrap();
    expect(Array.isArray(bootstrap.users)).toBe(true);
    expect(bootstrap.users.length).toBeGreaterThan(1);
  });

  await test.step('And de administrator dashboarddata opvraagt', async () => {
    const dashboard = await readApi.dashboard();
    expect(Array.isArray(dashboard.per_maand)).toBe(true);
    expect(dashboard.per_maand.length).toBeGreaterThan(0);
  });

  await test.step('Then de administrator ziet volledige invoice-data', async () => {
    const invoices = await readApi.invoices();
    expect(Array.isArray(invoices.items)).toBe(true);
    expect(invoices.items.length).toBeGreaterThan(0);
  });

  await test.step('And de sessie wordt afgesloten zodat volgende scenario\'s schoon starten', async () => {
    await authApi.logout();
  });
});

test('[ROLE-H-002] employee ziet alleen eigen data', async ({ request }) => {
  const authApi = new AuthApi(request);
  const readApi = new ReadApi(request);

  await test.step('Given de medewerker is ingelogd', async () => {
    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');
  });

  await test.step('When de medewerker bootstrapdata opvraagt', async () => {
    const bootstrap = await readApi.bootstrap();
    expect(bootstrap.users).toHaveLength(1);
    expect(bootstrap.users[0].email).toBe(appConfig.employeeEmail);
    expect(bootstrap.employees).toHaveLength(1);
    expect(bootstrap.assignments).toHaveLength(1);
    expect(bootstrap.mail_recipients).toHaveLength(0);
  });

  await test.step('Then de medewerker ziet alleen eigen invoice-data', async () => {
    const invoices = await readApi.invoices();
    expect(Array.isArray(invoices.items)).toBe(true);
    for (const item of invoices.items) {
      expect(item.employee_name).toBe('Stasjo van Bakel');
    }
  });

  await test.step('And de sessie wordt afgesloten zodat volgende scenario\'s schoon starten', async () => {
    await authApi.logout();
  });
});


test('[ROLE-N-004] een medewerker krijgt 403 op elke beheerder-only schrijfactie', async ({ request }) => {
  const authApi = new AuthApi(request);
  const csrf = async () => String((await (await request.get('/server/auth/csrf.php')).json()).csrf_token || '');
  const post = async (path: string, data: Record<string, unknown>) => {
    const r = await request.post(path, { headers: { 'X-CSRF-Token': await csrf() }, data });
    return { status: r.status(), body: await r.json().catch(() => ({})) };
  };

  await test.step('Given een ingelogde medewerker', async () => {
    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');
  });

  await test.step('Then weigert elke beheerder-only actie met 403 en verandert er niets', async () => {
    // [path, payload] -- elk is een echte beheerder-schrijfactie.
    const beheerderActies: Array<[string, Record<string, unknown>]> = [
      ['/server/api/users.php', { action: 'deactivate', user_id: 1 }],
      ['/server/api/staff.php', { action: 'upsert_employee', sendInvitation: false, employee: { name: 'X', email: 'x@example.invalid', role: 'Consultant', startDate: '2026-08-01', active: true, client: 'C', broker: 'B', brokerEmail: 'b@example.invalid', projectCode: 'X1' }, mailRecipients: [] }],
      ['/server/api/settings.php', { settings: { supportName: 'Hack' } }],
      ['/server/api/announcements.php', { action: 'create', title: 'X', message: 'X' }],
      ['/server/api/periods.php', { action: 'close', period: '2026-08' }],
    ];
    for (const [path, payload] of beheerderActies) {
      const res = await post(path, payload);
      expect([401, 403], `${path}: status ${res.status} (${JSON.stringify(res.body).slice(0, 120)})`).toContain(res.status);
    }
  });

  await test.step('And ook de leesbare beheerdersbronnen blijven dicht', async () => {
    // server-log.php is hier op 13 sep bij gekomen. Dat endpoint bewaakt zijn
    // rol correct (auth_require_role(['administrator'])) maar was als enige
    // beheerder-endpoint niet in deze lijst opgenomen -- gevonden door elk
    // bestand in server/api/ af te zetten tegen wat deze case dekt. De andere
    // niet-genoemde bestanden bleken terecht afwezig: common.php en
    // mail-recipients.php zijn gedeelde bibliotheken en geen endpoints,
    // notifications.php is bewust voor beide rollen, en test-reset.php is
    // alleen op LOCAL/TEST bereikbaar en heeft zijn eigen poort.
    for (const path of ['/server/api/audit-log.php', '/server/api/email-queue.php', '/server/api/mail-acceptance.php', '/server/api/server-log.php']) {
      const r = await request.get(path);
      expect([401, 403], `${path}: ${r.status()}`).toContain(r.status());
    }
    await authApi.logout();
  });
});

test('[ROLE-N-005] medewerker kan maanden voor de startdatum en na de huidige maand ook niet via de API openen', async ({ request }) => {
  const authApi = new AuthApi(request);
  let employeeId = 0;
  let startPeriod = '';

  const shiftPeriod = (period: string, delta: number) => {
    const [year, month] = period.split('-').map(Number);
    const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  await test.step('Given een medewerker met een persoonlijke startmaand is ingelogd', async () => {
    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');
    const bootstrap = await (await request.get('/server/api/bootstrap.php')).json();
    employeeId = Number(bootstrap.employees?.[0]?.id || 0);
    startPeriod = String(bootstrap.employees?.[0]?.employment_start_date || '').slice(0, 7);
    expect(employeeId).toBeGreaterThan(0);
    expect(startPeriod).toMatch(/^\d{4}-\d{2}$/);
  });

  await test.step('When de medewerker buiten de toegestane maandgrenzen rechtstreeks de API benadert', async () => {
    const beforeStart = shiftPeriod(startPeriod, -1);
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Vooruitkijken mag sindsdien tot 2 jaar (zie setPeriod()/
    // timesheet_require_employee_period_access()); 1 maand vooruit is dus
    // geen goede grens meer om te testen. 25 maanden ligt net voorbij de
    // toegestane 24.
    const afterCurrent = shiftPeriod(currentPeriod, 25);

    for (const period of [beforeStart, afterCurrent]) {
      for (const endpoint of ['timesheets.php', 'customer-timesheets.php']) {
        const response = await request.get(`/server/api/${endpoint}?period=${period}&employee_id=${employeeId}`, {
          headers: { 'X-Path-E2E-Run-Id': '' },
        });
        expect(response.status(), `${endpoint} hoort ${period} te weigeren`).toBe(403);
        expect((await response.json()).error).toBe('period-not-accessible');
      }
    }

    const csrf = String((await (await request.get('/server/auth/csrf.php')).json()).csrf_token || '');
    const writeResponse = await request.post('/server/api/timesheets.php', {
      headers: { 'X-CSRF-Token': csrf, 'X-Path-E2E-Run-Id': '' },
      data: { action: 'save_draft', period: beforeStart, employee_id: employeeId },
    });
    expect(writeResponse.status()).toBe(403);
    expect((await writeResponse.json()).error).toBe('period-not-accessible');
  });

  await test.step('Then blijft de eigen huidige maand wel bereikbaar', async () => {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const response = await request.get(`/server/api/timesheets.php?period=${currentPeriod}&employee_id=${employeeId}`);
    expect(response.status()).toBe(200);
    await authApi.logout();
  });
});

test('[ROLE-N-006] beheerder-only acties op gedeelde endpoints weigeren ook op de eigen urenstaat', async ({ request }) => {
  // Waarom deze case naast ROLE-N-004 bestaat.
  // ROLE-N-004 dekt endpoints die in hun geheel beheerder-only zijn
  // (users/staff/settings/announcements/periods): daar houdt auth_require_role()
  // de medewerker al bij de deur tegen. De echte "verborgen knop" zit ergens
  // anders: timesheets.php, customer-timesheets.php en invoices.php laten de
  // medewerker bewust binnen -- hij heeft ze nodig voor zijn eigen uren -- en
  // bewaken de beheerdersacties pas per actie, middenin het bestand. Precies
  // die per-actie-gates zijn wat er valt als iemand een in de UI verborgen knop
  // weer zichtbaar maakt of de POST rechtstreeks nabouwt, en ze werden nergens
  // afgedekt.
  //
  // Waarom de eigen medewerker en de eigen huidige maand.
  // In timesheets.php en customer-timesheets.php draait
  // require_employee_period_access() VOOR de rolcheck. Zou deze case de urenstaat
  // van een ander pakken, of een maand buiten de eigen grenzen, dan komt er ook
  // een 403 terug -- maar van de eigendoms-/periodepoort, en dan bewijst de case
  // niets over de rol. Door de eigen medewerker en de eigen lopende maand te
  // gebruiken passeren we die eerste poort gegarandeerd en is de 403 die
  // overblijft aantoonbaar de rolcheck. Daarom asserteren we ook de foutcode
  // 'forbidden-action' en niet alleen de status: dat is de code die uitsluitend
  // uit de rolgates komt, terwijl de periodepoort 'period-not-accessible' geeft.
  const authApi = new AuthApi(request);
  let employeeId = 0;
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const csrf = async () => String((await (await request.get('/server/auth/csrf.php')).json()).csrf_token || '');
  const post = async (path: string, data: Record<string, unknown>) => {
    const r = await request.post(path, { headers: { 'X-CSRF-Token': await csrf() }, data });
    return { status: r.status(), body: await r.json().catch(() => ({} as Record<string, unknown>)) };
  };

  await test.step('Given een ingelogde medewerker met zijn eigen lopende maand', async () => {
    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');
    const bootstrap = await (await request.get('/server/api/bootstrap.php')).json();
    employeeId = Number(bootstrap.employees?.[0]?.id || 0);
    expect(employeeId).toBeGreaterThan(0);
    const eigenMaand = await request.get(`/server/api/timesheets.php?period=${period}&employee_id=${employeeId}`);
    expect(eigenMaand.status(), 'de eigendoms-/periodepoort moet openstaan, anders bewijst de 403 hierna niets').toBe(200);
  });

  await test.step('When hij de beheerdersacties op zijn eigen urenstaat rechtstreeks aanroept', async () => {
    const perActieGates: Array<[string, Record<string, unknown>]> = [
      // timesheets.php -- de goedkeurknop en "correctie vragen" uit het beheerscherm
      ['/server/api/timesheets.php', { action: 'approve', period, employee_id: employeeId }],
      ['/server/api/timesheets.php', { action: 'request_correction', period, employee_id: employeeId }],
      // customer-timesheets.php -- de volledige beheerdersrij boven de klanturenstaat
      ...['approve', 'request_resubmit', 'mark_sent', 'mark_sent_to_broker', 'send_to_broker', 'confirm_external'].map(
        action => ['/server/api/customer-timesheets.php', { action, period, employee_id: employeeId }] as [string, Record<string, unknown>]
      ),
      // invoices.php -- "factuur definitief maken"
      ['/server/api/invoices.php', { action: 'lock', period, employee_id: employeeId, timesheet_id: 1 }],
    ];

    for (const [path, payload] of perActieGates) {
      const res = await post(path, payload);
      const label = `${path} (${String(payload.action)})`;
      expect(res.status, `${label}: status ${res.status} -- ${JSON.stringify(res.body).slice(0, 160)}`).toBe(403);
      expect(res.body.error, `${label} moet op de rolcheck stranden, niet op eigendom/periode/validatie`).toBe('forbidden-action');
    }
  });

  await test.step('Then blijft zijn eigen medewerkersactie op dezelfde endpoints wel toegestaan', async () => {
    // Tegenproef: de 403's hierboven komen niet doordat het endpoint, de sessie
    // of de CSRF-token stuk is. Met save_draft -- dezelfde medewerker, hetzelfde
    // endpoint, dezelfde maand, alleen een actie die hij wel mag -- komt hij
    // aantoonbaar voorbij de rolgate: hij krijgt de payloadvalidatie te zien.
    // We sturen bewust geen echte dagregels mee; deze case hoort niets te
    // schrijven, en juist die validatiefout bewijst dat hij binnen was.
    const eigen = await post('/server/api/timesheets.php', { action: 'save_draft', period, employee_id: employeeId });
    expect(eigen.status, `save_draft: ${JSON.stringify(eigen.body).slice(0, 160)}`).toBe(400);
    expect(eigen.body.error, 'save_draft hoort niet op de rolcheck te stranden').toBe('invalid-payload');
    await authApi.logout();
  });
});

test('[ROLE-N-007] de medewerker krijgt het uurtarief en btw-percentage van zijn opdracht niet mee, de beheerder wel', async ({ request }) => {
  // Wens van Gio (16 sep): een medewerker mag het tarief niet zien. Het scherm
  // toonde het al niet, maar de server stuurde het wel mee in bootstrap, en
  // wegblijven uit beeld is geen afscherming: met de ontwikkelaarsconsole is
  // zulke data gewoon te lezen. Deze case meet daarom het antwoord van de
  // server, niet wat het scherm ervan laat zien.
  const authApi = new AuthApi(request);
  const readApi = new ReadApi(request);

  await test.step('Given de medewerker is ingelogd', async () => {
    const login = await authApi.login(appConfig.employeeEmail, requirePassword(appConfig.employeePassword, 'PLAYWRIGHT_EMPLOYEE_PASSWORD'));
    expect(login.user.role).toBe('employee');
  });

  await test.step('When hij zijn eigen opdracht ophaalt', async () => {
    const bootstrap = await readApi.bootstrap();
    expect(bootstrap.assignments).toHaveLength(1);
    const eigen = bootstrap.assignments[0];

    await test.step('Then staan tarief en btw er niet in, ook niet als lege waarde', async () => {
      expect(Object.prototype.hasOwnProperty.call(eigen, 'hourly_rate')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(eigen, 'vat_percentage')).toBe(false);
      expect(JSON.stringify(bootstrap.assignments)).not.toContain('hourly_rate');
      expect(JSON.stringify(bootstrap.assignments)).not.toContain('vat_percentage');
    });

    await test.step('And de rest van zijn opdracht blijft gewoon bruikbaar', async () => {
      expect(eigen.assignment_name).toBeTruthy();
      expect(Number(eigen.employee_id)).toBeGreaterThan(0);
    });
  });

  await test.step('And de beheerder krijgt ze wel, want daar worden de facturen mee gemaakt', async () => {
    await authApi.logout();
    const login = await authApi.login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    expect(login.user.role).not.toBe('employee');
    const bootstrap = await readApi.bootstrap();
    expect(bootstrap.assignments.length).toBeGreaterThan(1);
    const metTarief = bootstrap.assignments.filter((item: Record<string, unknown>) => Object.prototype.hasOwnProperty.call(item, 'hourly_rate'));
    expect(metTarief).toHaveLength(bootstrap.assignments.length);
    expect(Number(metTarief[0].hourly_rate)).toBeGreaterThan(0);
    await authApi.logout();
  });
});
