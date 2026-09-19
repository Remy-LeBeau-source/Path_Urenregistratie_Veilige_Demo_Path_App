import { expect, test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { LoginPage } from '../playwright/pages/LoginPage';

// Verkenning (buiten CI): WCAG 2.5.8 doelgrootte (minimaal). Elk zichtbaar
// bedieningselement is minstens 24 x 24 CSS-pixels, of heeft genoeg vrije ruimte
// eromheen (een cirkel van 24px rond het midden raakt geen ander doel). Tekstlinks
// midden in een zin zijn door de norm uitgezonderd, en elementen met pointer-events:
// none zijn geen doel (zoals de dagvakjes op telefoon, waar het weekvlak de knop is). Alle schermen, beide rollen,
// Klassiek en Modern. Rapport in verkenning-rapport/doelgrootte-*.json.

type Vondst = { scherm: string; skin: string; element: string; maat: string };

for (const rol of ['medewerker', 'beheer'] as const) {
  test(`[VERK-DOEL-${rol}] elk bedieningselement is groot genoeg om te raken`, async ({ page }, info) => {
    test.setTimeout(240_000);
    const loginPage = new LoginPage(page);
    await loginPage.open();
    if (rol === 'beheer') await loginPage.loginAsAdmin(); else await loginPage.loginAsEmployee();
    await expect(page.locator('#app-shell')).toBeVisible();
    const vondsten: Vondst[] = [];
    const schermen = await page.evaluate(() => [...document.querySelectorAll('.nav-item[data-view]')].map(b => b.getAttribute('data-view') || '').filter((v, i, a) => v && a.indexOf(v) === i));
    for (const skin of ['classic', 'new']) {
      await page.evaluate(s => {
        const staat = (0, eval)('state') as { preferences: { skin: string } };
        staat.preferences.skin = s;
        ((0, eval)('applySkin') as () => void)();
        ((0, eval)('renderAll') as () => void)();
      }, skin);
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin);
      for (const scherm of schermen) {
        await page.evaluate(v => { window.location.hash = v; }, scherm);
        await page.waitForTimeout(600);
        const klein = await page.evaluate(() => {
          const selector = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="switch"], [role="checkbox"]';
          const alle = [...document.querySelectorAll(selector)].filter(el => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && !el.closest('[hidden],[aria-hidden="true"]')
              && r.bottom > 0 && r.top < innerHeight * 3;
          });
          const vakken = alle.map(el => ({ el, r: el.getBoundingClientRect() }));
          const inZin = (el: Element) => el.tagName === 'A' && !!el.closest('p, li, td, dd') && (el.parentElement?.textContent || '').trim().length > (el.textContent || '').trim().length + 10;
          const uit: string[] = [];
          for (const { el, r } of vakken) {
            if (r.width >= 24 && r.height >= 24) continue;
            if (inZin(el)) continue;
            // Uitzondering "spacing": een cirkel van 24px rond het midden raakt geen ander doel.
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            const botst = vakken.some(o => o.el !== el && !o.el.contains(el) && !el.contains(o.el) && (() => {
              const dx = Math.max(o.r.left - cx, 0, cx - o.r.right);
              const dy = Math.max(o.r.top - cy, 0, cy - o.r.bottom);
              return Math.hypot(dx, dy) < 12;
            })());
            if (!botst) continue;
            const id = el.id ? `#${el.id}` : '';
            const klas = typeof (el as HTMLElement).className === 'string' && (el as HTMLElement).className ? '.' + (el as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join('.') : '';
            const tekst = ((el as HTMLElement).innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30);
            uit.push(`${el.tagName.toLowerCase()}${id}${klas} "${tekst}"|${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          return [...new Set(uit)];
        });
        for (const regel of klein) { const [element, maat] = regel.split('|'); vondsten.push({ scherm, skin, element, maat }); }
      }
    }
    mkdirSync('verkenning-rapport', { recursive: true });
    writeFileSync(`verkenning-rapport/doelgrootte-${info.project.name}-${rol}.json`, JSON.stringify(vondsten, null, 2));
    expect.soft(vondsten, 'bedieningselementen kleiner dan 24x24 zonder vrije ruimte').toEqual([]);
  });
}
