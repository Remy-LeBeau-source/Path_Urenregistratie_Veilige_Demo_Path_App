// Beheer- en werkvoorraadkant van het dashboard.
//
// Dit bestand hield eerst álle dashboardcases (38 stuks, 114 over de drie
// projecten). Playwright verdeelt bij fullyParallel:false per bestand, dus dat
// ene bestand bepaalde in zijn eentje hoe lang de langzaamste CI-shard duurde;
// meer shards hielpen daar niets tegen. De medewerkerkant staat nu in
// dashboard-medewerker.spec.ts, gedeelde hulpstukken in
// fixtures/dashboardGedeeld.ts.

import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { attachBusinessScreenshot } from './reporting/uiAttachments';
import { captureConsoleErrors, clearConsoleErrors } from './fixtures/consoleErrors';
import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { openPaneel, openProfielmenu } from './pages/TopbarMenu';
import { readFileSync } from 'node:fs';
import { staleServerStateWith132OpenActions, verwachtAlleenSchermActief } from './fixtures/dashboardGedeeld';
import { suppressInstallBanner } from './fixtures/suppressInstallBanner';
import { useFixedDemoClock } from './fixtures/fixedDemoClock';

test.beforeEach(async ({ page }) => {
  await useFixedDemoClock(page);
  await suppressInstallBanner(page);
});

test('[DASH-H-001] admin dashboard opent zonder console errors', async ({ page }) => {
  const consoleErrors = captureConsoleErrors(page);
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Given de administrator is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    clearConsoleErrors(consoleErrors);
  });

  await test.step('When de administrator het dashboard opent', async () => {
    await dashboardPage.assertAdminDashboardVisible();
  });

  await test.step('Then het dashboard toont admin-overzicht zonder consolefouten', async () => {
    expect(consoleErrors).toEqual([]);
    await attachBusinessScreenshot(page, 'Business state · Admin dashboard');
  });
});

test('[DASH-H-018] elke login en elke Dashboard-klik opent de actuele maand; een handmatige maand blijft alleen op andere schermen', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-02T10:00:00.000Z'));

  await test.step('Given Backoffice in september inlogt met een eerder bewaarde maand', async () => {
    await page.addInitScript(() => {
      const key = 'path-uren-demo-v07-final';
      const saved = JSON.parse(window.localStorage.getItem(key) || '{}');
      window.localStorage.setItem(key, JSON.stringify({ ...saved, schemaVersion: 26, selectedPeriodKey: '2026-08' }));
    });
    await loginPage.open();
    await loginPage.loginAsAdmin();
    // De loginmaand zelf moet al vóór herstel kloppen. Herstel daarna de vaste
    // lokale demo-beginstand, zodat mutaties uit andere CI-shards de aantallen
    // van deze scenario-asserties niet kunnen beïnvloeden.
    await expect(page.locator('#period-label')).toHaveText('September 2026');
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then opent de actuele kalendermaand voor Backoffice', async () => {
    await expect(page.locator('#period-label')).toHaveText('September 2026');
    await expect(page.locator('#hero-task-total')).toHaveText('20 open acties');
    await expect(page.locator('[data-admin-task-month="2026-09"]')).toContainText('September 2026 · 8 open acties');
    await expect(page.locator('[data-admin-task-month="2026-09"]')).toContainText('0 bij Backoffice · 8 bij medewerkers');
  });

  await test.step('And Goedkeuringen en Facturen tonen de juiste septemberbeginstand', async () => {
    await page.locator('button[data-view="approvals"]').click();
    await expect(page.locator('[data-review][data-period-key="2026-09"]')).toHaveCount(0);
    await page.locator('button[data-view="invoices"]').click();
    if (await page.locator('#month-batch-card').isHidden()) await page.locator('#invoice-detail-toggle').click();
    await expect(page.locator('#month-batch-status')).toHaveText('4 blokkades');
    await expect(page.locator('#month-batch-progress-value')).toHaveText('0/4 gecontroleerd');
    await expect(page.locator('#test-month-delivery')).toHaveText('Bekijk 4 blokkades');
    await page.locator('button[data-view="dashboard"]').click();
    await expect(page.locator('#period-label')).toHaveText('September 2026');
  });

  await test.step('When Backoffice augustus kiest en naar Facturen navigeert', async () => {
    await page.locator('#period-prev').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await page.locator('button[data-view="invoices"]').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
  });

  await test.step('Then blijft augustus gekozen op de andere schermen', async () => {
    await page.locator('button[data-view="approvals"]').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await page.locator('button[data-view="invoices"]').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
  });

  await test.step('When Backoffice daarna op Dashboard klikt', async () => {
    await page.locator('button[data-view="dashboard"]').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('Then springt de maandkiezer terug naar de actuele kalendermaand september', async () => {
    await expect(page.locator('#period-label')).toHaveText('September 2026');
    await expect(page.locator('#period-picker')).toHaveValue('2026-09');
    // en die terugsprong houdt stand zodra Backoffice weer een ander scherm opent
    await page.locator('button[data-view="invoices"]').click();
    await expect(page.locator('#period-label')).toHaveText('September 2026');
  });

  await test.step('And een nieuwe medewerkerlogin begint opnieuw in september', async () => {
    await loginPage.logout();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#period-label')).toHaveText('September 2026');
    await expect(page.locator('#employee-open-task-total')).toHaveText('5 open acties');
    await expect(page.locator('[data-employee-open-month="2026-09"]')).toContainText('September 2026 · 2 open acties');
    await expect(page.locator('[data-employee-open-month="2026-09"]')).toContainText('Uren indienen · Klanturenstaat uploaden');
    await expect(page.locator('#employee-customer-timesheet-period')).toHaveText('September 2026');
    await expect(page.locator('#employee-dashboard-period')).toHaveText('September 2026');
    await expect(page.locator('#employee-history')).toContainText('September 2026');
    await page.locator('button[data-view="timesheet"]').click();
    await expect(page.locator('#timesheet-period-title')).toHaveText('September 2026');
    await page.locator('[data-hours-week-scope="all"]').click();
    await expect(page.locator('#submit-timesheet')).toBeVisible();
    await expect(page.locator('#customer-timesheet-period')).toHaveValue('2026-09');
    await page.locator('button[data-view="employee-dashboard"]').click();
    await expect(page.locator('#period-label')).toHaveText('September 2026');
  });
});

test('[DASH-N-022] een medewerker met een toekomstige startdatum verschijnt niet in Teamstatus of Klanturenstaten vóór indiensttreding', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const suffix = Date.now().toString().slice(-7);
  const futureName = `Toekomst Medewerker ${suffix}`;

  await test.step('Given de beheerder een nieuwe medewerker aanmaakt die pas volgende maand start', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await page.locator('[data-view="employees"]').click();
    await page.locator('#add-employee').click();
    await page.locator('#edit-name').fill(futureName);
    await page.locator('#edit-account-email').fill(`toekomst-${suffix}@example.invalid`);
    await page.locator('#edit-role').fill('Consultant');
    await page.locator('#edit-client').fill('Toekomstklant');
    await page.locator('#edit-project').fill(`TOEK-${suffix}`);
    await page.locator('#edit-broker').fill('Toekomstbroker');
    await page.locator('#edit-broker-email').fill('broker@example.invalid');
    await page.locator('#edit-start-date').fill('2026-09-01');
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#modal')).toBeHidden();
  });

  await test.step('Then blijft de nieuwe medewerker weg uit augustus (vóór indiensttreding)', async () => {
    await page.locator('button[data-view="dashboard"]').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await expect(page.locator('#dashboard-employee-rows')).not.toContainText(futureName);
    await expect(page.locator('#customer-timesheet-admin-list')).not.toContainText(futureName);
  });

  await test.step('When de beheerder naar september bladert (de startmaand)', async () => {
    await page.locator('#period-next').click();
    await expect(page.locator('#period-label')).toHaveText('September 2026');
  });

  await test.step('Then verschijnt de medewerker wél in Teamstatus en Klanturenstaten voor september', async () => {
    await expect(page.locator('#dashboard-employee-rows')).toContainText(futureName);
    await expect(page.locator('#customer-timesheet-admin-list')).toContainText(futureName);
  });
});

