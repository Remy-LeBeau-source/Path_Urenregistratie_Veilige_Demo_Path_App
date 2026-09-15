import type { Page } from '@playwright/test';
import { openProfielmenu } from '../pages/TopbarMenu';

// Sinds 15 sep (Gio: "op TEST zoveel mogelijk PROD") staan Licht/Donker en
// Klassiek/Modern in het profielmenu onder "Testfuncties" (zie [KLV-H-010]).
// Herstel demo blijft zichtbaar bovenin.
//
// Eén helper voor alle specs, zodat een case niet hoeft te weten waar een testknop
// staat: is de knop niet zichtbaar, dan eerst het profielmenu openen. Dezelfde knop,
// dezelfde id: de case toetst nog steeds de echte knop.
export async function openTestknoppen(page: Page): Promise<void> {
  if (await page.locator('#profile-menu').isVisible()) return;
  await openProfielmenu(page);
}

export async function klikTestknop(page: Page, selector: string): Promise<void> {
  const knop = page.locator(selector);
  const viaMenu = !(await knop.isVisible());
  if (viaMenu) await openTestknoppen(page);
  await knop.click();
  // Zelf geopend, dan ook zelf weer dicht: een open menu ligt anders over de
  // herstelknop of de rolwissel die de case daarna aanklikt (DASH-N-010, 15 sep).
  if (viaMenu) await sluitTestknoppen(page);
}

// Na een controle het menu weer dichtdoen: open ligt het over de pagina, en een
// volgende tik (bijvoorbeeld op "Rol kiezen") raakt dan het menu.
export async function sluitTestknoppen(page: Page): Promise<void> {
  if (await page.locator('#profile-menu').isVisible()) await page.keyboard.press('Escape');
}
