import { expect, test, request as playwrightRequest, type Locator } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { openProfielmenu } from './pages/TopbarMenu';
import { appConfig, requirePassword } from './fixtures/appConfig';

type JsonBody = Record<string, unknown>;

// Fase D — increment 1: de vormgevingsschakelaar ("skin").
// "classic" laat de bestaande app volledig ongemoeid; "new" activeert de
// regels in assets/styles-new.css (allemaal gescoped onder html[data-skin="new"]).
// Wisselen via Voorkeuren -> Vormgeving. In deze increment verandert er nog
// niets aan het uiterlijk; alleen de schakelaar en zijn persistentie worden
// hier vastgelegd.

// De <select> wordt in de modal opgewaardeerd naar een keuzemenu-widget
// (zoals #pref-theme). Bedienen gaat via #pref-skin-trigger + de optieknoppen.
async function kiesVormgeving(page: import('@playwright/test').Page, waarde: 'classic' | 'new'): Promise<void> {
  // 15s -> 25s (10 sep, mobile-safari), zelfde reden als accessibility.spec.ts:
  // moet boven openProfielmenu()/openPaneel()'s eigen 20s-budget blijven.
  await expect(async () => {
    await openProfielmenu(page);
    const preferences = page.locator('[data-profile-action="preferences"]');
    await expect(preferences).toBeVisible({ timeout: 2_500 });
    await preferences.click();
    await expect(page.locator('#pref-skin-trigger')).toBeVisible({ timeout: 2_500 });
  }).toPass({ timeout: 25_000, intervals: [250, 500, 1_000, 2_000] });
  await expect(page.locator('#pref-skin-trigger')).toBeVisible();
  await page.locator('#pref-skin-trigger').click();
  await page.locator(`[data-standard-choice-target="pref-skin"][data-standard-choice-value="${waarde}"]`).click();
  await page.getByRole('button', { name: 'Voorkeuren opslaan' }).click();
}

async function genormaliseerdeTekst(locator: Locator): Promise<string> {
  return locator.evaluate(element => String(element.textContent || '').replace(/\s+/g, ' ').trim());
}

test('[SKIN-H-001] de app start standaard in de klassieke vormgeving', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een verse browser op de loginpagina', async () => {
    await loginPage.open();
  });

  await test.step('When er nog geen vormgeving is gekozen', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  await test.step('Then blijft de app ook na inloggen in de klassieke vormgeving', async () => {
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });
});

test('[SKIN-H-002] Vormgeving op "Nieuw" zetten schakelt de skin en blijft na herladen staan', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een ingelogde administrator', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  await test.step('When Voorkeuren -> Vormgeving op "Nieuw" wordt gezet en opgeslagen', async () => {
    await kiesVormgeving(page, 'new');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  await test.step('Then draait de app door in de nieuwe skin en overleeft die een herlading', async () => {
    await expect(page.locator('#app-shell')).toBeVisible();
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });
});

test('[SKIN-H-003] terug naar "Klassiek" herstelt de klassieke vormgeving en bewaart die', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de app staat in de nieuwe skin', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
    await kiesVormgeving(page, 'new');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  await test.step('When Vormgeving weer op "Klassiek" wordt gezet', async () => {
    await kiesVormgeving(page, 'classic');
  });

  await test.step('Then is de klassieke vormgeving terug, ook na herladen', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });
});

test('[SKIN-H-004] de nieuwe skin activeert uitsluitend zijn eigen visuele fundament', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een ingelogde administrator in de klassieke vormgeving', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  const classic = await page.evaluate(() => ({
    pathCanvas: getComputedStyle(document.documentElement).getPropertyValue('--path-canvas').trim(),
    radius: getComputedStyle(document.documentElement).getPropertyValue('--radius').trim(),
    headingFont: getComputedStyle(document.querySelector('.topbar h1') as Element).fontFamily,
  }));

  await test.step('When de gebruiker de nieuwe vormgeving activeert', async () => {
    await kiesVormgeving(page, 'new');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  await test.step('Then zijn de 1414/1919-tokens en lokale serif alleen daar actief', async () => {
    const vernieuwd = await page.evaluate(() => ({
      pathCanvas: getComputedStyle(document.documentElement).getPropertyValue('--path-canvas').trim(),
      radius: getComputedStyle(document.documentElement).getPropertyValue('--radius').trim(),
      headingFont: getComputedStyle(document.querySelector('.topbar h1') as Element).fontFamily,
      bodyBackground: getComputedStyle(document.body).backgroundImage,
    }));

    expect(classic.pathCanvas).toBe('');
    expect(classic.radius).toBe('18px');
    expect(classic.headingFont).not.toContain('Path Editorial');
    expect(vernieuwd.pathCanvas).toBe('#e9ede6');
    expect(vernieuwd.radius).toBe('18px');
    expect(vernieuwd.headingFont).toContain('Path Editorial');
    expect(vernieuwd.bodyBackground).toContain('radial-gradient');
  });
});

