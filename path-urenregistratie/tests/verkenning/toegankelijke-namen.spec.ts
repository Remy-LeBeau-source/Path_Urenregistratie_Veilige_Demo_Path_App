import { expect, test, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { LoginPage } from '../playwright/pages/LoginPage';

// Verkenning (buiten CI): heeft elk zichtbaar bedieningselement in Klassiek een
// toegankelijke naam (WCAG 4.1.2)? Loopt alle schermen langs voor medewerker en
// beheer, in Klassiek en Modern, licht en donker. Rapport in verkenning-rapport/toegankelijke-namen-*.json.

type Vondst = { scherm: string; skin: string; thema: string; element: string };

async function zonderNaam(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const zichtbaar = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden],[aria-hidden="true"]');
    };
    const naam = (el: Element): string => {
      const aria = el.getAttribute('aria-label');
      if (aria && aria.trim()) return aria.trim();
      const door = el.getAttribute('aria-labelledby');
      if (door) {
        const t = door.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
        if (t) return t;
      }
      const id = el.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label && label.textContent && label.textContent.trim()) return label.textContent.trim();
      }
      const omhullend = el.closest('label');
      if (omhullend && omhullend.textContent && omhullend.textContent.trim()) return omhullend.textContent.trim();
      if (el instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(el.type) && el.value.trim()) return el.value.trim();
      if (el instanceof HTMLImageElement) return (el.alt || '').trim();
      const tekst = (el as HTMLElement).innerText || '';
      if (tekst.trim()) return tekst.trim();
      const img = el.querySelector('img[alt]:not([alt=""])');
      if (img) return img.getAttribute('alt') || '';
      const svgTitel = el.querySelector('svg title');
      if (svgTitel && svgTitel.textContent) return svgTitel.textContent.trim();
      const titel = el.getAttribute('title');
      if (titel && titel.trim()) return titel.trim();
      if (el instanceof HTMLInputElement && el.placeholder) return el.placeholder.trim();
      return '';
    };
    const selector = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';
    const uit: string[] = [];
    document.querySelectorAll(selector).forEach(el => {
      if (!zichtbaar(el) || naam(el)) return;
      const id = el.id ? `#${el.id}` : '';
      const klas = typeof (el as HTMLElement).className === 'string' && (el as HTMLElement).className ? '.' + (el as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      const data = [...el.attributes].filter(a => a.name.startsWith('data-')).slice(0, 2).map(a => `[${a.name}]`).join('');
      uit.push(`${el.tagName.toLowerCase()}${id}${klas}${data}`);
    });
    return [...new Set(uit)];
  });
}

for (const rol of ['medewerker', 'beheer'] as const) {
  test(`[VERK-A11Y-${rol}] elk zichtbaar bedieningselement heeft een toegankelijke naam`, async ({ page }, info) => {
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
    for (const thema of ['light', 'dark']) {
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), thema);
      for (const scherm of schermen) {
        await page.evaluate(v => { window.location.hash = v; }, scherm);
        await page.waitForTimeout(600);
        for (const element of await zonderNaam(page)) vondsten.push({ scherm, skin, thema, element });
      }
    }
    }
    mkdirSync('verkenning-rapport', { recursive: true });
    writeFileSync(`verkenning-rapport/toegankelijke-namen-${info.project.name}-${rol}.json`, JSON.stringify(vondsten, null, 2));
    expect.soft(vondsten, 'bedieningselementen zonder toegankelijke naam').toEqual([]);
  });
}
