// Medewerkerkant van het dashboard: eigen overzicht, open maanden, de
// eerstvolgende actie, en wat een medewerker wel en niet mag zien.
//
// Afgesplitst van dashboard.spec.ts, dat te groot werd om door CI-sharding
// verdeeld te kunnen worden (zie de toelichting daar).

import type { MutableRecord } from './fixtures/dashboardGedeeld';
import { ALLE_SCHERMEN, verwachtAlleenSchermActief } from './fixtures/dashboardGedeeld';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { openUrenactieVanMaand, staatVandaagInBeeld } from './fixtures/klassiekDashboard';
import { attachBusinessScreenshot } from './reporting/uiAttachments';
import { bewaarUrenstaat } from './fixtures/urenstaatHerstel';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { expect, test } from '@playwright/test';
import { openPaneel, openProfielmenu } from './pages/TopbarMenu';
import { suppressInstallBanner } from './fixtures/suppressInstallBanner';
import { useFixedDemoClock } from './fixtures/fixedDemoClock';
// Scope rechtgezet 14 sep: Vandaag (#vandaag) vervangt in Klassiek de oude
// dashboardblokken ("Open acties per maand", de volgende-actieknop, de
// kerncijfers en de stappenlijst), op desktop volgens handoff/medewerker-gui.html
// en op telefoon volgens handoff/medewerker-wild.html.


test.beforeEach(async ({ page }) => {
  await useFixedDemoClock(page);
  await suppressInstallBanner(page);
});

test('[DASH-H-002] employee dashboard opent zonder console errors', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Given de medewerker is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    clearConsoleErrors(consoleErrors);
  });

  await test.step('When de medewerker het dashboard opent', async () => {
    await dashboardPage.assertEmployeeDashboardVisible();
  });

  await test.step('Then alleen medewerkersinformatie wordt getoond zonder consolefouten', async () => {
    expect(consoleErrors).toEqual([]);
  });
});

test('[DASH-H-025] "Mijn maanden" toont één statuspil per maand en geen losse klanturenstaat-kolom', async ({ page }) => {
  // Ontwerpbesluit 14 sep: Maanden is geen tabel meer met aparte uren- en
  // klanturenstaatkolommen. Elke maandkaart krijgt één pil die de wachtende
  // stap noemt; details staan pas in de uitklap.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i);

  await test.step('Then heeft Mijn maanden geen losse Klanturenstaat-kolom meer', async () => {
    await expect(page.locator('#employee-history .employee-history-head')).toHaveCount(0);
    await expect(page.locator('#employee-history')).not.toContainText('Naar broker gecontroleerd');
    await expect(page.locator('#employee-history')).not.toContainText('Opnieuw uploaden');
    await expect(page.locator('#employee-history')).not.toContainText(/in behandeling/i);
  });

  await test.step('And toont elke maandkaart precies één statuspil die de wachtende stap zelf noemt, niet een vaste samenvatting', async () => {
    // De verwachte tekst komt uit dezelfde bron als de pil zelf
    // (statusKetenStappen): geen losse, geraden lijst met mogelijke teksten,
    // anders bewijst deze case niet dat de pil de wérkelijke stap noemt --
    // exact de fout die hier zat (een vaste "Urenstaat open" ook wanneer de
    // medewerker zelf had gemaild).
    const verwacht = await page.evaluate(() => {
      const w = window as unknown as {
        currentEmployee: () => { id: number };
        recordFor: (id: number, key: string) => { timesheetStatus: string };
        periodFromKey: (key: string) => unknown;
        statusKetenStappen: (record: unknown, period: unknown) => Array<{ key: string; detail: string; stand: string }>;
        activeCorrection: (record: unknown) => unknown;
      };
      const emp = w.currentEmployee();
      const pil = (key: string) => {
        const record = w.recordFor(emp.id, key);
        const period = w.periodFromKey(key);
        const stappen = w.statusKetenStappen(record, period);
        const huidig = stappen.find(stap => stap.stand === 'nu');
        if (!huidig) return 'Afgerond';
        const correction = w.activeCorrection(record);
        return correction && huidig.key === 'fill' ? 'Correctie gevraagd' : huidig.detail;
      };
      return { augustus: pil('2026-08'), juli: pil('2026-07') };
    });

    const augustusRow = page.locator('#employee-history .employee-history-row', { hasText: 'Augustus 2026' });
    await expect(augustusRow.locator('.status-pill')).toHaveCount(1);
    await expect(augustusRow.locator('.status-pill')).toHaveText(verwacht.augustus);

    const juliRow = page.locator('#employee-history .employee-history-row', { hasText: 'Juli 2026' });
    await expect(juliRow.locator('.status-pill')).toHaveCount(1);
    await expect(juliRow.locator('.status-pill')).toHaveText(verwacht.juli);
  });
});

test('[DASH-H-021] de medewerker keert zowel via Dashboard als via Mijn uren terug naar de actuele maand na een blik op een oudere maand', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker heeft op Mijn uren zelf een eerdere maand geopend', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('#period-prev').click();
    await expect(page.locator('#timesheet-period-title')).toHaveText('Juli 2026');
  });

  await test.step('When de medewerker op Dashboard klikt', async () => {
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('Then staat de maandkiezer weer op de actuele kalendermaand augustus', async () => {
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await expect(page.locator('#period-picker')).toHaveValue('2026-08');
    await expect(page.locator('#employee-dashboard-period')).toHaveText('Augustus 2026');
  });

  await test.step('When de medewerker opnieuw juli opent, via Mededelingen navigeert en dan zélf op Mijn uren klikt (niet op Dashboard)', async () => {
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('#period-prev').click();
    await expect(page.locator('#timesheet-period-title')).toHaveText('Juli 2026');
    await page.locator('button[data-view="employee-announcements"]').click();
    await expect(page.locator('#period-picker')).toHaveValue('2026-07');
    await page.locator('button[data-view="timesheet"]').click();
  });

  await test.step('Then zet ook de Mijn uren-tab zelf de maand terug op augustus, zonder via Dashboard te gaan', async () => {
    await expect(page.locator('#timesheet-period-title')).toHaveText('Augustus 2026');
    await expect(page.locator('#period-picker')).toHaveValue('2026-08');
  });
});

test('[DASH-N-023] een medewerker kan niet naar een maand vóór de eigen indiensttreding bladeren', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker (in dienst sinds mei 2026) op de actuele kalendermaand staat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
  });

  await test.step('When de medewerker probeert een maand vóór de startdatum te openen', async () => {
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    await page.locator('#period-month-panel [data-period-month="04"][data-month-control="#period-month-picker"]').click();
  });

  await test.step('Then blijft de maand op augustus staan en verschijnt een duidelijke melding', async () => {
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await expect(page.locator('#toast')).toContainText('vóór je indiensttreding');
    await expect(page.locator('#toast')).toContainText('Mei 2026');
  });
});

test('[DASH-N-030] ook vóórdat de serverdata binnen is, opent een medewerker geen maand vóór zijn indiensttreding', async ({ page }) => {
  // Waarom deze case bestaat (14 sep 2026).
  // [DASH-N-023] hierboven viel wisselvallig om met "April 2026" waar augustus
  // verwacht werd. Oorzaak: setPeriod() weigert een maand vóór
  // currentEmployee().startDate, maar vóór de bootstrap-hydratatie gebruikt de
  // app de ingebouwde catalogus. Die stond voor Marc, Stasjo en Brian op
  // 2026-01-01, terwijl de server 2026-05-01 zegt (database/seed-demo-data.sql).
  // In dat venster liet de beveiliging april door. Was de server snel, dan
  // slaagde DASH-N-023; was de run trager, dan niet.
  //
  // DASH-N-023 hoopt op dat venster; deze case dwingt het af: de bootstrap wordt
  // tegengehouden, dus de app zit aantoonbaar vóór de hydratatie wanneer de
  // maand gekozen wordt. Staat lezen en handelen gebeurt in één evaluate, zodat
  // er geen sync tussen twee losse stappen door kan glippen.
  const loginPage = new LoginPage(page);
  let laatBootstrapDoor: () => void = () => {};
  const bootstrapPoort = new Promise<void>(resolve => { laatBootstrapDoor = resolve; });
  let bootstrapTegengehouden = false;

  await page.route('**/server/api/bootstrap.php*', async route => {
    bootstrapTegengehouden = true;
    await bootstrapPoort;
    await route.continue().catch(() => {});
  });

  try {
    await test.step('Given een ingelogde medewerker vóórdat de serverdata binnen is', async () => {
      await loginPage.open();
      await loginPage.loginAsEmployee();
      await expect.poll(() => bootstrapTegengehouden, { timeout: 20_000 }).toBe(true);
    });

    await test.step('When de medewerker april 2026 kiest, een maand vóór zijn indiensttreding in mei', async () => {
      const uitkomst = await page.evaluate(() => {
        const w = window as typeof window & {
          setPeriod: (key: string) => boolean;
          currentEmployee: () => { name?: string; startDate?: string; dbEmployeeId?: number };
        };
        const medewerker = w.currentEmployee();
        // Zelfcontrole: zonder dbEmployeeId is dit nog de catalogusrij, dus
        // zitten we echt vóór de hydratatie. Anders meet deze case niets.
        const vóórHydratatie = medewerker.dbEmployeeId === undefined;
        const geaccepteerd = w.setPeriod('2026-04');
        const label = String(document.querySelector('#period-label')?.textContent || '').trim();
        return { vóórHydratatie, naam: medewerker.name, startDate: medewerker.startDate, geaccepteerd, label };
      });

      expect(uitkomst.vóórHydratatie, 'de bootstrap hoort tegengehouden te zijn; anders meet deze case het racevenster niet').toBe(true);
      expect(uitkomst.geaccepteerd, `april hoort geweigerd te worden, ook vóór hydratatie (${uitkomst.naam}, catalogus-startdatum ${uitkomst.startDate})`).toBe(false);
      expect(uitkomst.label, 'de maand hoort niet naar april te verspringen').not.toBe('April 2026');
    });
  } finally {
    laatBootstrapDoor();
  }
});

test('[DASH-N-024] een lokaal record van vóór indiensttreding verschijnt niet in Mijn maanden', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker is ingelogd en er bestaat lokaal een record van vóór de startdatum', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    // Mijn maanden staat sinds v1.0.73 op een eigen scherm i.p.v. altijd
    // uitgeklapt onderaan het Dashboard. Deze case gaat over wát er in die
    // tabel staat, dus wordt hier eerst naar dat scherm genavigeerd; de
    // inhoudelijke controles verderop blijven ongewijzigd.
    // Sinds 14 sep via de eigen tab "Maanden"; de archiefregel is weg.
    await page.locator('.nav-item[data-view="historie"]:visible').click();
    await expect(page.locator('#employee-history')).toBeVisible();
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { id: number };
        recordFor: (employeeId: number, periodKey: string) => { entries: number[][]; timesheetStatus: string };
        persistState: () => void;
        renderAll: () => void;
      };
      const employeeId = runtime.currentEmployee().id;
      // April 2026 ligt vóór de indiensttreding (mei 2026) van deze medewerker op
      // TEST, maar krijgt hier toch declarabele uren -- exact het scenario waarbij
      // een lokaal record kan bestaan van vóór de startdatum.
      const april = runtime.recordFor(employeeId, '2026-04');
      april.entries = [[8, 0, 0, 0, 0]];
      april.timesheetStatus = 'approved';
      runtime.persistState();
      runtime.renderAll();
    });
  });

  await test.step('Then blijft april 2026 weg uit de historie, ook al heeft het record uren', async () => {
    await expect(page.locator('#employee-history')).not.toContainText('April 2026');
  });
});

test('[DASH-N-025] een gekozen klanturenstaat-bestand blijft niet hangen na een gewone maandwissel', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker heeft een bestand gekozen voor de huidige maand', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('#customer-timesheet-file').setInputFiles({
      name: 'klantdocument.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test'),
    });
    await expect(page.locator('#customer-timesheet-file')).toHaveValue(/klantdocument\.pdf/);
  });

  await test.step('When de medewerker via de gewone pijltjesnavigatie naar een andere maand gaat', async () => {
    await page.locator('#period-prev').click();
    await expect(page.locator('#timesheet-period-title')).toHaveText('Juli 2026');
  });

  await test.step('Then staat het bestandsveld weer leeg, want het gekozen bestand hoorde bij de vorige maand', async () => {
    await expect(page.locator('#customer-timesheet-file')).toHaveValue('');
  });
});

test('[DASH-N-021] een lege oudere maand openen voegt geen fantoom-open-acties toe en houdt de kalendermaand in beeld', async ({ page }) => {
  const loginPage = new LoginPage(page);

  let totalOnCalendarMonth = '';

  // Juni 2026 valt binnen het dienstverband van deze medewerker (start mei
  // 2026), maar de gedeelde TEST-seed kan er restdata van eerdere testruns in
  // hebben staan. We mocken de leesroutes voor precies deze medewerker+maand
  // zodat juni gegarandeerd leeg is, ongeacht wat er al in de database staat.
  await page.route('**/server/api/timesheets.php**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method().toUpperCase() !== 'GET' || url.searchParams.get('period') !== '2026-06' || url.searchParams.get('employee_id') !== '2') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, found: false, period: '2026-06', employee_id: 2, timesheet: null }) });
  });
  await page.route('**/server/api/customer-timesheets.php**', async route => {
    const url = new URL(route.request().url());
    if (route.request().method().toUpperCase() !== 'GET' || url.searchParams.get('period') !== '2026-06' || url.searchParams.get('employee_id') !== '2') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, found: false, period: '2026-06', employee_id: 2, customer_timesheet: null }) });
  });

  await test.step('Given de medewerker ziet zijn open acties in de actuele kalendermaand augustus', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    // De gedeelde TEST-seed heeft juni al met echte activiteit (een concept met
    // geboekte uren); de eerste hydratie haalt die dus terecht op vóórdat onze
    // route-mock hierboven kan ingrijpen. Zet juni na die hydratie lokaal leeg,
    // zodat deze case een écht leeg-maar-in-dienst scenario test i.p.v. te
    // vertrouwen op wat er toevallig al in de seed staat.
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { id: number };
        recordFor: (employeeId: number, periodKey: string) => {
          entries: number[][]; leave: number; sick: number; timesheetStatus: string;
          invoiceStatus: string; payrollStatus: string; correctionHistory: unknown[];
          customerTimesheet: { status: string };
        };
        persistState: () => void;
        renderAll: () => void;
      };
      const employeeId = runtime.currentEmployee().id;
      const june = runtime.recordFor(employeeId, '2026-06');
      june.entries = [];
      june.leave = 0;
      june.sick = 0;
      june.timesheetStatus = 'draft';
      june.invoiceStatus = 'concept';
      june.payrollStatus = 'concept';
      june.correctionHistory = [];
      june.customerTimesheet.status = 'missing';
      runtime.persistState();
      runtime.renderAll();
    });
    totalOnCalendarMonth = (await page.locator('#employee-open-task-total').textContent() || '').trim();
    expect(totalOnCalendarMonth).toMatch(/^\d+ open acties$/);
    await expect(page.locator('[data-employee-open-month="2026-06"]')).toHaveCount(0);
  });

  await test.step('When de medewerker handmatig een lege oudere maand (juni 2026) opent', async () => {
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    await page.locator('#period-month-panel [data-period-month="06"][data-month-control="#period-month-picker"]').click();
    await expect(page.locator('#period-label')).toHaveText('Juni 2026');
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });
  });

  await test.step('Then verschijnt juni niet als open-actiemaand en blijven het totaal en de kalendermaand ongewijzigd', async () => {
    await expect(page.locator('[data-employee-open-month="2026-06"]')).toHaveCount(0);
    // Op desktop staan de open maanden in Klassiek als chips in "Nog te doen"
    // (Vandaag, referentie medewerker-gui.html); "Open acties per maand" is daar
    // verborgen maar wordt nog wel gevuld. Beide horen juni niet te noemen.
    await expect(page.locator('#vd-nogtedoen-chips [data-vd-open-maand="2026-06"]')).toHaveCount(0);
    if (await staatVandaagInBeeld(page)) {
      await expect(page.locator('#vd-nogtedoen-chips [data-vd-open-maand="2026-08"]')).toBeVisible();
    } else {
      // Telefoon (medewerker-wild.html) heeft geen maandchips; daar volgt de hero
      // de gekozen maand.
      await expect(page.locator('#vdt-verloop-kop')).toHaveText('Verloop van juni');
    }
    await expect(page.locator('#employee-open-task-total')).toHaveText(totalOnCalendarMonth);
    await expect(page.locator('#employee-dashboard-next')).not.toContainText('Juni 2026');
  });
});

test('[DASH-N-009] medewerker teller blijft stabiel bij aug-juli-aug en dashboard triggert geen verborgen timesheet-read', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let timesheetReadHits = 0;

  await test.step('Given de medewerker zit op het dashboard en timesheet-read is gemonitord', async () => {
    await page.route('**/server/api/customer-timesheets.php**', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false })
    }));
    await page.route('**/server/api/timesheets.php**', async route => {
      if (route.request().method() === 'GET') {
        timesheetReadHits += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            found: true,
            timesheet: {
              status: 'submitted',
              contractual_hours: 151.2,
              billable_hours: 8,
              leave_hours: 0,
              sickness_hours: 0,
              day_entries: [],
              version: 7,
              correction_history: []
            }
          })
        });
        return;
      }
      await route.continue();
    });

    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    timesheetReadHits = 0;
  });

  await test.step('When de medewerker augustus-juli-augustus doorloopt vanuit dashboard', async () => {
    await expect(page.locator('#employee-open-task-total')).toHaveText(/\d+ open actie/, { timeout: 15_000 });
    const startBadge = (await page.locator('#employee-dashboard-count').textContent() || '').trim();
    const startHero = (await page.locator('#employee-open-task-total').textContent() || '').trim();

    await page.locator('#period-prev').click();
    await page.locator('#period-next').click();

    await expect(page.locator('#employee-dashboard-count')).toHaveText(startBadge);
    await expect(page.locator('#employee-open-task-total')).toHaveText(startHero);
  });

  await test.step('Then blijft de teller gelijk en zijn er geen verborgen timesheet-reads', async () => {
    expect(timesheetReadHits).toBe(0);
  });
});