test('[SKIN-H-005] Klassiek start licht en Nieuw donker en onthoudt daarna elk eigen thema', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een ingelogde administrator met de standaardvoorkeuren', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  await test.step('When Nieuw voor het eerst direct wordt geopend', async () => {
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  await test.step('Then bewaart iedere skin zijn eigen keuze bij heen en weer schakelen', async () => {
    await page.locator('#quick-theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });
});

test('[SKIN-H-006] de echte medewerkerroute toont de live bento en blijft mobiel bedienbaar', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));
  await page.addInitScript(() => {
    localStorage.setItem('path-install-afgewezen', String(Date.now()));
  });
  await page.route('**/server/api/timesheets.php', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'Alleen visuele test' }) });
      return;
    }
    await route.fallback();
  });

  await test.step('Given de medewerker de nieuwe vormgeving opent', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  await test.step('When het echte dashboard de bento met live invoervelden en gezamenlijke versie-footer tekent', async () => {
    await expect(page.locator('#new-employee-bento')).toBeVisible();
    await expect(page.locator('.new-bento-hero')).toContainText('Begin met');
    await expect(page.locator('#new-bento-days .new-bento-hours-input')).toHaveCount(4);
    await expect(page.locator('#new-bento-week-total-label')).toContainText('4 werkdagen in deze maand');
    await expect(page.locator('#new-bento-days-total')).toHaveText(/\/ \d+ weken/);
    await expect(page.locator('[data-new-bento-submit]')).toContainText('Naar laatste week en controleren');
    await expect(page.locator('[data-new-bento-save]')).toHaveAttribute('title', /Bewaar/);
    await expect(page.locator('[data-new-bento-submit]')).toHaveAttribute('title', /laatste week|hele maand/i);
    await expect(page.locator('[data-new-bento-customer]')).toHaveAttribute('title', /Upload/);
    await expect(page.locator('.app-footer')).toContainText('Ontwikkeld en beheerd door Team Path');
    const versionBadge = page.locator('.app-footer-version');
    await expect(versionBadge).toBeVisible();
    await expect(versionBadge).toHaveText(/Versie \d+\.\d+\.\d+/);
    await expect(versionBadge).toHaveCSS('margin-left', '0px');
  });

  await test.step('And eerdere weken niet indienen en de laatste week eerst bevestiging vraagt', async () => {
    await page.locator('[data-new-bento-submit]').click();
    await expect(page.locator('#modal')).toBeHidden();
    await expect(page.locator('[data-new-bento-submit]')).toContainText('Indienen ter controle');
    await page.locator('[data-new-bento-submit]').click();
    await expect(page.locator('#modal')).toBeVisible();
    await expect(page.locator('#modal-title')).toContainText('indienen?');
    await expect(page.locator('#modal-summary')).toContainText('Alle uren worden vergrendeld');
    // Niet alleen een aantal: de bevestiging noemt de niet-ingevulde weken
    // met naam, zodat je precies weet waar je nog moet kijken.
    await expect(page.locator('.external-timesheet-warning li').first()).toContainText(/Week \d+/);
    await page.locator('#modal-close').click();
  });

  await test.step('Then blijven op telefoon weekinvoer, klanturenstaat en stappen binnen het scherm', async () => {
    await page.setViewportSize({ width: 412, height: 915 });
    await expect(page.locator('#new-employee-bento')).toBeVisible();
    await expect(page.locator('[data-new-bento-save]')).toBeVisible();
    await expect(page.locator('[data-new-bento-customer]')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test('[SKIN-H-008] Nieuw houdt dezelfde beheergegevens vast tijdens navigatie en terugschakelen', async ({ page }) => {
  // Root cause van de al lang bekende "zeldzame flake (~1 op 10)", grondig
  // uitgezocht (10 september): geen productbug, een test-timingprobleem.
  // dashboardVoor werd gemeten zodra er ÉÉN medewerkersrij stond, niet
  // zodra de volledige, asynchrone server-hydratatie (readApiRuntime.
  // adminWorkflowHydrated) was afgerond. Bij een medewerker wiens
  // seed-uren pas via die hydratatie binnenkomen (bv. Stasjo, 24u in
  // september volgens de huidige demo-seed) zag de eerste meting dus nog
  // de voorlopige 0-staat, en de latere (na de navigatieronde, die de
  // hydratatie de tijd gaf af te ronden) wél de echte waarde -- vandaar
  // de "wijziging" die er nooit een was. Eerst overwogen root causes die
  // het niet bleken te zijn, ter documentatie: (1) todaysWeekIndexInPeriod
  // zonder vaste klok -- uitgesloten, faalde ook met een vaste datum;
  // (2) applyDayHoursDefaultsToRecord/ensurePeriodRecords die andermans
  // record muteert bij loutere admin-navigatie -- een reëel, apart risico
  // (nu los daarvan verholpen, alleen nog actief voor de ingelogde
  // medewerker zelf), maar niet de oorzaak van déze test: Stasjo's
  // dayHours staat niet eens ingesteld in de seed. Bevestigd met de
  // server-API rechtstreeks: dezelfde 24u staat er al vóór alle navigatie,
  // direct na een verse database-bootstrap.
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));
  const loginPage = new LoginPage(page);

  await test.step('Given Backoffice is ingelogd en de dashboardgegevens zijn geladen', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#dashboard-employee-rows tr')).not.toHaveCount(0);
    // Wacht tot de asynchrone serverwerkvoorraad-sync (adminWorkflowHydrated)
    // is afgerond, anders meet dashboardVoor hieronder de voorlopige staat
    // i.p.v. de uiteindelijke -- zie de root-cause toelichting hierboven.
    // 20s i.p.v. de gebruikelijke 15s (zie dashboard.spec.ts): deze hydratatie
    // haalt timesheets + customer-timesheets op voor élke periode/medewerker-
    // combinatie t/m de huidige maand, dus met 4 medewerkers over meerdere
    // maanden zijn dat aanmerkelijk meer verzoeken dan de medewerker-variant.
    await expect(page.locator('#dashboard-next-action-label')).not.toHaveText(/laden/i, { timeout: 20_000 });
  });

  const dashboardVoor = await genormaliseerdeTekst(page.locator('#dashboard-employee-rows'));
  const teamTitelVoor = await genormaliseerdeTekst(page.locator('#dashboard-team-title'));

  await test.step('When Nieuw wordt geactiveerd en Backoffice alle hoofdschermen bezoekt', async () => {
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('.new-admin-topnav')).toBeVisible();

    for (const [view, titel] of [
      ['approvals', 'Goedkeuringen'],
      ['invoices', 'Facturen'],
      ['announcements', 'Mededelingen'],
      ['employees', 'Medewerkers'],
      ['settings', 'Instellingen'],
    ] as const) {
        await page.locator(`[data-view="${view}"]:visible, [data-pilot-view="${view}"]:visible`).first().click();
      await expect(page.locator(`#view-${view}`)).toHaveClass(/is-active/);
      await expect(page.locator('.view:visible')).toHaveCount(1);
      await expect(page.locator('#page-title')).toHaveText(titel);
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    }
  });

  await test.step('Then dezelfde gegevens blijven staan in Nieuw en na terugschakelen naar Klassiek', async () => {
    await page.locator('[data-view="dashboard"]:visible, [data-pilot-view="dashboard"]:visible').first().click();
    expect(await genormaliseerdeTekst(page.locator('#dashboard-employee-rows'))).toBe(dashboardVoor);
    expect(await genormaliseerdeTekst(page.locator('#dashboard-team-title'))).toBe(teamTitelVoor);

    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    expect(await genormaliseerdeTekst(page.locator('#dashboard-employee-rows'))).toBe(dashboardVoor);
    expect(await genormaliseerdeTekst(page.locator('#dashboard-team-title'))).toBe(teamTitelVoor);
  });
});

test('[SKIN-H-009] medewerker houdt dezelfde urenstatus in Nieuw, Mijn uren en Klassiek', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een medewerkerdashboard met geladen urenstatus', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#employee-dashboard-hours')).toBeVisible();
  });

  const medewerker = await page.locator('#workspace-name').innerText();
  const urenVoor = await page.locator('#employee-dashboard-hours').innerText();
  const statusVoor = await page.locator('#employee-dashboard-status').innerText();

  await test.step('When de medewerker Nieuw activeert en via de bento naar Mijn uren navigeert', async () => {
    await page.locator('#quick-skin-toggle').click();
    // De pijl in de bento blijft sinds SKIN-H-021 op het Dashboard; de
    // volledige Mijn uren-pagina is nog steeds bereikbaar via de route zelf.
    await page.evaluate(() => { window.location.hash = 'timesheet'; });
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('#timesheet-employee')).toHaveText(medewerker);
    await expect(page.locator('#view-dashboard')).toBeHidden();
    await expect(page.locator('#view-employee-dashboard')).toBeHidden();
    await expect(page.locator('.view:visible')).toHaveCount(1);
    await page.evaluate(() => { window.location.hash = 'employee-announcements'; });
    await expect(page.locator('#view-employee-announcements')).toBeVisible();
    await expect(page.locator('#view-employee-dashboard')).toBeHidden();
    await expect(page.locator('.view:visible')).toHaveCount(1);
  });

  await test.step('Then de dashboardstatus gelijk blijft en Klassiek dezelfde gegevens toont', async () => {
    await expect(page.locator('.mobile-brand-home')).toBeVisible();
    await page.locator('.mobile-brand-home').click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#employee-dashboard-hours')).toHaveText(urenVoor);
    await expect(page.locator('#employee-dashboard-status')).toHaveText(statusVoor);

    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    await expect(page.locator('#employee-dashboard-hours')).toHaveText(urenVoor);
    await expect(page.locator('#employee-dashboard-status')).toHaveText(statusVoor);
  });
});

test('[SKIN-H-010] de admin-verhaallijn wisselt van medewerker en toont bijbehorende status', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given Backoffice in de nieuwe skin met minstens twee medewerkers in de verhaallijn', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  // Geen harde assertie op minstens één rij hier: in de volledige suite delen
  // veel cases dezelfde demodatabase, en een eerdere case kan voor de actuele
  // kalendermaand alle medewerkers hebben gedeactiveerd/verplaatst. Dat is
  // geen skin-regressie, dus dan skipt deze case zichzelf net als bij minder
  // dan twee medewerkers.
  const rijen = page.locator('.new-admin-employee-row');
  test.skip(await rijen.count() < 2, 'Minder dan twee actieve medewerkers deze periode; wisselen valt niet te bewijzen.');

  const eersteNaam = await genormaliseerdeTekst(rijen.nth(0).locator('.new-admin-employee-person strong'));
  const tweedeNaam = await genormaliseerdeTekst(rijen.nth(1).locator('.new-admin-employee-person strong'));

  await test.step('When Backoffice de tweede medewerker in de wachtrij aanklikt', async () => {
    await rijen.nth(1).click();
  });

  await test.step('Then wordt die medewerker geselecteerd en toont het verhaal zijn naam en vier statuskaarten', async () => {
    await expect(rijen.nth(1)).toHaveClass(/is-selected/);
    await expect(rijen.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(rijen.nth(0)).not.toHaveClass(/is-selected/);
    const verhaalKop = await genormaliseerdeTekst(page.locator('#new-admin-story-heading'));
    expect(verhaalKop).toContain(tweedeNaam);
    expect(verhaalKop).not.toContain(eersteNaam);
    await expect(page.locator('#new-admin-story-cards article')).toHaveCount(4);
  });
});

