import { expect, test, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { LoginPage } from '../playwright/pages/LoginPage';

// Verkenning (buiten CI): WCAG 1.4.12 tekstafstand. Met regelhoogte 1.5, letter-
// afstand .12em, woordafstand .16em en alinea-afstand 2em mag geen tekst worden
// afgekapt. Per scherm wordt vergeleken wat er zonder en met die instellingen
// afgekapt is; alleen wat er bijkomt telt (bewuste ellipsis valt zo weg). Alle
// schermen, beide rollen, Klassiek en Modern, op de breedte van het project.

const AFSTAND = '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }';

async function afgekapt(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const uit: string[] = [];
    document.querySelectorAll('body *').forEach(el => {
      const h = el as HTMLElement;
      const cs = getComputedStyle(h);
      if (!h.offsetParent && cs.position !== 'fixed') return;
      if (h.closest('[hidden],[aria-hidden="true"]')) return;
      const eigenTekst = [...h.childNodes].some(n => n.nodeType === 3 && (n.textContent || '').trim().length > 1);
      if (!eigenTekst) return;
      const knip = (cs.overflowX !== 'visible' && h.scrollWidth > h.clientWidth + 1) || (cs.overflowY !== 'visible' && h.scrollHeight > h.clientHeight + 1);
      if (!knip) return;
      const id = h.id ? `#${h.id}` : '';
      const klas = typeof h.className === 'string' && h.className ? '.' + h.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      uit.push(`${h.tagName.toLowerCase()}${id}${klas} "${(h.textContent || '').trim().slice(0, 25)}"`);
    });
    return [...new Set(uit)];
  });
}

for (const rol of ['medewerker', 'beheer'] as const) {
  test(`[VERK-TEKST-${rol}] extra tekstafstand kapt geen tekst af`, async ({ page }, info) => {
    test.setTimeout(300_000);
    const loginPage = new LoginPage(page);
    await loginPage.open();
    if (rol === 'beheer') await loginPage.loginAsAdmin(); else await loginPage.loginAsEmployee();
    await expect(page.locator('#app-shell')).toBeVisible();
    const vondsten: Array<{ scherm: string; skin: string; nieuw: string[] }> = [];
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
        await page.waitForTimeout(500);
        const zonder = new Set(await afgekapt(page));
        await page.evaluate(css => { const s = document.createElement('style'); s.id = 'verk-afstand'; s.textContent = css; document.head.appendChild(s); }, AFSTAND);
        await page.waitForTimeout(150);
        const met = await afgekapt(page);
        await page.evaluate(() => document.getElementById('verk-afstand')?.remove());
        const nieuw = met.filter(x => !zonder.has(x));
        if (nieuw.length) vondsten.push({ scherm, skin, nieuw: nieuw.slice(0, 10) });
      }
    }
    mkdirSync('verkenning-rapport', { recursive: true });
    writeFileSync(`verkenning-rapport/tekstafstand-${info.project.name}-${rol}.json`, JSON.stringify(vondsten, null, 2));
    expect.soft(vondsten, 'tekst die pas met extra tekstafstand wordt afgekapt').toEqual([]);
  });
}