test('[DASH-N-007] afwijkend API-totaal overschrijft de concrete werkvoorraad niet', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een oude serverstate en een afwijkend API-totaal van 205', async () => {
    await page.route('**/server/api.php?action=state*', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, state: staleServerStateWith132OpenActions() })
      });
    });

    let dashboardGateOpen = false;
    const waitForDashboardGate = async () => {
      while (!dashboardGateOpen) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    };

    await page.route('**/server/api/dashboard.php*', async route => {
      await waitForDashboardGate();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          per_maand: [
            {
              period_key: '2026-07',
              gecontroleerd: 3,
              klaar_voor_controle: 1,
              uren_blokkades: 0,
              medewerkers: 4
            }
          ],
          open_werkvoorraad: {
            totaal: 205,
            bij_backoffice: 203,
            bij_medewerkers: 2
          }
        })
      });
    });

    await loginPage.open();
    await loginPage.loginAsAdmin();

    await expect(page.locator('#hero-task-total')).not.toContainText('132');
    dashboardGateOpen = true;
  });

  await test.step('Then alle zichtbare totalen blijven gelijk aan de concrete taakregels', async () => {
    await expect.poll(async () => page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#admin-task-list [data-admin-task-row]'));
      const total = rows.length;
      const backoffice = rows.filter(row => row.classList.contains('is-actionable')).length;
      const employees = total - backoffice;
      const text = (selector: string) => document.querySelector(selector)?.textContent?.trim() || '';

      return {
        hasRows: total > 0,
        totalMatches: text('#hero-task-total') === `${total} open acties`,
        ownersMatch: text('#hero-task-owners') === `Backoffice ${backoffice} + wacht op medewerkers ${employees} = ${total}`,
        ownerBadgesMatch: text('#hero-backoffice-count') === String(backoffice) && text('#hero-employee-count') === String(employees),
        metricMatches: text('#metric-actions') === String(backoffice),
        queueMatches: text('#open-work-queue') === `Bekijk alle ${total} open acties`,
        staleTotalsAbsent: !['#hero-task-total', '#hero-task-owners', '#metric-actions']
          .some(selector => /(?:132|205)/.test(text(selector)))
      };
    // Ruimer wachtvenster dan de standaard 5 s, met opzet.
    //
    // Op 13 sep viel deze case om terwijl er geen gedrag was veranderd: de
    // aantallen bleven identiek (12 acties in 10 dossiers, 12 rijen, Backoffice
    // 7 + medewerkers 5), maar de hero vulde ná een wijziging elders eerder dan
    // daarvoor. De case gate't `dashboard.php` bewust en injecteert een stale
    // staat; hero en lijst komen daardoor niet op hetzelfde moment binnen. Met
    // 5 s hing het van de snelheid van de machine af of ze binnen het venster
    // samenkwamen -- de case mat dus mede hoe traag de app is, en dat is niet
    // wat hij hoort te bewaken.
    //
    // Dit verzwakt de assertie niet: er wordt nog steeds geëist dat álle zes
    // waar zijn. Komen hero en lijst structureel niet overeen, dan faalt hij
    // net zo hard, alleen na 20 s in plaats van na 5. Juist daarom onderscheidt
    // deze wijziging de twee gevallen in plaats van er een te verbergen.
    }), { timeout: 20_000 }).toEqual({
      hasRows: true,
      totalMatches: true,
      ownersMatch: true,
      ownerBadgesMatch: true,
      metricMatches: true,
      queueMatches: true,
      staleTotalsAbsent: true
    });
  });
});

test('[DASH-N-008] voorbeeldgegevens herstellen houdt alle werkvoorraadtellers gelijk', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const heroTaskTotal = page.locator('#hero-task-total');

  await test.step('Given auth-modus met oude fallback-state en afwijkende serverwerkvoorraad', async () => {
    await page.route('**/server/api.php?action=state*', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, state: staleServerStateWith132OpenActions() })
      });
    });
    await page.route('**/server/api/dashboard.php*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          per_maand: [
            {
              period_key: '2026-07',
              gecontroleerd: 3,
              klaar_voor_controle: 1,
              uren_blokkades: 0,
              medewerkers: 4
            }
          ],
          open_werkvoorraad: {
            totaal: 7,
            bij_backoffice: 4,
            bij_medewerkers: 3
          }
        })
      });
    });

    await loginPage.open();
    await loginPage.loginAsAdmin();
    // Before reset, the counter reflects real (unmocked) server-side demo state, which
    // shifts as other suite tests submit/approve/correct timesheets before this one runs.
    // We only assert here that the mocked/stale totals below (132, 7) never leak through.
    await expect(heroTaskTotal).not.toHaveText('', { timeout: 15_000 });
    await expect(heroTaskTotal).not.toContainText('132');
    await expect(heroTaskTotal).not.toHaveText('7 open acties');
  });

  await test.step('When voorbeeldgegevens worden hersteld', async () => {
    await page.locator('button[data-view="settings"]').click();
    await page.locator('#reset-demo').click();
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then blijven de concrete taakregels leidend en verschijnt geen oude teller', async () => {
    // "Herstel demo" laat je sindsdien op het scherm staan waar je was
    // (op verzoek van de gebruiker: "als ik druk op demo herstel dan wil ik
    // blijven op de pagina waar ik werkte") in plaats van altijd terug naar
    // het Dashboard te springen -- deze test opende eerst Instellingen, dus
    // daar hoort de admin ook te blijven na de reset.
    await expect(page.locator('#view-settings')).toHaveClass(/is-active/);
    // After reset, isLocalResetAuthoritative() intentionally blocks re-syncing server/API
    // state (that's the fixed v0.9.44 behavior guarding against stale-state leakage), so the
    // counter must fall back to the static local demo baseline — a fixed, code-defined value,
    // not something derived from shared/mutable DB state left behind by other suite tests.
    await expect(heroTaskTotal).toHaveText('12 open acties', { timeout: 15_000 });
    await expect(heroTaskTotal).not.toContainText('132');
  });
});

test('[DASH-N-010] herstel blijft na F5 leidend boven een oude serverstatus', async ({ page }) => {
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);
  let businessReadHitsAfterReset = 0;
  let resetCompleted = false;

  await page.route('**/server/api/**', async route => {
    if (resetCompleted && route.request().method() === 'GET') businessReadHitsAfterReset += 1;
    await route.continue();
  });

  await test.step('Given Backoffice de voorbeeldomgeving herstelt en daarna naar Stasjo wisselt', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#quick-reset-demo')).toBeVisible();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
    await loginPage.logout();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('When Stasjo daarna een open urenactie indient', async () => {
    await expect(page.locator('#quick-reset-demo')).toBeVisible();
    await expect(page.locator('#employee-open-task-total')).toHaveText('3 open acties');
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
    await page.locator('button[data-view="timesheet"]').click();
    await page.locator('[data-hours-week-scope="all"]').click();
    await expect(page.locator('#submit-timesheet')).toBeVisible();
    await page.locator('#submit-timesheet').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#employee-open-task-total')).toHaveText('2 open acties');
  });

  await test.step('And Stasjo voert daarna F5 uit', async () => {
    resetCompleted = true;
    await page.reload();
  });

  await test.step('Then blijft de gewijzigde lokale teller zichtbaar en wordt er geen oude serverstatus teruggezet', async () => {
    await expect(page.locator('#login-screen')).toBeHidden();
    // F5 nu bewust het laatst geopende scherm herstelt (i.p.v. altijd terug
    // naar Dashboard te springen), staat Stasjo na herladen weer op de
    // urenstaat waar die was, niet op het overzicht.
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-open-task-total')).toHaveText('2 open acties');
    expect(businessReadHitsAfterReset).toBeLessThanOrEqual(1);
    await attachBusinessScreenshot(page, 'GUI smoke · Herstel blijft na F5 leidend');
  });

  await test.step('And Backoffice kan Marc zijn klanturenstaat goedkeuren zonder statusrace', async () => {
    // #switch-role is de desktop-knop; op mobiel zit dezelfde actie achter
    // #mobile-switch-role. loginPage.logout() kent dat onderscheid al.
    await loginPage.logout();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await page.locator('#hero-backoffice-filter').click();
    await expect(page.locator('[data-admin-task-filter="actionable"]')).toHaveClass(/is-active/);

    const juneTasks = page.locator('#admin-task-month-body-2026-06');
    if (await juneTasks.isHidden()) {
      await page.locator('[data-admin-task-month-toggle="2026-06"]').click();
    }
    await juneTasks.locator('[data-review-customer-timesheet="1"][data-period-key="2026-06"]').click();
    await expect(page.locator('#modal-title')).toContainText('Marc de Roon');
    await page.locator('#modal-confirm').click();

    await expect(page.locator('#toast')).toContainText('De klanturenstaat van Marc de Roon is goedgekeurd.');
    await expect(page.locator('#toast')).not.toContainText('De status is ondertussen gewijzigd');
    await attachBusinessScreenshot(page, 'GUI smoke · Klanturenstaat goedkeuren zonder statusrace');
  });
});

