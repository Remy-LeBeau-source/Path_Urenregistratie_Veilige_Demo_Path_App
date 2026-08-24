import { expect, type Page } from '@playwright/test';

/**
 * Het profielmenu openen.
 *
 * Dit stond op drie plekken als een kale klik, en dat viel op een trage machine
 * om: de knop bestaat al voordat de app zijn klikafhandeling heeft gekoppeld.
 * Playwright ziet dan een geslaagde klik op een knop die nog niets doet, wacht
 * daarna 45 seconden op een menu dat nooit opengaat, en meldt een fout terwijl er
 * niets mis is met de app. Dat kostte een hele pipelineronde.
 *
 * De oplossing is niet langer wachten maar doen wat een mens doet: als het menu
 * niet opengaat, nog een keer klikken. Dit verzwakt geen enkele controle -- als het
 * menu werkelijk kapot is, gaat het ook na herhaalde klikken niet open en valt de
 * case alsnog om, alleen sneller en met een duidelijker verhaal.
 */
export async function openProfielmenu(page: Page): Promise<void> {
  const knop = page.locator('#profile-menu-button');
  const paneel = page.locator('#profile-menu');

  await expect(knop, 'de profielknop hoort in de topbalk te staan').toBeVisible();

  await expect(async () => {
    if (await paneel.isHidden()) {
      await knop.click();
    }
    await expect(paneel, 'het profielmenu hoort open te gaan na een klik op de profielknop').toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000, intervals: [250, 500, 1_000] });
}