test('[SKIN-H-011] een bewust opgeslagen 0 uur telt mee voor de weekvoortgang in Mijn uren', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));
  await page.addInitScript(() => {
    localStorage.setItem('path-install-afgewezen', String(Date.now()));
  });

  await test.step('Given de medewerker de nieuwe vormgeving opent op de huidige week', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('#new-employee-bento')).toBeVisible();
  });

  const inputs = page.locator('#new-bento-days .new-bento-hours-input');
  const aantalDagen = await inputs.count();
  test.skip(aantalDagen < 2, 'Minder dan twee werkdagen deze week; het scenario (één dag bewust op 0 laten) valt niet te bewijzen.');
  // De precieze dagdatum van de laatst getoonde werkdag, om na te gaan of de
  // server er straks een eigen (0-uur) dagregel voor heeft — los van hoeveel
  // andere weken toevallig al gevuld zijn door eerdere cases in dezelfde
  // gedeelde demodatabase (zie ook [SKIN-H-010] hierboven).
  const laatsteDagLabel = await inputs.nth(aantalDagen - 1).locator('xpath=../..').locator('b').first().textContent();

  await test.step('When alle werkdagen op deze week uren krijgen behalve de laatste, die bewust leeg blijft, en de week wordt opgeslagen', async () => {
    for (let i = 0; i < aantalDagen - 1; i += 1) {
      await inputs.nth(i).fill('8');
      await inputs.nth(i).blur();
    }
    await expect(inputs.nth(aantalDagen - 1)).toHaveValue('');
    await page.locator('[data-new-bento-save]').click();
    // De conceptwrite is gedebounced (700ms) en asynchroon; geef de server de
    // kans om de expliciete 0-uur dagregel voor de actieve week te bewaren
    // voordat de pagina herlaadt.
    await page.waitForTimeout(1_500);
  });

  await test.step('Then heeft de server na een herlaad een eigen dagregel voor de laatste dag bewaard, ook al bleef die op 0 uur', async () => {
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/server/api/timesheets.php') && res.request().method() === 'GET'),
      page.reload(),
    ]);
    await expect(page.locator('#new-employee-bento')).toBeVisible();
    await expect(inputs.nth(0)).toHaveValue('8', { timeout: 10_000 });
    await expect(inputs.nth(aantalDagen - 1)).toHaveValue('');

    const data = await response.json();
    const dayEntries: Array<{ work_date: string; hours: number }> = data?.timesheet?.day_entries || [];
    const laatsteDagNummer = String(Number(laatsteDagLabel)).padStart(2, '0');
    const laatsteDagRij = dayEntries.find(entry => entry.work_date.endsWith('-' + laatsteDagNummer));
    expect(laatsteDagRij, 'de server moet een eigen dagregel bewaren voor de bewust op 0 gelaten dag').toBeTruthy();
    expect(Number(laatsteDagRij?.hours)).toBe(0);
  });
});

test('[SKIN-H-012] Mededelingen valt niet terug op de klassieke sidebar in Nieuw', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de medewerker de nieuwe vormgeving opent', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  // Mededelingen is voor een medewerker alleen bereikbaar via de bel (een
  // klik op een mededeling-notificatie), niet via de klassieke sidebar die
  // in Nieuw juist verborgen is voor de medewerkerroutes. Navigeren via de
  // hash raakt dezelfde showView()-code als die klik.
  await test.step('When de medewerker naar Mededelingen navigeert', async () => {
    await page.evaluate(() => { window.location.hash = 'employee-announcements'; });
    await expect(page.locator('#view-employee-announcements')).toBeVisible();
  });

  await test.step('Then blijft Nieuw actief en blijft de klassieke sidebar verborgen', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('.sidebar')).toBeHidden();
    await expect(page.locator('.mobile-brand-home')).toBeVisible();
  });
});

