// Medewerkerkant van het dashboard: eigen overzicht, open maanden, de
// eerstvolgende actie, en wat een medewerker wel en niet mag zien.
//
// Afgesplitst van dashboard.spec.ts, dat te groot werd om door CI-sharding
// verdeeld te kunnen worden (zie de toelichting daar).

import type { MutableRecord } from './fixtures/dashboardGedeeld';
import { ALLE_SCHERMEN, verwachtAlleenSchermActief } from './fixtures/dashboardGedeeld';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { attachBusinessScreenshot } from './reporting/uiAttachments';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { expect, test } from '@playwright/test';
import { openPaneel, openProfielmenu } from './pages/TopbarMenu';
import { suppressInstallBanner } from './fixtures/suppressInstallBanner';
import { useFixedDemoClock } from './fixtures/fixedDemoClock';

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

test('[DASH-H-025] "Mijn maanden" toont naast de urenstatus ook de klanturenstaat-status per maand', async ({ page }) => {
  // Testerfeedback (WhatsApp, Kristel/Stasjo): een compact statuslijstje per
  // maand voor de klanturenstaat ("Sept - ingediend, Okt - open") bestond nog
  // niet -- alleen de urenstatus stond al per maand in "Mijn maanden", de
  // klanturenstaat-status alleen voor de ene geselecteerde maand. Nu een
  // eigen kolom, hergebruikt customerTimesheetStatusPill() die al bestond
  // voor de huidige maand.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i);

  await test.step('Then heeft de historietabel een eigen Klanturenstaat-kolom naast Status', async () => {
    const head = page.locator('#employee-history .employee-history-head');
    await expect(head).toContainText('Status');
    await expect(head).toContainText('Klanturenstaat');
  });

  await test.step('And toont elke maandrij een eigen klanturenstaat-statuspil, niet gelijk aan de urenstatus', async () => {
    const augustusRow = page.locator('#employee-history .employee-history-row', { hasText: 'Augustus 2026' });
    await expect(augustusRow).toContainText('Correctie nodig');
    await expect(augustusRow).toContainText('Naar broker gecontroleerd');

    const juliRow = page.locator('#employee-history .employee-history-row', { hasText: 'Juli 2026' });
    await expect(juliRow).toContainText('Wacht op klanturenstaat');
    await expect(juliRow).toContainText('Opnieuw uploaden');
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

test('[DASH-N-024] een lokaal record van vóór indiensttreding verschijnt niet in Mijn maanden', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker is ingelogd en er bestaat lokaal een record van vóór de startdatum', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    // Mijn maanden staat sinds v1.0.73 op een eigen scherm i.p.v. altijd
    // uitgeklapt onderaan het Dashboard. Deze case gaat over wát er in die
    // tabel staat, dus wordt hier eerst naar dat scherm genavigeerd; de
    // inhoudelijke controles verderop blijven ongewijzigd.
    await page.locator('#employee-history-teaser [data-go="historie"]').click();
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
    await expect(page.locator('[data-employee-open-month="2026-08"]').first()).toBeVisible();
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
  const loginPage = new LoginPage(page);

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
    const totalBefore = await page.locator('#employee-dashboard-hours').textContent();
    const firstInput = page.locator('.hours-table input').first();
    await firstInput.fill('11');
    await firstInput.press('Enter');
    await page.locator('button[data-view="employee-dashboard"]').click();

    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#page-title')).toHaveText(/Mijn overzicht/);
    await expect(page.locator('#employee-dashboard-hours')).not.toHaveText(totalBefore || '', { timeout: 15_000 });
  });

  await test.step('Then blijven de maandnamen zichtbaar in donkere modus', async () => {
    const openOverview = page.locator('#employee-open-overview');
    // Deze case blokkeert timesheets.php bewust met een 503. De open-maandenkaart
    // blijft verborgen zolang de eerste werkvoorraad-sync loopt, dus wacht eerst
    // tot die ronde klaar is voordat de zichtbaarheid wordt beoordeeld.
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });
    await expect(openOverview).toBeVisible();
    const overviewContrast = await openOverview.evaluate((overview) => {
      const parseRgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (rgb: number[]) => {
        const channels = rgb.map((value) => {
          const channel = value / 255;
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
      };
      const foreground = luminance(parseRgb(getComputedStyle(overview.querySelector('h3')!).color));
      const background = luminance(parseRgb(getComputedStyle(overview).backgroundColor));
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(overviewContrast).toBeGreaterThanOrEqual(4.5);

    const firstOpenMonth = page.locator('#employee-open-overview-list [data-employee-open-month]').first();
    const openMonthContrast = await firstOpenMonth.evaluate((month) => {
      const parseRgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (rgb: number[]) => {
        const channels = rgb.map((value) => {
          const channel = value / 255;
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
      };
      const foreground = luminance(parseRgb(getComputedStyle(month.querySelector('strong')!).color));
      const background = luminance(parseRgb(getComputedStyle(month).backgroundColor));
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(openMonthContrast).toBeGreaterThanOrEqual(4.5);

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

test('[DASH-H-004] terugkeren naar medewerkerdashboard ververst de uren en behoudt maandlabels bij themawissel', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await page.route('**/server/api/timesheets.php**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));

  await test.step('Given een medewerker op donker thema die vanuit dashboard naar uren gaat', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#employee-open-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });
    await openProfielmenu(page);
    await page.locator('[data-profile-action="preferences"]').click();
    await page.locator('#pref-theme-trigger').click();
    await page.locator('[data-standard-choice-target="pref-theme"][data-standard-choice-value="dark"]').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('button[data-view="employee-dashboard"]').click();
    await page.locator('#employee-dashboard-action').click();
  });

  await test.step('When de medewerker uren wijzigt en terug navigeert via de zichtbare medewerkerroute', async () => {
    const hoursBefore = await page.locator('#employee-dashboard-hours').textContent();
    const firstInput = page.locator('.hours-table input').first();
    await firstInput.fill('11');
    await firstInput.press('Enter');
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-dashboard-hours')).not.toHaveText(hoursBefore || '', { timeout: 15_000 });
  });

  await test.step('Then zijn de maandlabels nog zichtbaar in de maandkiezer', async () => {
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    await expect(page.locator('#period-month-panel')).toBeVisible();
    await expect(page.locator('#period-month-panel button').nth(6)).toHaveText('Juli');
  });
});

test('[DASH-H-005] medewerker ziet open maanden compact en kan direct naar de juiste maand springen', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een medewerker met open maanden', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
  });

  await test.step('When het medewerkerdashboard opent', async () => {
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('Then is er een compacte open-maandenkaart zichtbaar met een directe maandknop', async () => {
    await expect(page.locator('#employee-open-overview')).toBeVisible();
    await expect(page.locator('#employee-open-task-total')).toHaveText(/open acti/);
    await expect(page.locator('#employee-open-task-total')).not.toHaveText('0 open acties');
    await expect(page.locator('#employee-open-task-owners')).toContainText('Urenregistraties');
    await expect(page.locator('#employee-open-task-owners')).not.toContainText('Backoffice');
    const openMonthItems = page.locator('#employee-open-overview-list [data-employee-open-month]');
    await expect.poll(async () => openMonthItems.count()).toBeGreaterThan(0);
    const firstMonth = openMonthItems.first();
    const firstToggle = firstMonth.locator('[data-employee-open-month-toggle]');
    if (await firstToggle.getAttribute('aria-expanded') !== 'true') await firstToggle.click();
    await firstMonth.locator('[data-employee-open-action]').first().click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
  });
});

test('[DASH-H-014] medewerker krijgt de eerstvolgende concrete actie met juiste maand en taakroute', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);

  await test.step('Given een medewerker met meerdere open acties over verschillende maanden', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    clearConsoleErrors(errors);
    await expect(page.locator('#employee-open-overview')).toBeVisible();
    await expect(page.locator('#employee-open-task-total')).not.toHaveText('0 open acties');
  });

  let firstPeriod = '';
  let firstPeriodLabel = '';
  let firstActionType = '';

  await test.step('When het dashboard de werkvoorraad prioriteert', async () => {
    const openMonths = page.locator('#employee-open-overview-list [data-employee-open-month]');
    await expect.poll(async () => openMonths.count()).toBeGreaterThan(0);
    const firstMonth = openMonths.first();
    firstPeriod = (await firstMonth.getAttribute('data-employee-open-month')) || '';
    firstPeriodLabel = ((await firstMonth.locator('.employee-open-month-heading-copy strong').textContent()) || '').split(' · ')[0];
    const firstToggle = firstMonth.locator('[data-employee-open-month-toggle]');
    await expect(firstToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(firstMonth.locator('.employee-open-month-body')).toBeHidden();
    await firstToggle.click();
    await expect(firstToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(firstMonth.locator('.employee-open-month-body')).toBeVisible();

    const allActionRows = page.locator('#employee-open-overview-list [data-employee-action-row]');
    const totalText = (await page.locator('#employee-open-task-total').textContent()) || '0';
    const total = Number(totalText.match(/\d+/)?.[0] || 0);
    await expect(allActionRows).toHaveCount(total);
    await expect(page.locator('#employee-dashboard-all-actions')).toHaveText(`Bekijk alle ${total} open ${total === 1 ? 'actie' : 'acties'}`);
    await page.locator('#employee-dashboard-all-actions').click();
    await expect(page.locator('#employee-open-overview')).toBeInViewport();
    await expect(page.locator('#employee-open-overview .panel-heading h3')).toBeVisible();
    expect(await page.locator('#employee-open-overview').evaluate(element => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(80);
    await expect(page.locator('#employee-history .employee-history-head')).toContainText('Maand');
    await expect(page.locator('#employee-history [data-history-period]').first()).toHaveText('Open maand');

    const firstAction = firstMonth.locator('[data-employee-open-action]').first();
    firstActionType = (await firstAction.getAttribute('data-employee-open-action')) || '';
    await expect(page.locator('#employee-dashboard-next-label')).toHaveText('Volgende actie');
    await expect(page.locator('#employee-dashboard-next-meta')).toContainText(firstPeriodLabel);
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-period', firstPeriod);
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-type', firstActionType);
    await attachBusinessScreenshot(page, 'GUI smoke · Slim medewerkerdashboard');
  });

  await test.step('Then opent de hoofdactie exact de geprioriteerde maand en juiste taakroute', async () => {
    await page.locator('#employee-dashboard-action').click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('#timesheet-period-title')).toHaveText(firstPeriodLabel);
    if (firstActionType === 'customer') await expect(page.locator('#customer-timesheet-upload-panel')).toBeVisible();
    else await expect(page.locator('#hours-grid')).toBeVisible();
    await attachBusinessScreenshot(page, 'GUI smoke · Medewerker opent eerstvolgende actie');
    expect(errors).toEqual([]);
  });
});

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
    await expect(page.locator('#employee-dashboard-action')).toHaveAttribute('data-employee-action-period', '2026-08');
    await expect(page.locator('#employee-dashboard-action')).toContainText('Open correctie');
    await page.locator('#employee-dashboard-action').click();
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
  const volgorde = ['employee-dashboard', 'timesheet', 'employee-announcements'] as const;

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
    // #hours-week-nav (Mijn uren) heeft dezelfde data-new-bento-week-knoppen;
    // scopen naar het dashboardkaartje, anders matcht de klik op twee.
    await page.locator('#new-employee-bento [data-new-bento-week="next"]').click();
    await expect(page.locator('#new-bento-week-title')).toHaveText('Week 38');
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