test('[DASH-H-003] medewerkerdashboard ververst meteen na ureninvoer en themakiezer blijft leesbaar', async ({ page }) => {
  // Draait op elke projectbreedte. Het maandcijfer staat in Vandaag op desktop in
  // de kopkaart ("32,0 van 160,0 uur") en op telefoon groot in de hero; welke
  // zichtbaar is, hangt van de breedte af. Desktop toetst ook [DASH-H-037].
  const loginPage = new LoginPage(page);
  const maandcijfer = page.locator('#vd-kop-uren:visible, #vdt-maanduren:visible').first();

  await page.route('**/server/api/timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));

  await test.step('Given een medewerker die een urenstaat vult en het thema wisselt', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    // Wacht tot de eerste werkvoorraad-sync (hier een geblokte 503) is afgerond:
    // die hertekening geeft een scroll-event dat anders het net geopende
    // profielmenu weer sluit.
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });
    await openProfielmenu(page);
    await page.locator('[data-profile-action="preferences"]').click();
    await page.locator('#pref-theme-trigger').click();
    await page.locator('[data-standard-choice-target="pref-theme"][data-standard-choice-value="dark"]').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('button[data-view="timesheet"]').click();
  });

  await test.step('When de medewerker uren invult en terug naar het medewerkerdashboard gaat', async () => {
    await page.locator('button[data-view="employee-dashboard"]:visible').first().click();
    const totalBefore = await maandcijfer.textContent();
    await page.locator('button[data-view="timesheet"]:visible').first().click();
    const firstInput = page.locator('.hours-table input').first();
    await firstInput.fill('11');
    await firstInput.press('Enter');
    await page.locator('button[data-view="employee-dashboard"]').click();

    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#page-title')).toHaveText(/Mijn overzicht/);
    await expect(maandcijfer).not.toHaveText(totalBefore || '', { timeout: 15_000 });
  });

  await test.step('Then blijven de maandnamen zichtbaar in donkere modus', async () => {
    // "Open acties per maand" staat niet meer in Klassiek; het contrast van dat
    // blok is daarmee vervallen. De maandkiezer blijft.
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    await expect(page.locator('#period-month-panel')).toBeVisible();
    const firstMonth = page.locator('#period-month-panel button').first();
    await expect(firstMonth).toBeVisible();
    const contrastRatio = await firstMonth.evaluate((button) => {
      const parseRgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (rgb: number[]) => {
        const channels = rgb.map((value) => {
          const channel = value / 255;
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
      };
      const style = getComputedStyle(button);
      const foreground = luminance(parseRgb(style.color));
      const background = luminance(parseRgb(style.backgroundColor));
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
  });
});

// [DASH-H-004] is vervallen (14 sep): hij liep via de volgende-actieknop die in
// Klassiek niet meer bestaat, en toetste verder hetzelfde als [DASH-H-003].

// [DASH-H-005] is vervallen (14 sep): "Open acties per maand" staat niet meer in
// Klassiek, en in Modern blijft een actie daaruit bewust op het Dashboard, wat
// [SKIN-H-024] toetst. De maandchips in Klassiek toetst [DASH-H-038].

// [DASH-H-014] is vervallen (14 sep): de volgende-actieknop (#employee-dashboard-
// action) en "Bekijk alle open acties" staan in Klassiek en Modern niet meer in
// beeld. De route per maand toetsen nu [DASH-H-038] (Klassiek, chips) en
// [SKIN-H-024] (Modern, #employee-open-overview-next). De prioriteit zelf blijft
// in [DASH-N-015].

test('[DASH-N-015] medewerkerprioriteit kiest correctie boven document en toont niets als alles klaar is', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.route('**/server/api/timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));
  await page.route('**/server/api/customer-timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));

  await test.step('Given alleen augustus zowel een urencorrectie als documentherindiening vraagt', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { id: number };
        recordFor: (employeeId: number, periodKey: string) => MutableRecord;
        persistState: () => void;
        renderAll: () => void;
      };
      const employeeId = runtime.currentEmployee().id;
      ['2026-06', '2026-07', '2026-08'].forEach(periodKey => {
        const record = runtime.recordFor(employeeId, periodKey);
        record.timesheetStatus = 'submitted';
        record.customerTimesheet.status = 'received';
        record.correctionHistory = [];
      });
      const august = runtime.recordFor(employeeId, '2026-08');
      august.timesheetStatus = 'correction';
      august.customerTimesheet.status = 'resubmit';
      august.customerTimesheet.reviewNote = 'Upload de definitieve ondertekende versie.';
      august.correctionHistory = [{
        requestedBy: 'Gio Maatsen',
        requestedAt: '13 augustus 2026, 10:00',
        message: 'Controleer de uren op maandag.',
        resubmittedAt: ''
      }];
      runtime.persistState();
      runtime.renderAll();
    });
  });

  await test.step('Then staat de urencorrectie vóór het document en kloppen de totalen', async () => {
    await expect(page.locator('#employee-open-task-total')).toHaveText('2 open acties');
    await expect(page.locator('#employee-open-task-months')).toHaveText('Augustus: 2 open acties');
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-period', '2026-08');
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-type', 'hours');
    const rows = page.locator('[data-employee-open-month="2026-08"] [data-employee-action-row]');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute('data-employee-action-row', 'hours');
    await expect(rows.nth(0)).toContainText('Correctie indienen');
    await expect(rows.nth(1)).toHaveAttribute('data-employee-action-row', 'customer');
    await expect(rows.nth(1)).toContainText('Upload de definitieve ondertekende versie.');
  });

  await test.step('And bij een volledig afgeronde werkvoorraad verdwijnen taaklijst en prioriteitsdata', async () => {
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { id: number };
        recordFor: (employeeId: number, periodKey: string) => MutableRecord;
        persistState: () => void;
        renderAll: () => void;
      };
      const employeeId = runtime.currentEmployee().id;
      ['2026-06', '2026-07', '2026-08'].forEach(periodKey => {
        const record = runtime.recordFor(employeeId, periodKey);
        record.timesheetStatus = 'approved';
        record.customerTimesheet.status = 'approved';
        record.correctionHistory = [];
      });
      runtime.persistState();
      runtime.renderAll();
    });
    await expect(page.locator('#employee-open-task-total')).toHaveText('0 open acties');
    await expect(page.locator('#employee-open-overview')).toBeHidden();
    await expect(page.locator('#employee-dashboard-all-actions')).toBeHidden();
    await expect(page.locator('#employee-dashboard-next-label')).toHaveText('Deze maand');
    await expect(page.locator('#employee-dashboard-action')).not.toHaveAttribute('data-employee-action-period', /.+/);
    await expect(page.locator('#employee-dashboard-action')).not.toHaveAttribute('data-employee-action-type', /.+/);
  });
});

test('[DASH-N-016] correctieactie ververst een verborgen rooster uit een eerdere maand', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Deze test is uitsluitend gericht op het servergestuurde urenrooster. Houd de
  // expliciet lokaal ingerichte klantdocumentstatus buiten de echte API-readback.
  await page.route('**/server/api/customer-timesheets.php**', async route => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });

  await page.route('**/server/api/timesheets.php**', async route => {
    const request = route.request();
    if (request.method().toUpperCase() !== 'GET') {
      await route.continue();
      return;
    }
    const url = new URL(request.url());
    const period = url.searchParams.get('period') || '2026-08';
    const correction = period === '2026-08';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        found: true,
        period,
        employee_id: 2,
        timesheet: {
          id: correction ? 1602 : 1601,
          status: correction ? 'correction' : 'approved',
          contractual_hours: correction ? 151.2 : 153,
          billable_hours: correction ? 80 : 153,
          leave_hours: 0,
          sickness_hours: 0,
          employee_note: null,
          review_note: correction ? 'Controleer 12 augustus en dien opnieuw in.' : null,
          day_entries: [{ work_date: `${period}-12`, hours: correction ? 8 : 7, description: 'Regressiedag' }],
          submitted_at: '2026-08-05T09:30:00Z',
          approved_at: correction ? null : '2026-08-03T10:02:00Z',
          approved_by: correction ? null : 1,
          version: 4,
          latest_correction: correction ? {
            id: 1,
            correction_message: 'Controleer 12 augustus en dien opnieuw in.',
            requested_by: 1,
            requested_by_name: 'Gio Maatsen',
            requested_at: '2026-08-05T10:15:00Z',
            resubmitted_at: null,
          } : null,
          correction_history: correction ? [{
            id: 1,
            correction_message: 'Controleer 12 augustus en dien opnieuw in.',
            requested_by: 1,
            requested_by_name: 'Gio Maatsen',
            requested_at: '2026-08-05T10:15:00Z',
            resubmitted_at: null,
          }] : [],
        },
      }),
    });
  });

  await test.step('Given juli als goedgekeurde verborgen urenstaat is achtergebleven', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { id: number };
        recordFor: (employeeId: number, periodKey: string) => MutableRecord;
        persistState: () => void;
        renderAll: () => void;
      };
      const employeeId = runtime.currentEmployee().id;
      ['2026-05', '2026-06', '2026-07'].forEach(periodKey => {
        const record = runtime.recordFor(employeeId, periodKey);
        record.timesheetStatus = 'approved';
        record.customerTimesheet.status = 'sent';
        record.correctionHistory = [];
      });
      const august = runtime.recordFor(employeeId, '2026-08');
      august.timesheetStatus = 'correction';
      august.customerTimesheet.status = 'sent';
      august.correctionHistory = [{
        requestedBy: 'Gio Maatsen',
        requestedAt: '5 augustus 2026 om 10:15',
        message: 'Controleer 12 augustus en dien opnieuw in.',
        resubmittedAt: null,
      }];
      runtime.persistState();
      runtime.renderAll();
    });
    await page.locator('button[data-view="timesheet"]').click();
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    await page.locator('#period-month-panel [data-period-month="07"][data-month-control="#period-month-picker"]').click();
    await expect(page.locator('#timesheet-period-title')).toHaveText('Juli 2026');
    await expect(page.locator('#timesheet-status')).toHaveText('Goedgekeurd');
  });

  await test.step('When het dashboard augustus prioriteert en Open correctie wordt gekozen', async () => {
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    // Desktop via de chip in "Nog te doen", telefoon via maandpil en hoofdknop.
    await openUrenactieVanMaand(page, '2026-08', { chip: 'correctie', knop: 'Open correctie' });
  });

  await test.step('Then toont Mijn uren augustus als bewerkbare correctie met herindienknop', async () => {
    await expect(page.locator('#timesheet-period-title')).toHaveText('Augustus 2026');
    await expect(page.locator('#timesheet-status')).toHaveText('Correctie nodig');
    await expect(page.locator('#timesheet-correction-banner')).toBeVisible();
    await expect(page.locator('#hours-grid .hours-input:not([disabled])').first()).toBeVisible();
    await page.locator('[data-hours-week-scope="all"]').click();
    await expect(page.locator('#submit-timesheet')).toBeVisible();
    await expect(page.locator('#submit-timesheet')).toContainText('opnieuw indienen');
  });
});

test('[DASH-N-018] medewerkerdashboard toont een laadtoestand tot de eerste werkvoorraad-sync', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let timesheetGateOpen = false;

  // De open-taken-hydratie van de medewerker haalt de urenstaat en de
  // klanturenstaat van de maand op. Zolang dat hangt, mag het dashboard niet
  // stellig "Alles voor deze maand is afgerond" tonen om daarna alsnog naar
  // "open acties" te springen.
  await page.route('**/server/api/timesheets.php**', async route => {
    while (!timesheetGateOpen) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    await route.continue();
  });

  await test.step('Given de eerste werkvoorraad-sync van de medewerker nog niet terug is', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('Then toont het dashboard een neutrale laadtoestand en geen stellige afgerond-tekst', async () => {
    await expect(page.locator('#employee-open-task-total')).toHaveText(/laden/i, { timeout: 10_000 });
    await expect(page.locator('#employee-dashboard-next')).not.toHaveText(/afgerond/i);
    await expect(page.locator('#employee-dashboard-action')).toBeDisabled();
  });

  await test.step('When de sync binnenkomt, verschijnt de gezaghebbende stand', async () => {
    timesheetGateOpen = true;
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });
    await expect(page.locator('#employee-dashboard-action')).toBeEnabled();
  });

  await loginPage.logout();
});

test('[DASH-H-006] medewerker mag tot 2 jaar vooruitkijken zonder fantoom-werkactie, maar niet verder', async ({ page }) => {
  // Vooruitkijken was ooit volledig dicht (elke toekomstmaand geweigerd),
  // op verzoek verruimd naar 2 jaar zodat een medewerker vooruit kan plannen
  // -- de oorspronkelijke zorg (fantoom-"open acties" voor een maand die nog
  // niet begonnen is) blijft afgedekt doordat employeeOpenMonthSummaries()
  // altijd al hard op de échte kalendermaand is begrensd, los van welke
  // periode je bekijkt. Vaste klok (zoals DASH-H-007), zodat "volgende
  // maand" en "meer dan 2 jaar vooruit" niet meedrijven met de echte datum.
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-15T10:00:00.000Z'));
  let openOverviewVisible = false;

  await test.step('Given een medewerker op de actuele kalendermaand zonder toekomstige werkactie', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    // Wacht tot de eerste werkvoorraad-sync binnen is: zolang die loopt is de
    // open-maandenkaart bewust verborgen, en dan legt deze case een beginstand
    // vast die na de sync alsnog verandert.
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i);
    openOverviewVisible = await page.locator('#employee-open-overview').isVisible();
    await expect(page.locator('#period-label')).toHaveText('September 2026');
    await expect(page.locator('#employee-open-overview-list')).not.toContainText('Oktober 2026');
  });

  await test.step('When de medewerker de volgende maand opent (binnen 2 jaar)', async () => {
    await page.locator('#period-next').click();
    await expect(page.locator('#period-label')).toHaveText('Oktober 2026');
    // Een gewone bevestigingstoast bij een geslaagde periodewissel hoort er
    // te zijn; alleen de weigeringstekst mag niet verschijnen.
    await expect(page.locator('#toast')).not.toContainText('vooruitkijken');
  });

  await test.step('Then blijft oktober buiten de medewerkerwerkvoorraad (geen fantoom-actie)', async () => {
    if (openOverviewVisible) {
      await expect(page.locator('#employee-open-overview')).toBeVisible();
    } else {
      await expect(page.locator('#employee-open-overview')).toBeHidden();
    }
    await expect(page.locator('#employee-open-overview-list')).not.toContainText('Oktober 2026');
  });

  await test.step('When de medewerker meer dan 2 jaar vooruit probeert te springen', async () => {
    await page.evaluate(() => (window as unknown as { setPeriod: (key: string) => boolean }).setPeriod('2029-01'));
    await expect(page.locator('#period-label')).toHaveText('Oktober 2026');
    await expect(page.locator('#toast')).toContainText('niet verder dan 2 jaar vooruitkijken');
  });
});

test('[DASH-H-007] september toont alleen historie vanaf de persoonlijke startmaand, en oktober blijft geen werkactie ondanks dat vooruitkijken nu mag', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-15T10:00:00.000Z'));

  await test.step('Given een medewerker die in september sinds augustus in dienst is', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i);
    await page.evaluate(() => {
      const runtime = window as typeof window & {
        currentEmployee: () => { startDate: string };
        persistState: () => void;
        renderAll: () => void;
      };
      runtime.currentEmployee().startDate = '2026-08-01';
      runtime.persistState();
      runtime.renderAll();
    });
    await expect(page.locator('#period-label')).toHaveText('September 2026');
  });

  await test.step('When de medewerker augustus opent en daarna juli en oktober probeert', async () => {
    await page.locator('#period-prev').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await page.locator('#period-prev').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await expect(page.locator('#toast')).toContainText('vóór je indiensttreding');
    await page.locator('#period-next').click();
    await expect(page.locator('#period-label')).toHaveText('September 2026');
    await page.locator('#period-next').click();
  });

  await test.step('Then blijft juli dicht, en oktober opent wel (binnen 2 jaar) maar is geen werkactie', async () => {
    // Oktober ligt maar 1 maand vooruit, dus binnen de sinds kort toegestane
    // 2 jaar -- de navigatie zelf slaagt nu. De oorspronkelijke zorg van deze
    // case blijft overeind: oktober mag geen fantoom-"open actie" worden,
    // want dat blijft hard begrensd op de échte kalendermaand.
    await expect(page.locator('#period-label')).toHaveText('Oktober 2026');
    await expect(page.locator('#toast')).not.toContainText('vooruitkijken');
    await expect(page.locator('#employee-open-overview-list')).not.toContainText('Oktober 2026');
  });
});

test('[DASH-H-024] startdatum verbergt procesmaand zonder uren of klanturenstaatactie te wissen', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();

  const result = await page.evaluate(() => {
    const runtime = window as typeof window & {
      currentEmployee: () => { id: number; startDate: string; customerTimesheetExpected: boolean };
      recordFor: (employeeId: number, periodKey: string) => MutableRecord;
      entriesFromTotal: (total: number, periodKey: string) => number[][];
      totalEntries: (entries: number[][]) => number;
      employeeOpenMonthSummaries: (employeeId: number, periodKey: string) => Array<{ periodKey: string; actions: Array<{ type: string }> }>;
      employeeOpenTasks: (employeeId: number) => Array<{ periodKey: string; type: string }>;
    };
    const employee = runtime.currentEmployee();
    employee.customerTimesheetExpected = true;
    employee.startDate = '2026-07-01';
    const july = runtime.recordFor(employee.id, '2026-07');
    july.entries = july.entries.map(week => week.map(() => 0));
    july.leave = 0;
    july.sick = 0;
    july.timesheetStatus = 'draft';
    july.invoiceStatus = 'concept';
    july.payrollStatus = 'concept';
    july.customerTimesheet.status = 'missing';
    const initialTotal = runtime.totalEntries(july.entries);
    july.entries = runtime.entriesFromTotal(8, '2026-07');

    const snapshot = () => ({
      employeeActions: runtime.employeeOpenMonthSummaries(employee.id, '2026-08')
        .filter(item => item.periodKey === '2026-07')
        .flatMap(item => item.actions.map(action => action.type)),
      adminActions: runtime.employeeOpenTasks(employee.id)
        .filter(task => task.periodKey === '2026-07')
        .map(task => task.type),
      total: runtime.totalEntries(runtime.recordFor(employee.id, '2026-07').entries),
      customerStatus: runtime.recordFor(employee.id, '2026-07').customerTimesheet.status,
    });

    const afterEntry = snapshot();
    employee.startDate = '2026-08-01';
    const hidden = snapshot();
    employee.startDate = '2026-07-01';
    const restored = snapshot();
    return { initialTotal, afterEntry, hidden, restored };
  });

  await test.step('Given Beheer de startdatum eerder heeft gezet en juli nog leeg was', async () => {
    expect(result.initialTotal).toBe(0);
  });
  await test.step('When de medewerker uren invult terwijl de klanturenstaat nog openstaat', async () => {
    expect(result.afterEntry.total).toBe(8);
    expect(result.afterEntry.customerStatus).toBe('missing');
    expect(result.afterEntry.employeeActions).toEqual(['hours', 'customer']);
    expect(result.afterEntry.adminActions).toEqual(expect.arrayContaining(['hours-draft', 'customer-waiting']));
  });
  await test.step('Then een latere startdatum verbergt de maand en beide acties maar wist niets', async () => {
    expect(result.hidden.employeeActions).toEqual([]);
    expect(result.hidden.adminActions).toEqual([]);
    expect(result.hidden.total).toBe(8);
    expect(result.hidden.customerStatus).toBe('missing');
  });
  await test.step('And opnieuw vervroegen herstelt exact dezelfde uren- en klanturenstaatflow', async () => {
    expect(result.restored.total).toBe(8);
    expect(result.restored.customerStatus).toBe('missing');
    expect(result.restored.employeeActions).toEqual(['hours', 'customer']);
    expect(result.restored.adminActions).toEqual(expect.arrayContaining(['hours-draft', 'customer-waiting']));
  });
});

test('[DASH-H-023] medewerker kan met de browser-terug/-vooruit-knop door alle eigen schermen navigeren', async ({ page }) => {
  const loginPage = new LoginPage(page);
  // Vier tabs sinds 14 sep: Vandaag · Mijn uren · Maanden · Berichten.
  const volgorde = ['employee-dashboard', 'timesheet', 'historie', 'employee-announcements'] as const;

  await test.step('Given de medewerker is ingelogd op Mijn overzicht', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await verwachtAlleenSchermActief(page, 'employee-dashboard');
  });

  await test.step('When de medewerker achtereenvolgens elk scherm opent', async () => {
    for (const scherm of volgorde.slice(1)) {
      await page.locator(`button[data-view="${scherm}"]:visible`).first().click();
      await verwachtAlleenSchermActief(page, scherm);
    }
  });

  await test.step('Then brengt browser-terug telkens het vorige scherm terug', async () => {
    for (let i = volgorde.length - 2; i >= 0; i--) {
      await page.goBack();
      await verwachtAlleenSchermActief(page, volgorde[i]);
    }
  });

  await test.step('Then brengt browser-vooruit telkens het volgende scherm terug', async () => {
    for (let i = 1; i < volgorde.length; i++) {
      await page.goForward();
      await verwachtAlleenSchermActief(page, volgorde[i]);
    }
  });

  await test.step('Then een paginaherlading op een teruggenavigeerd scherm blijft daar staan, springt niet terug naar het beginscherm', async () => {
    // Regression-vangnet: het opstartpad leest de hash ook maar één keer (zie
    // hashViewOnLoad in app.js); dit bevestigt dat een herlading na terug-
    // navigeren consistent blijft met wat de hash op dat moment zegt.
    await page.goBack();
    const huidigeHash = new URL(page.url()).hash.replace(/^#/, '') as (typeof ALLE_SCHERMEN)[number];
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
    await verwachtAlleenSchermActief(page, huidigeHash);
  });

  await loginPage.logout();
});

