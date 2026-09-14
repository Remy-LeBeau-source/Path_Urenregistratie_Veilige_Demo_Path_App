import { expect, type Page } from '@playwright/test';

// Kiest "Hele maand" in Mijn uren en bewijst dat die keuze staat voordat er
// ingediend wordt.
//
// Aanleiding (14 sep): in CI viel de klik op #submit-timesheet in [E2E-H-026]
// en [E2E-N-019] op mobile-safari 15 s vast, omdat die knop hidden + disabled
// stond -- hij verschijnt alleen bij scope "all". Twee verklaringen passen:
//  (a) de klik op "Hele maand" kwam niet aan (dezelfde WebKit-klikklasse als de
//      inlogknop: doorscrollen tussen indrukken en loslaten), of
//  (b) de keuze kwam aan maar werd later teruggezet (een render die de scope
//      overschrijft, zie [DASH-N-032]).
// Deze helper faalt direct en zegt welke van de twee het was, in plaats van
// 15 s later op een onzichtbare indienknop.
export async function kiesHeleMaand(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __heleMaandEvents?: string[] };
    w.__heleMaandEvents = [];
    for (const type of ['mousedown', 'mouseup', 'click']) {
      document.addEventListener(type, event => {
        const doel = event.target as Element | null;
        const opKnop = Boolean(doel?.closest?.('[data-hours-week-scope="all"]'));
        const knop = document.querySelector('[data-hours-week-scope="all"]')?.getBoundingClientRect();
        w.__heleMaandEvents?.push(`${type}@${opKnop ? 'heleMaand' : (doel?.id || doel?.tagName?.toLowerCase() || '?')}[sy${Math.round(scrollY)},kt${Math.round(knop?.top ?? -1)},my${Math.round((event as MouseEvent).clientY)}]`);
      }, { capture: true });
    }
  }).catch(() => undefined);

  const knop = page.locator('[data-hours-week-scope="all"]');
  await knop.click();

  const staat = async () => page.evaluate(() => ({
    events: (window as unknown as { __heleMaandEvents?: string[] }).__heleMaandEvents ?? null,
    knopActief: Boolean(document.querySelector('[data-hours-week-scope="all"].is-active')),
    indienknopZichtbaar: !(document.querySelector('#submit-timesheet') as HTMLButtonElement | null)?.hidden,
  })).catch(() => null);

  await expect(knop, 'de klik op "Hele maand" hoort die keuze actief te maken')
    .toHaveClass(/is-active/, { timeout: 5_000 })
    .catch(async error => {
      throw new Error(`${(error as Error).message}\nHele maand niet actief na klik: ${JSON.stringify(await staat())}`);
    });
  await expect(page.locator('#submit-timesheet'), 'bij "Hele maand" hoort de indienknop zichtbaar te zijn')
    .toBeVisible({ timeout: 5_000 })
    .catch(async error => {
      throw new Error(`${(error as Error).message}\nIndienknop weg terwijl Hele maand gekozen was: ${JSON.stringify(await staat())}`);
    });
}