test('[DASH-N-011] afgeronde Backoffice-taak en teller blijven na F5 stabiel, ongeacht het beginaantal', async ({ page }) => {
  // Regression guard for the "12 -> 5 -> 9" class of bug: completing a Backoffice task must not
  // revert after a reload, and the counter shown right after the action must survive F5 unchanged.
  // Note: completing one task can legitimately chain into a follow-up task (e.g. hours-review ->
  // invoice-delivery), so the total is NOT asserted to change - only that neither the specific
  // completed task reappears, nor does the counter jump to a different (stale) value after F5.
  const loginPage = new LoginPage(page);
  let totalAfterAction = '';
  let approvedEmployeeId = 0;
  let approvedPeriodKey = '';

  await test.step('Given de administrator is ingelogd en reset naar vaste baseline', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('When een actionable urencontrole-taak (hours-review) wordt goedgekeurd', async () => {
    const nextReview = await page.evaluate(() => {
      const task = window.adminOpenTasks().find(item => item.type === 'hours-review' && item.actionable);
      return task ? { employeeId: task.employee.id, periodKey: task.periodKey } : null;
    });
    expect(nextReview).not.toBeNull();
    approvedEmployeeId = nextReview!.employeeId;
    approvedPeriodKey = nextReview!.periodKey;

    await page.locator('#hero-backoffice-filter').click();
    const openMonthToggle = page.locator(`[data-admin-task-month-toggle="${approvedPeriodKey}"]`);
    if (await openMonthToggle.getAttribute('aria-expanded') !== 'true') {
      await openMonthToggle.click();
    }
    const taskRow = page.locator(`[data-admin-task-row="hours-review-${approvedPeriodKey}-${approvedEmployeeId}"]`);
    const reviewButton = taskRow.locator(`[data-review="${approvedEmployeeId}"][data-period-key="${approvedPeriodKey}"]`);
    await expect(reviewButton).toBeVisible();
    await reviewButton.click();
    await expect(page.locator('#modal-confirm')).toHaveText('Goedkeuren');
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#toast')).toContainText('is goedgekeurd');

    await expect.poll(() => page.evaluate(
      ({ employeeId, periodKey }) => window.adminOpenTasks().some(
        task => task.type === 'hours-review' && task.employee.id === employeeId && task.periodKey === periodKey
      ),
      { employeeId: approvedEmployeeId, periodKey: approvedPeriodKey }
    ), { timeout: 10_000 }).toBe(false);

    totalAfterAction = (await page.locator('#hero-task-total').innerText()).trim();
    expect(totalAfterAction).toMatch(/^\d+ open acties$/);
  });

  await test.step('Then blijft de goedgekeurde taak weg en de teller stabiel na F5', async () => {
    await page.reload();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#hero-task-total')).toHaveText(totalAfterAction, { timeout: 15_000 });

    const stillApprovedAway = await page.evaluate(
      ({ employeeId, periodKey }) => !window.adminOpenTasks().some(
        task => task.type === 'hours-review' && task.employee.id === employeeId && task.periodKey === periodKey
      ),
      { employeeId: approvedEmployeeId, periodKey: approvedPeriodKey }
    );
    expect(stillApprovedAway).toBe(true);
  });
});

test('[DASH-H-008] GUI-closeout verwerkt alle 12 voorbeeldtaken via medewerker en Backoffice', async ({ page }) => {
  // Heavy multi-step closeout flow (12 sequential UI actions + a file upload); test.slow()'s 3x multiplier of the
  // 30s default (90s) was observed to be exceeded on slower CI runners, so set an explicit, larger budget instead.
  test.setTimeout(240_000);
  const demoPdf = {
    name: 'klanturenstaat.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n% GUI closeout test', 'utf8'),
  };

  // #switch-role is de desktop-topbar-knop; op mobiel zit dezelfde actie
  // achter #mobile-switch-role (zie LoginPage.logout()).
  async function switchRoleIfNeeded(): Promise<void> {
    if (!(await page.locator('#app-shell').isVisible())) return;
    const desktop = page.locator('#switch-role');
    const mobile = page.locator('#mobile-switch-role');
    if (await desktop.isVisible()) await desktop.click();
    else if (await mobile.isVisible()) await mobile.click();
  }

  async function openDemoEmployee(employeeId: number): Promise<void> {
    await switchRoleIfNeeded();
    await expect(page.locator('#login-screen')).toBeVisible();
    await page.locator('#login-employee-trigger').click();
    const choices = page.locator('#login-employee-choices');
    await expect(choices).toBeVisible();
    const choice = choices.locator(`[data-login-account-role="employee"][data-login-account-id="${employeeId}"]`);
    await expect(choice).toBeVisible();
    await choice.click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  }

  async function openDemoAdmin(): Promise<void> {
    await switchRoleIfNeeded();
    await expect(page.locator('#login-screen')).toBeVisible();
    await page.locator('#login-admin-trigger').click();
    const choices = page.locator('#login-admin-choices');
    await expect(choices).toBeVisible();
    const choice = choices.locator('[data-login-account-role="admin"]').first();
    await expect(choice).toBeVisible();
    await choice.click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  }

  async function chooseMonth(month: string): Promise<void> {
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    const panel = page.locator('#period-month-panel');
    await expect(panel).toBeVisible();
    const picker = panel.locator(`[data-period-month="${month}"][data-month-control="#period-month-picker"]`);
    await expect(picker).toBeVisible();
    await picker.click();
  }

  await page.route('**/server/auth/**', async route => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });

  await test.step('Given de lokale demo toont alle 12 beginacties en tellerverdeling', async () => {
    await page.goto('/');
    await openDemoAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
    await expect(page.locator('#admin-task-summary')).toContainText('Backoffice kan 7 oppakken; 5 wachten op medewerkers');
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(12);
    console.log('GUI-CLOSEOUT baseline: 12 open acties; Backoffice 7; medewerkers 5; Stasjo 3 medewerkeracties; Brian 2 medewerkeracties plus 1 Backoffice-controle; Shawn 0 medewerkeracties (gestart per juli, juni telt niet mee).');

    await openDemoEmployee(2);
    await expect(page.locator('#employee-open-task-total')).toHaveText('3 open acties');
    await openDemoEmployee(3);
    await expect(page.locator('#employee-open-task-total')).toHaveText('2 open acties');
    await openDemoEmployee(1);
    await expect(page.locator('#employee-open-task-total')).toHaveText('0 open acties');
    await openDemoEmployee(4);
    await expect(page.locator('#employee-open-task-total')).toHaveText('0 open acties');
  });

  await test.step('When medewerkers alle vijf wachtende acties via de zichtbare interface afronden', async () => {
    // Mijn uren zet de maand terug op nu (net als Dashboard/Home) -- dus eerst
    // de tab openen en dán pas de maand kiezen, niet andersom.
    await openDemoEmployee(2);
    await page.locator('button[data-view="timesheet"]').click();
    await chooseMonth('06');
    await page.locator('[data-hours-week-scope="all"]').click();
    await page.locator('#submit-timesheet').click();
    await page.locator('#modal-confirm').click();

    await page.locator('button[data-view="timesheet"]').click();
    await chooseMonth('07');
    await page.locator('#customer-timesheet-file').setInputFiles(demoPdf);
    await page.locator('#customer-timesheet-submit').click();
    await expect(page.locator('#toast')).toContainText('ingediend bij Backoffice');

    await page.locator('button[data-view="timesheet"]').click();
    await chooseMonth('08');
    await page.locator('[data-hours-week-scope="all"]').click();
    await page.locator('#submit-timesheet').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#employee-open-task-total')).toHaveText('0 open acties');

    await openDemoEmployee(3);
    await page.locator('button[data-view="timesheet"]').click();
    await chooseMonth('06');
    await page.locator('#customer-timesheet-file').setInputFiles(demoPdf);
    await page.locator('#customer-timesheet-submit').click();
    await expect(page.locator('#toast')).toContainText('ingediend bij Backoffice');

    await page.locator('button[data-view="timesheet"]').click();
    await chooseMonth('07');
    await page.locator('[data-hours-week-scope="all"]').click();
    await page.locator('#submit-timesheet').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#employee-open-task-total')).toHaveText('0 open acties');
  });

  await test.step('And Backoffice bevestigt iedere resterende zichtbare taak tot de werkvoorraad 0 is', async () => {
    await openDemoAdmin();
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');

    for (let actions = 0; actions < 30; actions += 1) {
      const total = (await page.locator('#hero-task-total').textContent() || '').trim();
      if (total === '0 open acties') break;

      if (await page.locator('#modal').isVisible()) {
        const confirm = page.locator('#modal-confirm');
        await confirm.focus();
        await page.keyboard.press('Enter');
      } else {
        await page.locator('#dashboard-next-action-button').click();
      }
    }

    await expect(page.locator('#hero-task-total')).toHaveText('0 open acties');
    await expect(page.locator('#admin-task-summary')).toContainText('Alles is afgehandeld.');
    await attachBusinessScreenshot(page, 'GUI closeout · Alle 12 taken afgerond');
  });
});