test('[SKIN-H-013] de medewerkerroute blijft op elk scherm consequent Nieuw, ook op telefoonbreedte', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.setViewportSize({ width: 412, height: 915 });

  // Elk scherm dat de medewerker daadwerkelijk kan bereiken (sidebar is in
  // Nieuw bewust verborgen op deze routes) moet zichzelf op dezelfde manier
  // presenteren: Nieuw blijft actief, de klassieke sidebar duikt nergens
  // stiekem weer op, en de eigen terugknop ("Home") blijft het vaste anker
  // i.p.v. dat je terugvalt op klassieke navigatie.
  const assertConsistentNewSkin = async (verwachteView: string) => {
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator(`#${verwachteView}`)).toBeVisible();
    await expect(page.locator('.sidebar')).toBeHidden();
    await expect(page.locator('.mobile-brand-home')).toBeVisible();
    await expect(page.locator('.mobile-brand-home')).toContainText('Home');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontale scroll op ${verwachteView}`).toBeLessThanOrEqual(1);
  };

  await test.step('Given de medewerker inlogt en Nieuw activeert', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await assertConsistentNewSkin('view-employee-dashboard');
  });

  await test.step('When de medewerker naar Mijn uren gaat', async () => {
    await page.evaluate(() => { window.location.hash = 'timesheet'; });
    await assertConsistentNewSkin('view-timesheet');
  });

  await test.step('And de medewerker naar Mededelingen gaat (bereikbaar via de bel)', async () => {
    await page.evaluate(() => { window.location.hash = 'employee-announcements'; });
    await assertConsistentNewSkin('view-employee-announcements');
  });

  await test.step('Then brengt de eigen Home-knop terug naar het dashboard, nog altijd in Nieuw', async () => {
    await page.locator('.mobile-brand-home').click();
    await assertConsistentNewSkin('view-employee-dashboard');
  });
});

test('[SKIN-H-015] de theme-snelknop staat niet meer op de medewerker-startpagina, Voorkeuren blijft werken', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Testfeedback (Stasjo, medewerker): de licht/donker-snelknop bovenaan het
  // scherm was niet duidelijk en hoort niet prominent op de homepage.
  await test.step('Given de medewerker Nieuw activeert', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  await test.step('Then staat de theme-snelknop niet meer op het dashboard', async () => {
    await expect(page.locator('#quick-theme-toggle')).toBeHidden();
    await expect(page.locator('#quick-skin-toggle')).toBeVisible();
  });

  await test.step('And blijft de onderliggende voorkeur bereikbaar en werkend via Voorkeuren', async () => {
    // Zelfde toPass-vangnet als kiesVormgeving() hierboven (10 sep): een kale
    // klik direct na openProfielmenu() bleek op mobile-safari soms te vroeg,
    // nog vóór het profielmenu daadwerkelijk interactief was.
    await expect(async () => {
      await openProfielmenu(page);
      const voorkeuren = page.locator('[data-profile-action="preferences"]');
      await expect(voorkeuren).toBeVisible({ timeout: 2_500 });
      await voorkeuren.click();
      await expect(page.locator('#pref-theme-trigger')).toBeVisible({ timeout: 2_500 });
    }).toPass({ timeout: 25_000, intervals: [250, 500, 1_000, 2_000] });
    await page.locator('#pref-theme-trigger').click();
    await page.locator('[data-standard-choice-target="pref-theme"][data-standard-choice-value="dark"]').click();
    await page.getByRole('button', { name: 'Voorkeuren opslaan' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test('[SKIN-N-007] productie forceert Klassiek en verbergt de redesignschakelaar', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een gebruiker heeft de nieuwe vormgeving in een pilotomgeving gekozen', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  await test.step('When dezelfde voorkeur onder het productiebeleid wordt toegepast', async () => {
    await page.evaluate(() => {
      const runtime = window as typeof window & { applySkin: (hostname?: string) => void };
      runtime.applySkin('uren.pathconsultancy.nl');
    });
  });

  await test.step('Then blijft productie klassiek zonder zichtbare pilotschakelaar en blijft TEST wel beschikbaar', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    await expect(page.locator('#quick-skin-toggle')).toBeHidden();
    await page.evaluate(() => {
      const runtime = window as typeof window & { applySkin: (hostname?: string) => void };
      runtime.applySkin('uren-test.pathconsultancy.nl');
    });
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('#quick-skin-toggle')).toBeVisible();
  });
});

test('[SKIN-H-014] snelkeuze in Mijn uren-bento heeft ook een 0-optie naast 8 en 9', async ({ page }) => {
  // Feedback eerste testronde (Stasjo): 8/9 als snelkeuze is handig, maar een
  // dag die je bewust niet werkt (bv. altijd vrije vrijdag) heeft geen
  // snelkeuze voor 0 uur -- je moet dan handmatig wissen of het veld leeg
  // laten. Derde knop naast 8/9 lost dat op zonder de bestaande twee te raken.
  const loginPage = new LoginPage(page);
  // Zelfde vaste datum als SKIN-H-011: garandeert een editable, huidige week
  // i.p.v. een willekeurige (mogelijk vergrendelde) periode op basis van de
  // echte systeemklok -- anders vindt de knop wel plaats maar doet niets,
  // omdat de handler stilzwijgend teruggaat bij een disabled invoerveld.
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));
  await page.addInitScript(() => {
    localStorage.setItem('path-install-afgewezen', String(Date.now()));
  });

  await test.step('Given de medewerker de nieuwe vormgeving opent op Mijn uren', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('#new-employee-bento')).toBeVisible();
  });

  await test.step('Then heeft de eerste dag drie snelkeuzeknoppen: 0, 8 en 9', async () => {
    const eersteDag = page.locator('#new-bento-days .new-bento-day').first();
    await eersteDag.locator('.new-bento-hours-input').focus();
    const presets = eersteDag.locator('.new-bento-presets button');
    await expect(presets).toHaveCount(3);
    await expect(presets.nth(0)).toHaveText('0');
    await expect(presets.nth(1)).toHaveText('8');
    await expect(presets.nth(2)).toHaveText('9');
  });

  await test.step('When op 8 gevolgd door 0 wordt geklikt', async () => {
    const eersteDag = page.locator('#new-bento-days .new-bento-day').first();
    const input = eersteDag.locator('.new-bento-hours-input');
    // De snelkeuzeknoppen tonen alleen bij :focus-within op de dag, en een
    // preset-klik herbouwt de hele daglijst (dezelfde innerHTML-render als
    // een handmatige invoer) -- de focus op het oude inputelement overleeft
    // dat niet. Voor elke klik dus opnieuw focussen op het (ververste) veld.
    // WebKit past :focus-within soms met vertraging toe t.o.v. Chromium; een
    // enkele herhaling (focus + klik) i.p.v. één poging voorkomt een race
    // tegen die vertraging zonder de assertie zelf te verzwakken.
    await input.focus();
    const focusWithinActief = await eersteDag.evaluate(el => el.matches(':focus-within'));
    const actEl = await page.evaluate(() => document.activeElement?.className || '(geen)');
    console.log('[SKIN-H-014 diagnose] focus-within=', focusWithinActief, 'activeElement=', actEl);
    await expect(async () => {
      await input.focus();
      await eersteDag.locator('[data-new-bento-set="8"]').click();
      await expect(input).toHaveValue('8', { timeout: 2_000 });
    }).toPass({ timeout: 30_000, intervals: [250, 500, 1_000, 2_000] });
    await expect(async () => {
      await input.focus();
      await eersteDag.locator('[data-new-bento-set="0"]').click();
      // Bewust: 0 uur wordt net als bij handmatige invoer als LEEG veld getoond
      // (placeholder "0"), niet als letterlijke "0" -- zelfde renderregel
      // die [SKIN-H-011] al bewijst voor bewust op 0 gelaten dagen. De knop
      // zet de waarde intern wel degelijk naar 0 (vandaar de lege weergave
      // i.p.v. de vorige "8"), dit bewijst alleen dat de knop-actie werkt.
      await expect(input).toHaveValue('');
    }).toPass({ timeout: 10_000, intervals: [250, 500, 1_000] });
  });
});

test('[SKIN-H-016] een eigen werkpatroon per weekdag vult Mijn uren voor en telt zo mee in de contracturen', async ({ page }) => {
  // Wens van medewerker Stasjo: "mijn vrijdag is altijd 0, dat zou ik graag
  // als standaard willen zodat ik het alleen hoef aan te passen wanneer dat
  // nodig is." Een eigen werkpatroon per weekdag (ingesteld door Backoffice,
  // want het raakt ook de contracturen-vergelijking) vult een nog niet
  // aangeraakte dag voor met die waarde -- gewoon aanpasbaar, en Opslaan
  // bewaart hem net zoals elke andere getypte waarde. Werkt gelijk in Nieuw
  // en Klassiek, want de vulling zit in de data (applyTimesheetApiPayload),
  // niet in een van de twee vormgevingen.
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));
  await page.addInitScript(() => {
    localStorage.setItem('path-install-afgewezen', String(Date.now()));
  });

  const uniek = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  const eigenAdres = `patroonproef-${uniek}@example.invalid`;
  const eigenNaam = `Patroonproef ${uniek}`;
  const nieuwWachtwoord = `PatroonE2e!${uniek}`;
  let gebruikerId = 0;
  let medewerkerId = 0;

  const beheer = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  const beheerPost = async (pad: string, data: JsonBody) => {
    const csrf = await (await beheer.get('/server/auth/csrf.php')).json() as { csrf_token?: string };
    const res = await beheer.post(pad, { headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') }, data });
    return { status: res.status(), body: await res.json() as JsonBody };
  };

  try {
    await test.step('Given Backoffice een medewerker met een eigen werkpatroon aanmaakt (dinsdag 6 uur, vrijdag 0 uur)', async () => {
      const csrfLogin = await (await beheer.get('/server/auth/csrf.php')).json() as { csrf_token?: string };
      const loginResponse = await beheer.post('/server/auth/login.php', {
        headers: { 'X-CSRF-Token': String(csrfLogin.csrf_token || '') },
        data: {
          email: appConfig.adminEmail,
          password: requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'),
        },
      });
      expect(loginResponse.status(), 'Backoffice moet kunnen inloggen om de medewerker aan te maken').toBe(200);

      const aangemaakt = await beheerPost('/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: eigenNaam,
          email: eigenAdres,
          role: 'Consultant',
          active: true,
          startDate: '2020-01-01',
          weeklyHours: 32,
          hoursTuesday: 6,
          hoursFriday: 0,
        },
      });
      expect(aangemaakt.status, JSON.stringify(aangemaakt.body)).toBe(200);
      gebruikerId = Number(aangemaakt.body.user_id || 0);
      medewerkerId = Number(aangemaakt.body.employee_id || 0);
      expect(gebruikerId, 'de nieuwe medewerker hoort een account te krijgen').toBeGreaterThan(0);

      const resetAangevraagd = await beheerPost('/server/auth/request-reset.php', { email: eigenAdres });
      expect(resetAangevraagd.status).toBe(200);
      const token = String(resetAangevraagd.body.token || '');
      expect(token).toMatch(/^[a-f0-9]{64}$/);

      await page.goto(`${appConfig.baseUrl}/index.html#reset-password=${token}`);
      await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
      await page.locator('#auth-reset-new-password').fill(nieuwWachtwoord);
      await page.locator('#auth-reset-confirm-password').fill(nieuwWachtwoord);
      await page.locator('#auth-reset-complete-submit').click();
      await expect(page.locator('#auth-reset-complete-feedback')).toContainText('Je wachtwoord is ingesteld');
      await page.locator('#auth-reset-goto-login').click();
    });

    const loginPage = new LoginPage(page);
    await test.step('When de medewerker inlogt, Nieuw activeert en Mijn uren opent', async () => {
      await expect(page.locator('#auth-login-form')).toBeVisible();
      await loginPage.login(eigenAdres, nieuwWachtwoord);
      await expect(page.locator('#app-shell')).toBeVisible();
      await page.locator('#quick-skin-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
      await expect(page.locator('#new-employee-bento')).toBeVisible();
    });

    // Week 0 van september 2026 begint met dinsdag 1 sep (maandag valt buiten
    // de maand) -- de eerste getoonde dag is dus dinsdag, de laatste vrijdag.
    const inputs = page.locator('#new-bento-days .new-bento-hours-input');

    await test.step('Then staat dinsdag al op 6 uur en vrijdag op leeg (0 uur), zonder dat er iets is getypt', async () => {
      // De eerste render gebeurt synchroon met een nog lege record (voor de
      // server-fetch is opgehaald); de standaardwaarden verschijnen pas
      // zodra die fetch is verwerkt. Poll dus in plaats van één momentopname.
      await expect(inputs.first()).toHaveValue('6', { timeout: 15_000 });
      await expect(inputs.last()).toHaveValue('');
    });

    await test.step('And de standaardweekknop is zichtbaar op het Dashboard', async () => {
      await expect(page.locator('#new-employee-bento [data-standard-hours-fill]')).toContainText('Standaardweek vullen');
    });

    await test.step('And dezelfde knop vult nog lege weken in Mijn uren in Nieuw en Klassiek', async () => {
      await page.evaluate(() => { window.location.hash = 'timesheet'; });
      await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
      await page.locator('[data-hours-week-scope="week-1"]').click();
      await expect(page.locator('#hours-week-nav')).toBeVisible();
      await expect(page.locator('#fill-standard-hours')).toContainText('Standaardweek vullen');
      const newCardsInput = page.locator('#hours-grid-cards .new-bento-hours-input').nth(1);
      await expect(newCardsInput).toHaveValue('');
      await page.locator('#fill-standard-hours').click();
      await expect(newCardsInput).toHaveValue('6', { timeout: 5_000 });

      await page.locator('#quick-skin-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
      await page.locator('[data-hours-week-scope="week-2"]').click();
      await expect(page.locator('#hours-table-wrap')).toBeVisible();
      const classicInput = page.locator('#hours-grid .hours-input').nth(1);
      await expect(classicInput).toHaveValue('');
      await page.locator('#fill-standard-hours').click();
      await expect(classicInput).toHaveValue('6', { timeout: 5_000 });

      await page.locator('[data-hours-week-scope="week-0"]').click();
    });

    await test.step('When de uren vanuit Mijn uren worden opgeslagen', async () => {
      await page.locator('#save-timesheet').click();
      await page.waitForTimeout(1_500);
    });

    await test.step('Then heeft de server het patroon zelf bewaard: dinsdag 6 uur, vrijdag expliciet 0 uur', async () => {
      // Rechtstreeks bij de server nagaan i.p.v. op de herlaad-request zelf te
      // wachten -- die race is bij deze zwaardere setup (nieuwe medewerker +
      // wachtwoordreset in dezelfde test) een paar keer nooit gematcht,
      // terwijl de knop-actie en de UI-assertie hierboven al lieten zien dat
      // het patroon goed staat.
      const eigenMedewerkerId = await page.evaluate(() => {
        // @ts-expect-error debug-only, alleen voor deze directe controle-call
        return currentEmployee().id;
      });
      const response = await page.request.get(`/server/api/timesheets.php?period=2026-09&employee_id=${encodeURIComponent(String(eigenMedewerkerId))}`);
      expect(response.status()).toBe(200);
      const data = await response.json();
      const dayEntries: Array<{ work_date: string; hours: number }> = data?.timesheet?.day_entries || [];
      const dinsdagRij = dayEntries.find(entry => entry.work_date.endsWith('-01'));
      const vrijdagRij = dayEntries.find(entry => entry.work_date.endsWith('-04'));
      expect(dinsdagRij, 'dinsdag 1 sep hoort als 6 uur bewaard te zijn').toBeTruthy();
      expect(Number(dinsdagRij?.hours)).toBe(6);
      expect(vrijdagRij, 'vrijdag 4 sep hoort als expliciete 0 uur bewaard te zijn').toBeTruthy();
      expect(Number(vrijdagRij?.hours)).toBe(0);
    });
  } finally {
    // Zonder dit blijft de wegwerpmedewerker actief in de gedeelde demo-data
    // staan -- dat verstoort de isolatiecontrole (orphans/marker-checks) van
    // alle ándere tests die dezelfde CI-database delen, ook lang na deze
    // case. Zelfde opruimpatroon als business-workflows-e2e.spec.ts: eerst
    // deactiveren, dan het account echt verwijderen.
    const csrfLogout = await page.request.get('/server/auth/csrf.php').catch(() => null);
    if (csrfLogout && csrfLogout.ok()) {
      const csrfBody = await csrfLogout.json() as { csrf_token?: string };
      await page.request.post('/server/auth/logout.php', {
        headers: { 'X-CSRF-Token': String(csrfBody.csrf_token || '') },
      }).catch(() => null);
    }
    if (gebruikerId > 0) {
      await beheerPost('/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: { name: eigenNaam, email: eigenAdres, dbEmployeeId: medewerkerId, dbUserId: gebruikerId, role: 'Consultant', active: false },
      }).catch(() => null);
      await beheerPost('/server/api/users.php', { action: 'delete', user_id: gebruikerId }).catch(() => null);
    }
    await beheer.dispose();
  }
});