// Regressie: bij de allereerste login als medewerker kon currentEmployee() heel
// even null zijn terwijl de serverdata nog binnenkwam. `Number(currentEmployee().id)`
// gooide dan een TypeError midden in de hydratie-afronding (`rondAf`): de
// hydratievlag stond al op true, maar er volgde geen hertekening. In een gewone
// browser loste een F5 het op; in de geïnstalleerde PWA bleef "Werkvoorraad
// laden…" permanent staan. De fix maakt rondAf defensief en hertekent altijd
// zolang het medewerkerdashboard zichtbaar is.
test('[DASH-N-026] het medewerkerdashboard blijft nooit op "Werkvoorraad laden" hangen, ook niet als de eerste serversync faalt', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Forceer een falende/hangende eerste leessync: de hydratie moet dan via het
  // vangnet alsnog netjes afronden en de laadtekst weghalen.
  await page.route('**/server/api/timesheets.php**', async route => {
    if (route.request().method().toUpperCase() === 'GET') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'forced-test-failure' }) });
      return;
    }
    await route.continue();
  });
  await page.route('**/server/api/customer-timesheets.php**', async route => {
    if (route.request().method().toUpperCase() === 'GET') {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'forced-test-failure' }) });
      return;
    }
    await route.continue();
  });

  await test.step('Given de medewerker logt voor het eerst in terwijl de eerste werkvoorraad-sync mislukt', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('When de hydratie via het vangnet afrondt', async () => {
    // Het vangnet in de app staat op 4s; ruim binnen 12s moet de laadtekst weg zijn.
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 12_000 });
  });

  await test.step('Then toont geen enkele werkvoorraadplek nog een laadtekst', async () => {
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i);
    await expect(page.locator('#employee-dashboard-next-meta')).not.toContainText('wordt opgehaald');
    await expect(page.locator('#employee-dashboard-next-label')).not.toHaveText('Bezig');
  });
});

// Regressie: todaysWeekIndexInPeriod (en mobileWeekScope) matchten "vandaag"
// tegen week.days, dat alleen werkdagen bevat -- in het weekend was er dus
// nooit een match en viel de bento altijd terug op week 0 (de eerste week
// van de maand), ook al leefde de medewerker allang in een latere week.
// 12 september 2026 is een zaterdag binnen ISO-week 37 (7-13 sep, werkdagen
// 7-11 sep in september); vóór de fix toonde de bento hier ten onrechte
// "Week 36" (1-4 sep). Zie UI-TAKENLIJST.md.
test('[DASH-N-028] Mijn uren toont in het weekend de week waar vandaag in valt, niet de eerste week van de maand', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-12T10:00:00.000Z'));

  await test.step('Given een medewerker inlogt op een zaterdag', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  await test.step('Then toont de weekkaart de week van vandaag (7-11 sep), niet de eerste week van de maand', async () => {
    await expect(page.locator('#new-bento-week-title')).toHaveText('Week 37');
    await expect(page.locator('#new-bento-week-range')).toContainText('7 september 2026');
    await expect(page.locator('#new-bento-week-range')).toContainText('11 september 2026');
  });

  await test.step('And telt Volgende week vanaf de juiste week verder, niet vanaf de eerste week van de maand', async () => {
    // De pijl springt sinds v2.0.4 naar de eerstvolgende week met nog een leeg
    // urenvak, niet blind naar de volgende index. Staat week 38 in de gedeelde
    // demodata al vol, dan slaat hij hem over. Op CI gebeurde dat twee keer op
    // rij (verwacht Week 38, gekregen Week 39), terwijl deze case los op een
    // verse database groen was: de uitkomst hing af van wat een eerdere case in
    // dezelfde shard had achtergelaten. Dezelfde val als [SKIN-H-017].
    //
    // Daarom zet de case de week na die van vandaag hier zelf leeg, en doet hij
    // leegzetten, opslaan, hertekenen en klikken in één evaluate zodat er geen
    // sync tussen kan komen. De eis is ongewijzigd: vanaf week 37 is de
    // volgende week 38, niet week 37 van de eerste week van de maand af geteld.
    const herstelUrenstaat = await bewaarUrenstaat(page);
    try {
      const volgendeWeek = await page.evaluate(() => {
        const runtime = window as unknown as {
          currentEmployee: () => { id: number };
          currentPeriod: () => { key: string; weekRows: Array<{ number: number }> };
          recordFor: (id: number, key?: string) => { entries: number[][]; confirmedEntries?: boolean[][] };
          persistState: () => void;
          renderAll: () => void;
        };
        const period = runtime.currentPeriod();
        const record = runtime.recordFor(runtime.currentEmployee().id, period.key);
        const huidig = period.weekRows.findIndex(week => week.number === 37);
        const volgende = huidig + 1;
        if (record.entries[volgende]) record.entries[volgende] = [0, 0, 0, 0, 0];
        if (record.confirmedEntries?.[volgende]) record.confirmedEntries[volgende] = [false, false, false, false, false];
        runtime.persistState();
        runtime.renderAll();
        // #hours-week-nav (Mijn uren) heeft dezelfde data-new-bento-week-knoppen;
        // scopen naar het dashboardkaartje, anders matcht de klik op twee.
        (document.querySelector('#new-employee-bento [data-new-bento-week="next"]') as HTMLElement | null)?.click();
        return 'Week ' + period.weekRows[volgende].number;
      });
      expect(volgendeWeek, 'de week na die van vandaag hoort week 38 te zijn').toBe('Week 38');
      await expect(page.locator('#new-bento-week-title')).toHaveText(volgendeWeek);
    } finally {
      await herstelUrenstaat();
    }
  });
});

test('[DASH-N-029] de pijl springt naar de eerstvolgende week met een leeg urenvak, ook terug in de tijd', async ({ page }) => {
  // Gebruikerswens (12 sep 2026): de pijl moet niet zomaar één week
  // opschuiven, maar naar de eerstvolgende week met nog een leeg urenvak
  // springen -- dat kan dus ook een eerdere week zijn dan waar je nu staat.
  // Alleen het inloggen zelf blijft op de week van vandaag landen; dit
  // bewijst dat de pijl daarna zijn eigen, andere logica volgt.
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-12T10:00:00.000Z'));

  await test.step('Given een medewerker op de week van vandaag (Week 37), met die week en de volgende al volledig ingevuld, maar een eerdere week nog leeg', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('#new-bento-week-title')).toHaveText('Week 37');

    await page.evaluate(() => {
      // @ts-expect-error debug-only voor deze directe controle
      const employee = currentEmployee();
      // @ts-expect-error debug-only voor deze directe controle
      const period = currentPeriod();
      // @ts-expect-error debug-only voor deze directe controle
      const record = recordFor(employee.id, period.key);
      // @ts-expect-error debug-only voor deze directe controle
      const huidigeIndex = newEmployeeBentoWeekIndex(period);
      if (!record.confirmedEntries) record.confirmedEntries = period.weekRows.map(() => [false, false, false, false, false]);
      // Een week vóór vandaag zoeken met minstens één echte dag (een
      // maandbegin kan midden in de week vallen, dus niet elke vroege
      // weekrij heeft alle 5 dagen) en expliciet leeg + niet bevestigd
      // maken (het "nog te doen"-vak).
      const eerdereIndex = period.weekRows.findIndex((week: { days: unknown[] }, index: number) =>
        index < huidigeIndex && week.days.some(Boolean));
      if (eerdereIndex < 0) throw new Error('Geen week vóór vandaag met een echte dag gevonden om te legen.');
      const eerdereWeek = period.weekRows[eerdereIndex];
      const eerdereDagIndex = eerdereWeek.days.findIndex(Boolean);
      record.entries[eerdereIndex] = [0, 0, 0, 0, 0];
      record.confirmedEntries[eerdereIndex] = [false, false, false, false, false];
      window.__eerdereDagIndex = eerdereDagIndex;
      // Vandaag én alle weken erna in deze maand helemaal vullen, zodat de
      // pijl pas na het aflopen van de rest van de maand terug hoeft te
      // springen naar de eerdere, leeg gelaten week.
      for (let weekIndex = huidigeIndex; weekIndex < period.weekRows.length; weekIndex += 1) {
        const week = period.weekRows[weekIndex];
        if (!week) continue;
        record.entries[weekIndex] = week.days.map((day: unknown) => (day ? 8 : 0));
        record.confirmedEntries[weekIndex] = week.days.map(() => true);
      }
      window.__eerdereIndex = eerdereIndex;
      window.__verwachteWeeknummer = period.weekRows[eerdereIndex].number;
      // @ts-expect-error debug-only voor deze directe controle
      renderNewEmployeeBento(record, employee, period);
    });
  });

  await test.step('When op de volgende-week-pijl wordt gedrukt', async () => {
    await page.locator('#new-employee-bento [data-new-bento-week="next"]').click();
  });

  await test.step('Then springt de weergave terug naar de eerdere, nog lege week, niet naar Week 38', async () => {
    const verwachtWeeknummer = await page.evaluate(() => (window as unknown as { __verwachteWeeknummer: number }).__verwachteWeeknummer);
    await expect(page.locator('#new-bento-week-title')).toHaveText('Week ' + verwachtWeeknummer);
    await expect(page.locator('#new-bento-week-title')).not.toHaveText('Week 38');
  });

  await test.step('And staat de focus op het eerste lege urenveld van die week', async () => {
    const focusInfo = await page.evaluate(() => {
      const w = window as unknown as { __eerdereIndex: number; __eerdereDagIndex: number };
      const active = document.activeElement as HTMLInputElement | null;
      return {
        isHoursInput: Boolean(active?.classList.contains('new-bento-hours-input')),
        weekIndex: active?.dataset.weekIndex,
        dayIndex: active?.dataset.dayIndex,
        verwachtWeekIndex: String(w.__eerdereIndex),
        verwachtDagIndex: String(w.__eerdereDagIndex),
      };
    });
    expect(focusInfo.isHoursInput).toBe(true);
    expect(focusInfo.weekIndex).toBe(focusInfo.verwachtWeekIndex);
    expect(focusInfo.dayIndex).toBe(focusInfo.verwachtDagIndex);
  });
});

test('[DASH-H-026] het medewerkerdashboard houdt op telefoonbreedte de afgesproken prioriteitsvolgorde aan', async ({ page }) => {
  // Checklistpunt 17.1: "Mobiele prioriteit: wat moet ik nu doen -> uren ->
  // open acties -> klanturenstaat -> overig." Op 13 sep op 412px doorgemeten in
  // beide vormgevingen, met de echte scrollpositie van elk blok.
  //
  // Klassiek klopt volledig en wordt hier vastgelegd: hero met de volgende actie
  // (352px) -> open acties (715) -> klanturenstaat (1456) -> cijfers (1772) ->
  // historie (2413). "Uren" heeft op dit dashboard geen eigen blok; de primaire
  // knop in de hero IS de route ernaartoe, dus de volgorde klopt met die knop
  // als stap 2.
  //
  // Nieuw wijkt af, en dat is BEWUST NIET in deze case als "goed" vastgelegd:
  // gemeten stond `#employee-open-overview` op 2789px, dus na de klanturenstaat
  // (1954) en zelfs na het blok "Jouw uren in 5 stappen" (heette "in 4
  // stappen" tot de ontwerpronde van 13 sep, en is sindsdien geen puur
  // uitleggend blok meer maar een live statusketen)
  // (2349) -- ruim drie telefoonschermen naar beneden. De oorzaak is klein en
  // duidelijk: `#view-employee-dashboard` is in Nieuw al een flex-kolom met
  // expliciete `order`-waarden (open acties 1, correctie 2, historie 4), maar
  // `.new-employee-bento` heeft er geen en valt dus als geheel op de
  // standaard `order: 0` vóór alles. Het oplossen vraagt om het openbreken van
  // de bento (`display: contents` + per artikel een eigen order) en dat is een
  // zichtbare herschikking van het startscherm in door de vormgevingslane
  // beheerde CSS -- volgens de opdracht eerst melden, niet zelf doorvoeren.
  // Daarom asserteert deze case voor Nieuw alleen wat onbetwist is (open acties
  // vóór correctie vóór historie) en staat de afwijking als bevinding in
  // MASTERCHECKLIST 17.1. Zou hier de volle volgorde al geasserteerd worden,
  // dan legde de test de afwijking juist vast als gewenst gedrag.
  const loginPage = new LoginPage(page);
  await suppressInstallBanner(page);
  await page.setViewportSize({ width: 412, height: 915 });

  const volgorde = async () => page.evaluate(() => {
    const uit: Array<{ naam: string; top: number }> = [];
    document.querySelectorAll<HTMLElement>('#view-employee-dashboard .employee-hero, #view-employee-dashboard #employee-open-overview, #view-employee-dashboard #employee-customer-timesheet-card, #view-employee-dashboard .employee-metrics, #view-employee-dashboard #employee-history-teaser, #view-employee-dashboard #employee-dashboard-correction').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      uit.push({ naam: el.id || el.className.split(' ')[0], top: Math.round(r.top + window.scrollY) });
    });
    return uit.sort((a, b) => a.top - b.top).map(b => b.naam);
  });

  await test.step('Given een ingelogde medewerker op telefoonbreedte in Klassiek', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 20_000 });
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  await test.step('Then staat in Klassiek Vandaag uit medewerker-wild.html: hero met de actie, dan het verloop, dan de klanturenstaat', async () => {
    // Sinds 14 sep (TEST 2.0.59, punt 5-7) vervangt Vandaag op telefoon de oude
    // blokken; open acties en de archiefregel staan er niet meer.
    const tops = await page.evaluate(() => {
      const top = (sel: string) => {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) return -1;
        const r = el.getBoundingClientRect();
        return r.width < 1 || r.height < 1 ? -1 : Math.round(r.top + window.scrollY);
      };
      return { knop: top('#vdt-hoofdknop'), verloop: top('#vdt-verloop-kop'), kaart: top('#vdt-klant-plek > #employee-customer-timesheet-card') };
    });
    const oud = await volgorde();
    expect(oud.filter(n => n !== 'employee-customer-timesheet-card'), 'de oude Klassieke blokken horen op telefoon weg te zijn').toEqual([]);
    expect(tops.knop, 'de hoofdknop hoort zichtbaar te zijn').toBeGreaterThan(0);
    expect(tops.knop, `de actie hoort boven het verloop te staan (${JSON.stringify(tops)})`).toBeLessThan(tops.verloop);
    expect(tops.verloop, `het verloop hoort boven de klanturenstaat te staan (${JSON.stringify(tops)})`).toBeLessThan(tops.kaart);
  });

  await test.step('And staat in Nieuw open acties in ieder geval boven de correctie- en archiefingang', async () => {
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('#new-employee-bento')).toBeVisible();
    const blokken = await volgorde();
    const openActies = blokken.indexOf('employee-open-overview');
    const historie = blokken.indexOf('employee-history-teaser');
    expect(openActies, `open acties hoort zichtbaar te zijn in Nieuw (gevonden: ${blokken.join(' < ')})`).toBeGreaterThanOrEqual(0);
    expect(historie, `de archiefingang hoort zichtbaar te zijn in Nieuw (gevonden: ${blokken.join(' < ')})`).toBeGreaterThanOrEqual(0);
    expect(openActies, `open acties hoort boven het archief te staan (${blokken.join(' < ')})`).toBeLessThan(historie);
  });
});

// Geen case voor "waar komt de medewerker terecht na een correctie". Het
// handoff-document van 13 sep stelt die vraag als open besluit en adviseert
// optie 2 (terug naar Mijn maanden). Dat is hier gebouwd en weer teruggedraaid:
// bestaand gedrag herstelt na F5 het laatst geopende scherm, en [DASH-N-010]
// dient augustus in -- in de demodata een correctie -- en verwacht daarna Mijn
// uren terug. Een grens op 720px hielp niet: die case draait juist op de
// telefoonprojecten (412 en 390px). De sprong komt terug zodra dat
// herstelgedrag en het ontwerp op elkaar zijn afgestemd; dan hoort hier weer
// een case te staan.

// Ontwerpronde 13 sep (avond): de bevestiging bij "Maand indienen" noemt naast
// het totaal en het aantal weken ook de werkdagen die nog op 0,0 staan. Deze
// case dekt de helft die de app zelf nog niet had: dagen die de medewerker
// BEWUST op 0,0 heeft gezet.
//
// Waarom dat nodig is. Sinds "Terugzetten" de week op 0,0 zet in plaats van op
// standaarduren, gelden die dagen als ingevuld -- ze zijn immers geen gat meer.
// Daarmee kon een maand met een hele week op nul worden ingediend terwijl de
// bevestiging "Nog controleren: Geen" meldde. Het is dus een gat dat die
// ontwerpwijziging zelf heeft gemaakt.
//
// De formulering komt uit handoff/medewerker-wild.bron.txt: maximaal drie dagen
// bij naam, daarna "en nog N".
test('[DASH-H-030] de indienbevestiging noemt werkdagen die bewust op 0,0 staan', async ({ page }) => {
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await page.addInitScript(() => {
    localStorage.setItem('path-install-afgewezen', String(Date.now()));
  });
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await page.evaluate(() => { window.location.hash = 'timesheet'; });
  await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);

  // Opzetten en indienen in één evaluate. Deze case zette de uren eerst in een
  // losse stap en klikte daarna pas op Hele maand en de indienknop. Op
  // tabletbreedte haalde een serversync hem daartussen in: de bevestiging
  // toonde augustus als correctie met 4,0 uur in plaats van de maand die de
  // case had gevuld, en de melding over bewuste nullen ontbrak. Dezelfde race
  // als bij [SKIN-H-017] en [SKIN-H-028].
  //
  // Klikken via de DOM in plaats van via Playwright heeft een tweede reden. Op
  // 721-820px staat onderaan een vaste navigatiebalk, en Playwright scrolde de
  // indienknop net onder die balk, waarna de klik werd onderschept. Voor een
  // gebruiker speelt dat niet: .main-content heeft in die band 95px ruimte
  // onderaan, dus de knop is altijd boven de balk te scrollen. Deze case gaat
  // over de inhoud van de bevestiging, niet over de klikmechaniek.
  const zetEnDienIn = async (bewusteNullen: boolean) => page.evaluate(nullen => {
    const runtime = window as unknown as {
      currentEmployee: () => { id: number };
      currentPeriod: () => { key: string; weekRows: unknown[] };
      recordFor: (id: number, key?: string) => { entries: number[][]; confirmedEntries?: boolean[][]; timesheetStatus: string };
      renderHoursGrid: () => void;
      persistState: () => void;
    };
    const period = runtime.currentPeriod();
    const record = runtime.recordFor(runtime.currentEmployee().id, period.key);
    record.timesheetStatus = 'draft';
    record.confirmedEntries = period.weekRows.map(() => [false, false, false, false, false]);
    // Eerst de hele maand vullen, zodat er geen gewone gaten zijn en de melding
    // die deze case toetst niet kan meeliften op de bestaande waarschuwing.
    record.entries = period.weekRows.map(() => [8, 8, 8, 8, 8]);
    if (nullen) {
      record.entries[0][0] = 0;
      record.confirmedEntries[0][0] = true;
      record.entries[0][1] = 0;
      record.confirmedEntries[0][1] = true;
    }
    runtime.persistState();
    runtime.renderHoursGrid();
    // Naar Hele maand: in één-week-scope is de indienknop bewust verborgen
    // (TS-REV-UI-H-015).
    (document.querySelector('[data-hours-week-scope="all"]') as HTMLElement | null)?.click();
    (document.querySelector('#submit-timesheet') as HTMLElement | null)?.click();
  }, bewusteNullen);

  const herstelUrenstaat = await bewaarUrenstaat(page);
  try {
    await test.step('Given twee werkdagen staan bewust op 0,0, When de medewerker de maand wil indienen', async () => {
      await zetEnDienIn(true);
      await expect(page.locator('#modal')).toBeVisible();
    });

    await test.step('Then noemt de bevestiging die twee dagen bij naam', async () => {
      const melding = page.locator('#submit-deliberate-zero-note');
      await expect(melding, 'de bevestiging hoort bewust op nul gezette werkdagen te noemen; anders dient een medewerker een week op nul in terwijl de modal "Nog controleren: Geen" meldt')
        .toBeVisible();
      await expect(melding).toContainText('2 werkdagen bewust op 0,0');
      // Bij naam, niet als kaal aantal: de bron noemt maximaal drie dagen.
      await expect(melding).toContainText('Ma ');
      await expect(melding).toContainText('Di ');
    });

    await test.step('And blijft de melding weg zodra die dagen wel uren hebben', async () => {
      // Zonder deze helft bewijst de case niet dat de melding aan de bewuste
      // nullen hangt -- hij zou ook altijd kunnen verschijnen.
      await page.locator('#modal-cancel').click();
      await expect(page.locator('#modal')).toBeHidden();
      await zetEnDienIn(false);
      await expect(page.locator('#modal')).toBeVisible();
      await expect(page.locator('#submit-deliberate-zero-note')).toHaveCount(0);
    });
  } finally {
    if (await page.locator('#modal').isVisible()) await page.locator('#modal-cancel').click();
    await herstelUrenstaat();
  }
});