test('[DASH-N-012] afgeronde verzendcontrole blijft na F5 weg, ongeacht het beginaantal', async ({ page }) => {
  // Regression guard voor de "0 bij Backoffice -> F5 -> 1 bij Backoffice"-klasse bug:
  // een invoice-delivery-taak ("Verzending controleren") die via de zichtbare
  // interface wordt afgerond, mag na een reload niet terugkomen. DASH-N-011 bewijst
  // dit al voor hours-review; deze case bewijst hetzelfde voor invoice-delivery,
  // waarvan "afgerond" afhangt van een async server-bevestigde mail-verzending
  // (finalizeInvoiceAndQueueToApi) i.p.v. een directe statuswijziging.
  const loginPage = new LoginPage(page);
  let totalAfterAction = '';
  let completedEmployeeId = 0;
  let completedPeriodKey = '';

  await test.step('Given de administrator is ingelogd, reset naar vaste baseline en keurt een ingediende urenstaat goed', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');

    // Een verse, echt server-gekoppelde invoice-delivery-taak: het baseline-exemplaar
    // kan een puur lokaal gesimuleerde staat zijn zonder serverTimesheetId, en dan
    // faalt "Controle afronden" meteen op "serverurenstaat niet gevonden" -- dat is
    // een ander probleem dan waar deze case voor bedoeld is. Goedkeuren via de
    // zichtbare Goedkeuringen-flow (zelfde pad als E2E-H-004) maakt er altijd een.
    const review = await page.evaluate(() => {
      const task = window.adminOpenTasks().find(item => item.type === 'hours-review');
      return task ? { employeeId: task.employee.id, employeeName: task.employee.name, periodKey: task.periodKey } : null;
    });
    expect(review).not.toBeNull();
    completedEmployeeId = review!.employeeId;
    completedPeriodKey = review!.periodKey;

    await page.locator('button[data-view="approvals"]').click();
    const card = page
      .locator(`article.approval-card[data-approval-period="${completedPeriodKey}"]`)
      .filter({ hasText: review!.employeeName });
    await expect(card).toBeVisible();
    await card.locator('[data-approve]').click();
    await expect(card).toHaveCount(0);

    await expect.poll(() => page.evaluate(
      ({ employeeId, periodKey }) => window.adminOpenTasks().some(
        task => task.type === 'invoice-delivery' && task.employee.id === employeeId && task.periodKey === periodKey
      ),
      { employeeId: completedEmployeeId, periodKey: completedPeriodKey }
    ), { timeout: 10_000 }).toBe(true);
  });

  await test.step('When de nieuwe verzendcontrole (invoice-delivery) wordt afgerond', async () => {
    await page.locator('button[data-view="dashboard"]').click();
    await page.locator('#hero-backoffice-filter').click();
    const openMonthToggle = page.locator(`[data-admin-task-month-toggle="${completedPeriodKey}"]`);
    if (await openMonthToggle.getAttribute('aria-expanded') !== 'true') {
      await openMonthToggle.click();
    }
    const invoiceButton = page.locator(`[data-admin-task-invoice="${completedEmployeeId}"][data-period-key="${completedPeriodKey}"]`);
    await expect(invoiceButton).toBeVisible();

    await invoiceButton.click();
    // Diagnose bij falen, geen extra eis.
    //
    // Aanleiding (13 sep): deze case viel in een volledige bestandsrun één keer om
    // met "verwacht Controle afronden, gekregen Voorbeeldgegevens herstellen" --
    // de tekst van de resetmodal uit de Given-stap hierboven. `#modal-confirm` is
    // één herbruikbaar element, dus die oude tekst blijft staan zodra de klik géén
    // nieuwe modal opent. En `showInvoiceDeliveryCheck()` (app.js ~11389) stapt
    // vóór het openen van de modal uit met alleen een toast: als de klanturenstaat
    // nog niet klaar is voor facturatie, of als er al een serverfactuur is waarvan
    // de urenstaat nog niet op approved/invoiced staat. Welke van de twee het was,
    // stond nergens in de melding.
    //
    // Bewust NIET vooraf op een serverstatus gewacht. Dat heb ik geprobeerd en het
    // was fout: de server rapporteert hier "submitted", terwijl de case gewoon
    // slaagt -- de tweede uitstap geldt alleen als er al een serverfactuur bestaat,
    // en die is er op dit punt niet. Een wachtconditie op approved legt de case dus
    // een eis op die de app niet stelt. Dit blok voegt daarom niets toe aan wat er
    // moet kloppen; het maakt alleen de melding bruikbaar op het moment dat het
    // tóch misgaat.
    const modalConfirm = page.locator('#modal-confirm');
    if ((await modalConfirm.innerText().catch(() => '')).trim() !== 'Controle afronden') {
      const toast = (await page.locator('#toast').innerText().catch(() => '')).trim();
      expect(toast, `de verzendcontrole opende geen modal; toast: "${toast || '(leeg)'}"`).toBe('');
    }
    await expect(modalConfirm).toHaveText('Controle afronden');
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#toast')).toContainText('klaargezet', { timeout: 15_000 });

    await expect.poll(() => page.evaluate(
      ({ employeeId, periodKey }) => window.adminOpenTasks().some(
        task => task.type === 'invoice-delivery' && task.employee.id === employeeId && task.periodKey === periodKey
      ),
      { employeeId: completedEmployeeId, periodKey: completedPeriodKey }
    ), { timeout: 10_000 }).toBe(false);

    totalAfterAction = (await page.locator('#hero-task-total').innerText()).trim();
    expect(totalAfterAction).toMatch(/^\d+ open acties$/);
  });

  await test.step('Then blijft de afgeronde verzendcontrole weg en de teller stabiel na F5', async () => {
    await page.reload();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#hero-task-total')).toHaveText(totalAfterAction, { timeout: 15_000 });

    const stillCompletedAway = await page.evaluate(
      ({ employeeId, periodKey }) => !window.adminOpenTasks().some(
        task => task.type === 'invoice-delivery' && task.employee.id === employeeId && task.periodKey === periodKey
      ),
      { employeeId: completedEmployeeId, periodKey: completedPeriodKey }
    );
    expect(stillCompletedAway, 'de afgeronde verzendcontrole mag na F5 niet terugkeren').toBe(true);
  });
});

