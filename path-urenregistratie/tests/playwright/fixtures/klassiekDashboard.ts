import { expect, type Page } from '@playwright/test';
import { openPaneel } from '../pages/TopbarMenu';

// Scope rechtgezet 14 sep: in Klassiek is het medewerkerdashboard het
// Vandaag-scherm. Op desktop (vanaf 721px) volgens handoff/medewerker-gui.html,
// met de open maanden als chips in "Nog te doen". Op telefoon volgens
// handoff/medewerker-wild.html: geen chips, de hero volgt de gekozen maand.
// Alleen Modern heeft nog "Open acties per maand" met de volgende-actieknop.
//
// Deze helpers kiezen de route op basis van breedte en skin, niet op "wat
// toevallig zichtbaar is": dat laatste is vlak na het inloggen afhankelijk van
// hoe ver de eerste render is, en dan kiest een case stil de verkeerde weg.
export type DashboardRoute = 'chips' | 'telefoon' | 'modern';

export async function dashboardRoute(page: Page): Promise<DashboardRoute> {
  const skin = await page.locator('html').getAttribute('data-skin');
  if (skin === 'new') return 'modern';
  return (page.viewportSize()?.width ?? 0) >= 721 ? 'chips' : 'telefoon';
}

// Waar: Vandaag op desktop, met de chips in "Nog te doen".
export async function staatVandaagInBeeld(page: Page): Promise<boolean> {
  return (await dashboardRoute(page)) === 'chips';
}

// Opent de urenactie (invullen of correctie) van één maand vanaf het
// medewerkerdashboard, via de route die op deze breedte bestaat. Elke route
// toetst eerst dat het om die maand en om een urenactie gaat, en eindigt op
// Mijn uren van die maand.
export async function openUrenactieVanMaand(page: Page, periodKey: string, verwacht: { chip: string | RegExp; knop: string | RegExp }): Promise<void> {
  const route = await dashboardRoute(page);
  const gekozen = await page.evaluate(() => ((0, eval)('currentPeriod') as () => { key: string })().key);
  if (route === 'chips' && gekozen === periodKey) {
    // De gekozen maand staat niet als pil onder "Eerdere maanden" maar in de
    // kopkaart zelf; daar is de hoofdknop de weg naar de urenactie.
    const knop = page.locator('#vd-hoofdknop');
    await expect(knop).toHaveAttribute('data-vd-actie', 'uren');
    await knop.click();
  } else if (route === 'chips') {
    const chip = page.locator(`#vd-nogtedoen-chips [data-vd-open-maand="${periodKey}"]`);
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('data-vd-open-soort', 'uren');
    await expect(chip).toContainText(verwacht.chip);
    await chip.click();
  } else if (route === 'telefoon') {
    // Telefoon: eerst de maand kiezen met de maandpil; de hero volgt die maand
    // en de hoofdknop wijst dan naar de urenactie van precies die maand.
    const [jaar, maandNr] = periodKey.split('-');
    await openPaneel(page, '#period-month-picker', '#period-month-panel');
    await page.locator('#period-year-picker').fill(jaar);
    await page.locator(`#period-month-panel [data-period-month="${maandNr}"][data-month-control="#period-month-picker"]`).click();
    const maandNaam = new Date(Number(jaar), Number(maandNr) - 1, 1).toLocaleString('nl-NL', { month: 'long' });
    await expect(page.locator('#vdt-verloop-kop')).toHaveText(`Verloop van ${maandNaam}`);
    const knop = page.locator('#vdt-hoofdknop');
    await expect(knop).toBeVisible();
    await expect(knop).toHaveAttribute('data-vd-actie', 'uren');
    await knop.click();
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
