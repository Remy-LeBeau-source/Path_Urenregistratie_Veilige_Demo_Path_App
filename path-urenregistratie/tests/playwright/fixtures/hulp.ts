import { expect, type Page } from '@playwright/test';
import { openProfielmenu } from '../pages/TopbarMenu';

// Opent "Hulp & contact" zoals een gebruiker dat op deze breedte doet.
//
// Sinds 15 sep (besluit Gio) is er onder 821px geen zwevende hulpknop meer;
// hulp zit daar in het profielmenu. Op desktop blijft de zwevende knop. Deze
// helper kiest de route die op het scherm werkelijk bestaat, zodat dezelfde
// case op desktop en telefoon draait en op beide de echte ingang gebruikt.
export async function openHulp(page: Page): Promise<void> {
  const zwevend = page.locator('#help-launcher');
  if (await zwevend.isVisible()) {
    await zwevend.click();
  } else {
    await openProfielmenu(page);
    await page.locator('#profile-menu [data-profile-action="help"]').click();
  }
  await expect(page.locator('#help-panel')).toBeVisible();
}
