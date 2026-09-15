import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { LoginPage } from '../playwright/pages/LoginPage';

// Seeded monkey testing op de medewerker in Klassiek. Zie
// playwright.verkenning.config.ts voor waarom dit buiten de regressie staat.
//
// Werkwijze per seed: inloggen als medewerker, thema kiezen (oneven seed licht,
// even seed donker), en dan MONKEY_STAPPEN willekeurige handelingen. Na elke
// handeling worden invarianten gecontroleerd die in Klassiek ALTIJD moeten
// gelden, ongeacht wat er aangeklikt is. De willekeur komt uit een vaste seed,
// dus een vondst is met dezelfde seed te herhalen; het handelingenlogboek staat
// in verkenning-rapport/.
//
// Harde invarianten (case faalt):
//   H1 geen JavaScript-fout (pageerror) en geen console.error
//   H2 geen serverfout (HTTP 5xx) op een app-verzoek
//   H3 precies één actief scherm (.view.is-active)
//   H4 geen kapotte waarde in beeld: undefined, NaN, null, [object Object], Invalid Date
//   H5 de sessie blijft bestaan: geen onverwacht inlogscherm
//   H6 het actieve menu-item hoort bij het actieve scherm
//   H7 de paginatitel is niet leeg (Vandaag uitgezonderd: daar valt hij bewust weg)
//   H8 geen "door iemand anders gewijzigd" in beeld terwijl er maar één medewerker in één tabblad werkt
// Een andere 4xx (terechte weigering, bv. >24 uur) is een zachte bevinding met de
// foutcode van de server erbij.
// Zachte bevindingen (gelogd, case faalt niet): inhoud buiten de rechterrand.

function prng(seed: number): () => number {
  // mulberry32: klein, snel en deterministisch.
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedsUitOmgeving(): number[] {
  const raw = String(process.env.MONKEY_SEEDS || '1-3').trim();
  const seeds = new Set<number>();
  for (const deel of raw.split(',')) {
    const [van, tot] = deel.split('-').map(Number);
    if (Number.isFinite(van) && Number.isFinite(tot)) for (let s = van; s <= tot; s++) seeds.add(s);
    else if (Number.isFinite(van)) seeds.add(van);
  }
  return [...seeds];
}

const STAPPEN = Number(process.env.MONKEY_STAPPEN || 120);

// Rommelinvoer: equivalentieklassen en grenswaarden die een formulierveld moet
// verdragen zonder de app te breken.
const ROMMEL = [
  '', ' ', '0', '-1', '24', '24,01', '99999', '1e9', '0,5', '7.5', '8,25', 'abc', '--',
  '<img src=x onerror="window.__xss=1">', '"; DROP TABLE users; --', '😀🎉', 'ﷺ', 'a'.repeat(300),
  '‮omgekeerd', 'NaN', 'undefined',
];

// Wat de monkey nooit aanraakt: uitloggen en "Andere rol kiezen" (beide brengen je
// bewust naar het inlogscherm, dan stopt de verkenning), downloads en
// externe links (verlaten de app of openen een bestand), en de schakelaar naar
// Modern (dit is een Klassiek-verkenning).
const UITGESLOTEN = [
  '[data-profile-action="logout"]',
  '#logout-button',
  '#switch-role',
  '#mobile-switch-role',
  'a[target="_blank"]',
  'a[download]',
  '[data-standard-choice-value="new"]',
].join(', ');

type Handeling = { stap: number; soort: string; doel?: string; waarde?: string; scherm?: string };

async function invarianten(page: Page): Promise<{ hard: string[]; zacht: string[] }> {
  return page.evaluate(() => {
    const hard: string[] = [];
    const zacht: string[] = [];
    const actief = document.querySelectorAll('.view.is-active');
    if (actief.length !== 1) hard.push(`H3 ${actief.length} actieve schermen`);
    const inlog = document.querySelector('#login-screen');
    if (inlog && !inlog.hasAttribute('hidden') && getComputedStyle(inlog).display !== 'none') hard.push('H5 inlogscherm zichtbaar, sessie kwijt');
    const tekst = document.body.innerText || '';
    const kapot = tekst.match(/\b(undefined|NaN|null|Invalid Date)\b|\[object Object\]/g);
    if (kapot) hard.push(`H4 kapotte waarde in beeld: ${[...new Set(kapot)].join(', ')}`);
    if ((window as unknown as { __xss?: number }).__xss) hard.push('H4 ingevoerde HTML is uitgevoerd (XSS)');
    const scherm = document.body.dataset.scherm || '';
    const actiefMenu = Array.from(document.querySelectorAll<HTMLElement>('.nav-item.is-active')).filter(n => n.offsetParent !== null);
    if (actief.length === 1 && actiefMenu.some(n => n.dataset.view && n.dataset.view !== scherm)) {
      hard.push(`H6 menu wijst ${actiefMenu.map(n => n.dataset.view).join('/')} aan terwijl scherm ${scherm} actief is`);
    }
    const opslagStatus = document.querySelector('#hours-autosave-status')?.textContent || '';
    const meldingen = Array.from(document.querySelectorAll('.toast, [role="status"], [role="alert"]')).map(t => t.textContent || '').join(' ');
    if (/door iemand anders gewijzigd/i.test(opslagStatus + ' ' + meldingen)) hard.push('H8 "door iemand anders gewijzigd" in beeld bij één medewerker');
    const titel = document.querySelector('#page-title');
    if (titel && scherm && !['employee-dashboard'].includes(scherm) && !(titel.textContent || '').trim()) hard.push(`H7 lege paginatitel op ${scherm}`);
    const breedte = window.innerWidth;
    const inScroller = (el: Element) => {
      for (let o = el.parentElement; o && o !== document.body; o = o.parentElement) {
        const ox = getComputedStyle(o).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
      }
      return false;
    };
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.right <= breedte + 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.position === 'fixed' || el.closest('[hidden]')) continue;
      if (inScroller(el)) continue;
      zacht.push(`buiten rechterrand: ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} (${Math.round(r.right)}>${breedte})`);
      if (zacht.length > 5) break;
    }
    return { hard, zacht };
  });
}

