import type { Page } from '@playwright/test';

// Sinds 15 sep zitten Herstel demo, Licht/Donker en Klassiek/Nieuw bij de
// medewerker in Klassiek op telefoonbreedte (tot 820px) achter de testpil
// #testbalk-open (zie [KLV-H-010]). Op desktop, bij beheer en in Modern staan ze
// nog gewoon in beeld.
//
// Eén helper voor alle specs, zodat een case niet per scherm hoeft te weten waar
// de knop staat: is de knop niet zichtbaar maar de pil wel, dan eerst de pil
// openen. Dezelfde knop, dezelfde id: de case toetst nog steeds de echte knop.
export async function openTestknoppen(page: Page): Promise<void> {
  const pil = page.locator('#testbalk-open');
  if (!(await pil.isVisible())) return;
  if ((await pil.getAttribute('aria-expanded')) !== 'true') await pil.click();
}

export async function klikTestknop(page: Page, selector: string): Promise<void> {
  const knop = page.locator(selector);
  if (!(await knop.isVisible())) await openTestknoppen(page);
  await knop.click();
}

// Na een controle het paneel weer dichtdoen: open ligt het (terecht) over de
// topbalk, en een volgende tik op bijvoorbeeld "Rol kiezen" raakt dan het paneel.
export async function sluitTestknoppen(page: Page): Promise<void> {
  const pil = page.locator('#testbalk-open');
  if ((await pil.isVisible()) && (await pil.getAttribute('aria-expanded')) === 'true') await page.keyboard.press('Escape');
}
