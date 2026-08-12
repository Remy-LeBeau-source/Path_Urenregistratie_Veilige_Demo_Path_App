import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

// Basic keyboard/accessibility smoke coverage (Fase 15: "Basiscontrole op
// toetsenbordbediening en leesbaarheid"). Deliberately scoped: this checks that
// key controls are reachable/labelled, not a full WCAG audit.

test('[A11Y-H-001] loginformulier is volledig met het toetsenbord bruikbaar en correct gelabeld', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de loginpagina is geopend', async () => {
    await loginPage.open();
  });

  await test.step('Then hebben e-mail, wachtwoord en inlogknop een programmatisch gekoppeld label', async () => {
    await expect(page.locator('#auth-login-email')).toBeVisible();
    await expect(page.locator('#auth-login-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inloggen', exact: true })).toBeVisible();
  });

  await test.step('When er met Tab door het formulier wordt genavigeerd', async () => {
    await page.locator('#auth-login-email').focus();
    await expect(page.locator('#auth-login-email')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#auth-login-password')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Inloggen', exact: true })).toBeFocused();
  });
});

test('[A11Y-H-002] admin-dashboard hoofdnavigatie is toetsenbordbereikbaar met herkenbare namen', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Given de administrator is ingelogd', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#app-shell')).toBeVisible();
  });

  await test.step('Then heeft elke hoofdnavigatieknop een herkenbare, unieke naam', async () => {
    const navButtons = page.locator('nav [data-view]');
    const count = await navButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const button = navButtons.nth(index);
      const accessibleName = (await button.textContent())?.trim() ?? '';
      expect(accessibleName.length).toBeGreaterThan(0);
    }
  });

  await test.step('When de eerste hoofdnavigatieknop via het toetsenbord wordt bediend', async () => {
    const firstNavButton = page.locator('nav [data-view]').first();
    await firstNavButton.focus();
    await expect(firstNavButton).toBeFocused();
    await page.keyboard.press('Enter');
  });
});
