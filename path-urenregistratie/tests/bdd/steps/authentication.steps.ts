import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';

Given('de lokale Path loginpagina beschikbaar is', async ({ loginPage, page }) => {
  await loginPage.open();
  await expect(page.locator('#login-environment-label')).toBeVisible();
});

Then('heet het omgevingsveld Veilige testomgeving', async ({ page }) => {
  await expect(page.locator('#login-environment-label')).toHaveText('Veilige testomgeving');
  await expect(page.locator('#local-account-login-tools')).toBeVisible();
});

Then('heet de lokale titel Welkom bij Uren & Facturatie', async ({ page }) => {
  await expect(page.locator('#login-title')).toHaveText('Welkom bij Uren & Facturatie');
});

When('dezelfde login als productiepresentatie wordt getoond', async ({ page }) => {
  await page.evaluate(() => {
    const runtime = window as typeof window & { applyLoginPresentation: (allowed: boolean) => void };
    runtime.applyLoginPresentation(false);
  });
});

Then('heten omgeving en titel Beveiligde omgeving en Inloggen', async ({ page }) => {
  await expect(page.locator('#login-environment-label')).toHaveText('Beveiligde omgeving');
  await expect(page.locator('#login-title')).toHaveText('Inloggen');
});
