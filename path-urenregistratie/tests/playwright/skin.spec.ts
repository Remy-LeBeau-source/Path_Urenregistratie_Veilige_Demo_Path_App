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
  await openProfielmenu(page);
  await page.locator('[data-profile-action="preferences"]').click();
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