async function kandidaten(page: Page, uitgesloten: string): Promise<string[]> {
  // Geeft een unieke selector per zichtbaar, bedienbaar element terug. De
  // volgorde is documentvolgorde, dus bij gelijke toestand is de keuze gelijk.
  return page.evaluate(uit => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(
      'button, a[href], [role="tab"], [role="button"], input:not([type="hidden"]), select, textarea, summary, [data-view]',
    ));
    const result: string[] = [];
    els.forEach((el, i) => {
      if (el.matches(uit) || el.closest(uit)) return;
      if ((el as HTMLButtonElement).disabled) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (r.bottom < 0 || r.top > window.innerHeight * 3) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || el.closest('[hidden]')) return;
      el.setAttribute('data-monkey', String(i));
      result.push(`[data-monkey="${i}"]`);
    });
    return result;
  }, uitgesloten);
}

async function beschrijf(page: Page, selector: string): Promise<string> {
  return page.locator(selector).first().evaluate(el => {
    const h = el as HTMLElement;
    const label = (h.getAttribute('aria-label') || h.innerText || (h as HTMLInputElement).placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${h.tagName.toLowerCase()}${h.id ? '#' + h.id : ''} "${label}"`;
  }).catch(() => selector);
}

for (const seed of seedsUitOmgeving()) {
  test(`[VERK-${seed}] monkey op de medewerker in Klassiek blijft heel (seed ${seed})`, async ({ page }, testInfo) => {
    const rnd = prng(seed * 7919 + (testInfo.project.name.includes('telefoon') ? 1 : 0));
    const kies = <T>(lijst: T[]): T => lijst[Math.floor(rnd() * lijst.length)];
    const fouten: string[] = [];
    const log: Handeling[] = [];
    const zachteBevindingen = new Map<string, number>();

    const getypt = new Set<string>();
    // Netwerklogboek van de urenstaat: bij een vondst wil je weten welke versie de
    // app meestuurde en wat de server teruggaf, niet alleen welke knop er viel.
    const netlog: string[] = [];
    let stapNu = 0;
    const netNoteer = (regel: string) => { netlog.push(`${stapNu} ${regel}`); if (netlog.length > 30) netlog.shift(); };
    page.on('request', r => {
      if (!r.url().includes('/server/api/timesheets.php') && !r.url().includes('/server/api/test-reset.php')) return;
      const body = r.method() === 'POST' ? (r.postDataJSON() as { action?: string; expected_version?: number } | null) : null;
      netNoteer(`-> ${r.method()} ${new URL(r.url()).pathname.split('/').pop()} ${body ? `${body.action} expected=${body.expected_version}` : ''}`);
    });
    page.on('pageerror', e => fouten.push(`H1 pageerror: ${String(e).slice(0, 300)}`));
    // "Failed to load resource" is de browser die een 4xx/5xx-response nog eens in
    // de console zet. Die beoordelen we via de response zelf (hieronder), met de
    // foutcode van de server erbij, anders is elke terechte weigering een "fout".
    page.on('console', m => {
      if (m.type() !== 'error' || /Failed to load resource: the server responded with a status of 4\d\d/.test(m.text())) return;
      fouten.push(`H1 console.error: ${m.text().slice(0, 300)}`);
    });
    page.on('response', async r => {
      if (!r.url().includes('/server/')) return;
      const pad = `${r.request().method()} ${new URL(r.url()).pathname}`;
      if (r.status() >= 500) { fouten.push(`H2 ${r.status()} op ${pad}`); return; }
      if (r.status() < 400) {
        if (r.url().includes('/server/api/timesheets.php')) {
          const ok = await r.json().catch(() => ({})) as { timesheet?: { version?: number } };
          netNoteer(`<- ${r.status()} versie=${ok.timesheet?.version}`);
        }
        return;
      }
      const body = await r.json().catch(() => ({})) as { error?: string; message?: string };
      if (r.url().includes('/server/api/timesheets.php')) netNoteer(`<- ${r.status()} ${body.error || ''}`);
      const sleutel = `${r.status()} ${body.error || '?'} op ${pad}: ${String(body.message || '').slice(0, 90)}`;
      // H8: één medewerker in één tabblad kan niet "door iemand anders" achterhaald
      // zijn. Een stale-version hier is de app die met zichzelf botst.
      // Een 409 in het netwerk is nog geen fout: de app herstelt een achterhaald eigen
      // concept zelf (KLV-N-004). H8 kijkt daarom naar wat de medewerker ziet.
      zachteBevindingen.set(sleutel, (zachteBevindingen.get(sleutel) || 0) + 1);
    });
    // "Pagina verlaten?" (beforeunload) altijd accepteren: de app vraagt dat bewust
    // bij een nog niet opgeslagen concept (E2E-H-028). Blijven laat page.reload()
    // eindeloos wachten op een navigatie die nooit komt -- seed 1 hing zo 15 min.
    page.on('dialog', d => { (d.type() === 'beforeunload' || rnd() < 0.5 ? d.accept() : d.dismiss()).catch(() => undefined); });

    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
    const thema = seed % 2 === 0 ? 'dark' : 'light';
    await page.evaluate(t => {
      const s = (0, eval)('state') as { preferences: Record<string, unknown> };
      s.preferences.theme = t;
      ((0, eval)('applyTheme') as () => void)();
    }, thema);

    const telefoon = testInfo.project.name.includes('telefoon');
    const breedtes = [360, 390, 720, 721, 768, 820, 821, 1024, 1280, 1440];
    const rapport = () => {
      // Niet in outputDir: Playwright maakt die bij elke run leeg.
      const dir = join(process.cwd(), 'verkenning-rapport');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${testInfo.project.name}-seed-${seed}.json`), JSON.stringify({
        seed, project: testInfo.project.name, thema, stappen: log.length, fouten, netlog,
        zachteBevindingen: Object.fromEntries(zachteBevindingen), log,
      }, null, 2));
    };

    try {
      for (let stap = 1; stap <= STAPPEN; stap++) {
        stapNu = stap;
        const scherm = await page.evaluate(() => document.body.dataset.scherm || '');
        const worp = rnd();
        const h: Handeling = { stap, soort: '', scherm };
        try {
          if (worp < 0.62) {
            const lijst = await kandidaten(page, UITGESLOTEN);
            if (!lijst.length) { h.soort = 'geen-kandidaten'; }
            else {
              const doel = kies(lijst);
              h.doel = await beschrijf(page, doel);
              const el = page.locator(doel).first();
              const tag = await el.evaluate(x => `${x.tagName}:${(x as HTMLInputElement).type || ''}`);
              if (/^INPUT:number$/i.test(tag)) {
                // fill() weigert niet-numerieke tekst; een gebruiker kan hem wel
                // intikken. Dus echt typen: selecteren, wissen, toetsaanslagen.
                h.soort = 'typ-getal';
                h.waarde = kies(ROMMEL).slice(0, 12);
                await el.click({ timeout: 2_000 });
                await page.keyboard.press('ControlOrMeta+A');
                await page.keyboard.press('Backspace');
                await page.keyboard.type(h.waarde);
                if (rnd() < 0.5) await el.press(rnd() < 0.5 ? 'Enter' : 'Tab');
              } else if (/^(INPUT:(text|search|email|tel|password|date|month|time|)|TEXTAREA:)/i.test(tag)) {
                h.soort = 'typ';
                h.waarde = kies(ROMMEL);
                await el.fill(h.waarde, { timeout: 2_000 });
                if (rnd() < 0.5) await el.press(rnd() < 0.5 ? 'Enter' : 'Tab');
              } else if (tag.startsWith('SELECT')) {
                h.soort = 'kies-optie';
                const opties = await el.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value));
                if (opties.length) { h.waarde = kies(opties); await el.selectOption(h.waarde, { timeout: 2_000 }); }
              } else {
                h.soort = telefoon ? 'tik' : 'klik';
                if (telefoon) await el.tap({ timeout: 2_000 }); else await el.click({ timeout: 2_000 });
              }
            }
          } else if (worp < 0.72) {
            h.soort = 'toets';
            h.waarde = kies(['Escape', 'Tab', 'Enter', 'Space', 'ArrowDown', 'ArrowRight', 'Shift+Tab']);
            await page.keyboard.press(h.waarde);
          } else if (worp < 0.80) {
            h.soort = 'scroll';
            await page.mouse.wheel(0, Math.round((rnd() - 0.3) * 1500));
          } else if (worp < 0.86 && !telefoon) {
            const b = kies(breedtes);
            h.soort = 'breedte';
            h.waarde = String(b);
            await page.setViewportSize({ width: b, height: b < 721 ? 844 : 900 });
          } else if (worp < 0.91) {
            h.soort = 'terug';
            await page.goBack({ timeout: 5_000 }).catch(() => undefined);
            // Terug vóór het eerste bezoek verlaat de app (about:blank). Dat is de
            // browser, geen app-fout (onderzocht 15 sep): weer vooruit en doorgaan.
            if (!page.url().startsWith(new URL(testInfo.project.use.baseURL || 'http://localhost:8000').origin)) {
              h.soort = 'terug-uit-app-en-weer-vooruit';
              await page.goForward({ timeout: 10_000 }).catch(() => undefined);
              await page.waitForFunction(() => document.querySelectorAll('.view.is-active').length === 1, null, { timeout: 20_000 }).catch(() => undefined);
            }
          } else if (worp < 0.94) {
            h.soort = 'herladen';
            await page.reload({ timeout: 20_000 });
            await page.waitForFunction(() => document.querySelectorAll('.view.is-active').length === 1, null, { timeout: 20_000 });
          } else if (worp < 0.97) {
            h.soort = 'thema-wissel';
            const knop = page.locator('#quick-theme-toggle');
            if (await knop.isVisible()) await knop.click({ timeout: 2_000 });
          } else {
            h.soort = 'navigeer-hash';
            h.waarde = kies(['employee-dashboard', 'timesheet', 'historie', 'employee-announcements', 'customer-timesheet', 'dashboard', 'settings', 'onbekend']);
            await page.evaluate(v => { window.location.hash = v; }, h.waarde);
          }
        } catch (e) {
          // Een element dat net verdween of bedekt is, is geen fout van de app;
          // de monkey gaat door. Alleen de invarianten beslissen.
          h.soort = `${h.soort || 'handeling'}-overgeslagen`;
          h.waarde = `${h.waarde ?? ''} (${String((e as Error).message).split('\n')[0].slice(0, 80)})`;
        }
        log.push(h);
        await page.waitForTimeout(60);

        const { hard, zacht } = await invarianten(page).catch(() => ({ hard: ['H3 pagina niet leesbaar na handeling'], zacht: [] }));
        for (const z of zacht) zachteBevindingen.set(z, (zachteBevindingen.get(z) || 0) + 1);
        // Tekst die de monkey zelf intypte en die de app netjes terugtoont
        // ("Geen resultaten voor NaN") is geen kapotte waarde.
        if (h.waarde) getypt.add(h.waarde.trim());
        fouten.push(...hard.filter(x => !(x.startsWith('H4 kapotte waarde') && [...getypt].some(t => /^(NaN|undefined|null)$/.test(t) && x.includes(t)))).map(x => `${x} (na stap ${stap}: ${h.soort} ${h.doel ?? ''} ${h.waarde ?? ''})`));
        if (fouten.length) break;
      }
    } finally {
      rapport();
    }

    expect(fouten, `Seed ${seed} (${thema}) brak een invariant. Logboek: verkenning-rapport/`).toEqual([]);
  });
}
