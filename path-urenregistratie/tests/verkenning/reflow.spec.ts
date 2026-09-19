import { expect, test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { LoginPage } from '../playwright/pages/LoginPage';

// Verkenning (buiten CI): WCAG 1.4.10 reflow. Op 320 CSS-pixels breed (400% zoom)
// hoort geen scherm horizontaal te schuiven. Inhoud die bewust in een eigen
// scrollvak staat (overflow-x auto/scroll, zoals een brede tabel) telt niet mee;
// wat daarbuiten voorbij de rechterrand steekt wel. Alle schermen, beide rollen,
// Klassiek en Modern, licht thema. Rapport in verkenning-rapport/reflow-*.json.

type Vondst = { scherm: string; skin: string; paginaBreed: number; uitstekers: string[] };

for (const rol of ['medewerker', 'beheer'] as const) {
  test(`[VERK-REFLOW-${rol}] op 320px schuift geen scherm horizontaal`, async ({ page }, info) => {
    test.setTimeout(240_000);
    const loginPage = new LoginPage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await loginPage.open();
    if (rol === 'beheer') await loginPage.loginAsAdmin(); else await loginPage.loginAsEmployee();
    await expect(page.locator('#app-shell')).toBeVisible();
    await page.setViewportSize({ width: 320, height: 800 });
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
        const meting = await page.evaluate(() => {
          const rand = document.documentElement.clientWidth;
          const inScrollvak = (el: Element) => {
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
              const ox = getComputedStyle(p).overflowX;
              if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
            }
            return false;
          };
          const uit: string[] = [];
          document.querySelectorAll('body *').forEach(el => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.position === 'fixed') return;
            if (r.right <= rand + 1 || inScrollvak(el)) return;
            if (el.closest('[hidden],[aria-hidden="true"]')) return;
            const id = el.id ? `#${el.id}` : '';
            const klas = typeof (el as HTMLElement).className === 'string' && (el as HTMLElement).className ? '.' + (el as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join('.') : '';
            uit.push(`${el.tagName.toLowerCase()}${id}${klas} +${Math.round(r.right - rand)}px`);
          });
          return { paginaBreed: document.documentElement.scrollWidth, uitstekers: [...new Set(uit)].slice(0, 12) };
        });
        if (meting.paginaBreed > 320 || meting.uitstekers.length) vondsten.push({ scherm, skin, ...meting });
      }
    }
    mkdirSync('verkenning-rapport', { recursive: true });
    writeFileSync(`verkenning-rapport/reflow-${info.project.name}-${rol}.json`, JSON.stringify(vondsten, null, 2));
    expect.soft(vondsten, 'schermen die op 320px horizontaal schuiven of inhoud buiten de rand hebben').toEqual([]);
  });
}