test('[DASH-H-012] GUI-smoke scheidt werkacties van medewerkers- en beheerdersaccounts', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de vaste GUI-baseline met twaalf open acties en zes actieve accounts', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
    await expect(page.locator('#hero-task-total')).toHaveText('12 open acties');
  });

  await test.step('Then toont het dashboard zeven Backoffice-acties en vijf wachttaken zonder medewerkerbadge in het menu', async () => {
    await expect(page.locator('#hero-backoffice-count')).toHaveText('7');
    await expect(page.locator('#hero-employee-count')).toHaveText('5');
    await expect(page.locator('#dashboard-backoffice-count')).toHaveText('7');
    await expect(page.locator('#dashboard-employee-count')).toHaveText('5');
    await expect(page.locator('#dashboard-work-count')).toHaveAttribute('aria-label', '12 open acties: 7 bij Backoffice, 5 wacht op medewerkers');
    await expect(page.locator('#employees-count')).toHaveCount(0);
    const taskTypes = await page.evaluate(() => [...new Set(window.adminOpenTasks().map(task => task.type))].sort());
    expect(taskTypes).toEqual([
      'customer-broker',
      'customer-review',
      'customer-waiting',
      'hours-correction',
      'hours-draft',
      'hours-review',
      'invoice-delivery'
    ]);
    await page.locator('#hero-backoffice-filter').click();
    await expect(page.locator('[data-admin-task-filter="actionable"]')).toHaveClass(/is-active/);
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(7);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await page.locator('[data-admin-task-month-toggle]').first().click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible').first()).toHaveClass(/is-actionable/);
    await page.locator('#hero-employee-filter').click();
    await expect(page.locator('[data-admin-task-filter="waiting"]')).toHaveClass(/is-active/);
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(5);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await page.locator('[data-admin-task-month-toggle]').first().click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible').first()).toHaveClass(/is-waiting/);
  });

  await test.step('And Teambeheer toont vier medewerkers en twee beheerders als zes actieve accounts', async () => {
    await page.locator('button[data-view="employees"]').click();
    await expect(page.locator('#view-employees h2')).toHaveText('Teambeheer');
    await expect(page.locator('#team-active-account-count')).toHaveText('6');
    await expect(page.locator('#team-employees-overview')).toContainText('4 medewerkers');
    await expect(page.locator('#team-admins-overview')).toContainText('2 beheerders');
    await expect(page.locator('.team-account-avatar.employees')).toHaveCount(4);
    await expect(page.locator('.team-account-avatar.admins')).toHaveCount(2);
    await attachBusinessScreenshot(page, 'GUI smoke · Acties en teamaccounts apart');
  });

  await test.step('And Dashboard opent bovenaan terwijl eigenaarbolletjes gericht naar hun werkvoorraad springen', async () => {
    await page.locator('button[data-view="dashboard"]').click();
    await expect(page.locator('.hero-card')).toBeInViewport();
    await page.locator('#hero-backoffice-filter').click();
    await expect(page.locator('#admin-task-panel')).toBeInViewport();
    await expect(page.locator('#admin-task-title')).toHaveText('Acties bij Backoffice per maand');
    await expect(page.locator('#admin-task-summary')).toContainText('7 acties die Backoffice nu kan oppakken');
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(7);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await expect(page.locator('#admin-task-list .admin-task-row.is-waiting')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-filter="all"]')).toHaveText('Alle acties · 12');
    await expect(page.locator('[data-admin-task-filter="actionable"]')).toHaveText('Bij Backoffice · 7');
    await expect(page.locator('[data-admin-task-filter="waiting"]')).toHaveText('Bij medewerkers · 5');
  });
});

test('[DASH-H-013] dashboardmodules tonen compacte documenten, procesfasen en teamacties', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given Backoffice de vaste augustusbaseline opent', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-reset-demo').click();
    await page.locator('#modal-confirm').click();
  });

  await test.step('Then toont klanturenstaten een verkoopklaar kaartenoverzicht', async () => {
    // Klanturenstaten staat sinds de opknipronde op een eigen scherm
    // (#view-customer-timesheet-admin), bereikt via de teaser op het
    // Dashboard -- de inhoud zelf wordt hier al gerenderd vóór navigatie
    // (renderCustomerTimesheetAdmin() kijkt niet naar welk scherm actief is),
    // maar scrollIntoViewIfNeeded() vereist een zichtbaar element.
    await expect(page.locator('#customer-timesheet-admin-summary')).toHaveText('4 verwacht · 1 document te controleren · 0 extern te bevestigen · 0 wacht op medewerkers');
    await expect(page.locator('#customer-timesheet-admin-list .customer-timesheet-admin-row')).toHaveCount(4);
    await expect(page.locator('#customer-timesheet-admin-list .customer-timesheet-admin-meta')).toHaveCount(4);
    await expect(page.locator('#customer-timesheet-admin-list')).toContainText('Deadline');
    await expect(page.locator('#customer-timesheet-admin-list')).toContainText('Brokerroute');
    await page.locator('[data-go="customer-timesheet-admin"]').click();
    await expect(page.locator('#view-customer-timesheet-admin')).toHaveClass(/is-active/);
    await page.locator('#customer-timesheet-admin-list').scrollIntoViewIfNeeded();
    await attachBusinessScreenshot(page, 'GUI smoke · Klanturenstaten als compacte kaarten');
    await page.locator('#view-customer-timesheet-admin [data-go="dashboard"]').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('And proces en team tonen zonder lege tussenruimte duidelijke kerninformatie en acties', async () => {
    // Team blijft op het Dashboard: "wie loopt achter en wat is de
    // vervolgactie" is dagelijkse bediening. De procesmeter verhuisde in
    // v1.0.73 naar een eigen scherm -- het is naslag over de maand en zegt
    // zelf al "geen taaktelling". Op het Dashboard staat nog wel de stand.
    await expect(page.locator('#dashboard-team-title')).toHaveText('Teamstatus · Augustus 2026');
    await expect(page.locator('#dashboard-team-summary')).toHaveText('4 medewerkers · 2 te controleren · 1 wacht op medewerker');
    await expect(page.locator('#dashboard-employee-rows .dashboard-team-action')).toHaveCount(4);
    await expect(page.locator('#dashboard-employee-rows .dashboard-team-action.send')).toHaveCount(2);
    await expect(page.locator('#workflow-teaser-text')).toContainText('van 4 fasen');
    await page.locator('.dashboard-team-panel').scrollIntoViewIfNeeded();
    await attachBusinessScreenshot(page, 'GUI smoke · Teamstatus met vervolgacties');

    await page.locator('#workflow-teaser [data-go="teamstatus"]').click();
    await expect(page.locator('#view-teamstatus')).toHaveClass(/is-active/);
    await expect(page.locator('.workflow-overview')).toBeVisible();
    await expect(page.locator('.workflow-overview .workflow-step')).toHaveCount(4);
    await attachBusinessScreenshot(page, 'GUI smoke · Procesfasen als compact overzicht');
    await page.locator('#view-teamstatus [data-go="dashboard"]').click();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  });
});