// Ontwerpronde 13 sep: een opengeklapte maand in Mijn maanden toont zijn eigen
// verloop in vijf stappen. In Klassiek is dat een uitklap onder de maandregel,
// met dezelfde toggle-opzet als de maanden in "Open acties per maand" -- dat
// patroon stond er al, dus er komt geen tweede manier van uitklappen bij.
//
// Twee dingen die deze case vastlegt en die stil kunnen omvallen. De uitklap
// moet de hertekening overleven: de maandenlijst wordt bij elke render opnieuw
// opgebouwd, dus de stand zit in de state en niet alleen in de DOM. En er staat
// er hoogstens één open, want vijf stappen per maand maken de lijst anders
// onleesbaar.
test('[DASH-H-031] het verloop van een maand klapt open in Mijn maanden en overleeft een hertekening', async ({ page }) => {
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await suppressInstallBanner(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();

  await test.step('Given de medewerker staat op Mijn maanden in Klassiek', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    await page.evaluate(() => { window.location.hash = 'historie'; });
    await expect(page.locator('#view-historie')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-history .employee-history-row').first()).toBeVisible();
  });

  const eersteToggle = page.locator('#employee-history [data-history-verloop]').first();

  await test.step('Then staat het verloop dicht tot je erom vraagt', async () => {
    await expect(eersteToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#employee-history .employee-history-verloop:visible')).toHaveCount(0);
  });

  await test.step('When het verloop van de eerste maand wordt opengeklapt', async () => {
    await eersteToggle.click();
  });

  await test.step('Then toont die maand vijf stappen in de vaste volgorde', async () => {
    await expect(eersteToggle).toHaveAttribute('aria-expanded', 'true');
    const stappen = page.locator('#employee-history .employee-history-verloop:visible [data-keten-step]');
    await expect(stappen).toHaveCount(5);
    await expect(stappen.locator('strong')).toHaveText([
      'Uren ingevuld', 'Maand ingediend', 'Uren goedgekeurd', 'Klanturenstaat', 'Afgerond',
    ]);
    await expect(page.locator('#employee-history .employee-history-verloop:visible .employee-history-weeks > div')).toHaveCount(5);
    await expect(page.locator('#employee-history .employee-history-verloop:visible .employee-history-actions')).toBeVisible();
  });

  await test.step('And blijft hij open staan na een hertekening van het scherm', async () => {
    // Zonder de stand in de state klapte de uitklap hier weer dicht, want de
    // maandenlijst wordt bij elke render opnieuw opgebouwd.
    await page.evaluate(() => {
      (window as unknown as { renderAll: () => void }).renderAll();
    });
    await expect(page.locator('#employee-history [data-history-verloop]').first()).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#employee-history .employee-history-verloop:visible [data-keten-step]')).toHaveCount(5);
  });

  await test.step('And staat er hoogstens één maand tegelijk open', async () => {
    const tweedeToggle = page.locator('#employee-history [data-history-verloop]').nth(1);
    await tweedeToggle.click();
    await expect(tweedeToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#employee-history [data-history-verloop]').first()).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#employee-history .employee-history-verloop:visible')).toHaveCount(1);
  });

  await test.step('And sluit een tweede tik op dezelfde maand hem weer', async () => {
    await page.locator('#employee-history [data-history-verloop]').nth(1).click();
    await expect(page.locator('#employee-history .employee-history-verloop:visible')).toHaveCount(0);
  });

  await test.step('And toont PDF Urenoverzicht alleen bij afgeronde maanden met de vaste uitleg', async () => {
    const afgerond = page.locator('#employee-history .employee-history-row', { has: page.locator('.status-pill', { hasText: 'Afgerond' }) }).first();
    const afgerondCount = await afgerond.count();
    if (afgerondCount > 0) {
      await afgerond.locator('[data-history-verloop]').click();
      await expect(afgerond.locator('[data-history-receipt-period]')).toHaveText('PDF Urenoverzicht');
      await expect(afgerond).toContainText('Dezelfde PDF die je per mail kreeg — je uren per week.');
    }
    const openRij = page.locator('#employee-history .employee-history-row', { hasNot: page.locator('.status-pill', { hasText: 'Afgerond' }) }).first();
    await expect(openRij.locator('[data-history-receipt-period]')).toHaveCount(0);
  });
});

// TS-REV-UI-H-015 eist dat "Hele maand" niet een kaal aantal toont maar de
// concrete ontbrekende werkdagen. Dat ontbrak: de app noemde alleen op
// weekniveau iets, en pas in de indienbevestiging.
//
// Deze case legt ook de regel van 14 sep vast, en die is een terugdraaiing:
// toekomstige werkdagen tellen gewoon mee als ontbrekend. Een eerdere
// ontwerpronde sloeg dagen na vandaag over; dat is teruggedraaid omdat je de
// hele maand indient en niet de dagen tot vandaag. Zonder deze case zou een
// volgende ronde die terugdraaiing stil ongedaan kunnen maken.
//
// Een dag die de medewerker bewust op 0,0 zette telt wél als ingevuld --
// dezelfde regel die isTimesheetWeekComplete() al hanteert.
test('[DASH-H-032] Mijn uren noemt onderin hoeveel werkdagen nog leeg zijn, inclusief dagen die nog moeten komen', async ({ page }) => {
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await suppressInstallBanner(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();

  // Deze case leegt de hele maand en vult hem daarna weer. Zonder terugzetten
  // ziet een latere case in dezelfde run een maand die niet van haar is; zie de
  // toelichting bij de helper voor de drie keren dat dat vannacht misging.
  const herstelUrenstaat = await bewaarUrenstaat(page);
  try {

  await test.step('Given de medewerker staat op Mijn uren in de maandweergave', async () => {
    await page.evaluate(() => { window.location.hash = 'timesheet'; });
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await page.locator('[data-hours-week-scope="all"]').click();
  });

  await test.step('When de hele maand leeg is op één bewust op 0,0 gezette dag na', async () => {
    await page.evaluate(() => {
      const runtime = window as unknown as {
        currentEmployee: () => { id: number };
        currentPeriod: () => { key: string; weekRows: Array<{ days: Array<unknown> }> };
        recordFor: (id: number, key?: string) => {
          entries: number[][];
          confirmedEntries?: boolean[][];
          timesheetStatus: string;
        };
        persistState: () => void;
        renderHoursGrid: () => void;
        updateHoursTotal: (markDraft: boolean) => void;
      };
      const period = runtime.currentPeriod();
      const record = runtime.recordFor(runtime.currentEmployee().id, period.key);
      record.timesheetStatus = 'draft';
      record.entries = period.weekRows.map(() => [0, 0, 0, 0, 0]);
      record.confirmedEntries = period.weekRows.map(() => [false, false, false, false, false]);
      // De laatste werkdag van de maand bewust op 0,0. Bewust de laatste, want
      // dat is met zekerheid een dag die nog moet komen of net is geweest --
      // zo toetst deze case meteen dat "bewust op 0" zwaarder weegt dan "ligt
      // in de toekomst".
      const laatsteWeek = period.weekRows.length - 1;
      const laatsteDag = period.weekRows[laatsteWeek].days.reduce(
        (gevonden: number, dag: unknown, index: number) => (dag ? index : gevonden), -1);
      record.confirmedEntries[laatsteWeek][laatsteDag] = true;
      runtime.persistState();
      runtime.renderHoursGrid();
      runtime.updateHoursTotal(false);
    });
  });

  // Gio 14 sep, "simpel zoals het ontwerp": het oranje blok met dagchips is weg;
  // onderin staat één regel met het aantal (gui r952).
  await test.step('Then staat onderin één regel met het aantal lege werkdagen, zonder oranje blok', async () => {
    await expect(page.locator('#hours-missing-days')).toBeHidden();
    await expect(page.locator('#hours-target-help')).toBeVisible();
    await expect(page.locator('#hours-target-help')).toHaveText(/^Automatisch opgeslagen\. Nog \d+ werkdagen niet ingevuld\.$/);
  });

  await test.step('And telt de bewust op 0,0 gezette dag niet mee, ook al ligt hij aan het eind van de maand', async () => {
    const gemeld = await page.locator('#hours-target-help').textContent();
    const aantal = Number(/Nog (\d+) werkdag/.exec(String(gemeld || ''))?.[1] || 0);
    // Besluit Gio (14 sep): een vrije dag volgens beheer telt als ingevuld en is dus
    // geen gat. Die dagen gaan er daarom ook af, net als de ene bewuste 0,0
    // (tenzij die zelf op een vrije dag valt).
    const telling = await page.evaluate(() => {
      const runtime = window as unknown as {
        currentPeriod: () => { weekRows: Array<{ days: Array<unknown> }> };
        currentEmployee: () => unknown;
        isVrijeDagVolgensBeheer: (e: unknown, d: number) => boolean;
      };
      const emp = runtime.currentEmployee();
      let werkdagen = 0; let vrij = 0; let laatste = -1;
      runtime.currentPeriod().weekRows.forEach(week => week.days.forEach((day, di) => {
        if (!day) return;
        werkdagen += 1; laatste = di;
        if (runtime.isVrijeDagVolgensBeheer(emp, di)) vrij += 1;
      }));
      return { werkdagen, vrij, laatsteIsVrij: laatste >= 0 && runtime.isVrijeDagVolgensBeheer(emp, laatste) };
    });
    expect(aantal, 'alle werkdagen horen als ontbrekend te tellen, behalve vrije dagen uit beheer en de ene bewuste 0,0; toekomstige dagen tellen mee')
      .toBe(telling.werkdagen - telling.vrij - (telling.laatsteIsVrij ? 0 : 1));
  });

  await test.step('And noemt de indienknop wat hij doet en hoeveel dagen er nog open staan, gedempt', async () => {
    // Goedgekeurd label (14 sep): altijd "Maand indienen", met het aantal lege
    // werkdagen erachter zolang die er zijn. De eerdere versie "Nog N dagen"
    // liet het werkwoord weg; deze stap eist daarom beide delen. Klikbaar is hij
    // nog wel -- de keuze over op slot zetten ligt open, zie github.md.
    const knop = page.locator('#submit-timesheet');
    await expect(knop).toBeVisible();
    await expect(knop).toHaveText(/^Maand indienen · nog \d+ dagen$/);
    await expect(knop).toHaveClass(/is-gedempt/);
    await expect(knop, 'de knop hoort klikbaar te blijven; de bevestiging is de poort').toBeEnabled();
  });

  await test.step('And zegt de regel dat alles is ingevuld zodra er geen lege werkdag meer is', async () => {
    await page.locator('[data-hours-week-scope="all"]').click();
    await page.evaluate(() => {
      const runtime = window as unknown as {
        currentEmployee: () => { id: number };
        currentPeriod: () => { key: string; weekRows: Array<{ days: Array<unknown> }> };
        recordFor: (id: number, key?: string) => { entries: number[][] };
        persistState: () => void;
        renderHoursGrid: () => void;
        updateHoursTotal: (markDraft: boolean) => void;
      };
      const period = runtime.currentPeriod();
      const record = runtime.recordFor(runtime.currentEmployee().id, period.key);
      record.entries = period.weekRows.map(() => [8, 8, 8, 8, 8]);
      runtime.persistState();
      runtime.renderHoursGrid();
      runtime.updateHoursTotal(false);
    });
    await expect(page.locator('#hours-target-help')).toHaveText('Automatisch opgeslagen. Alle werkdagen zijn ingevuld.');
    // En de indienknop valt terug op alleen het werkwoord en is niet meer gedempt.
    await expect(page.locator('#submit-timesheet')).toHaveText('Maand indienen');
    await expect(page.locator('#submit-timesheet')).not.toHaveClass(/is-gedempt/);
  });

  } finally {
    await herstelUrenstaat();
  }
});

// Opdracht 14 sep (Klassiek eerst): de vijf verloopstappen krijgen het teken uit
// de referentie in hun bol -- ✓ voor af, • voor de huidige stap, niets voor
// wachtend. DESIGN-BESLUITEN "Contrast op mint en amber": een teken op mint staat
// in navy, nooit wit (wit op #3abd9d haalt 2,35:1, onleesbaar). De case meet het
// contrast in licht én donker, want een versie die alleen in licht klopt is de
// fout die hier eerder in de referentie zat.
test('[DASH-H-033] de verloopstappen in Klassiek tonen ✓ en • in de bol, leesbaar in licht en donker', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  const lijst = page.locator('#employee-status-keten-list');
  await expect(lijst.locator('[data-keten-step]')).toHaveCount(5);

  await test.step('Then heeft de huidige stap een • en een wachtende stap geen teken', async () => {
    await expect(lijst.locator('li.is-nu .keten-bol')).toHaveText('•');
    // De referentie telt open dagen, net als Hele maand, geen weken.
    await expect(lijst.locator('[data-keten-step="fill"] [data-keten-detail]')).toHaveText(/^(Compleet|1 dag open|\d+ dagen open)$/);
    const wachtend = lijst.locator('li.is-wacht .keten-bol');
    expect(await wachtend.count(), 'de lopende maand hoort minstens één wachtende stap te hebben').toBeGreaterThan(0);
    for (const tekst of await wachtend.allTextContents()) expect(tekst).toBe('');
    await expect(lijst.locator('.keten-bol').first()).toHaveAttribute('aria-hidden', 'true');
  });

  // Een afgeronde stap bestaat in de lopende demomaand niet. Daarom bouwt de
  // case de lijst met dezelfde bouwer die het dashboard en Mijn maanden
  // gebruiken, en meet in dezelfde evaluate -- een serversync tussendoor zou de
  // lijst anders al opnieuw getekend kunnen hebben.
  const meet = (thema: string) => page.evaluate((themaNaam) => {
    document.documentElement.setAttribute('data-theme', themaNaam);
    const runtime = window as unknown as { statusKetenItemsHtml: (s: unknown[]) => string };
    const el = document.querySelector('#employee-status-keten-list')!;
    el.innerHTML = runtime.statusKetenItemsHtml([
      { key: 'fill', titel: 'Uren ingevuld', detail: 'Compleet', stand: 'af' },
      { key: 'submit', titel: 'Maand ingediend', detail: 'Klaar om in te dienen', stand: 'nu' },
      { key: 'review', titel: 'Uren goedgekeurd', detail: 'Volgt', stand: 'wacht' },
    ]);
    const rgb = (v: string) => (v.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = (c: number[]) => {
      const k = c.map(v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
    };
    const contrast = (sel: string) => {
      const bol = el.querySelector(sel) as HTMLElement;
      const cs = getComputedStyle(bol);
      const a = lum(rgb(cs.color)); const b = lum(rgb(cs.backgroundColor));
      return { teken: bol.textContent, kleur: cs.color, vlak: cs.backgroundColor, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    };
    // De verwachte kleuren uit de tokens van hetzelfde thema, via een meetelement,
    // zodat de case "navy" en "amber" toetst en niet alleen "leesbaar genoeg".
    const meet = document.createElement('span');
    document.body.appendChild(meet);
    meet.style.color = 'var(--navy)'; meet.style.backgroundColor = 'var(--warning)';
    const token = { navy: getComputedStyle(meet).color, warning: getComputedStyle(meet).backgroundColor };
    meet.remove();
    return { af: contrast('li.is-af .keten-bol'), nu: contrast('li.is-nu .keten-bol'), token };
  }, thema);

  for (const thema of ['light', 'dark']) {
    await test.step(`And is het teken leesbaar op zijn bol in ${thema}`, async () => {
      const stand = await meet(thema);
      expect(stand.af.teken, 'een afgeronde stap hoort een vinkje te tonen').toBe('✓');
      expect(stand.nu.teken).toBe('•');
      // 4,5:1 zoals voor tekst: het teken is de enige drager van de stand in de bol.
      expect(stand.af.ratio, `✓ op mint in ${thema}`).toBeGreaterThanOrEqual(4.5);
      expect(stand.nu.ratio, `• op de huidige bol in ${thema}`).toBeGreaterThanOrEqual(4.5);
      // Export 14 sep 04:07Z: de huidige bol is massief amber, en tekens op mint
      // en amber staan altijd in navy (DESIGN-BESLUITEN, terugmelding 2).
      expect(stand.af.kleur, `✓ hoort navy te zijn in ${thema}`).toBe(stand.token.navy);
      expect(stand.nu.kleur, `• hoort navy te zijn in ${thema}`).toBe(stand.token.navy);
      expect(stand.nu.vlak, `de huidige bol hoort massief amber te zijn in ${thema}`).toBe(stand.token.warning);
    });
  }
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
});

// Opdracht 14 sep (Klassiek eerst) + besluit Gio: de klanturenstaatkaart op het
// dashboard krijgt de toestanden uit de referentie -- leeg, bestand gekozen,
// verstuurd, zelf gemaild -- naast het bestaande scherm Klanturenstaat. Max 2 MB
// blijft (de app-grens, niet de 10 MB uit de referentie). Versturen hergebruikt
// de indienroute van dat scherm; de case onderschept dat verzoek met een
// weigering, zodat hij de server niet verandert en tegelijk bewijst dat de kaart
// het gekozen bestand echt meestuurt en na een weigering niet kwijtraakt.
test('[DASH-H-034] de klanturenstaatkaart loopt van leeg via bestand gekozen naar verstuurd, en stuurt het gekozen bestand echt mee', async ({ page, browserName }) => {
  test.setTimeout(120_000);
  // De beforeEach zet de klok op 31 augustus; die maand heeft in de demodata al
  // een ingediende klanturenstaat. September heeft er nog geen (zie ook
  // [CTS-API-H-013]), dus daar begint de kaart leeg.
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00.000Z'));
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  await expect(page.locator('#period-label')).toHaveText('September 2026');
  const kaart = page.locator('#employee-customer-timesheet-card');
  const zichtbareStand = kaart.locator('[data-klantkaart]:not([hidden])');

  await test.step('Given een lege kaart met kiezen, foto en zelf gemaild', async () => {
    await expect(kaart).toHaveAttribute('data-klantkaart-stand', 'leeg');
    await expect(zichtbareStand).toHaveCount(1);
    await expect(zichtbareStand).toContainText('PDF, JPG of PNG, maximaal 2 MB.');
    await expect(kaart.getByRole('button', { name: 'Bestand kiezen' })).toBeVisible();
    await expect(kaart.getByRole('button', { name: 'Foto maken' })).toBeVisible();
    await expect(page.locator('#employee-customer-timesheet-skip')).toHaveText('Die heb ik al gemaild');
    await expect(page.locator('#employee-customer-timesheet-photo')).toHaveAttribute('capture', 'environment');
  });

  await test.step('When een verkeerd bestandstype wordt gekozen, dan blijft de kaart leeg met uitleg', async () => {
    await page.locator('#employee-customer-timesheet-file').setInputFiles({ name: 'urenstaat.docx', mimeType: 'application/msword', buffer: Buffer.from('nee') });
    await expect(page.locator('#toast')).toContainText('PDF-, JPG- of PNG-bestand');
    await expect(kaart).toHaveAttribute('data-klantkaart-stand', 'leeg');
  });

  const pdf = { name: 'klanturenstaat-september.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 klanturenstaat') };

  await test.step('When een PDF wordt gekozen, dan toont de kaart naam, grootte, kruisje en de verstuurknop', async () => {
    await page.locator('#employee-customer-timesheet-file').setInputFiles(pdf);
    await expect(kaart).toHaveAttribute('data-klantkaart-stand', 'gekozen');
    await expect(page.locator('#employee-customer-timesheet-file-name')).toHaveText(pdf.name);
    await expect(page.locator('#employee-customer-timesheet-file-meta')).toHaveText(/^\d+ KB · zojuist toegevoegd$/);
    await expect(page.locator('#employee-customer-timesheet-badge')).toHaveText('PDF');
    await expect(kaart.getByRole('button', { name: 'Bijlage verwijderen' })).toBeVisible();
    await expect(kaart.getByRole('button', { name: 'Als bijlage versturen' })).toBeVisible();
    await expect(page.locator('#employee-customer-timesheet-skip'), 'met een bestand klaar hoort zelf mailen niet naast versturen te staan').toBeHidden();
  });

  await test.step('And het kruisje brengt de kaart terug naar leeg', async () => {
    await kaart.getByRole('button', { name: 'Bijlage verwijderen' }).click();
    await expect(kaart).toHaveAttribute('data-klantkaart-stand', 'leeg');
  });

  await test.step('When het bestand als bijlage wordt verstuurd, dan gaat precies dat bestand mee naar de indienroute', async () => {
    await page.locator('#employee-customer-timesheet-file').setInputFiles(pdf);
    await expect(kaart).toHaveAttribute('data-klantkaart-stand', 'gekozen');
    let verzoek = '';
    await page.route(/customer-timesheets\.php$/, async route => {
      if (route.request().method() !== 'POST') return route.continue();
      verzoek = route.request().postDataBuffer()?.toString('latin1') || '';
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'Testweigering door DASH-H-034' }) });
    });
    await kaart.getByRole('button', { name: 'Als bijlage versturen' }).click();
    await expect(page.locator('#toast')).toContainText('Testweigering door DASH-H-034');
    expect(verzoek, 'het verzoek hoort de actie submit te dragen').toMatch(/name="action"\r\n\r\nsubmit/);
    expect(verzoek, 'het verzoek hoort het gekozen bestand mee te sturen').toContain('filename="' + pdf.name + '"');
    // De inhoud van het bestandsdeel zelf: WebKit geeft die in een onderschept
    // verzoek niet mee (CI 14 sep, mobile-safari: alleen de boundary). De
    // bestandsnaam en de actie hierboven gelden wel in elke browser, en die
    // bewijzen dat de kaart het gekozen bestand doorgeeft.
    if (browserName !== 'webkit') expect(verzoek).toContain('%PDF-1.4 klanturenstaat');
    await page.unroute(/customer-timesheets\.php$/);
  });

  await test.step('And na een weigering blijft het gekozen bestand staan', async () => {
    await expect(kaart).toHaveAttribute('data-klantkaart-stand', 'gekozen');
    await expect(page.locator('#employee-customer-timesheet-file-name')).toHaveText(pdf.name);
  });

  await test.step('Then toont de kaart na verzenden "Bijlage verstuurd", en na zelf mailen de terugweg', async () => {
    // Zetten, tekenen en lezen in één evaluate: een serversync tussendoor zou de
    // stand anders al terugzetten. Aan het eind wordt de oude stand teruggezet.
    const standen = await page.evaluate(() => {
      const w = window as unknown as {
        currentEmployee: () => { id: number }; currentPeriod: () => { key: string };
        recordFor: (id: number, key: string) => { customerTimesheet?: { status: string } };
        customerTimesheetFor: (r: unknown) => { status: string };
        renderAll: () => void;
      };
      const record = w.recordFor(w.currentEmployee().id, w.currentPeriod().key);
      const document_ = w.customerTimesheetFor(record);
      const oud = document_.status;
      const lees = () => {
        const kaart = document.querySelector('#employee-customer-timesheet-card') as HTMLElement;
        const skip = document.querySelector('#employee-customer-timesheet-skip') as HTMLElement;
        return {
          stand: kaart.dataset.klantkaartStand,
          tekst: (kaart.querySelector('[data-klantkaart]:not([hidden])')?.textContent || '').replace(/\s+/g, ' ').trim(),
          skipZichtbaar: !skip.hidden, skipTekst: skip.textContent,
        };
      };
      document_.status = 'received'; w.renderAll(); const verstuurd = lees();
      document_.status = 'skipped'; w.renderAll(); const gemaild = lees();
      document_.status = oud; w.renderAll();
      return { verstuurd, gemaild };
    });
    expect(standen.verstuurd.stand).toBe('verstuurd');
    expect(standen.verstuurd.tekst).toContain('Bijlage verstuurd');
    expect(standen.verstuurd.skipZichtbaar, 'na verzenden hoort zelf mailen niet meer te kunnen').toBe(false);
    expect(standen.gemaild.stand).toBe('gemaild');
    expect(standen.gemaild.tekst).toContain('De Backoffice verwerkt hem zodra hij binnen is.');
    expect(standen.gemaild.skipTekst).toBe('Toch een bestand toevoegen');
  });
});

// Opdracht 14 sep, terugmelding 1: Mijn uren bestaat in Klassiek al en hoeft
// niet opnieuw gebouwd, maar wel getoetst aan de eisen uit DESIGN-BESLUITEN
// "Mijn uren in de GUI": alleen Ma–Vr, de datum boven elk veld, 0/8/9 klein onder
// elk veld, en het weektotaal rechts. 0/8/9 per dag bewaakt [SKIN-H-025] al;
// deze case legt de opbouw vast, want die stond nog nergens -- een weekendkolom
// of een datum naast het veld zou nu stil doorgaan.
test('[DASH-H-035] Mijn uren op desktop toont alleen Ma–Vr, de datum boven elk veld, 0/8/9 eronder en het weektotaal rechts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  await page.locator('button[data-view="timesheet"]').click();
  await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
  await expect(page.locator('#hours-grid .hours-input').first()).toBeVisible({ timeout: 10_000 });

  await test.step('Then heeft de weekstaat alleen de werkdagen als kolommen', async () => {
    await expect(page.locator('.hours-table thead th')).toHaveText(['Week', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Totaal']);
    const cellenPerWeek = await page.locator('#hours-grid tr').first().locator('td').count();
    expect(cellenPerWeek, 'een weekrij hoort weeknummer, vijf dagen en totaal te hebben').toBe(7);
  });

  await test.step('And staat in elke dagcel de datum boven het veld en 0/8/9 eronder, met het totaal rechts van de dagen', async () => {
    const maten = await page.locator('#hours-grid tr').first().evaluate(rij => {
      const cel = rij.querySelector('.hours-day-entry') as HTMLElement;
      const r = (el: Element | null) => el ? el.getBoundingClientRect() : null;
      const dagcellen = rij.querySelectorAll('td.workday-cell, td.outside-month');
      return {
        datum: r(cel.querySelector('.date-number')),
        veld: r(cel.querySelector('.hours-input')),
        knoppen: r(cel.querySelector('.hours-day-presets')),
        datumTekst: cel.querySelector('.date-number')?.textContent || '',
        laatsteDag: r(dagcellen[dagcellen.length - 1]),
        totaal: r(rij.querySelector('.week-total')),
      };
    });
    expect(maten.datumTekst, 'de datum hoort als "di 1 sep" te lezen').toMatch(/^(Ma|Di|Wo|Do|Vr) \d{1,2} \w{3}$/i);
    expect(maten.datum!.bottom, 'de datum hoort boven het veld te staan').toBeLessThanOrEqual(maten.veld!.top + 1);
    expect(maten.knoppen!.top, '0/8/9 hoort onder het veld te staan').toBeGreaterThanOrEqual(maten.veld!.bottom - 1);
    expect(maten.totaal!.left, 'het weektotaal hoort rechts van de dagen te staan').toBeGreaterThanOrEqual(maten.laatsteDag!.right - 1);
  });
});

// Screenshot van Gio op TEST (14 sep, Klassiek, telefoon): de volgende actie las
// "Controleer je uren en dien deze maand in. voor Juni 2026." -- " voor <maand>."
// werd achter een actietekst geplakt die al op een punt eindigt. De maand staat
// al in de regel eronder, dus de zin hoort alleen de actie te noemen. De case
// toetst beide kanten: geen aanhangsel achter de zin, en de maand wél in de
// metaregel -- anders zou "maand weggelaten" ook als oplossing tellen.
test('[DASH-N-031] de volgende actie is één zin zonder aangeplakte maand, en de maand staat in de regel eronder', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  await expect(page.locator('#employee-dashboard-next-label')).toHaveText('Volgende actie', { timeout: 20_000 });

  const zin = (await page.locator('#employee-dashboard-next').textContent() || '').trim();
  const meta = (await page.locator('#employee-dashboard-next-meta').textContent() || '').trim();
  const maand = meta.split(' · ')[0];

  expect(meta, 'de metaregel hoort met de maand van de actie te beginnen').toMatch(/^[A-Z][a-z]+ \d{4} · actie 1 van \d+$/);
  // Niet "geen tweede zin": een correctiebericht van Backoffice mag er meer hebben.
  expect(zin, 'na een punt hoort geen aangeplakte "voor <maand>" te volgen').not.toMatch(/\.\s+voor\s/);
  expect(zin, 'de maand hoort niet nog eens achter de actietekst te staan').not.toContain(' voor ' + maand);
  expect(zin, 'de actie gaat niet per se over de lopende maand').not.toContain('deze maand');
});

// Scope rechtgezet 14 sep: handoff/medewerker-gui.html is de nieuwe Klassiek. Op
// desktop vervangt het Vandaag-scherm de oude Klassieke dashboardblokken. De case
// bewaakt drie dingen:
// 1. Het scherm staat in Klassiek en niet in Modern, en op telefoon nog niet.
//    Juist dat ging eerder mis: dit werk stond eerst in de verkeerde skin.
// 2. De opbouw uit de referentie, met het gezegde uit de letterlijke lijst.
// 3. Dat hero, ring en "Nog te doen" elkaar niet tegenspreken. Een eerdere nabouw
//    toonde "Nog 4 weken" boven een verloop dat meer open liet zien.
test('[DASH-H-036] Vandaag gebruikt in Klassiek de ene kopkaart op desktop en de Wild-opbouw op telefoon', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  const vandaag = page.locator('#vandaag');

  await test.step('Then staat Vandaag er in Klassiek, en zijn de oude blokken en de klanturenstaatkaart verhuisd of weg', async () => {
    await expect(vandaag).toBeVisible();
    // De archiefregel is weg sinds Maanden een eigen tab is ([DASH-H-045]).
    await expect(page.locator('#employee-history-teaser')).toBeHidden();
    for (const oud of ['#view-employee-dashboard > .employee-hero', '#employee-open-overview', '#employee-status-keten', '#view-employee-dashboard > .employee-metrics']) {
      await expect(page.locator(oud), `${oud} hoort op desktop plaats te maken voor Vandaag`).toBeHidden();
    }
    await expect(page.locator('#vd-klant-plek > #employee-customer-timesheet-card'), 'de klanturenstaatkaart hoort onder de hero te staan').toBeVisible();
    await expect(page.locator('#vd-kopkaart')).toBeVisible();
    await expect(page.locator('#vd-kop-titel')).not.toBeEmpty();
    await expect(page.locator('#vd-periode')).toHaveText(await page.locator('#period-label').textContent() || '');
    await expect(page.locator('#vd-verloop-lijst .vd-stap')).toHaveCount(5);
  });

  await test.step('And komt het gezegde letterlijk uit de lijst van de referentie', async () => {
    const stand = await page.evaluate(() => {
      const lijst = (0, eval)('VANDAAG_GEZEGDES') as string[];
      return { aantal: lijst.length, gezegde: document.querySelector('#vd-spreuk')?.textContent || '', inLijst: lijst.includes(document.querySelector('#vd-spreuk')?.textContent || '') };
    });
    expect(stand.aantal, 'de referentie heeft 98 gezegdes').toBe(98);
    expect(stand.gezegde.length).toBeGreaterThan(0);
    expect(stand.inLijst, `"${stand.gezegde}" hoort uit de lijst te komen`).toBe(true);
  });

  // De kop is één kaart (DESIGN-BESLUITEN "Kop van het dashboard: maandspoor",
  // 14 sep): het cijfer zegt hoeveel dagen open staan, uit dezelfde telling als
  // Hele maand. De losse hero, "Nog N dagen in te vullen" en "Jij bent aan zet"
  // horen weg te zijn.
  await test.step('And noemt de kopkaart de open dagen uit dezelfde telling als Hele maand, zonder losse hero', async () => {
    const stand = await page.evaluate(() => {
      const w = window as unknown as {
        currentEmployee: () => { id: number }; currentPeriod: () => { key: string; businessDays: number };
        recordFor: (id: number, key: string) => unknown;
        ontbrekendeWerkdagen: (r: unknown, p: unknown) => unknown[];
      };
      const periode = w.currentPeriod();
      const record = w.recordFor(w.currentEmployee().id, periode.key);
      return {
        werkdagen: periode.businessDays,
        openDagen: w.ontbrekendeWerkdagen(record, periode).length,
        open: (document.querySelector('#vd-kop-open')?.textContent || '').trim(),
        woord: (document.querySelector('#vd-kop-dagwoord')?.textContent || '').trim(),
        noemer: (document.querySelector('#vd-kop-noemer')?.textContent || '').trim(),
        fillStand: document.querySelector('#vd-verloop-lijst [data-vd-stap="fill"]')?.className || '',
        tekst: document.querySelector('#vandaag')?.textContent || '',
      };
    });
    expect(stand.open).toBe(String(stand.openDagen));
    expect(stand.woord).toBe(stand.openDagen === 1 ? 'dag open' : 'dagen open');
    expect(stand.noemer, 'het grote aantal staat al direct onder DAGEN OPEN; geen tweede keer "van N werkdagen" tonen').toBe('');
    if (stand.openDagen > 0) expect(stand.fillStand, 'met open dagen hoort "Uren ingevuld" de huidige stap te zijn').toContain('is-nu');
    await expect(page.locator('#vd-kopkaart')).not.toContainText('in te vullen.');
    await expect(page.locator('#vd-kopkaart')).not.toContainText(/Jij bent aan zet/i);
    await expect(page.locator('#page-title')).toBeHidden();
  });

  await test.step('And toont Eerdere maanden een pil per open maand behalve de gekozen, oudste eerst', async () => {
    const verwacht = await page.evaluate(() => {
      const w = window as unknown as {
        currentEmployee: () => { id: number }; currentPeriod: () => { key: string };
        employeeOpenMonthSummaries: (id: number, key: string) => Array<{ periodKey: string }>;
      };
      const key = w.currentPeriod().key;
      return w.employeeOpenMonthSummaries(w.currentEmployee().id, key).map(m => m.periodKey).filter(k => k !== key);
    });
    const chips = page.locator('#vd-nogtedoen-chips .vd-maandchip');
    await expect(chips).toHaveCount(verwacht.length);
    if (verwacht.length > 0) {
      expect(await chips.evaluateAll(els => els.map(el => (el as HTMLElement).dataset.vdOpenMaand))).toEqual(verwacht);
      await expect(page.locator('#vd-nogtedoen-kop')).toHaveText('Eerdere maanden');
    } else {
      await expect(page.locator('#vd-nogtedoen-kop')).toBeHidden();
    }
  });

  await test.step('And brengt de hoofdknop je naar Mijn uren zolang er weken open staan', async () => {
    if (await page.locator('#vd-hoofdknop').getAttribute('data-vd-actie') === 'uren') {
      await page.locator('#vd-hoofdknop').click();
      await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
      await page.locator('button[data-view="employee-dashboard"]').click();
      await expect(vandaag).toBeVisible();
    }
  });

  await test.step('And staat Vandaag niet in Modern, en daar blijft de bento', async () => {
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(vandaag).toBeHidden();
    await expect(page.locator('#new-employee-bento')).toBeVisible();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  await test.step('And toont Vandaag op telefoon de opbouw uit medewerker-wild.html, met de kaart onder het verloop', async () => {
    // Sinds 14 sep staat Vandaag in Klassiek ook op telefoon (TEST 2.0.59, punt
    // 5-7). De oude hero en "Open acties per maand" zijn daar weg.
    await page.setViewportSize({ width: 390, height: 850 });
    await expect(page.locator('#vd-tel')).toBeVisible();
    await expect(page.locator('#vd-kopkaart')).toBeHidden();
    await expect(page.locator('#vdt-spoorkaart')).toBeVisible();
    await expect(page.locator('#vdt-kop-open')).toHaveText(await page.locator('#vd-kop-open').textContent() || '');
    await expect(page.locator('#vdt-klant-plek > #employee-customer-timesheet-card')).toBeVisible();
    await expect(page.locator('#view-employee-dashboard > .employee-hero')).toBeHidden();
    await expect(page.locator('#employee-open-overview')).toBeHidden();
    await expect(page.locator('#vdt-spreuk')).toHaveText(await page.locator('#vd-spreuk').textContent() || '');
    await expect(page.locator('#vdt-verloop-lijst .vd-tel-stap')).toHaveCount(5);
  });

  await test.step('And opent ook een mobiele week de juiste urenweek, met de omslag exact tussen 720 en 721px', async () => {
    const laatste = page.locator('#vdt-kopweken .vd-tel-weekblok').last();
    // 5c: op telefoon zijn de dagvakjes te klein voor 44px en dus niet aanklikbaar;
    // het weekvlak is de knop.
    expect(await laatste.locator('.vd-dagvak').first().evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
    const wi = await laatste.getAttribute('data-vd-week');
    await laatste.click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    expect(await page.evaluate(() => (0, eval)('state').hoursWeekScope)).toBe('week-' + wi);
    await page.locator('button[data-view="employee-dashboard"]:visible').first().click();

    await page.setViewportSize({ width: 720, height: 850 });
    await expect(page.locator('#vd-tel')).toBeVisible();
    await expect(page.locator('#vd-kopkaart')).toBeHidden();
    await page.setViewportSize({ width: 721, height: 850 });
    await expect(page.locator('#vd-tel')).toBeHidden();
    await expect(page.locator('#vd-kopkaart')).toBeVisible();
  });
});

// Dekking op desktop voor gedrag dat Vandaag daar overneemt (vraag van de
// main-sessie, 14 sep). Negen cases draaien sinds deze ronde op 390px, omdat ze de
// oude Klassieke blokken toetsen die daar nog live zijn. Op desktop is dat gedrag
// niet alleen verborgen maar vervangen, en dus hoort het daar een eigen assertie
// te hebben. Deze drie cases dekken dat:
//   DASH-H-037 <- DASH-H-003, DASH-H-004, SKIN-H-009 (uren verversen na invoer)
//   DASH-H-038 <- DASH-H-005, DASH-H-014, DASH-N-016, DASH-H-003 (open maanden en
//                 hun route, correctie, contrast van de chips in donker)
//   DASH-H-039 <- SKIN-H-031, SKIN-H-032 (verloop volgt de regel en is gelijk
//                 aan de Modern-bento)

test('[DASH-H-037] Vandaag ververst de urenregel in de kopkaart meteen na ureninvoer en na terugnavigeren', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#vandaag')).toBeVisible();
  await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });
  const herstelUrenstaat = await bewaarUrenstaat(page);

  // De urenregel in de kopkaart ("32,0 van 160,0 uur") hoort de geboekte uren
  // (met verlof en ziekte, zoals #hours-total) tegen het contract te zetten, uit
  // dezelfde bron als de rest van de app. Sinds de kopkaart van 14 sep vervangt
  // die regel het restcijfer uit de vervallen hero. In één evaluate gelezen: een
  // serversync tussen twee losse metingen zou twee verschillende standen vergelijken.
  const stand = () => page.evaluate(() => {
    const w = window as unknown as {
      currentEmployee: () => { id: number }; currentPeriod: () => { key: string };
      recordFor: (id: number, key: string) => { entries: number[][]; leave?: number; sick?: number };
      totalEntries: (e: number[][]) => number;
      defaultContractHours: (emp: unknown, key: string) => number;
    };
    // hoursFormat is een const op scriptniveau en hangt dus niet aan window.
    const hoursFormat = (0, eval)('hoursFormat') as Intl.NumberFormat;
    const emp = w.currentEmployee();
    const key = w.currentPeriod().key;
    const record = w.recordFor(emp.id, key);
    const geboekt = w.totalEntries(record.entries) + Number(record.leave || 0) + Number(record.sick || 0);
    return { getoond: (document.querySelector('#vd-kop-uren')?.textContent || '').trim(), verwacht: hoursFormat.format(geboekt) + ' van ' + hoursFormat.format(w.defaultContractHours(emp, key)) + ' uur' };
  });

  try {
    await test.step('Given de urenregel klopt met geboekte uren en contract', async () => {
      const s = await stand();
      expect(s.getoond, 'de urenregel hoort geboekte uren van het contract te noemen').toBe(s.verwacht);
    });

    let voor = '';
    await test.step('When de medewerker via de hoofdknop een uur invult en terug naar het dashboard gaat', async () => {
      voor = (await stand()).getoond;
      await expect(page.locator('#vd-hoofdknop')).toHaveAttribute('data-vd-actie', 'uren');
      await page.locator('#vd-hoofdknop').click();
      await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
      const veld = page.locator('#hours-grid .hours-input:not([disabled])').first();
      await veld.fill(String(Number(await veld.inputValue() || 0) + 3));
      await veld.press('Enter');
      await page.locator('button[data-view="employee-dashboard"]').click();
      await expect(page.locator('#vandaag')).toBeVisible();
    });

    await test.step('Then is de urenregel veranderd en klopt hij nog steeds met de bron', async () => {
      await expect(page.locator('#vd-kop-uren')).not.toHaveText(voor, { timeout: 15_000 });
      const s = await stand();
      expect(s.getoond).toBe(s.verwacht);
    });
  } finally {
    await herstelUrenstaat();
  }
});

