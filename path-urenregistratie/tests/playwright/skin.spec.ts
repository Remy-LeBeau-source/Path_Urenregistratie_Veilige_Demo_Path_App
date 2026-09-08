import { expect, test, type Locator } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { openProfielmenu } from './pages/TopbarMenu';

// Fase D — increment 1: de vormgevingsschakelaar ("skin").
// "classic" laat de bestaande app volledig ongemoeid; "new" activeert de
// regels in assets/styles-new.css (allemaal gescoped onder html[data-skin="new"]).
// Wisselen via Voorkeuren -> Vormgeving. In deze increment verandert er nog
// niets aan het uiterlijk; alleen de schakelaar en zijn persistentie worden
// hier vastgelegd.

// De <select> wordt in de modal opgewaardeerd naar een keuzemenu-widget
// (zoals #pref-theme). Bedienen gaat via #pref-skin-trigger + de optieknoppen.
async function kiesVormgeving(page: import('@playwright/test').Page, waarde: 'classic' | 'new'): Promise<void> {
  await expect(async () => {
    await openProfielmenu(page);
    const preferences = page.locator('[data-profile-action="preferences"]');
    await expect(preferences).toBeVisible({ timeout: 1_000 });
    await preferences.click();
    await expect(page.locator('#pref-skin-trigger')).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000, intervals: [250, 500, 1_000] });
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
    expect(vernieuwd.pathCanvas).toBe('#eae3d4');
    expect(vernieuwd.radius).toBe('22px');
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
  const loginPage = new LoginPage(page);

  await test.step('Given Backoffice is ingelogd en de dashboardgegevens zijn geladen', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#dashboard-employee-rows tr')).not.toHaveCount(0);
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
    await page.locator('[data-new-bento-open-hours]').click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('#timesheet-employee')).toHaveText(medewerker);
    await expect(page.locator('#view-dashboard')).toBeHidden();
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