test('[DASH-N-017] beheerderdashboard toont een laadtoestand tot de eerste werkvoorraad-sync', async ({ page }) => {
  const loginPage = new LoginPage(page);
  let bootstrapGateOpen = false;

  await page.route('**/server/api/bootstrap.php', async route => {
    while (!bootstrapGateOpen) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    await route.continue();
  });

  await test.step('Given de eerste werkvoorraad-sync nog niet is teruggekomen', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('Then toont het dashboard een neutrale laadtoestand en geen voorlopige teller', async () => {
    await expect(page.locator('#hero-task-total')).toHaveText(/laden/i, { timeout: 10_000 });
    await expect(page.locator('#hero-task-total')).not.toHaveText(/\d+ open actie/);
    await expect(page.locator('#dashboard-work-count')).toBeHidden();
    await expect(page.locator('#open-work-queue')).toBeHidden();
  });

  await test.step('When de sync binnenkomt, verschijnt de gezaghebbende teller', async () => {
    bootstrapGateOpen = true;
    await expect(page.locator('#hero-task-total')).toHaveText(/^\d+ open actie/, { timeout: 15_000 });
    await expect(page.locator('#hero-task-total')).not.toHaveText(/laden/i);
  });

  await loginPage.logout();
});

test('[DASH-H-017] serverwerkvoorraad hydrateert volledig en blijft stabiel bij maand- en filterwissels', async ({ page }) => {
  // 60 s was te krap zodra de wachtvensters verderop ruimer werden: dan
  // verplaats je de uitval alleen van een assertie naar een testtime-out, en
  // dat ziet er nog minder uit als wat het is. Zie de toelichting bij de
  // herocijfers verderop.
  test.setTimeout(180_000);
  const loginPage = new LoginPage(page);
  let workflowReads = 0;

  page.on('response', response => {
    if (response.request().method() !== 'GET') return;
    if (/\/server\/api\/(?:timesheets|customer-timesheets)\.php\?/.test(response.url())) workflowReads += 1;
  });

  await test.step('Given Backoffice met de volledige serverwerkvoorraad is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    const csrfResponse = await page.request.get('/server/auth/csrf.php');
    const csrf = await csrfResponse.json() as { csrf_token?: string };
    const resetResponse = await page.request.post('/server/api/test-reset.php', {
      headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') },
      data: { confirm: 'RESET_SHARED_TEST_BASELINE' },
    });
    const resetBody = await resetResponse.text();
    expect(resetResponse.ok(), `TEST-reset gaf HTTP ${resetResponse.status()}: ${resetBody}`).toBe(true);
    const reset = JSON.parse(resetBody) as { ok?: boolean; reset?: { open_actions?: number } };
    expect(reset).toMatchObject({ ok: true, reset: { open_actions: 12 } });
    workflowReads = 0;
    await page.reload();
    await expect(page.locator('#login-screen')).toBeHidden();
    await expect(page.locator('#view-dashboard')).toBeVisible();
    await expect.poll(() => workflowReads, { timeout: 20_000 }).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => {
      const tasks = window.adminOpenTasks();
      return {
        total: tasks.length,
        actionable: tasks.filter(task => task.actionable).length,
        waiting: tasks.filter(task => !task.actionable).length,
      };
    }), { timeout: 20_000 }).toEqual({ total: 12, actionable: 7, waiting: 5 });
    await expect(page.locator('#admin-task-content')).toBeHidden();
  });

  const snapshot = async () => page.evaluate(() => {
    const tasks = window.adminOpenTasks();
    return {
      ids: tasks.map(task => task.id).sort(),
      total: tasks.length,
      actionable: tasks.filter(task => task.actionable).length,
      waiting: tasks.filter(task => !task.actionable).length,
      months: [...new Set(tasks.map(task => task.periodKey))].sort(),
    };
  });

  const baseline = await snapshot();
  expect(baseline).toMatchObject({ total: 12, actionable: 7, waiting: 5 });

  await test.step('When Backoffice augustus-juli-augustus doorloopt', async () => {
    await page.locator('#period-prev').click();
    await expect(page.locator('#period-label')).toHaveText('Juli 2026');
    await page.locator('#period-next').click();
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
  });

  await test.step('Then blijven globale aantallen, eigenaren en taakidentiteiten gelijk', async () => {
    await expect.poll(snapshot, { timeout: 20_000 }).toEqual(baseline);
    expect(baseline.total).toBe(baseline.actionable + baseline.waiting);
    // Ruimer venster dan de standaard 5 s op de drie herocijfers, om dezelfde
    // reden als bij [DASH-N-007] in dit bestand.
    //
    // De maandwissel hierboven (augustus -> juli -> augustus) laat de
    // werkvoorraad opnieuw hydrateren. Tot dat rond is staat er letterlijk
    // "Werkvoorraad laden…" in `#hero-task-total`, en op een trage omgeving
    // duurt dat langer dan 5 s. Precies dat gebeurde: twee keer rood op de
    // CI-pool (release-run 34779932639, shards 7 en 10, inclusief de
    // herkansing) en ook hier lokaal op `tablet-chromium`. Twee onafhankelijke
    // omgevingen, dus geen lokale ruis.
    //
    // Geen verzwakking: de geëiste waarden zijn ongewijzigd en komen nog steeds
    // uit dezelfde `baseline`. Blijft de hydratatie hangen of levert hij andere
    // cijfers, dan faalt de case net zo hard -- alleen na 20 s in plaats van 5.
    const heroWacht = { timeout: 20_000 };
    await expect(page.locator('#hero-task-total')).toHaveText(`${baseline.total} open acties`, heroWacht);
    await expect(page.locator('#hero-backoffice-count')).toHaveText(String(baseline.actionable), heroWacht);
    await expect(page.locator('#hero-employee-count')).toHaveText(String(baseline.waiting), heroWacht);
  });

  await test.step('And eigenaarfilters openen alleen hun concrete taakregels', async () => {
    await page.locator('[data-open-work-filter="actionable"]').first().click();
    await expect(page.locator('#admin-task-content')).toBeVisible();
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(baseline.actionable);
    await expect(page.locator('#admin-task-list .admin-task-row.is-waiting')).toHaveCount(0);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await page.locator('[data-admin-task-month-toggle]').first().click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible').first()).toHaveClass(/is-actionable/);

    await page.locator('[data-admin-task-filter="waiting"]').click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]')).toHaveCount(baseline.waiting);
    await expect(page.locator('#admin-task-list .admin-task-row.is-actionable')).toHaveCount(0);
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-admin-task-month-toggle][aria-expanded="true"]')).toHaveCount(0);
    await page.locator('[data-admin-task-month-toggle]').first().click();
    await expect(page.locator('#admin-task-list [data-admin-task-row]:visible').first()).toHaveClass(/is-waiting/);
  });

  await test.step('And opnieuw openen zet alle maandblokken terug naar ingeklapt', async () => {
    await page.locator('[data-admin-task-filter="all"]').click();
    const julyToggle = page.locator('[data-admin-task-month-toggle="2026-07"]');
    await julyToggle.click();
    await expect(julyToggle).toHaveAttribute('aria-expanded', 'true');

    await page.locator('#admin-task-panel-toggle').click();
    await expect(page.locator('#admin-task-content')).toBeHidden();
    await page.locator('#admin-task-panel-toggle').click();
    await expect(page.locator('#admin-task-content')).toBeVisible();

    const monthToggles = page.locator('[data-admin-task-month-toggle]');
    const monthBodies = page.locator('.admin-task-month-body');
    await expect(monthToggles).toHaveCount(3);
    for (let index = 0; index < await monthToggles.count(); index += 1) {
      await expect(monthToggles.nth(index)).toHaveAttribute('aria-expanded', 'false');
      await expect(monthBodies.nth(index)).toBeHidden();
    }
  });
});

test('[DASH-H-019] werkvoorraadhydratatie negeert toekomstperioden en begrenst parallelle reads', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const futureReads: string[] = [];

  await page.route('**/server/api/bootstrap.php', async route => {
    const response = await route.fetch();
    const payload = await response.json() as { periods?: Array<Record<string, unknown>> };
    payload.periods = [
      ...(Array.isArray(payload.periods) ? payload.periods : []),
      { id: 999_991, period_key: '2199-11', year: 2199, month: 11 },
      { id: 999_992, period_key: '2199-12', year: 2199, month: 12 },
    ];
    await route.fulfill({ response, json: payload });
  });
  page.on('request', request => {
    if (/period=2199-(?:11|12)/.test(request.url())) futureReads.push(request.url());
  });

  await test.step('Given Backoffice een bootstrap met ongeldige toekomstperioden ontvangt', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#period-label')).toHaveText('Augustus 2026');
  });

  await test.step('Then toekomstperioden veroorzaken geen workflowreads', async () => {
    await page.waitForTimeout(1_000);
    expect(futureReads).toEqual([]);
  });

  await test.step('And de gedeelde leeswachtrij voert maximaal vier taken tegelijk uit', async () => {
    const concurrency = await page.evaluate(async () => {
      const helper = (window as unknown as {
        settlePromiseFactoriesWithConcurrency: (
          factories: Array<() => Promise<number>>,
          concurrency: number,
        ) => Promise<Array<{ status: string }>>;
      }).settlePromiseFactoriesWithConcurrency;
      let active = 0;
      let maximum = 0;
      const factories = Array.from({ length: 12 }, (_, index) => () => new Promise<number>(resolve => {
        active += 1;
        maximum = Math.max(maximum, active);
        window.setTimeout(() => {
          active -= 1;
          resolve(index);
        }, 15);
      }));
      const results = await helper(factories, 4);
      return { maximum, resultCount: results.length, allSettled: results.every(result => result.status === 'fulfilled') };
    });
    expect(concurrency.maximum).toBe(4);
    expect(concurrency.resultCount).toBe(12);
    expect(concurrency.allSettled).toBe(true);
  });
});