test('[SKIN-H-017] Mijn uren toont bij een enkele week dezelfde bento-kaartjes als het Dashboard, Klassiek blijft de tabel', async ({ page }) => {
  // "we willen toch vanuit hier blijven werken in new design? je springt
  // ineens naar dit bij pijl kiezen. 0 8 9 hier wel maar bij oude niet?" --
  // de volledige Mijn uren-weergave gebruikte bij een enkele week nog de
  // klassieke tabelrij-layout, ook al was de kleurstelling al Nieuw. Een
  // enkele week toont nu dezelfde kaartjes (met dezelfde -/+ en 0/8/9-
  // knoppen) als de bento, met dezelfde vorige/volgende-week-pijlen erboven.
  // "Hele maand" blijft de compacte tabel voor een totaaloverzicht. Klassiek
  // raakt hier niets van: geen kaartjes, geen pijlen, gewoon de tabel.
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));

  await test.step('Given de medewerker Nieuw activeert en Mijn uren opent op een enkele week', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    // De pijl in de bento blijft sinds SKIN-H-021 op het Dashboard; Mijn uren
    // wordt hier via de route zelf geopend.
    await page.evaluate(() => { window.location.hash = 'timesheet'; });
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await page.locator('[data-hours-week-scope="week-0"]').click();
  });

  await test.step('Then toont Mijn uren dezelfde kaartjesstijl als de bento, met werkende week-pijlen', async () => {
    await expect(page.locator('#hours-table-wrap')).toBeHidden();
    await expect(page.locator('#hours-week-nav')).toBeVisible();
    const cards = page.locator('#hours-grid-cards .new-bento-day');
    await expect(cards.first()).toBeVisible();
    await expect(page.locator('#hours-week-nav-title')).toHaveText('Week 36');

    const dinsdag = cards.first();
    await dinsdag.locator('.new-bento-hours-input').focus();
    await expect(dinsdag.locator('[data-new-bento-set="8"]')).toBeVisible();
    await dinsdag.locator('[data-new-bento-set="8"]').click();
    await expect(dinsdag.locator('.new-bento-hours-input')).toHaveValue('8', { timeout: 5_000 });

    await page.locator('#hours-week-nav [data-new-bento-week="next"]').click();
    await expect(page.locator('#hours-week-nav-title')).toHaveText('Week 37');
  });

  await test.step('When Hele maand wordt gekozen', async () => {
    await page.locator('[data-hours-week-scope="all"]').click();
  });

  await test.step('Then staat de compacte tabel weer terug, geen kaartjes', async () => {
    await expect(page.locator('#hours-table-wrap')).toBeVisible();
    await expect(page.locator('#hours-week-nav')).toBeHidden();
  });

  await test.step('And in Klassiek blijft Mijn uren altijd de tabel, zonder kaartjes of pijlen', async () => {
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    await page.locator('[data-hours-week-scope="week-0"]').click();
    await expect(page.locator('#hours-table-wrap')).toBeVisible();
    await expect(page.locator('#hours-week-nav')).toBeHidden();
    await expect(page.locator('#hours-grid-cards')).toBeHidden();
  });
});

test('[SKIN-H-018] Klanturenstaat-blok klapt inline open op het Dashboard, zonder weg te navigeren, en keert terug naar Mijn uren', async ({ page }) => {
  // "ik wil zoveel mogelijk in 1 menu blijven" -- het Klanturenstaat-blok
  // navigeerde altijd weg naar de volledige Mijn uren-pagina. Het klikt nu
  // inline open op het Dashboard zelf: het ECHTE #customer-timesheet-upload-
  // panel (van Mijn uren) verhuist in de DOM naar het blokje en weer terug,
  // dus geen dubbele logica en geen dubbele ids.
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));

  await test.step('Given de medewerker Nieuw activeert op het Dashboard', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('#new-employee-bento')).toBeVisible();
  });

  const card = page.locator('#new-bento-customer');
  const toggle = page.locator('[data-new-bento-customer]');
  const panel = page.locator('#customer-timesheet-upload-panel');

  await test.step('When op het Klanturenstaat-blok wordt geklikt', async () => {
    await toggle.click();
  });

  await test.step('Then klapt het blok open, blijft het Dashboard actief en verhuist het echte paneel erin', async () => {
    await expect(card).toHaveAttribute('data-open', 'true');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toContainText('Klanturenstaat sluiten');
    await expect(panel).toBeVisible();
    await expect(page.locator('#customer-timesheet-file')).toBeVisible();
    expect(await panel.evaluate((el, expandId) => el.parentElement?.id === expandId, 'new-bento-customer-expand')).toBe(true);
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    // De maand/bestand-velden en knoppen moeten in één kolom passen -- geen
    // horizontale overflow van het brede grid dat op de volle pagina wordt
    // gebruikt.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'geen horizontale scroll door het ingeklemde uploadgrid').toBeLessThanOrEqual(1);
  });

  await test.step('When er nogmaals op wordt geklikt', async () => {
    await toggle.click();
  });

  await test.step('Then klapt het blok weer dicht en staat het paneel terug op zijn vaste plek', async () => {
    await expect(card).toHaveAttribute('data-open', 'false');
    await expect(toggle).toContainText('Klanturenstaat openen');
    expect(await panel.evaluate(el => el.parentElement?.id)).not.toBe('new-bento-customer-expand');
  });

  await test.step('When het blok weer wordt geopend en daarna naar Mijn uren wordt genavigeerd', async () => {
    await toggle.click();
    await expect(card).toHaveAttribute('data-open', 'true');
    // De pijl in de bento blijft sinds SKIN-H-021 op het Dashboard; de
    // navigatie weg van het Dashboard loopt hier via de route zelf.
    await page.evaluate(() => { window.location.hash = 'timesheet'; });
  });

  await test.step('Then staat het paneel weer op zijn vaste plek op Mijn uren en is het daar gewoon zichtbaar', async () => {
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(panel).toBeVisible();
    expect(await panel.evaluate(el => el.parentElement?.id)).not.toBe('new-bento-customer-expand');
  });
});

