import { expect, test } from '@playwright/test';
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

test('[SKIN-H-005] de topbar wisselt licht/donker en klassiek/nieuw direct en persistent', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given een ingelogde administrator met de standaardvoorkeuren', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  await test.step('When beide directe schakelaars eenmaal worden gebruikt', async () => {
    await page.locator('#quick-theme-toggle').click();
    await page.locator('#quick-skin-toggle').click();
  });

  await test.step('Then zijn donker en nieuw actief en blijven beide na herladen bewaard', async () => {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
    await expect(page.locator('#quick-theme-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#quick-skin-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#quick-theme-toggle')).toContainText('Donker');
    await expect(page.locator('#quick-skin-toggle')).toContainText('Nieuw');
    await page.reload();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'new');
  });
});

test('[SKIN-H-006] de echte medewerkerroute toont de live bento en blijft mobiel bedienbaar', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));
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
    await expect(page.locator('[data-new-bento-submit]')).toContainText('Hele maand indienen');
    await expect(page.locator('[data-new-bento-save]')).toHaveAttribute('title', /Bewaar/);
    await expect(page.locator('[data-new-bento-submit]')).toHaveAttribute('title', /alle weken/);
    await expect(page.locator('[data-new-bento-customer]')).toHaveAttribute('title', /Upload/);
    await expect(page.locator('.app-footer')).toContainText('Ontwikkeld en beheerd door Team Path');
    await expect(page.locator('.app-footer-version')).toHaveText(/Versie \d+\.\d+\.\d+/);
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
