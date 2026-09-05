import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

// De 1919-pilot is een losstaande statische pagina onder /pilot/. Deze case
// bewaakt precies wat de opzet belooft: de pilot is bereikbaar als eigen URL
// EN de echte app blijft daarnaast gewoon werken -- de pilot deelt geen code,
// routing of data met de app, dus "de rest valt niet om".
test('[PILOT-H-001] de 1919-pilot leeft als losse URL naast een ongewijzigde app', async ({ page }) => {
  let response: Awaited<ReturnType<typeof page.goto>> = null;

  await test.step('Given de webroot met de app op /', async () => {
    // De pilot mag pas iets betekenen als de app er los van bestaat.
  });

  await test.step('When de losstaande pilot-URL wordt opgevraagd', async () => {
    response = await page.goto('/pilot/1919-medewerker.html');
    expect(response?.status(), 'de pilot hoort als statisch bestand geserveerd te worden').toBe(200);
  });

  await test.step('Then toont hij de 1919-storyline-inhoud met de pilot-vlag', async () => {
    await expect(page.locator('.pilot-flag')).toContainText('PILOT');
    await expect(page.locator('.pilot-flag')).toContainText('niet de echte app');
    await expect(page.locator('.hero h1')).toHaveText('Je maand begint');
    await expect(page.locator('.chapter.navy h2')).toHaveText('Vul je uren in');
    await expect(page.locator('.week .day')).toHaveCount(6);
    // Geen enkele verwijzing naar de app-bundels: de pilot staat echt los.
    await expect(page.locator('link[href*="assets/styles.css"], script[src*="assets/app.js"]')).toHaveCount(0);
  });

  await test.step('And de echte app blijft er onaangeroerd naast draaien', async () => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(page.locator('#login-screen')).toBeVisible();
    await loginPage.loginAsEmployee();
    await expect(page.locator('#app-shell')).toBeVisible();
    await loginPage.logout();
  });
});