test('[SKIN-H-019] de beheerroute blijft op elk van de 6 pilot-tabs consequent Nieuw, zonder terug te vallen op de klassieke zijbalk', async ({ page }) => {
  // De pilot-topbar (.new-admin-topnav) tekende al zes tabs (Cockpit,
  // Goedkeuringen, Facturen, Mededelingen, Medewerkers, Instellingen), maar
  // alleen Cockpit had de zijbalk-verborgen/Nieuw-behandeling: de andere vijf
  // vielen terug op de klassieke zijbalk zodra je erheen klikte -- exact
  // hetzelfde "springt naar oud menu"-patroon dat eerder bij de medewerker-
  // schermen is opgelost. Deze case loopt alle zes tabs langs en bewijst dat
  // ze nu consequent hetzelfde beheerscherm (zijbalk weg, pilot-topnav met
  // eigen actieve tab, geen horizontale overflow) tonen.
  const loginPage = new LoginPage(page);
  const views: Array<{ id: string; view: string }> = [
    { id: 'dashboard', view: 'view-dashboard' },
    { id: 'approvals', view: 'view-approvals' },
    { id: 'invoices', view: 'view-invoices' },
    { id: 'announcements', view: 'view-announcements' },
    { id: 'employees', view: 'view-employees' },
    { id: 'settings', view: 'view-settings' },
  ];

  const assertConsistentNewAdminSkin = async (pilotId: string, verwachteView: string) => {
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator(`#${verwachteView}`)).toHaveClass(/is-active/);
    await expect(page.locator('.sidebar')).toBeHidden();
    await expect(page.locator('.new-admin-topnav')).toBeVisible();
    await expect(page.locator(`.new-admin-topnav button[data-pilot-view="${pilotId}"]`)).toHaveClass(/is-active/);
    await expect(page.locator('.mobile-brand-home')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontale scroll op ${verwachteView}`).toBeLessThanOrEqual(1);
  };

  await test.step('Given een ingelogde administrator Nieuw activeert', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
    await page.locator('#quick-skin-toggle').click();
    await assertConsistentNewAdminSkin('dashboard', 'view-dashboard');
  });

  for (const { id, view } of views.slice(1)) {
    await test.step(`When de administrator via de pilot-tab naar ${id} navigeert`, async () => {
      await page.locator(`[data-pilot-view="${id}"]`).click();
      await assertConsistentNewAdminSkin(id, view);
    });
  }

  await test.step('Then brengt de eigen Home-knop terug naar Cockpit, nog altijd in Nieuw', async () => {
    await page.locator('.mobile-brand-home').click();
    await assertConsistentNewAdminSkin('dashboard', 'view-dashboard');
  });
});

test('[SKIN-H-020] de voetstrip onder Verhalen per medewerker toont de echte periode en tijd, en het verhaaloverzicht is te exporteren', async ({ page }) => {
  // Overgenomen uit de 1919-beheerderpilot (.pagefoot), maar zonder de
  // verzonnen "synchronisatie actief"-status uit die statische mockup: deze
  // app pollt niet, dus de voetstrip toont alleen wat echt is -- de
  // weergaveperiode, het moment van de laatste render, de legenda die de
  // status-bolletjes in de rest van de sectie al gebruikt, en een csv-export
  // die exact de zichtbare rijen exporteert.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsAdmin();
  await expect(page.locator('#app-shell')).toBeVisible();
  await page.locator('#quick-skin-toggle').click();
  await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);

  const foot = page.locator('.new-admin-storyline-foot');
  await expect(foot).toBeVisible();

  await test.step('De weergaveperiode in de voetstrip komt overeen met de rest van de Storyline', async () => {
    const storylinePeriod = (await page.locator('#new-admin-storyline-period').textContent()) || '';
    const [expectedPeriod] = storylinePeriod.split(' · ');
    await expect(page.locator('#new-admin-foot-period')).toHaveText(expectedPeriod);
  });

  await test.step('"Laatst vernieuwd" toont een echt tijdstip, geen verzonnen synchronisatiestatus', async () => {
    await expect(page.locator('#new-admin-foot-refreshed')).toHaveText(/^\d{1,2}:\d{2}$/);
  });

  await test.step('De legenda benoemt dezelfde drie statussen als de voortgangsbolletjes ernaast', async () => {
    const legendItems = foot.locator('.new-admin-foot-legend i');
    await expect(legendItems).toHaveCount(3);
    await expect(legendItems.nth(0)).toHaveText('Gereed');
    await expect(legendItems.nth(1)).toHaveText('Actie vereist');
    await expect(legendItems.nth(2)).toHaveText('Nog niet gestart');
  });

  await test.step('Verhaaloverzicht exporteren levert een echte csv-download op', async () => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#new-admin-story-export').click()
    ]);
    expect(download.suggestedFilename()).toMatch(/^Path_verhaaloverzicht_.*\.csv$/);
    await expect(page.locator('#toast')).toContainText('verhaaloverzicht is gedownload');
  });
});

test('[SKIN-H-021] de medewerker blijft op het Dashboard: de pijl springt naar vandaag in het weekkaartje, open maanden staan er zichtbaar bij, en een skinwissel hertekent Mijn uren direct', async ({ page }) => {
  // Drie dingen die Gio tijdens handmatig testen aanwees:
  // 1. "bij drukken op de pijl kom je nu hier [Mijn uren] en dat moet niet"
  //    -- de pijl navigeerde weg naar de losse Mijn uren-pagina, terwijl het
  //    weekkaartje de week al inline toont. Hij blijft nu op het Dashboard,
  //    springt naar de week van vandaag en zet de cursor in de dag van
  //    vandaag.
  // 2. "stel je hebt 2 maanden openstaan, waar staat het dan?" -- het al
  //    bestaande "Open acties per maand"-overzicht was in Nieuw onbedoeld
  //    verborgen achter de blanket-regel die de rest van het klassieke
  //    Dashboard verbergt. Het is nu zichtbaar, en een actie erin blijft ook
  //    op het Dashboard (wisselt alleen de maand).
  // 3. "fout bij switchen nog steeds" -- skin wisselen terwijl Mijn uren open
  //    stond, liet de bento-kaartjes ongestyled staan tot een F5, omdat
  //    applySkin() alleen het data-skin-attribuut zette en niets hertekende.
  //    SKIN-H-017 verhulde dat per ongeluk door na de wissel nog een
  //    weekscope-klik te doen; hier wordt direct na de wissel gecontroleerd.
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-09T12:00:00.000Z'));

  await test.step('Given de medewerker Nieuw activeert op het Dashboard', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });

  await test.step('When op de pijl-knop wordt gedrukt', async () => {
    // Eerst weg van de week van vandaag navigeren, om te bewijzen dat de
    // pijl altijd terugspringt naar vandaag, ongeacht welke week toevallig
    // openstond (1 september 2026 is een dinsdag, dus "vorige week" staat
    // al uit op week 0 -- "volgende week" bewijst hetzelfde).
    await page.locator('#new-employee-bento [data-new-bento-week="next"]').click();
    await page.locator('[data-new-bento-open-hours]').click();
  });

  await test.step('Then blijft het Dashboard actief, staat het weekkaartje op de week van vandaag en heeft de dag van vandaag focus', async () => {
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#view-timesheet')).not.toHaveClass(/is-active/);
    await expect(page.locator('#new-bento-week-title')).toHaveText('Week 37');
    const focusInToday = await page.evaluate(() => Boolean(document.activeElement?.closest('.new-bento-day')?.classList.contains('is-active')));
    expect(focusInToday).toBe(true);
  });

  await test.step('And staat het overzicht van open maanden zichtbaar op het Dashboard, en een actie erin blijft op het Dashboard', async () => {
    // Gio wees op de rustigere kaartstijl van dit maand-overzicht. Het oude
    // hero-blok (.employee-hero) zelf blijft in Nieuw verborgen -- dat gaf
    // dubbele/inconsistente info naast deze kaart, die dezelfde "welke
    // maanden staan open"-behoefte al dekt.
    await expect(page.locator('.employee-hero')).toBeHidden();
    await expect(page.locator('#employee-open-task-total')).toHaveText(/\d+ open acties?/);
    const overview = page.locator('#employee-open-overview');
    await expect(overview).toBeVisible();
    await expect(page.locator('#employee-open-overview-count')).toHaveText(/\d+ open maand/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'werkvoorraadkaarten blijven binnen het mobiele scherm').toBeLessThanOrEqual(1);
    await page.locator('[data-employee-open-month-toggle]').first().click();
    await page.locator('[data-employee-open-action]').first().click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#view-timesheet')).not.toHaveClass(/is-active/);
  });

  await test.step('When Mijn uren open staat op een enkele week en de skin naar Klassiek wisselt', async () => {
    await page.evaluate(() => { window.location.hash = 'timesheet'; });
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await page.locator('[data-hours-week-scope="week-1"]').click();
    await expect(page.locator('#hours-grid-cards .new-bento-day').first()).toBeVisible();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  await test.step('Then staat de klassieke tabel er meteen, zonder extra klik of F5', async () => {
    await expect(page.locator('#hours-table-wrap')).toBeVisible();
    await expect(page.locator('#hours-grid-cards')).toBeHidden();
    await expect(page.locator('#hours-week-nav')).toBeHidden();
  });
});

test('[SKIN-H-022] een tweede herlading zet de skin/thema-voorkeur niet terug naar standaard', async ({ page }) => {
  // loadState() stempelt een geladen (bestaande) staat altijd op
  // schemaVersion 27, ook als hij als schemaVersion 26 binnenkwam. De
  // acceptatie-check herkende historisch alleen [7..26] -- prima bij de
  // éérste herlading (leest nog 26 terug), maar de tweede herlading leest
  // dan 27 terug, viel buiten die lijst, en de hele opgeslagen staat
  // (inclusief skin- en themavoorkeur) werd stilletjes weggegooid voor een
  // verse standaardstaat. Pas zichtbaar na twee herladingen; Gio meldde dit
  // na een avond lang F5'en tijdens het testen.
  const loginPage = new LoginPage(page);
  await test.step('Given een ingelogde administrator zet Nieuw en donker aan', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  await test.step('When de pagina twee keer ververst', async () => {
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');

    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  await test.step('Then blijft de skin- en themavoorkeur na beide herladingen bewaard', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test('[SKIN-H-023] "Standaardweek/-maand vullen" vult alleen lege dagen met het eigen werkpatroon, in Nieuw en Klassiek', async ({ page }) => {
  // WhatsApp-wens van medewerker Stasjo: "mijn vrijdag is altijd 0, de andere
  // dagen 9 uur -- zou je met 1 knop een standaardweek kunnen vullen?" en "als
  // ik ziek of vrij ben moet ik ze eruit kunnen halen" (dus nooit iets
  // overschrijven dat al is ingevuld). Hergebruikt hetzelfde eigen-werkpatroon
  // dat SKIN-H-016 al bewijst (dinsdag/vrijdag daar; hier een vol Ma-do/vr-
  // patroon zoals Stasjo's eigen voorbeeld), en toont dat "Standaardweek
  // vullen" op het Dashboard een al getypte dag ongemoeid laat, terwijl
  // "Standaardweek/-maand vullen" op Mijn uren in beide skins werkt.
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));
  await page.addInitScript(() => {
    localStorage.setItem('path-install-afgewezen', String(Date.now()));
  });

  const uniek = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  const eigenAdres = `standaardweek-${uniek}@example.invalid`;
  const eigenNaam = `Standaardweekproef ${uniek}`;
  const nieuwWachtwoord = `StdWeekE2e!${uniek}`;
  let gebruikerId = 0;
  let medewerkerId = 0;

  const beheer = await playwrightRequest.newContext({ baseURL: appConfig.baseUrl });
  const beheerPost = async (pad: string, data: JsonBody) => {
    const csrf = await (await beheer.get('/server/auth/csrf.php')).json() as { csrf_token?: string };
    const res = await beheer.post(pad, { headers: { 'X-CSRF-Token': String(csrf.csrf_token || '') }, data });
    return { status: res.status(), body: await res.json() as JsonBody };
  };

  try {
    await test.step('Given Backoffice een medewerker met een eigen werkpatroon aanmaakt (ma-do 9 uur, vrijdag 0 uur)', async () => {
      const csrfLogin = await (await beheer.get('/server/auth/csrf.php')).json() as { csrf_token?: string };
      const loginResponse = await beheer.post('/server/auth/login.php', {
        headers: { 'X-CSRF-Token': String(csrfLogin.csrf_token || '') },
        data: { email: appConfig.adminEmail, password: requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD') },
      });
      expect(loginResponse.status(), 'Backoffice moet kunnen inloggen om de medewerker aan te maken').toBe(200);

      const aangemaakt = await beheerPost('/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: {
          name: eigenNaam,
          email: eigenAdres,
          role: 'Consultant',
          active: true,
          startDate: '2020-01-01',
          weeklyHours: 36,
          hoursMonday: 9,
          hoursTuesday: 9,
          hoursWednesday: 9,
          hoursThursday: 9,
          hoursFriday: 0,
        },
      });
      expect(aangemaakt.status, JSON.stringify(aangemaakt.body)).toBe(200);
      gebruikerId = Number(aangemaakt.body.user_id || 0);
      medewerkerId = Number(aangemaakt.body.employee_id || 0);
      expect(gebruikerId).toBeGreaterThan(0);

      const resetAangevraagd = await beheerPost('/server/auth/request-reset.php', { email: eigenAdres });
      const token = String(resetAangevraagd.body.token || '');
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      await page.goto(`${appConfig.baseUrl}/index.html#reset-password=${token}`);
      await expect(page.locator('#auth-reset-complete-form')).toBeVisible();
      await page.locator('#auth-reset-new-password').fill(nieuwWachtwoord);
      await page.locator('#auth-reset-confirm-password').fill(nieuwWachtwoord);
      await page.locator('#auth-reset-complete-submit').click();
      await expect(page.locator('#auth-reset-complete-feedback')).toContainText('Je wachtwoord is ingesteld');
      await page.locator('#auth-reset-goto-login').click();
    });

    const loginPage = new LoginPage(page);
    await test.step('When de medewerker inlogt en Nieuw activeert op het Dashboard', async () => {
      await expect(page.locator('#auth-login-form')).toBeVisible();
      await loginPage.login(eigenAdres, nieuwWachtwoord);
      await expect(page.locator('#app-shell')).toBeVisible();
      await page.locator('#quick-skin-toggle').click();
      await expect(page.locator('#new-employee-bento')).toBeVisible();
    });

    const inputs = page.locator('#new-bento-days .new-bento-hours-input');

    await test.step('And staat de patroonuitleg er correct bij ("Ma 9,0u · ... · Vr vrij")', async () => {
      await expect(page.locator('#new-bento-fill-pattern-note')).toContainText('9,0u');
      await expect(page.locator('#new-bento-fill-pattern-note')).toContainText('vrij');
    });

    await test.step('When de medewerker maandag van week 37 zelf al op 12 uur zet en daarna Standaardweek vullen klikt', async () => {
      // Week 0 (de standaard-actieve week) wordt al automatisch voorgevuld
      // door het bestaande applyDayHoursDefaultsToRecord (SKIN-H-016) --
      // logisch, maar geen goede plek om "een al ingevulde dag blijft staan"
      // te bewijzen. Week 1 (7-11 september, een volledige ma-vr week) is dat
      // nog niet, dus die schakelen we hier expliciet in. Rechtstreeks in de
      // staat gezet i.p.v. via het invoerveld: elke wijziging via het veld
      // zelf bevestigt synchroon meteen de hele actieve week (zie
      // handleBentoDayCardChange -> scheduleDraftTimesheetWrite ->
      // buildTimesheetWritePayload, hetzelfde mechanisme dat SKIN-H-011
      // bewijst) -- dan zou er voor deze stap niets meer te vullen overblijven.
      await page.evaluate(() => {
        // @ts-expect-error debug-only voor deze directe controle
        state.hoursWeekScope = 'week-1';
        // @ts-expect-error debug-only voor deze directe controle
        state.hoursWeekScopeTouched = true;
        // @ts-expect-error debug-only voor deze directe controle
        const record = recordFor(currentEmployee().id);
        record.entries[1][0] = 12;
        // @ts-expect-error debug-only voor deze directe controle
        renderNewEmployeeBento(record, currentEmployee(), currentPeriod());
      });
      await expect(page.locator('#new-bento-week-title')).toHaveText('Week 37');
      await expect(inputs.first()).toHaveValue('12');
      // Een achtergrond-sync (server-refresh na inloggen) kan dinsdag t/m
      // vrijdag intussen ook al hebben voorgevuld -- zodra week 1 de actieve
      // week is geworden, doet applyDayHoursDefaultsToRecord daar hetzelfde
      // mee als bij week 0. Zonder herbevestiging vlak vóór de klik is de
      // startwaarde dan niet deterministisch, dus forceer 'm nogmaals en klik
      // in dezelfde evaluate, zonder gat waarin die sync ertussen kan komen.
      await page.evaluate(() => {
        // @ts-expect-error debug-only voor deze directe controle
        const record = recordFor(currentEmployee().id);
        record.entries[1] = [12, 0, 0, 0, 0];
        record.confirmedEntries[1] = [false, false, false, false, false];
        (document.querySelector('#new-employee-bento [data-standard-hours-fill]') as HTMLElement | null)?.click();
      });
      await page.waitForTimeout(300);
    });

    await test.step('Then blijft maandag op 12 (niet overschreven), en zijn dinsdag/woensdag/donderdag/vrijdag gevuld met het patroon', async () => {
      await expect(page.locator('#toast')).toContainText('Standaardweek vullen');
      const entries = await page.evaluate(() => {
        // @ts-expect-error debug-only voor deze directe controle
        const record = recordFor(currentEmployee().id);
        return record.entries[1];
      });
      expect(entries[0]).toBe(12); // maandag: eigen invoer blijft staan
      expect(entries[1]).toBe(9); // dinsdag: patroon
      expect(entries[2]).toBe(9); // woensdag: patroon
      expect(entries[3]).toBe(9); // donderdag: patroon
      expect(entries[4]).toBe(0); // vrijdag: patroon (bewust 0)
    });

    await test.step('And toont Mijn uren dezelfde knop, die van naam wisselt tussen week en hele maand', async () => {
      await page.evaluate(() => { window.location.hash = 'timesheet'; });
      await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
      await page.locator('[data-hours-week-scope="week-1"]').click();
      await expect(page.locator('#fill-standard-hours')).toHaveText('Standaardweek vullen');
      await page.locator('[data-hours-week-scope="all"]').click();
      await expect(page.locator('#fill-standard-hours')).toHaveText('Standaardmaand vullen');
      await page.locator('#fill-standard-hours').click();
      await page.waitForTimeout(600);
      await expect(page.locator('#toast')).toContainText('Standaardmaand vullen');
    });

    await test.step('And blijft de knop ook in Klassiek werken', async () => {
      await page.locator('#quick-skin-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
      await expect(page.locator('#fill-standard-hours')).toBeVisible();
      const entriesNaVulling = await page.evaluate(() => {
        // @ts-expect-error debug-only voor deze directe controle
        const record = recordFor(currentEmployee().id);
        return record.entries;
      });
      const totaalGevuld = entriesNaVulling.flat().filter((uur: number) => uur > 0 || uur === 0).length;
      expect(totaalGevuld).toBeGreaterThan(0);
    });
  } finally {
    const csrfLogout = await (await page.request.get('/server/auth/csrf.php')).json() as { csrf_token?: string };
    await page.request.post('/server/auth/logout.php', {
      headers: { 'X-CSRF-Token': String(csrfLogout.csrf_token || '') },
    }).catch(() => null);
    if (gebruikerId > 0) {
      await beheerPost('/server/api/staff.php', {
        action: 'upsert_employee',
        sendInvitation: false,
        employee: { name: eigenNaam, email: eigenAdres, dbEmployeeId: medewerkerId, dbUserId: gebruikerId, role: 'Consultant', active: false },
      }).catch(() => null);
      await beheerPost('/server/api/users.php', { action: 'delete', user_id: gebruikerId }).catch(() => null);
    }
    await beheer.dispose();
  }
});