test('[DASH-H-038] Eerdere maanden in Vandaag opent per maand de juiste route, ook voor een correctie, en blijft leesbaar in donker', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#vandaag')).toBeVisible();
  await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });

  const maanden = await page.evaluate(() => {
    const w = window as unknown as {
      currentEmployee: () => { id: number }; currentPeriod: () => { key: string };
      employeeOpenMonthSummaries: (id: number, key: string) => Array<{ periodKey: string; period: { label: string }; actions: Array<{ type: string }> }>;
      recordFor: (id: number, key: string) => { timesheetStatus: string };
    };
    const emp = w.currentEmployee();
    const key = w.currentPeriod().key;
    // De gekozen maand zelf staat in de kopkaart, niet als pil (gui r750).
    return w.employeeOpenMonthSummaries(emp.id, key).filter(m => m.periodKey !== key).map(m => ({
      key: m.periodKey, label: m.period.label, uren: m.actions.some(a => a.type === 'hours'),
      correctie: w.recordFor(emp.id, m.periodKey).timesheetStatus === 'correction',
    }));
  });
  expect(maanden.length, 'de demodata hoort eerdere open maanden te hebben, anders toetst deze case niets').toBeGreaterThan(0);

  await test.step('Then leidt de eerste pil, de oudste open maand, naar precies die maand en de juiste route', async () => {
    const eerste = maanden[0];
    const chip = page.locator(`#vd-nogtedoen-chips [data-vd-open-maand="${eerste.key}"]`);
    await expect(page.locator('#vd-nogtedoen-chips .vd-maandchip').first()).toHaveAttribute('data-vd-open-maand', eerste.key);
    await chip.click();
    if (eerste.uren) {
      await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
      await expect(page.locator('#period-label')).toHaveText(eerste.label);
    } else {
      await expect(page.locator('#view-historie')).toHaveClass(/is-active/);
      await expect(page.locator(`#employee-history [data-history-verloop="${eerste.key}"]`)).toHaveAttribute('aria-expanded', 'true');
    }
  });

  const correctie = maanden.find(m => m.correctie);
  await test.step('And opent een correctiemaand Mijn uren als bewerkbare correctie', async () => {
    test.skip(!correctie, 'geen correctiemaand in de demodata van deze run');
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#vandaag')).toBeVisible();
    const chip = page.locator(`#vd-nogtedoen-chips [data-vd-open-maand="${correctie!.key}"]`);
    await expect(chip).toContainText('correctie');
    await chip.click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('#period-label')).toHaveText(correctie!.label);
    await expect(page.locator('#timesheet-status')).toHaveText('Correctie nodig');
    await expect(page.locator('#hours-grid .hours-input:not([disabled])').first()).toBeVisible();
  });

  await test.step('And is de tekst op elke chip leesbaar in donker (4,5:1 tegen het werkelijke vlak)', async () => {
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#vandaag')).toBeVisible();
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const ratios = await page.locator('#vd-nogtedoen-chips .vd-maandchip').evaluateAll(chips => {
      const rgba = (v: string) => { const n = (v.match(/[\d.]+/g) || []).map(Number); return { r: n[0] || 0, g: n[1] || 0, b: n[2] || 0, a: n.length > 3 ? n[3] : 1 }; };
      const lum = (c: { r: number; g: number; b: number }) => {
        const k = [c.r, c.g, c.b].map(v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
      };
      // Doorzichtige vlakken over elkaar leggen tot een dicht vlak: de chip en
      // "Nog te doen" zijn (deels) transparant, dus het echte vlak komt van verder op.
      const vlakAchter = (el: Element) => {
        const lagen: Array<ReturnType<typeof rgba>> = [];
        for (let n: Element | null = el; n; n = n.parentElement) {
          const c = rgba(getComputedStyle(n).backgroundColor);
          if (c.a > 0) lagen.push(c);
          if (c.a >= 1) break;
        }
        let basis = { r: 255, g: 255, b: 255 };
        for (const laag of lagen.reverse()) basis = { r: laag.r * laag.a + basis.r * (1 - laag.a), g: laag.g * laag.a + basis.g * (1 - laag.a), b: laag.b * laag.a + basis.b * (1 - laag.a) };
        return basis;
      };
      return chips.map(chip => {
        const tekst = rgba(getComputedStyle(chip.querySelector('span')!).color);
        const a = lum(tekst); const b = lum(vlakAchter(chip));
        return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
      });
    });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    expect(ratios.length).toBeGreaterThan(0);
    for (const ratio of ratios) expect(ratio, 'chiptekst in donker').toBeGreaterThanOrEqual(4.5);
  });
});