test('[DASH-H-020] de actieteller benoemt dat de rij over alle maanden loopt', async ({ page }) => {
  // "Actie 8 van 8" telde over alle maanden terwijl je het venster opent vanuit
  // een lijst die op een maand staat. Dat las alsof die ene maand acht acties had.
  const loginPage = new LoginPage(page);

  await test.step('Given Backoffice openstaande acties in meer dan een maand heeft', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    await page.locator('#admin-task-panel-toggle').click();
    await expect(page.locator('#admin-task-content')).toBeVisible();
    const maanden = page.locator('[data-admin-task-month-toggle]');
    expect(await maanden.count(), 'deze case heeft meer dan een maand met taken nodig').toBeGreaterThan(1);
  });

  await test.step('When Backoffice een actie vanuit de maandlijst opent', async () => {
    await page.locator('[data-admin-task-month-toggle]').first().click();
    const actie = page.locator('#admin-task-list .admin-task-row.is-actionable .admin-task-action button').first();
    await expect(actie).toBeVisible();
    await actie.click();
  });

  await test.step('Then vermeldt de teller dat de rij over alle maanden loopt', async () => {
    const teller = page.locator('#modal-queue-progress');
    await expect(teller).toBeVisible();
    await expect(teller).toContainText(/Actie \d+ van \d+ bij Backoffice/);
    await expect(teller, 'zonder deze toevoeging lijkt de teller over de gekozen maand te gaan')
      .toContainText('alle maanden');
  });
});

test('[DASH-N-019] een achtergrond-hertekening sluit het geopende profielmenu niet', async ({ page }) => {
  // Elke scroll sloot de topbalkmenu's, ook een scroll-event dat de gebruiker niet
  // zelf veroorzaakte: een hertekening die de paginahoogte verandert geeft er ook een.
  const loginPage = new LoginPage(page);
  const profielmenu = page.locator('#profile-menu');
  const bron = readFileSync(join(process.cwd(), 'assets', 'app.js'), 'utf8');

  await test.step('Given de scroll-handler het respijtvenster na een hertekening respecteert', async () => {
    const handler = bron.slice(bron.indexOf('window.addEventListener("scroll"'));
    expect(handler).toContain('Date.now() - laatsteHertekeningAt < LAYOUT_SCROLL_GRACE_MS');
    // markLayoutRender() moet worden aangeroepen op de twee plekken waar de
    // laadtoestand door de echte werkvoorraad wordt vervangen.
    expect((bron.match(/markLayoutRender\(\);/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  await test.step('When de beheerder het profielmenu opent en er een hertekening plaatsvindt', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#hero-task-total')).not.toHaveText(/laden/i, { timeout: 15_000 });
    await openProfielmenu(page);
    await expect(profielmenu).toBeVisible();
    await page.evaluate(() => {
      (window as unknown as { markLayoutRender: () => void }).markLayoutRender();
      window.dispatchEvent(new Event('scroll'));
    });
  });

  await test.step('Then blijft het profielmenu open', async () => {
    // Kort de tijd geven dat een verkeerde afhandeling het alsnog zou sluiten.
    await page.waitForTimeout(200);
    await expect(profielmenu, 'een hertekening mag het menu niet dichtklappen').toBeVisible();
    await expect(page.locator('#profile-menu-button')).toHaveAttribute('aria-expanded', 'true');
  });
});

test('[DASH-H-022] beheerder kan met de browser-terug/-vooruit-knop door alle eigen schermen navigeren', async ({ page }) => {
  const loginPage = new LoginPage(page);
  // Beheerderschermen (zie adminViews in app.js): dashboard, approvals,
  // invoices, announcements, employees, settings -- medewerker-only schermen
  // (timesheet, employee-dashboard, employee-announcements) wijken voor een
  // beheerder automatisch uit naar dashboard, dus die horen hier niet in de
  // volgorde.
  const volgorde = ['dashboard', 'approvals', 'invoices', 'announcements', 'employees', 'settings'] as const;

  await test.step('Given de beheerder is ingelogd op Urenoverzicht', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await verwachtAlleenSchermActief(page, 'dashboard');
  });

  await test.step('When de beheerder achtereenvolgens elk scherm opent', async () => {
    for (const scherm of volgorde.slice(1)) {
      await page.locator(`button[data-view="${scherm}"]:visible`).first().click();
      await verwachtAlleenSchermActief(page, scherm);
    }
  });

  await test.step('Then brengt browser-terug telkens het vorige scherm terug, in exact omgekeerde volgorde', async () => {
    for (let i = volgorde.length - 2; i >= 0; i--) {
      await page.goBack();
      await verwachtAlleenSchermActief(page, volgorde[i]);
    }
  });

  await test.step('Then brengt browser-vooruit telkens het volgende scherm terug, in dezelfde volgorde als daarnet geopend', async () => {
    for (let i = 1; i < volgorde.length; i++) {
      await page.goForward();
      await verwachtAlleenSchermActief(page, volgorde[i]);
    }
  });

  // Ook direct in deze case één assertion houden: de living-doc extractor telt
  // helper-assertions bewust niet mee en moet deze regressie als uitvoerbaar zien.
  await expect(page.locator('#view-settings')).toHaveClass(/is-active/);

  await loginPage.logout();
});

// Regressie: "Ander account of rol" in het profielmenu is demo-cruft dat bij
// een echte login niets anders doet dan uitloggen -- het wekt ten onrechte de
// indruk dat een medewerker een andere rol kan kiezen en hoort verborgen te
// zijn buiten de demomodus. (De mail-badge kreeg tegelijk een neutrale
// "laden"-stand i.p.v. meteen "E-mail uitgeschakeld" te flitsen; dat pad draait
// alleen op echte prod/test-hosts, niet in deze e2e.)
test('[DASH-N-027] het profielmenu verbergt "Ander account of rol" bij een echte login', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een echt ingelogde medewerker', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  await test.step('When de medewerker het profielmenu opent', async () => {
    await openProfielmenu(page);
  });

  await test.step('Then is er geen "Ander account of rol" en wel gewoon Uitloggen', async () => {
    await expect(page.locator('[data-profile-action="switch"]')).toBeHidden();
    await expect(page.locator('[data-profile-action="logout"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ander account of rol' })).toHaveCount(0);
  });
});