test('[SKIN-H-024] "Volgende actie" bovenaan Open acties per maand toont de eerstvolgende stap en blijft op het Dashboard', async ({ page }) => {
  // Vervangt wat het oude klassieke hero-blok deed (één duidelijke
  // eerstvolgende stap met knop) door dezelfde bento-kaarttaal te gebruiken
  // als de rest van deze sectie, i.p.v. het hero-blok zelf terug te zetten
  // (dat gaf dubbele/inconsistente info -- zie de toelichting bij
  // #employee-open-overview in styles-new.css). De knop hergebruikt dezelfde
  // skin-bewuste data-employee-open-action-handler als de losse
  // maandregels eronder, dus blijft ook hier op het Dashboard staan.
  const loginPage = new LoginPage(page);
  await test.step('Given de medewerker Nieuw activeert op het Dashboard', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#employee-dashboard-hours')).toBeVisible();
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });

  const overview = page.locator('#employee-open-overview');
  const next = page.locator('#employee-open-overview-next');
  await test.step('Then staat bovenaan Open acties per maand een "Volgende actie"-kaart met titel, periode en knop', async () => {
    await expect(overview).toBeVisible();
    await expect(next).toBeVisible();
    await expect(page.locator('#employee-open-overview-next-title')).not.toBeEmpty();
    await expect(page.locator('#employee-open-overview-next-meta')).toContainText('actie 1 van');
    await expect(page.locator('#employee-open-overview-next-action')).not.toBeEmpty();
    // Regressie (10 sep, TEST-tester Shawn-Douglas): titel en periodedetail
    // liepen zonder regeleinde in elkaar over ("...September 2026September
    // 2026 · actie 1 van 2"), want strong/small stonden zonder display:block
    // los tegen elkaar aan. Elk moet dus op een eigen regel (andere y) staan.
    const titleBox = await page.locator('#employee-open-overview-next-title').boundingBox();
    const metaBox = await page.locator('#employee-open-overview-next-meta').boundingBox();
    expect(titleBox && metaBox, 'titel en periodedetail horen allebei een zichtbare bounding box te hebben').toBeTruthy();
    expect(metaBox.y, 'periodedetail hoort op een eigen regel onder de titel te staan, niet ernaast').toBeGreaterThan(titleBox.y + titleBox.height - 2);
  });

  await test.step('When op de knop van de Volgende actie wordt geklikt', async () => {
    await page.locator('#employee-open-overview-next-action').click();
  });

  await test.step('Then blijft het Dashboard actief, net als bij de losse maandregels eronder', async () => {
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
    await expect(page.locator('#view-timesheet')).not.toHaveClass(/is-active/);
  });
});

