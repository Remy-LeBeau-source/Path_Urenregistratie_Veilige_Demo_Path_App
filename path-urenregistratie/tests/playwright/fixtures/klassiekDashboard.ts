import { expect, type Page } from '@playwright/test';

// Scope rechtgezet 14 sep: in Klassiek op desktop (vanaf 721px) is het
// medewerkerdashboard het Vandaag-scherm uit handoff/medewerker-gui.html. Daar
// staan de open maanden als chips in "Nog te doen". Op telefoon, en in Modern,
// staat nog "Open acties per maand" met de volgende-actieknop.
//
// Deze helper kiest de route op basis van breedte en skin, niet op "wat
// toevallig zichtbaar is": dat laatste is vlak na het inloggen afhankelijk van
// hoe ver de eerste render is, en dan kiest een case stil de verkeerde weg.
export async function staatVandaagInBeeld(page: Page): Promise<boolean> {
  const breedte = page.viewportSize()?.width ?? 0;
  const skin = await page.locator('html').getAttribute('data-skin');
  return breedte >= 721 && skin !== 'new';
}

// Opent de urenactie (invullen of correctie) van één maand vanaf het
// medewerkerdashboard, via de route die op deze breedte bestaat. Beide routes
// toetsen eerst dat het om die maand en om een urenactie gaat, en eindigen op
// Mijn uren van die maand.
export async function openUrenactieVanMaand(page: Page, periodKey: string, verwacht: { chip: string | RegExp; knop: string | RegExp }): Promise<void> {
  if (await staatVandaagInBeeld(page)) {
    const chip = page.locator(`#vd-nogtedoen-chips [data-vd-open-maand="${periodKey}"]`);
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('data-vd-open-soort', 'uren');
    await expect(chip).toContainText(verwacht.chip);
    await chip.click();
  } else {
    const maand = page.locator(`[data-employee-open-month="${periodKey}"]`);
    await expect(maand).toBeVisible();
    const body = maand.locator('.employee-open-month-body');
    if (await body.isHidden()) await maand.locator('[data-employee-open-month-toggle]').click();
    const actie = maand.locator('[data-employee-open-action="hours"]');
    await expect(actie).toContainText(verwacht.knop);
    await expect(actie).toHaveAttribute('data-period-key', periodKey);
    await actie.click();
  }
  await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
}
