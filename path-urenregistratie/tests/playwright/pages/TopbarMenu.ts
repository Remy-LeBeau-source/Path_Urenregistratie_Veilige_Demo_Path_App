import { expect, type Page } from '@playwright/test';

/**
 * Een paneel openen dat pas verschijnt nadat je op zijn opener klikt.
 *
 * Dit patroon viel op 2026-08-24 twee keer om in de pipeline: de knop bestaat al
 * voordat de app zijn klikafhandeling eraan heeft gekoppeld. Playwright ziet dan een
 * geslaagde klik op een knop die nog niets doet, wacht daarna tot de tijd om is op
 * een paneel dat nooit opengaat, en meldt een fout terwijl er niets mis is met de
 * app. Dat kostte een hele pipelineronde.
 *
 * De oplossing is niet langer wachten maar doen wat een mens doet: gaat het niet
 * open, klik dan nog eens. Dit verzwakt geen enkele controle -- is het paneel
 * werkelijk kapot, dan gaat het ook na herhaald klikken niet open en valt de case
 * alsnog om, alleen sneller en met een duidelijker verhaal.
 */
export async function openPaneel(page: Page, opener: string, paneel: string): Promise<void> {
  const knop = page.locator(opener);
  const doel = page.locator(paneel);

  await expect(knop, 'de opener ' + opener + ' hoort te bestaan').toBeVisible();

  await expect(async () => {
    if (await doel.isHidden()) {
      await knop.click();
    }
    await expect(doel, paneel + ' hoort open te gaan na een klik op ' + opener)
      .toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000, intervals: [250, 500, 1_000] });
}

/** Het profielmenu in de topbalk. */
export async function openProfielmenu(page: Page): Promise<void> {
  await openPaneel(page, '#profile-menu-button', '#profile-menu');
}