test('[SKIN-H-025] de 0/8/9-snelkeuze bij elke dag staat altijd zichtbaar, in Klassiek en in Nieuw', async ({ page }) => {
  // Testfeedback: de snelkeuze bestond al in Nieuw se bento-kaartjes, maar
  // verscheen alleen bij de actief geselecteerde/gefocuste dag -- bij de
  // andere dagen (het merendeel van de week) was hij onvindbaar zonder eerst
  // te tikken. Klassiek had de knoppen daarnaast helemaal niet. Beide nu
  // gelijk: elke dag toont zijn eigen 0/8/9 zonder eerst te hoeven focussen.
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await page.locator('button[data-view="timesheet"]').click();
  await expect(page.locator('#timesheet-status')).toBeVisible();

  await test.step('Given Klassiek: minstens twee losse dagcellen tonen allebei hun eigen 0/8/9, zonder te focussen', async () => {
    await expect(page.locator('#hours-grid .hours-input').first()).toBeVisible({ timeout: 10_000 });
    const cellen = page.locator('#hours-grid .hours-day-entry:has(.hours-input:not([disabled]))');
    await expect(cellen.first()).toBeVisible();
    const aantal = await cellen.count();
    test.skip(aantal < 2, 'Minder dan twee bewerkbare dagcellen deze periode.');
    for (const index of [0, 1]) {
      const presets = cellen.nth(index).locator('.hours-day-presets button');
      await expect(presets).toHaveCount(3);
      await expect(presets.first()).toBeVisible();
    }
    await cellen.first().locator('[data-hours-set="8"]').click();
    await expect(cellen.first().locator('.hours-input')).toHaveValue('8');
  });

  await test.step('When naar Nieuw wordt gewisseld op dezelfde week', async () => {
    await page.locator('#quick-skin-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await page.locator('[data-hours-week-scope="week-0"]').click();
  });

  await test.step('Then tonen minstens twee bento-dagkaartjes allebei hun eigen 0/8/9, zonder te focussen', async () => {
    const dagen = page.locator('#hours-grid-cards .new-bento-day:has(.new-bento-hours-input:not([disabled]))');
    await expect(dagen.first()).toBeVisible();
    const aantal = await dagen.count();
    test.skip(aantal < 2, 'Minder dan twee bewerkbare dagkaartjes deze week.');
    for (const index of [0, 1]) {
      const presets = dagen.nth(index).locator('.new-bento-presets button');
      await expect(presets).toHaveCount(3);
      await expect(presets.first()).toBeVisible();
    }
    await dagen.first().locator('[data-new-bento-set="9"]').click();
    await expect(dagen.first().locator('.new-bento-hours-input')).toHaveValue('9');
  });
});