test('[DASH-H-027] de dashboardtellers van Backoffice komen exact uit de serverdata, niet uit een eigen berekening', async ({ page }) => {
  // Checklistpunt 17.2: "dashboardtellers (moeten kloppen met werkelijke data)".
  // Er was hiervoor geen enkele test -- gecontroleerd op 13 sep: geen bestaande
  // case raakte `#metric-submitted`, `#metric-approved` of hun notities.
  //
  // Wat hier precies bewezen wordt. De tellers hebben twee bronnen: de
  // serverwaarheid uit `/server/api/dashboard.php` (`per_maand`, de rij van de
  // actieve maand) en een lokale terugvaloptie die uit de gerenderde rijen
  // wordt geteld (`fallbackSubmitted`/`fallbackApproved`/`fallbackOpen`,
  // app.js ~7388). Zolang de API antwoordt hoort de server te winnen. Die
  // twee kunnen uiteenlopen -- de API telt élke urenstaat van de maand, de
  // rijen alleen wat het dashboard toont -- en dan liegt de teller. Deze case
  // vergelijkt daarom de zichtbare getallen met de API-rij van precies de maand
  // die de app open heeft staan, en niet met de rijen op het scherm.
  //
  // De relaties komen één-op-één uit app.js ~7391-7413:
  //   #metric-submitted  = gecontroleerd + klaar_voor_controle  / medewerkers
  //   #metric-approved   = gecontroleerd                        / medewerkers
  //   #metric-approved-note noemt klaar_voor_controle
  const loginPage = new LoginPage(page);
  await suppressInstallBanner(page);

  await test.step('Given de administrator heeft het dashboard open', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    // Wacht tot de serverdata binnen is: zolang de teller nog het
    // laadstreepje toont, is er niets te vergelijken.
    await expect(page.locator('#metric-submitted')).not.toHaveText(/^\s*[–-]\s*$/, { timeout: 20_000 });
  });

  const periodeKey = await page.locator('#period-picker').inputValue();
  expect(periodeKey, 'de app hoort een maand als JJJJ-MM open te hebben').toMatch(/^\d{4}-\d{2}$/);

  const maand = await test.step('When de serverwaarheid voor diezelfde maand wordt opgehaald', async () => {
    const response = await page.request.get('/server/api/dashboard.php');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok, JSON.stringify(body).slice(0, 200)).toBe(true);
    const rij = (body.per_maand as Array<{ period_key: string; gecontroleerd: number; klaar_voor_controle: number; medewerkers: number }>)
      .find(item => item.period_key === periodeKey);
    // Geen rij voor deze maand betekent dat de app op de lokale terugvaloptie
    // staat; dan is er geen serverwaarheid om tegen te vergelijken en bewijst
    // doorgaan niets.
    test.skip(!rij, `Geen serverrij voor ${periodeKey}; de tellers vallen dan terug op een lokale telling en zijn hier niet te vergelijken.`);
    return rij!;
  });

  await test.step('Then tonen de tellers exact de getallen van de server', async () => {
    const ingediend = Number(maand.gecontroleerd) + Number(maand.klaar_voor_controle);
    const gecontroleerd = Number(maand.gecontroleerd);
    const totaal = Math.max(0, Number(maand.medewerkers));

    // De teller staat als "4 / 4" in de DOM (het tweede getal in een <small>),
    // dus op de genormaliseerde tekst vergelijken.
    const tellerTekst = async (selector: string) => (await page.locator(selector).innerText()).replace(/\s+/g, ' ').trim();
    expect(await tellerTekst('#metric-submitted'), `#metric-submitted hoort ${ingediend} / ${totaal} te tonen voor ${periodeKey}`)
      .toBe(`${ingediend} / ${totaal}`);
    expect(await tellerTekst('#metric-approved'), `#metric-approved hoort ${gecontroleerd} / ${totaal} te tonen voor ${periodeKey}`)
      .toBe(`${gecontroleerd} / ${totaal}`);
  });

  await test.step('And spreken de bijschriften de tellers niet tegen', async () => {
    const open = Number(maand.klaar_voor_controle);
    const ingediend = Number(maand.gecontroleerd) + open;
    const totaal = Math.max(0, Number(maand.medewerkers));

    const controleNote = await page.locator('#metric-approved-note').innerText();
    if (open > 0) {
      expect(controleNote, `bij ${open} openstaande controles hoort dat aantal in het bijschrift te staan`).toContain(String(open));
    } else {
      expect(controleNote, 'zonder openstaande controles hoort het bijschrift dat te zeggen').toMatch(/geen openstaande controles/i);
    }

    // Het bijschrift onder "ingediend" noemt hoeveel er nog NIET ingediend zijn.
    // Dat getal is afgeleid van dezelfde twee cijfers; loopt het uit elkaar, dan
    // vertellen kop en bijschrift twee verschillende verhalen.
    const ingediendNote = await page.locator('#metric-submitted-note').innerText();
    if (ingediend < totaal && !/nog geen invoer verwacht/i.test(ingediendNote)) {
      expect(ingediendNote, `kop zegt ${ingediend}/${totaal}, dus het bijschrift hoort ${totaal - ingediend} nog-niet-ingediend te noemen`)
        .toContain(String(totaal - ingediend));
    }
  });

  await test.step('And wint de server aantoonbaar van een eigen telling, ook bij getallen die lokaal onmogelijk zijn', async () => {
    // Zonder deze stap kan de vergelijking hierboven meeliften op toeval: als de
    // serverwaarheid en de lokale terugvaltelling dezelfde getallen opleveren,
    // zou de case ook slagen terwijl de app stilletjes lokaal rekent. Daarom
    // hier een geantwoorde maandrij met aantallen die uit de gerenderde rijen
    // nooit kunnen komen (99 medewerkers in de demodatabase bestaan niet). Staat
    // er daarna "48 / 99" op het scherm, dan komt de teller bewijsbaar van de
    // server.
    await page.route('**/server/api/dashboard.php**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          per_maand: [{ period_key: periodeKey, gecontroleerd: 41, klaar_voor_controle: 7, uren_blokkades: 0, medewerkers: 99 }],
        }),
      });
    });
    await page.reload();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
    const tellerTekst = async (selector: string) => (await page.locator(selector).innerText()).replace(/\s+/g, ' ').trim();
    await expect.poll(() => tellerTekst('#metric-submitted'), { timeout: 20_000 }).toBe('48 / 99');
    expect(await tellerTekst('#metric-approved')).toBe('41 / 99');
    await page.unroute('**/server/api/dashboard.php**');
  });

  await loginPage.logout();
});

test('[DASH-H-028] elke goedkeurknop draagt de echte employees.id van de getoonde medewerker', async ({ page }) => {
  // Bewaking, geen gedragswijziging. Aanleiding: bij het natrekken van de
  // mededelingen-P0 (employees.id verstuurd waar users.id hoort) bleek dat de
  // client zijn medewerkers-id's uit een statische catalogus haalt --
  // `localEmployee.id` wordt bij het hydrateren nooit op de database-id gezet;
  // de echte `employees.id` komt er als `dbEmployeeId` naast te staan
  // (`app.js` ~3134-3160). De beheerdersacties goedkeuren en correctie-vragen
  // sturen die catalogus-id door als `employee_id`.
  //
  // Vandaag gaat dat goed omdat de twee reeksen samenvallen: gemeten zijn de
  // client-id's 1/2/3/4 en de `employees.id` in de database ook 1/2/3/4. Er is
  // dus GEEN defect en er is bewust niets aan de code veranderd -- een fix
  // zonder falend geval is een fix zonder vangnet, en dit pad raakt goedkeuren.
  //
  // Wat deze case wél doet: luid klagen zodra die aanname niet meer klopt. Zou
  // ooit een bedrijf worden toegevoegd waarvan de employees-rijen niet bij 1
  // beginnen, of zou er een medewerker verwijderd worden, dan loopt de
  // koppeling stil scheef en keurt een beheerder de uren van iemand anders
  // goed. Deze case valt dan om, op de plek waar het misgaat.
  //
  // De vergelijking gaat bewust via de NAAM op de kaart: die is voor de
  // gebruiker het bewijs van wie hij goedkeurt, en de id eronder moet daarbij
  // horen. Een vergelijking van alleen "is het een bestaande id" zou een
  // verwisseling tussen twee medewerkers niet zien.
  const loginPage = new LoginPage(page);
  await suppressInstallBanner(page);

  await test.step('Given Backoffice de openstaande goedkeuringen open heeft', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('button[data-view="approvals"]').first().click();
    await expect(page.locator('#view-approvals')).toHaveClass(/is-active/);
    await expect(page.locator('.approval-card').first()).toBeVisible({ timeout: 30_000 });
  });

  await test.step('Then hoort bij elke naam op een goedkeurkaart de employees.id uit de database', async () => {
    const kaarten = await page.locator('.approval-card').evaluateAll(els => els.map(el => ({
      clientId: Number(el.getAttribute('data-approval-card')),
      naam: (el.querySelector('.approval-person strong')?.textContent || '').trim(),
      goedkeurId: Number(el.querySelector('[data-approve]')?.getAttribute('data-approve')),
    })));
    expect(kaarten.length, 'de demodatabase hoort openstaande goedkeuringen te bevatten').toBeGreaterThan(0);

    // Bewust via de pagina zelf ophalen en niet via page.request: dan
    // vergelijken we de getoonde id's met exact de gegevens die de app heeft
    // gekregen. page.request loopt buiten de pagina om, waardoor een
    // gesimuleerde afwijking in deze case niet eens zou aankomen -- dat is bij
    // het opzetten van deze bewaking daadwerkelijk gebeurd en maakte de proef
    // stil waardeloos.
    const bootstrap = await page.evaluate(async () => {
      const response = await fetch('/server/api/bootstrap.php', { headers: { Accept: 'application/json' } });
      return response.json();
    });
    const dbPerNaam = new Map<string, number>(
      (bootstrap.employees as Array<{ id: number; full_name: string }>).map(e => [String(e.full_name).trim(), Number(e.id)])
    );

    for (const kaart of kaarten) {
      const verwacht = dbPerNaam.get(kaart.naam);
      expect(verwacht, `"${kaart.naam}" staat op een goedkeurkaart maar niet in de serverlijst met medewerkers`).toBeDefined();
      expect(kaart.clientId, `de kaart van ${kaart.naam} draagt id ${kaart.clientId}, maar in de database is dat employees.id ${verwacht} -- de catalogus-id en de database-id lopen uiteen`)
        .toBe(verwacht);
      expect(kaart.goedkeurId, `de goedkeurknop van ${kaart.naam} hoort dezelfde id te dragen als de kaart`).toBe(verwacht);
    }
  });

  await loginPage.logout();
});