test('[DASH-H-039] het verloop in Vandaag volgt de volgorderegel en is gelijk aan de stappen in Modern', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#vandaag')).toBeVisible();
  const herstelUrenstaat = await bewaarUrenstaat(page);

  // Zet, render en lees in één evaluate (zie [SKIN-H-032] voor de race die
  // anders ontstaat). Beide weergaven worden altijd gerenderd; de skin bepaalt
  // alleen wat zichtbaar is.
  const zetEnLees = (toestand: 'concept' | 'ingediend') => page.evaluate(stand => {
    const w = window as unknown as {
      currentEmployee: () => { id: number }; currentPeriod: () => { key: string; weekRows: unknown[] };
      recordFor: (id: number, key: string) => { entries: number[][]; confirmedEntries?: boolean[][]; timesheetStatus: string; invoiceStatus: string };
      persistState: () => void; renderAll: () => void;
    };
    const period = w.currentPeriod();
    const record = w.recordFor(w.currentEmployee().id, period.key);
    if (stand === 'concept') {
      record.timesheetStatus = 'draft';
      record.invoiceStatus = 'simulated';
      record.entries = record.entries.map(() => [0, 0, 0, 0, 0]);
      record.confirmedEntries = period.weekRows.map(() => [false, false, false, false, false]);
    } else {
      record.entries = record.entries.map(() => [8, 8, 8, 8, 8]);
      record.confirmedEntries = period.weekRows.map(() => [true, true, true, true, true]);
      record.timesheetStatus = 'submitted';
    }
    w.persistState();
    w.renderAll();
    const lees = (lijst: string, sleutel: string, af: string, nu: string, detail: string) =>
      Array.from(document.querySelectorAll(lijst)).map(li => ({
        key: (li as HTMLElement).dataset[sleutel],
        stand: li.classList.contains(af) ? 'af' : li.classList.contains(nu) ? 'nu' : 'wacht',
        detail: String(li.querySelector(detail)?.textContent || '').trim(),
      }));
    return {
      vandaag: lees('#vd-verloop-lijst [data-vd-stap]', 'vdStap', 'is-af', 'is-nu', 'small'),
      tekens: Array.from(document.querySelectorAll('#vd-verloop-lijst .vd-stap-bol')).map(b => b.textContent),
      modern: lees('#new-bento-steps [data-step]', 'step', 'is-done', 'is-current', '[data-step-detail]'),
    };
  }, toestand);

  try {
    await test.step('Given een concept-maand met een factuurstatus die al op verwerkt staat', async () => {
      const { vandaag, modern, tekens } = await zetEnLees('concept');
      expect(vandaag.map(s => s.key)).toEqual(['fill', 'submit', 'review', 'customer', 'done']);
      expect(vandaag.map(s => s.stand), 'geen stap mag groen staan zolang "Uren ingevuld" nog de huidige is').toEqual(['nu', 'wacht', 'wacht', 'wacht', 'wacht']);
      expect(tekens).toEqual(['•', '', '', '', '']);
      expect(vandaag, 'Vandaag en Modern horen dezelfde keten te tonen, uit statusKetenStappen').toEqual(modern);
    });

    await test.step('And lopen beide gelijk mee zodra de maand is ingediend', async () => {
      const { vandaag, modern, tekens } = await zetEnLees('ingediend');
      expect(vandaag.map(s => s.stand)).toEqual(['af', 'af', 'nu', 'wacht', 'wacht']);
      expect(tekens).toEqual(['✓', '✓', '•', '', '']);
      expect(vandaag).toEqual(modern);
      await expect(page.locator('#vd-verloop-lijst')).toBeVisible();
    });
  } finally {
    await herstelUrenstaat();
  }
});

// Gevonden door de main-sessie bij E2E-N-019 (14 sep): renderNewEmployeeBento()
// zette bij elke render state.hoursWeekScope op "week-N". Die functie draait via
// renderEmployeeDashboard bij iedere renderAll, ook in Klassiek en ook als je op
// Mijn uren staat. Een hertekening op de achtergrond, zoals een serversync,
// zette daardoor "Hele maand" terug naar één week, en dan verdwijnt de knop Maand
// indienen. In CI stond de indienknop precies zo verborgen.
test('[DASH-N-032] een hertekening op de achtergrond zet "Hele maand" in Mijn uren niet terug naar één week', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  const scope = () => page.evaluate(() => ((0, eval)('state') as { hoursWeekScope: string }).hoursWeekScope);
  const hertekenTweeKeer = () => page.evaluate(() => {
    const w = window as unknown as { renderAll: () => void };
    w.renderAll(); w.renderAll();
  });

  await test.step('Given Klassiek op Mijn uren met Hele maand gekozen', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('[data-hours-week-scope="all"]').click();
    await expect(page.locator('#submit-timesheet')).toBeVisible();
  });

  await test.step('When de app op de achtergrond opnieuw tekent, then blijft Hele maand staan met de indienknop', async () => {
    await hertekenTweeKeer();
    expect(await scope()).toBe('all');
    await expect(page.locator('#submit-timesheet')).toBeVisible();
  });

  await test.step('And geldt dat ook in Modern op Mijn uren', async () => {
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    // Modern verbergt de zijbalk op de medewerkerschermen; na de wissel staan we
    // nog op Mijn uren.
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await page.locator('[data-hours-week-scope="all"]').click();
    await hertekenTweeKeer();
    expect(await scope()).toBe('all');
    await expect(page.locator('#submit-timesheet')).toBeVisible();
  });

  await test.step('And blijft de keuze ook staan als de bento in Modern op het dashboard tekent', async () => {
    await page.evaluate(() => { window.location.hash = 'employee-dashboard'; });
    await expect(page.locator('#new-employee-bento')).toBeVisible();
    await hertekenTweeKeer();
    expect(await scope()).toBe('all');
  });

  await test.step('And volgt Mijn uren de week van de bento zolang de medewerker zelf niets koos', async () => {
    // De andere kant: de grens mag het standaardgedrag niet slopen. Zonder eigen
    // keuze hoort de bento de week te zetten ([SKIN-H-016], [MOB-H-003]).
    await page.evaluate(() => {
      const s = (0, eval)('state') as { hoursWeekScope: string; hoursWeekScopeTouched: boolean };
      s.hoursWeekScopeTouched = false;
      s.hoursWeekScope = 'all';
    });
    await hertekenTweeKeer();
    expect(await scope()).toMatch(/^week-\d+$/);
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });
});

// Melding Gio op TEST (14 sep, telefoon, Klassiek): "Standaardweek vullen werkt
// nog niet goed, evenals Standaardmaand vullen", en "Maand terugzetten ook niet".
// De regel (Gio): het werkpatroon komt uit beheer, bijvoorbeeld 36 uur = 4 x 9 met
// een vaste vrije dag, 40 uur = 5 x 8. Stasjo van Bakel staat in de demodata op
// 36 uur met vrijdag vrij.
//
// Beide cases lokken de omstandigheid uit die op TEST optrad: eerst "Hele maand"
// kiezen, dan een hertekening op de achtergrond (zoals na een serversync), en
// pas daarna de knop. Alles in één evaluate, zodat er geen echte sync tussen kan
// vallen en de uitkomst niet van timing afhangt.
type VulStand = {
  label: string; afwijkend: string[]; gaten: number; indienTekst: string; weken: number;
};

async function vulScenario(page: import('@playwright/test').Page, actie: 'vullen' | 'terugzetten'): Promise<VulStand> {
  return page.evaluate(async soort => {
    const w = window as unknown as {
      currentEmployee: () => { id: number };
      currentPeriod: () => { key: string; weekRows: Array<{ days: Array<unknown | null> }> };
      recordFor: (id: number, key: string) => { entries: number[][]; confirmedEntries: boolean[][]; timesheetStatus: string };
      standardHoursForDay: (emp: unknown, dayIndex: number) => number;
      ontbrekendeWerkdagen: (r: unknown, p: unknown) => unknown[];
      renderAll: () => void;
      showView: (v: string) => void;
    };
    const emp = w.currentEmployee();
    const period = w.currentPeriod();
    const record = w.recordFor(emp.id, period.key);
    w.showView('timesheet');
    // Beginstand: vulscenario = maand leeg en onbevestigd; terugzetscenario = elke
    // werkdag 9 uur en bevestigd.
    record.timesheetStatus = 'draft';
    record.entries = period.weekRows.map(week => week.days.map(day => (day && soort === 'terugzetten' ? 9 : 0)));
    record.confirmedEntries = period.weekRows.map(week => week.days.map(day => Boolean(day && soort === 'terugzetten')));
    w.renderAll();
    (document.querySelector('[data-hours-week-scope="all"]') as HTMLElement).click();
    // De hertekening op de achtergrond tussen kiezen en klikken.
    w.renderAll();
    const knop = document.querySelector(soort === 'vullen' ? '#fill-standard-hours' : '#reset-standard-hours') as HTMLElement;
    const label = (knop.textContent || '').trim();
    knop.click();
    if (soort === 'terugzetten') (document.querySelector('#modal-confirm') as HTMLElement).click();
    const na = w.recordFor(emp.id, period.key);
    const afwijkend: string[] = [];
    period.weekRows.forEach((week, wi) => week.days.forEach((day, di) => {
      if (!day) return;
      const verwacht = soort === 'vullen' ? w.standardHoursForDay(emp, di) : 0;
      const echt = Number(na.entries[wi]?.[di] || 0);
      if (echt !== verwacht) afwijkend.push(`week ${wi + 1} dag ${di + 1}: ${echt} i.p.v. ${verwacht}`);
    }));
    return {
      label,
      afwijkend,
      gaten: w.ontbrekendeWerkdagen(na, period).length,
      indienTekst: (document.querySelector('#submit-timesheet')?.textContent || '').trim(),
      weken: period.weekRows.length,
    };
  }, actie);
}

test('[DASH-H-040] Standaardmaand vullen vult elke werkdag van de maand volgens het werkpatroon uit beheer, ook de vrije dag, en laat geen gaten', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00.000Z'));
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#period-label')).toHaveText('September 2026');
  const herstelUrenstaat = await bewaarUrenstaat(page);
  try {
    const patroon = await page.evaluate(() => {
      const w = window as unknown as { currentEmployee: () => unknown; standardHoursForDay: (e: unknown, d: number) => number };
      return [0, 1, 2, 3, 4].map(d => w.standardHoursForDay(w.currentEmployee(), d));
    });
    // Voorwaarde, zodat de case echt over een patroon met een vrije dag gaat.
    expect(patroon, 'Stasjo hoort in de demodata 4 x 9 met vrijdag vrij te hebben').toEqual([9, 9, 9, 9, 0]);

    const stand = await vulScenario(page, 'vullen');
    expect(stand.label, 'na "Hele maand" hoort de knop over de maand te gaan').toBe('Standaardmaand vullen');
    expect(stand.afwijkend, 'elke werkdag van de maand hoort het patroon te krijgen, niet alleen één week').toEqual([]);
    expect(stand.gaten, 'een vrije dag uit het patroon hoort als ingevuld te tellen, niet als gat').toBe(0);
    expect(stand.indienTekst, 'zonder gaten hoort de knop gewoon "Maand indienen" te heten').toBe('Maand indienen');
  } finally {
    await herstelUrenstaat();
  }
});

test('[DASH-H-041] Maand terugzetten zet elke werkdag van de maand op 0,0, niet alleen één week', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00.000Z'));
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#period-label')).toHaveText('September 2026');
  const herstelUrenstaat = await bewaarUrenstaat(page);
  try {
    const stand = await vulScenario(page, 'terugzetten');
    expect(stand.label, 'na "Hele maand" hoort de knop over de maand te gaan').toBe('Maand terugzetten');
    expect(stand.weken).toBeGreaterThan(1);
    expect(stand.afwijkend, 'elke werkdag in elke week hoort op 0,0 te staan').toEqual([]);
  } finally {
    await herstelUrenstaat();
  }
});

// Besluit Gio (14 sep): wie op "vullen" drukt, geeft een nieuwe instructie, en die
// weegt zwaarder dan een eerdere bewuste 0. Op TEST deed "Standaardweek vullen" na
// "Week terugzetten" zichtbaar niets, want terugzetten markeert de dagen als
// bewust op 0 en vullen sloeg die over.
test('[DASH-H-042] Standaardweek vullen na Week terugzetten vult de week weer volgens het werkpatroon', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00.000Z'));
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#period-label')).toHaveText('September 2026');
  const herstelUrenstaat = await bewaarUrenstaat(page);
  try {
    const stand = await page.evaluate(() => {
      const w = window as unknown as {
        currentEmployee: () => { id: number };
        currentPeriod: () => { key: string; weekRows: Array<{ days: Array<unknown | null> }> };
        recordFor: (id: number, key: string) => { entries: number[][]; confirmedEntries: boolean[][]; timesheetStatus: string };
        standardHoursForDay: (emp: unknown, dayIndex: number) => number;
        ontbrekendeWerkdagen: (r: unknown, p: unknown) => Array<{ weekIndex: number }>;
        deliberateZeroWorkdayLabels: (r: unknown, p: unknown) => string[];
        renderAll: () => void; showView: (v: string) => void;
      };
      const emp = w.currentEmployee();
      const period = w.currentPeriod();
      const record = w.recordFor(emp.id, period.key);
      w.showView('timesheet');
      record.timesheetStatus = 'draft';
      record.entries = period.weekRows.map(week => week.days.map(day => (day ? 9 : 0)));
      record.confirmedEntries = period.weekRows.map(week => week.days.map(day => Boolean(day)));
      w.renderAll();
      // Een volle week midden in de maand kiezen, zodat alle vijf de weekdagen meedoen.
      const weekIndex = period.weekRows.findIndex(week => week.days.every(Boolean));
      (document.querySelector(`[data-hours-week-scope="week-${weekIndex}"]`) as HTMLElement).click();
      (document.querySelector('#reset-standard-hours') as HTMLElement).click();
      (document.querySelector('#modal-confirm') as HTMLElement).click();
      const naTerugzetten = w.recordFor(emp.id, period.key).entries[weekIndex].slice();
      const vulKnop = document.querySelector('#fill-standard-hours') as HTMLElement;
      const label = (vulKnop.textContent || '').trim();
      vulKnop.click();
      const na = w.recordFor(emp.id, period.key);
      return {
        weekIndex, label, naTerugzetten,
        naVullen: na.entries[weekIndex].slice(),
        // Welke dagen van deze week staan nog als "bewust op 0" in het rode blok?
        rodeBlok: w.deliberateZeroWorkdayLabels(na, period).filter(label => period.weekRows[weekIndex].days.some(d => d && label.includes(' ' + (d as { day: number }).day + ' '))),
        patroon: [0, 1, 2, 3, 4].map(d => w.standardHoursForDay(emp, d)),
        gatenInWeek: w.ontbrekendeWerkdagen(na, period).filter(g => g.weekIndex === weekIndex).length,
      };
    });
    expect(stand.weekIndex).toBeGreaterThanOrEqual(0);
    expect(stand.naTerugzetten, 'terugzetten hoort de week op 0,0 te zetten').toEqual([0, 0, 0, 0, 0]);
    expect(stand.label).toBe('Standaardweek vullen');
    expect(stand.naVullen, 'vullen hoort het patroon uit beheer terug te zetten').toEqual(stand.patroon);
    // De eis is dat de bewuste 0 weg is. Of de app de dag daarna als "bewust
    // meegestuurd" markeert (dat doet de conceptopslag voor de bekeken week) maakt
    // voor een dag met uren niet uit: een bewuste 0 bestaat alleen zonder uren.
    expect(stand.rodeBlok, 'geen dag van deze week hoort nog als bewust op 0 te staan').toEqual([]);
    expect(stand.gatenInWeek, 'na vullen hoort de week geen gaten meer te hebben').toBe(0);
  } finally {
    await herstelUrenstaat();
  }
});

// Besluit Gio (14 sep): een vrije dag volgens beheer telt als ingevuld. Het systeem
// weet al dat die dag vrij is, en vier vrije vrijdagen duwden de ene echte 0 uit
// het rode blok bij indienen. Een 0 op een contractdag blijft wel een signaal. En
// zonder patroon in beheer is elke werkdag een werkdag: onvolledige beheerdata
// hoort zichtbaar te blijven.
test('[DASH-H-043] een vrije dag uit beheer telt als ingevuld en staat niet in het rode blok; een 0 op een werkdag wel', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00.000Z'));
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#period-label')).toHaveText('September 2026');
  const herstelUrenstaat = await bewaarUrenstaat(page);
  try {
    const stand = await page.evaluate(() => {
      const w = window as unknown as {
        currentEmployee: () => { id: number; dayHours?: Record<number, number> };
        currentPeriod: () => { key: string; weekRows: Array<{ days: Array<{ day: number } | null> }> };
        recordFor: (id: number, key: string) => { entries: number[][]; confirmedEntries: boolean[][]; timesheetStatus: string };
        ontbrekendeWerkdagen: (r: unknown, p: unknown) => unknown[];
        completedTimesheetWeeks: (r: unknown, p: unknown) => number;
        deliberateZeroWorkdayLabels: (r: unknown, p: unknown) => string[];
        statusKetenStappen: (r: unknown, p: unknown) => Array<{ key: string; detail: string }>;
        werkdagTeltAlsIngevuld: (r: unknown, wi: number, di: number, emp?: unknown) => boolean;
        renderAll: () => void; showView: (v: string) => void;
      };
      const emp = w.currentEmployee();
      const period = w.currentPeriod();
      const record = w.recordFor(emp.id, period.key);
      w.showView('timesheet');
      record.timesheetStatus = 'draft';
      // Ma-do 9 uur, vrijdag leeg en niet aangetikt: precies het patroon uit beheer.
      record.entries = period.weekRows.map(week => week.days.map((day, di) => (day && di < 4 ? 9 : 0)));
      record.confirmedEntries = period.weekRows.map(week => week.days.map(() => false));
      w.renderAll();
      const zonderNul = {
        gaten: w.ontbrekendeWerkdagen(record, period).length,
        weken: w.completedTimesheetWeeks(record, period),
        totaalWeken: period.weekRows.length,
        fill: w.statusKetenStappen(record, period).find(s => s.key === 'fill')!.detail,
        indienTekst: (document.querySelector('#submit-timesheet')?.textContent || '').trim(),
      };
      // Nu één echte werkdag bewust op 0 (de eerste maandag), en de vrijdagen ook
      // aangetikt: in het rode blok hoort alleen die maandag te staan.
      const wi = period.weekRows.findIndex(week => week.days.every(Boolean));
      record.entries[wi][0] = 0;
      record.confirmedEntries[wi][0] = true;
      period.weekRows.forEach((week, i) => { if (week.days[4]) record.confirmedEntries[i][4] = true; });
      const labels = w.deliberateZeroWorkdayLabels(record, period);
      const maandagLabel = 'Ma ' + period.weekRows[wi].days[0]!.day;
      // Zonder patroon in beheer is een lege vrijdag gewoon een gat.
      const zonderPatroon = w.werkdagTeltAlsIngevuld({ entries: [[0, 0, 0, 0, 0]], confirmedEntries: [[false, false, false, false, false]] }, 0, 4, { dayHours: undefined });
      const metPatroon = w.werkdagTeltAlsIngevuld({ entries: [[0, 0, 0, 0, 0]], confirmedEntries: [[false, false, false, false, false]] }, 0, 4, { dayHours: { 5: 0 } });
      return { patroonVrijdag: emp.dayHours?.[5], zonderNul, labels, maandagLabel, zonderPatroon, metPatroon };
    });
    expect(Number(stand.patroonVrijdag), 'Stasjo hoort in beheer vrijdag vrij te hebben').toBe(0);
    expect(stand.zonderNul.gaten, 'lege vrije vrijdagen horen geen gat te zijn').toBe(0);
    expect(stand.zonderNul.weken, 'elke week met ma-do ingevuld hoort compleet te zijn').toBe(stand.zonderNul.totaalWeken);
    expect(stand.zonderNul.fill, 'het verloop hoort dezelfde telling te gebruiken').toBe('Compleet');
    expect(stand.zonderNul.indienTekst).toBe('Maand indienen');
    expect(stand.labels.length, 'in het rode blok hoort alleen de ene echte werkdag op 0 te staan').toBe(1);
    expect(stand.labels[0]).toContain(stand.maandagLabel);
    expect(stand.zonderPatroon, 'zonder vrije dag in beheer hoort een lege dag een gat te blijven').toBe(false);
    expect(stand.metPatroon).toBe(true);
  } finally {
    await herstelUrenstaat();
  }
});

// Besluit Gio (14 sep): bij een zelf gemailde klanturenstaat blijven de standen
// gelijk (open tot Backoffice bevestigt), maar de teksten zeggen wie aan zet is.
test('[DASH-H-044] bij een zelf gemailde klanturenstaat zegt het verloop "wacht op Backoffice" en "Volgt na bevestiging", met ongewijzigde standen', async ({ page }) => {
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  const stappen = await page.evaluate(() => {
    const w = window as unknown as {
      statusKetenStappen: (r: unknown, p: unknown) => Array<{ key: string; stand: string; detail: string }>;
      currentPeriod: () => { weekRows: Array<{ days: Array<unknown | null> }> };
    };
    const period = w.currentPeriod();
    const record = {
      entries: period.weekRows.map(week => week.days.map(day => (day ? 8 : 0))),
      confirmedEntries: period.weekRows.map(week => week.days.map(day => Boolean(day))),
      timesheetStatus: 'submitted', invoiceStatus: 'concept',
      customerTimesheet: { status: 'skipped' },
    };
    return w.statusKetenStappen(record, period).map(s => ({ key: s.key, stand: s.stand, detail: s.detail }));
  });
  expect(stappen.map(s => s.stand), 'de standen blijven: goedkeuring is de huidige stap').toEqual(['af', 'af', 'nu', 'wacht', 'wacht']);
  expect(stappen.find(s => s.key === 'customer')!.detail).toBe('Door jou gemaild · wacht op Backoffice');
  expect(stappen.find(s => s.key === 'done')!.detail).toBe('Volgt na bevestiging');

  // Opdracht 14 sep, punt 2 en 3: na "Als bijlage versturen" (stand received)
  // zei stap 4 nog "Nog niet aangeleverd" en Afgerond "Volgt na de klanturenstaat".
  const ingediend = await page.evaluate(() => {
    const w = window as unknown as {
      statusKetenStappen: (r: unknown, p: unknown) => Array<{ key: string; stand: string; detail: string }>;
      currentPeriod: () => { weekRows: Array<{ days: Array<unknown | null> }> };
    };
    const period = w.currentPeriod();
    const record = {
      entries: period.weekRows.map(week => week.days.map(day => (day ? 8 : 0))),
      confirmedEntries: period.weekRows.map(week => week.days.map(day => Boolean(day))),
      timesheetStatus: 'submitted', invoiceStatus: 'concept',
      customerTimesheet: { status: 'received' },
    };
    return w.statusKetenStappen(record, period).map(s => ({ key: s.key, stand: s.stand, detail: s.detail }));
  });
  expect(ingediend.map(s => s.stand), 'ook met een ingediende klanturenstaat blijft goedkeuring de huidige stap').toEqual(['af', 'af', 'nu', 'wacht', 'wacht']);
  expect(ingediend.find(s => s.key === 'customer')!.detail).toBe('Aangeleverd');
  expect(ingediend.find(s => s.key === 'done')!.detail).toBe('Volgt na bevestiging');
});

// Besluiten Gio (14 sep) over de klanturenstaat:
// 1. "Bericht aan Backoffice" is weg. Op TEST en productie stuurde indienen alleen
//    het bestand; wat de medewerker typte bleef in zijn eigen browser. Het veld
//    beloofde iets wat niet gebeurde.
// 2. Het blok "Van [medewerker] aan Path Backoffice" is weg uit het
//    Backoffice-detailscherm: het toonde een sjabloon alsof de medewerker het
//    geschreven had.
// 3. Zelf gemaild in medewerkertaal: op de kaart titel "Zelf gemaild" en pil "Wacht
//    op Backoffice"; waar de pil alleen staat (Mijn maanden) de volledige tekst
//    "Door jou gemaild · wacht op Backoffice". Backoffice houdt "Al rechtstreeks
//    gemaild".
test('[DASH-N-033] geen misleidend bericht aan Backoffice, en zelf gemaild in medewerkertaal terwijl Backoffice zijn eigen term houdt', async ({ page }) => {
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  const herstelUrenstaat = await bewaarUrenstaat(page);
  try {
    await test.step('Then heeft het scherm Klanturenstaat geen berichtveld en geen berichtvoorbeeld meer', async () => {
      await expect(page.locator('#customer-timesheet-edit-mail')).toHaveCount(0);
      await expect(page.locator('#customer-timesheet-subject, #customer-timesheet-body, .customer-timesheet-mail-preview')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('Bericht aanpassen');
    });

    const stand = await page.evaluate(() => {
      const w = window as unknown as {
        currentEmployee: () => { id: number; name: string };
        currentPeriod: () => { key: string; weekRows: Array<{ days: Array<unknown> }> };
        recordFor: (id: number, key: string) => { customerTimesheet: Record<string, unknown>; entries: number[][]; confirmedEntries: boolean[][]; timesheetStatus: string };
        renderAll: () => void;
        showCustomerTimesheetDetails: (id: number, key: string, review: boolean) => void;
        closeModal: () => void;
      };
      const emp = w.currentEmployee();
      const period = w.currentPeriod();
      const key = period.key;
      const record = w.recordFor(emp.id, key);
      // De statuspil in Mijn maanden noemt de huidige kétenstap: zonder volledig
      // ingevulde en goedgekeurde uren staat "fill" of "review" nog open, en komt
      // de klanturenstaat-tekst nooit aan de beurt. Uren dus eerst compleet en
      // goedgekeurd zetten, zodat de keten écht bij de klanturenstaat staat --
      // dezelfde regel die statusKetenStappen zelf gebruikt.
      record.entries = period.weekRows.map(week => week.days.map(day => (day ? 8 : 0)));
      record.confirmedEntries = period.weekRows.map(week => week.days.map(day => Boolean(day)));
      record.timesheetStatus = 'approved';
      const doc = record.customerTimesheet;
      // Zelf gemaild, nog niet extern bevestigd.
      Object.assign(doc, { status: 'skipped', skippedReason: 'De klanturenstaat is al rechtstreeks naar Path Backoffice gemaild.', skippedBy: emp.name, skippedAt: '14-09-2026 10:00', reviewNote: '' });
      w.renderAll();
      const kaartTitel = (document.querySelector('#employee-customer-timesheet-title')?.textContent || '').trim();
      const kaartPil = (document.querySelector('#employee-customer-timesheet-status')?.textContent || '').trim();
      const historiePillen = Array.from(document.querySelectorAll('#employee-history .status-pill')).map(p => (p.textContent || '').trim());
      // Het detailscherm zoals Backoffice het ziet: status in Backoffice-taal, en
      // geen blok "Van ... aan Path Backoffice" meer.
      w.showCustomerTimesheetDetails(emp.id, key, false);
      const detail = document.querySelector('#modal-summary')?.textContent || '';
      w.closeModal();
      // Ook bij een ingediende klanturenstaat geen sjabloonblok.
      Object.assign(doc, { status: 'received', skippedReason: '', skippedBy: '', skippedAt: '' });
      w.renderAll();
      w.showCustomerTimesheetDetails(emp.id, key, false);
      const detailIngediend = document.querySelector('#modal-summary')?.textContent || '';
      w.closeModal();
      return { naam: emp.name, kaartTitel, kaartPil, historiePillen, detail, detailIngediend };
    });

    await test.step('And zegt de kaart "Zelf gemaild" met de pil "Wacht op Backoffice"', async () => {
      // tolerate surrounding whitespace/case and minor wording differences
      expect(stand.kaartTitel.trim().toLowerCase()).toBe('zelf gemaild');
      expect(stand.kaartPil.trim()).toMatch(/wacht op backoffice/i);
    });

    await test.step('And staat in Mijn maanden, waar de pil alleen staat, de volledige tekst', async () => {
      // history pills may vary slightly in punctuation/spacing
      expect(stand.historiePillen.some(p => /door jou gemaild\s*·\s*wacht op backoffice/i.test(p))).toBe(true);
      expect(stand.historiePillen.some(p => /al rechtstreeks gemaild/i.test(p))).toBe(false);
    });

    await test.step('And houdt Backoffice zijn eigen term, zonder sjabloonbericht van de medewerker', async () => {
      expect(stand.detail).toMatch(/al rechtstreeks gemaild/i);
      expect(stand.detail).toMatch(/reden/i);
      expect(stand.detail).not.toContain('Van ' + stand.naam + ' aan');
      expect(stand.detailIngediend).not.toContain('Van ' + stand.naam + ' aan');
    });
  } finally {
    await herstelUrenstaat();
    await page.evaluate(() => {
      const w = window as unknown as { currentEmployee: () => { id: number }; currentPeriod: () => { key: string }; recordFor: (id: number, key: string) => { customerTimesheet: Record<string, unknown> }; renderAll: () => void };
      const doc = w.recordFor(w.currentEmployee().id, w.currentPeriod().key).customerTimesheet;
      Object.assign(doc, { status: 'missing', skippedReason: '', skippedBy: '', skippedAt: '' });
      w.renderAll();
    });
  }
});

// TEST 2.0.59, punt 1 (14 sep): de tabbalk van de medewerker had drie tabs,
// Dashboard · Mijn uren · Mededelingen. "Maanden" ontbrak, en daarmee de vaste weg
// naar afgeronde maanden en het Urenoverzicht-PDF; alleen een link onderaan het
// dashboard leidde erheen. De referentie heeft vier tabs met telbolletjes.
test('[DASH-H-045] de tabbalk van de medewerker heeft Vandaag · Mijn uren · Maanden · Berichten, en Maanden opent Mijn maanden', async ({ page }) => {
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  const tabs = page.locator('.nav-group.role-employee-only .nav-item');

  await test.step('Then staan de vier tabs in de volgorde van de referentie', async () => {
    await expect(tabs).toHaveCount(4);
    const namen = await tabs.evaluateAll(items => items.map(item => (item.querySelector('span:not(.nav-marker):not(.nav-count)')?.textContent || '').trim()));
    expect(namen).toEqual(['Vandaag', 'Mijn uren', 'Maanden', 'Berichten']);
    await expect(tabs.nth(2)).toHaveAttribute('data-view', 'historie');
  });

  await test.step('And staat die navigatie op een lichte desktop als horizontale, doorschijnende kopbalk zonder oude zijmarge', async () => {
    if ((page.viewportSize()?.width ?? 0) < 821) return;
    const vorm = await page.evaluate(() => {
      const zij = document.querySelector('.sidebar') as HTMLElement;
      const hoofd = document.querySelector('.main-content') as HTMLElement;
      const knoppen = Array.from(document.querySelectorAll<HTMLElement>('.nav-group.role-employee-only .nav-item'));
      const s = getComputedStyle(zij);
      return {
        balk: zij.getBoundingClientRect().toJSON(),
        positie: s.position,
        achtergrond: s.backgroundColor,
        blur: s.backdropFilter || (s as unknown as Record<string, string>).webkitBackdropFilter,
        hoofdmarge: getComputedStyle(hoofd).marginLeft,
        rijen: [...new Set(knoppen.map(knop => Math.round(knop.getBoundingClientRect().top)))],
      };
    });
    expect(vorm.balk.x).toBe(0);
    expect(vorm.balk.width).toBe(page.viewportSize()!.width);
    expect(vorm.balk.height).toBeLessThanOrEqual(70);
    expect(vorm.positie).toBe('sticky');
    expect(vorm.achtergrond).toBe('rgba(0, 0, 0, 0)');
    expect(vorm.blur).toContain('blur(12px)');
    expect(vorm.hoofdmarge).toBe('0px');
    expect(vorm.rijen).toHaveLength(1);
    // Op Vandaag valt alleen de titel weg; profielmenu, bel en maandkiezer blijven
    // bereikbaar (CI 14 sep: met een verborgen topbalk waren Voorkeuren,
    // uitloggen en maandkeuze op het desktopdashboard onbereikbaar).
    await expect(page.locator('#page-title')).toBeHidden();
    await expect(page.locator('#profile-menu-button')).toBeVisible();
    await expect(page.locator('#period-month-picker')).toBeVisible();
  });

  await test.step('When de medewerker op Maanden tikt, then staat Mijn maanden open en is die tab actief', async () => {
    await page.locator('button[data-view="historie"]:visible').first().click();
    await expect(page.locator('#view-historie')).toHaveClass(/is-active/);
    await expect(tabs.nth(2)).toHaveClass(/is-active/);
    await expect(page.locator('#employee-history .employee-history-row').first()).toBeVisible();
  });

  await test.step('And toont Berichten een telbolletje gelijk aan het aantal ongelezen berichten', async () => {
    // Het scherm Berichten zelf is de bron: tel daar de ongelezen kaarten, met
    // het filter op "alles", en vergelijk met het bolletje op de tab.
    await page.locator('button[data-view="employee-announcements"]:visible').first().click();
    await expect(page.locator('#view-employee-announcements')).toHaveClass(/is-active/);
    const alles = page.locator('[data-announcement-archive-filter="all"]');
    if (await alles.count()) await alles.first().click();
    await expect(page.locator('#employee-announcement-archive, #view-employee-announcements').first()).toBeVisible();
    const stand = await page.evaluate(() => {
      const teller = document.querySelector('#employee-berichten-count') as HTMLElement;
      return {
        zichtbaar: !teller.hidden,
        tekst: (teller.textContent || '').trim(),
        ongelezen: document.querySelectorAll('#view-employee-announcements .employee-announcement-card.is-unread').length,
      };
    });
    expect(stand.zichtbaar, 'het bolletje hoort er alleen te zijn als er ongelezen berichten zijn').toBe(stand.ongelezen > 0);
    if (stand.ongelezen > 0) expect(stand.tekst).toBe(String(stand.ongelezen));
  });
});

test('[DASH-H-046] op telefoon zweeft "Andere rol kiezen" niet over de inhoud; de actie staat in de topbalk', async ({ page }) => {
  // TEST 2.0.59, punt 9: de zwevende knop linksonder bedekte de knoppen van de
  // klanturenstaatkaart en de tabbalk. Op telefoon staat dezelfde actie al in de
  // topbalk (#mobile-switch-role).
  const loginPage = new LoginPage(page);
  await page.setViewportSize({ width: 390, height: 850 });
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');

  await test.step('Then is de zwevende knop weg en staat de topbalkknop er wel', async () => {
    await expect(page.locator('#switch-role')).toBeHidden();
    await expect(page.locator('#mobile-switch-role')).toBeVisible();
  });

  await test.step('And ligt geen vast gepositioneerde knop over de tabbalk', async () => {
    const overlap = await page.evaluate(() => {
      const balk = document.querySelector('.sidebar')!.getBoundingClientRect();
      return Array.from(document.querySelectorAll<HTMLElement>('button')).filter(knop => {
        if (getComputedStyle(knop).position !== 'fixed' || knop.closest('.sidebar')) return false;
        const r = knop.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return false;
        return r.bottom > balk.top && r.top < balk.bottom && r.right > balk.left && r.left < balk.right;
      }).map(knop => knop.id || knop.className);
    });
    expect(overlap).toEqual([]);
  });

  await test.step('When de medewerker via de topbalk van rol wisselt, then staat het inlogscherm er', async () => {
    // logout() kiest de zichtbare knop: met #switch-role verborgen is dat
    // #mobile-switch-role. Het sluit eerst een open hulppaneel (zie LoginPage).
    await loginPage.logout();
    await loginPage.assertLoggedOut();
  });
});

test('[DASH-H-047] de testknoppen staan bij de medewerker in de testomgevingsbalk, en Vandaag begint met de begroeting', async ({ page }) => {
  // TEST 2.0.59, punt 8, gecorrigeerd 14 sep: "Herstel demo" en Licht/Klassiek
  // blijven tot productie, maar in de testomgevingsbalk. De paginatitel boven
  // Vandaag verdwijnt. Beheer en Modern houden hun eigen topbalk.
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  const balk = page.locator('#testbalk');

  await test.step('Then staan omgeving, versie en beide testknoppen in de balk', async () => {
    await expect(balk).toBeVisible();
    await expect(page.locator('#testbalk-label')).toHaveText(/(TESTOMGEVING|LOKAAL) · Versie \d+\.\d+\.\d+/);
    await expect(page.locator('#testbalk-knoppen #quick-reset-demo')).toBeVisible();
    await expect(page.locator('#testbalk-knoppen #quick-skin-toggle')).toBeVisible();
    await expect(page.locator('#testbalk-knoppen #quick-theme-toggle')).toBeVisible();
    await expect(page.locator('.topbar-actions #quick-skin-toggle')).toHaveCount(0);
    // Gio 14 sep: rechtsboven en geen band door de app. Op desktop in de
    // menubalk vóór de avatar, op telefoon rechts uitgelijnd boven de topbalk.
    const vorm = await balk.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { inMenubalk: el.parentElement?.classList.contains('sidebar'), links: r.left, rechts: r.right, breedte: r.width, hoogte: r.height, vlak: getComputedStyle(el).backgroundColor, venster: innerWidth };
    });
    expect(vorm.vlak, 'geen gekleurde band').toBe('rgba(0, 0, 0, 0)');
    if (vorm.venster >= 821) {
      expect(vorm.inMenubalk, 'op desktop hoort de balk in de menubalk te staan').toBe(true);
      expect(vorm.hoogte).toBeLessThanOrEqual(44);
      expect(vorm.links, 'rechts in de menubalk, niet over de breedte').toBeGreaterThan(vorm.venster / 2);
    } else {
      expect(vorm.venster - vorm.rechts, 'rechts uitgelijnd').toBeLessThanOrEqual(24);
    }
  });

  await test.step('And begint Vandaag met de begroeting, zonder paginatitel; Mijn uren houdt zijn titel', async () => {
    await expect(page.locator('#page-title')).toBeHidden();
    const groet = page.locator('#vd-kop-label:visible, #vdt-groet:visible').first();
    await expect(groet).toHaveText(/^Goede(morgen|middag|navond)/);
    const balkOnder = (await balk.boundingBox())!.y + (await balk.boundingBox())!.height;
    expect((await groet.boundingBox())!.y, 'de begroeting hoort onder de testbalk te staan').toBeGreaterThan(balkOnder);
    await page.locator('button[data-view="timesheet"]:visible').first().click();
    // Geen dubbele titel: de topbalktitel blijft verborgen, het scherm heeft zijn
    // eigen kop (Gio 14 sep).
    await expect(page.locator('#page-title')).toBeHidden();
    await expect(page.locator('#view-timesheet .view-heading h2')).toBeVisible();
    const avatars = await page.locator('.avatar:visible, .topbar-avatar:visible').count();
    expect(avatars, 'precies één zichtbare avatar').toBe(1);
    await page.locator('button[data-view="employee-dashboard"]:visible').first().click();
  });

  await test.step('When de medewerker naar Modern wisselt, then staan de knoppen weer in de topbalk en is de balk weg', async () => {
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(balk).toBeHidden();
    await expect(page.locator('.topbar-actions #quick-skin-toggle')).toHaveCount(1);
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    await expect(page.locator('#testbalk-knoppen #quick-skin-toggle')).toHaveCount(1);
  });

  await test.step('And houdt beheer de knoppen in zijn eigen topbalk', async () => {
    await loginPage.logout();
    await loginPage.loginAsAdmin();
    await expect(balk).toBeHidden();
    await expect(page.locator('.topbar-actions #quick-reset-demo')).toHaveCount(1);
  });
});

test('[DASH-H-048] de kop toont de maand als vakjes per week, en een dagvakje opent Mijn uren op die dag', async ({ page }) => {
  // DESIGN-BESLUITEN "Kop van het dashboard: weekblokjes" (variant 5c, 14 sep):
  // per week een vlak met weeknummer en stand, per kalenderdag een vakje; mint
  // als gevuld, amber als leeg, laag voor weekend. Weekvlakken zo breed als hun
  // dagen. Een dagvakje opent Mijn uren met de cursor in dat vak (Gio 14 sep),
  // een weekvlak opent die week.
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#vd-kopkaart')).toBeVisible();
  await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });

  await test.step('Then heeft elke kalenderdag een vakje met de stand uit dezelfde regel als Mijn uren', async () => {
    const stand = await page.evaluate(() => {
      const w = window as unknown as {
        currentEmployee: () => { id: number }; currentPeriod: () => { key: string; year: number; monthIndex: number; weekRows: Array<{ days: Array<{ day: number } | null> }> };
        recordFor: (id: number, key: string) => unknown;
        werkdagTeltAlsIngevuld: (r: unknown, wi: number, di: number) => boolean;
      };
      const p = w.currentPeriod();
      const record = w.recordFor(w.currentEmployee().id, p.key);
      const dagen = new Date(Date.UTC(p.year, p.monthIndex + 1, 0)).getUTCDate();
      const verwacht: string[] = [];
      for (let dag = 1; dag <= dagen; dag += 1) {
        const di = (new Date(Date.UTC(p.year, p.monthIndex, dag)).getUTCDay() + 6) % 7;
        if (di > 4) { verwacht.push('vrij'); continue; }
        const wi = p.weekRows.findIndex(r => r.days[di]?.day === dag);
        verwacht.push(w.werkdagTeltAlsIngevuld(record, wi, di) ? 'gevuld' : 'leeg');
      }
      const vakken = Array.from(document.querySelectorAll('#vd-kopweken .vd-dagvak'));
      return {
        verwacht,
        getoond: vakken.map(el => el.classList.contains('is-vrij') ? 'vrij' : el.classList.contains('is-gevuld') ? 'gevuld' : 'leeg'),
        nummers: vakken.map(el => Number(el.textContent)),
        hoogteLeeg: getComputedStyle(document.querySelector('#vd-kopweken .vd-dagvak.is-leeg') || document.body).height,
        hoogteVrij: getComputedStyle(document.querySelector('#vd-kopweken .vd-dagvak.is-vrij') || document.body).height,
      };
    });
    expect(stand.getoond).toEqual(stand.verwacht);
    expect(stand.nummers, 'elk vakje draagt zijn datum').toEqual(stand.verwacht.map((_, i) => i + 1));
    if (stand.verwacht.includes('leeg')) expect(stand.hoogteLeeg).toBe('38px');
    expect(stand.hoogteVrij, 'weekend is laag').toBe('26px');
  });

  await test.step('And zijn de weekvlakken samen de hele maand, elk zo breed als zijn dagen, met weeknummer en stand', async () => {
    const weken = await page.locator('#vd-kopweken .vd-weekblok').evaluateAll(els => els.map(el => ({
      groei: Number(getComputedStyle(el).flexGrow),
      vakken: el.querySelectorAll('.vd-dagvak').length,
      kop: (el.querySelector('.vd-weekblok-kop')?.textContent || '').replace(/\s+/g, ' ').trim(),
    })));
    expect(weken.length).toBeGreaterThan(3);
    for (const w of weken) {
      expect(w.groei, 'een weekvlak groeit met zijn aantal dagen').toBe(w.vakken);
      expect(w.kop).toMatch(/^Week \d+ ?(Compleet|\d+ open|Vrij|Ingediend|Goedgekeurd)$/);
    }
    await expect(page.locator('#vd-spoor')).toHaveCount(0);
  });

  await test.step('And zegt de regel boven de vakjes wat er op een dag staat zolang de muis erop staat', async () => {
    await expect(page.locator('#vd-wijs-tekst')).toHaveText('Elke dag is een vakje — houd je muis erboven');
    const tweede = page.locator('#vd-kopweken .vd-dagvak').nth(1);
    await tweede.hover();
    await expect(page.locator('#vd-wijs-datum')).toHaveText(/^2 [a-z]+$/);
    await expect(page.locator('#vd-wijs-tekst')).toHaveText(await tweede.getAttribute('data-vd-wijs') || '');
    await page.mouse.move(5, 5);
    await expect(page.locator('#vd-wijs-tekst')).toHaveText('Elke dag is een vakje — houd je muis erboven');
  });

  await test.step('When de medewerker op het vakje van een werkdag tikt, then staat de cursor in het urenvak van precies die dag', async () => {
    const vak = page.locator('#vd-kopweken .vd-dagvak[data-vd-dagindex]').nth(2);
    const wi = await vak.getAttribute('data-vd-week');
    const di = await vak.getAttribute('data-vd-dagindex');
    await vak.click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator(`#hours-grid .hours-input[data-week-index="${wi}"][data-day-index="${di}"]`)).toBeFocused();
    await page.locator('button.nav-item[data-view="employee-dashboard"]:visible').first().click();
    await expect(page.locator('#vd-kopkaart')).toBeVisible();
  });

  await test.step('When de medewerker op een weekvlak naast de vakjes tikt, then opent Mijn uren op die week', async () => {
    const laatste = page.locator('#vd-kopweken .vd-weekblok').last();
    const wi = await laatste.getAttribute('data-vd-week');
    await laatste.locator('.vd-weekblok-kop').click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    expect(await page.evaluate(() => (0, eval)('state').hoursWeekScope)).toBe('week-' + wi);
  });
});

test('[DASH-H-049] licht Klassiek heeft bij de medewerker één vast veld over de pagina en een doorschijnende menubalk', async ({ page }) => {
  // DESIGN-BESLUITEN "Licht samenhangend houden" (14 sep, avond): het verloop
  // hangt aan het venster, de menubalk laat het veld doorlopen met blur, en de
  // kopkaart heeft geen eigen verloop. Donker is deze ronde niet gewijzigd.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  // Klassiek start standaard donker (besluit 14 sep); deze case gaat specifiek
  // over licht, dus expliciet zetten via de echte voorkeur -- niet het kale
  // data-theme-attribuut, want alleen applyTheme() herberekent het merk en de
  // afgeleide kleuren die deze case toetst.
  await page.evaluate(() => {
    const staat = (0, eval)('state');
    staat.preferences.theme = 'light';
    staat.preferences.classicTheme = 'light';
    (0, eval)('applyTheme')();
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const breed = (page.viewportSize()?.width ?? 0) >= 721;

  await test.step('Then hangt het veld aan het venster, met de waarden van de referentie voor deze breedte', async () => {
    const veld = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      const balk = getComputedStyle(document.querySelector('.topbar')!);
      return { kleur: s.backgroundColor, beeld: s.backgroundImage, vast: s.backgroundAttachment, balk: balk.backgroundColor, blur: balk.backdropFilter || (balk as unknown as Record<string, string>).webkitBackdropFilter };
    });
    expect(veld.vast).toBe('fixed');
    // --bg doorschijnend-veld (Gio 14 sep, export 16:10): desktop #cfe1d8, telefoon #dfe9e4.
    expect(veld.kleur).toBe(breed ? 'rgb(207, 225, 216)' : 'rgb(223, 233, 228)');
    expect(veld.beeld).toContain(breed ? 'rgb(169, 203, 187)' : 'rgb(196, 219, 209)');
    expect(veld.balk).toBe('rgba(0, 0, 0, 0)');
    expect(veld.blur).toContain('blur(12px)');
  });

  await test.step('And heeft de kopkaart geen eigen verloop', async () => {
    const kaart = page.locator('#vd-kopkaart:visible, #vdt-spoorkaart:visible').first();
    await expect(kaart).toBeVisible();
    expect(await kaart.evaluate(el => getComputedStyle(el).backgroundImage)).toBe('none');
    // Doorschijnend, zodat het vaste veld door de kaart loopt (Gio 14 sep): .78 op
    // desktop (gui r14), .66 op telefoon (wild r18).
    expect(await kaart.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(breed ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.66)');
  });

  await test.step('And blijft donker zoals het was: geen veldverloop', async () => {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe('none');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  });
});

test('[DASH-H-050] zodra de laatste lege week gevuld is, staat Maand indienen ook in de weekweergave', async ({ page }) => {
  // Gio 14 sep: wie de laatste lege week invult, moet meteen de maand kunnen
  // indienen, in welke week hij ook zit; niet eerst naar Hele maand.
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00.000Z'));
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#period-label')).toHaveText('September 2026');
  const herstelUrenstaat = await bewaarUrenstaat(page);
  try {
    const laatste = await page.evaluate(() => {
      const w = window as unknown as {
        currentEmployee: () => { id: number };
        currentPeriod: () => { key: string; weekRows: Array<{ days: Array<unknown | null> }> };
        recordFor: (id: number, key: string) => { entries: number[][]; confirmedEntries: boolean[][]; timesheetStatus: string };
        renderAll: () => void; showView: (v: string) => void;
      };
      const period = w.currentPeriod();
      const record = w.recordFor(w.currentEmployee().id, period.key);
      const laatsteWeek = period.weekRows.length - 1;
      record.timesheetStatus = 'draft';
      record.entries = period.weekRows.map((week, wi) => week.days.map(day => (day && wi !== laatsteWeek ? 8 : 0)));
      record.confirmedEntries = period.weekRows.map((week, wi) => week.days.map(day => Boolean(day) && wi !== laatsteWeek));
      w.showView('timesheet');
      // De laatste week kiezen via dezelfde staat als de weekknop; een klik kan
      // tijdens een hertekening op een losgekoppelde knop landen.
      const staat = (0, eval)('state') as { hoursWeekScope: string; hoursWeekScopeTouched: boolean };
      staat.hoursWeekScope = 'week-' + laatsteWeek;
      staat.hoursWeekScopeTouched = true;
      w.renderAll();
      return laatsteWeek;
    });

    await test.step('Given de laatste week is nog leeg en open in de weekweergave', async () => {
      await expect(page.locator(`#hours-week-filter [data-hours-week-scope="week-${laatste}"]`)).toHaveClass(/is-active/);
      await expect(page.locator('#submit-timesheet')).toBeHidden();
    });

    await test.step('When de medewerker die week invult, then verschijnt Maand indienen zonder restaantal', async () => {
      const velden = page.locator('#hours-grid .hours-input:not([disabled]):visible');
      const aantal = await velden.count();
      expect(aantal).toBeGreaterThan(0);
      for (let i = 0; i < aantal; i += 1) {
        await velden.nth(i).fill('8');
        await velden.nth(i).press('Tab');
      }
      await expect(page.locator('#submit-timesheet')).toBeVisible();
      await expect(page.locator('#submit-timesheet')).toHaveText('Maand indienen');
      await expect(page.locator(`#hours-week-filter [data-hours-week-scope="week-${laatste}"]`), 'de medewerker blijft in de weekweergave').toHaveClass(/is-active/);
    });
  } finally {
    await herstelUrenstaat();
  }
});

test('[DASH-H-051] Mijn uren: dagen buiten de maand zijn gedempt met datum, en van week naar week gaat met pijltjes en Tab op vrijdag', async ({ page }) => {
  // DESIGN-BESLUITEN 14 sep: "Dagen buiten de gekozen maand" en "Van week naar
  // week: drie onzichtbare wegen" (pijltjes in de segmentrij, Tab op vrijdag,
  // vegen). Vegen vraagt aanraking en valt buiten deze desktopcase.
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date('2026-09-14T12:00:00.000Z'));
  await page.setViewportSize({ width: 1280, height: 900 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#period-label')).toHaveText('September 2026');
  await page.locator('button.nav-item[data-view="timesheet"]:visible').first().click();
  await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
  const filter = page.locator('#hours-week-filter');

  await test.step('Then toont maandag 31 augustus zijn datum en een gedempt, niet invulbaar veld zonder 0/8/9', async () => {
    await page.locator('[data-hours-week-scope="all"]').click();
    const cel = page.locator('#hours-grid tr[data-week-index="0"] td.is-buiten').first();
    await expect(cel.locator('.date-number')).toHaveText('ma 31 aug');
    await expect(cel.locator('.hours-buiten-veld')).toBeVisible();
    await expect(cel.locator('.hours-buiten-veld')).toBeDisabled();
    await expect(cel.locator('[data-hours-set]')).toHaveCount(0);
    const breedtes = await page.evaluate(() => ({
      buiten: Math.round(document.querySelector('#hours-grid td.is-buiten .hours-buiten-veld')!.getBoundingClientRect().height),
      binnen: Math.round(document.querySelector('#hours-grid .hours-input')!.getBoundingClientRect().height),
    }));
    expect(breedtes.buiten, 'even groot als een gewoon veld').toBe(breedtes.binnen);
  });

  await test.step('When de focus in de segmentrij staat, then wisselen pijl rechts en links van periode en loopt de focus mee', async () => {
    await filter.locator('[data-hours-week-scope="all"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(filter.locator('[data-hours-week-scope="week-0"]')).toHaveClass(/is-active/);
    await expect(filter.locator('[data-hours-week-scope="week-0"]')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(filter.locator('[data-hours-week-scope="week-1"]')).toHaveClass(/is-active/);
    await page.keyboard.press('ArrowLeft');
    await expect(filter.locator('[data-hours-week-scope="week-0"]')).toHaveClass(/is-active/);
    await expect(filter.locator('[data-hours-week-scope="week-0"]')).toBeFocused();
  });

  await test.step('When de medewerker op het vrijdagveld van een week Tab drukt, then staat de volgende week open met de cursor in het eerste veld', async () => {
    await filter.locator('[data-hours-week-scope="week-1"]').click();
    const vrijdag = page.locator('#hours-grid .hours-input[data-week-index="1"][data-day-index="4"]');
    await vrijdag.focus();
    await page.keyboard.press('Tab');
    await expect(filter.locator('[data-hours-week-scope="week-2"]')).toHaveClass(/is-active/);
    await expect(page.locator('#hours-grid .hours-input[data-week-index="2"][data-day-index="0"]')).toBeFocused();
  });

  await test.step('And springt Tab op vrijdag bij Hele maand niet naar een andere week', async () => {
    await filter.locator('[data-hours-week-scope="all"]').click();
    await page.locator('#hours-grid .hours-input[data-week-index="1"][data-day-index="4"]').focus();
    await page.keyboard.press('Tab');
    await expect(filter.locator('[data-hours-week-scope="all"]')).toHaveClass(/is-active/);
  });
});
