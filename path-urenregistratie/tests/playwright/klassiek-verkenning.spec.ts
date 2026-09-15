import { expect, test, type Page, type Request } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { bewaarUrenstaat } from './fixtures/urenstaatHerstel';

// Vaste regressiecases uit de seeded monkey-verkenning op de medewerker in
// Klassiek (tests/verkenning/klassiek-monkey.spec.ts, nacht van 14 op 15 sep).
// Een monkey vindt; deze cases houden vast. Elke case zet de toestand die de
// monkey toevallig bereikte doelbewust en deterministisch neer, zodat hij niet
// op timing of geluk leunt.

// Zichtbare inhoud die voorbij de rechterrand valt, en dus afgekapt is. Gedeeld
// door KLV-N-005 (medewerker) en KLV-N-006 (beheer): één meting, zodat de twee
// cases dezelfde garantie geven.
async function inhoudBuitenRechterrand(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const rand = document.documentElement.clientWidth;
    // Binnen beeld gehouden door een ouder: een scroller (veegbaar) of een ouder
    // die afknipt en zelf binnen de rand eindigt (dan zie je het niet buiten de rand).
    const binnenGehouden = (el: Element) => {
      for (let o = el.parentElement; o && o !== document.body; o = o.parentElement) {
        const ox = getComputedStyle(o).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
        if ((ox === 'hidden' || ox === 'clip') && o.getBoundingClientRect().right <= rand + 1) return true;
      }
      return false;
    };
    const gevonden: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.view.is-active *, .sidebar *'))) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.right <= rand + 1) continue;
      const cs = getComputedStyle(el);
      // Decoratie (aria-hidden, zoals de gloed achter de kopkaart) is geen inhoud.
      if (el.closest('[aria-hidden="true"]')) continue;
      if (cs.visibility === 'hidden' || cs.position === 'fixed' || el.closest('[hidden]') || binnenGehouden(el)) continue;
      gevonden.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).trim().split(/\s+/).slice(0, 2).join('.')} (${Math.round(r.right)}>${rand})`);
      if (gevonden.length >= 6) break;
    }
    return gevonden;
  });
}

test('[KLV-N-002] het maandkeuzepaneel valt op geen enkele breedte buiten het scherm', async ({ page }) => {
  // Vondst seeds 1 en 12 (paneel buiten de rechterrand). Vastgepind op Vandaag bij
  // 821px: 21px buiten beeld, Maart/September/December afgekapt. Een maand die
  // buiten beeld valt, kun je niet kiezen.
  // Grenswaarden rond de breekpunten (720/721, 820/821) plus gangbare breedtes.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  await test.step('Given een medewerker in Klassiek', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  const gemeten: string[] = [];
  for (const scherm of ['employee-dashboard', 'timesheet', 'historie']) for (const breedte of [390, 720, 721, 768, 820, 821, 1024, 1280, 1440]) {
    await test.step(`Then ligt het geopende paneel op ${scherm} bij ${breedte}px volledig binnen beeld`, async () => {
      await page.setViewportSize({ width: breedte, height: 900 });
      // Zelfde .nav-item: zijbalk op desktop, tabbalk onderin op de telefoon.
      await page.locator(`.nav-item[data-view="${scherm}"]:visible`).first().click();
      await expect(page.locator(`#view-${scherm}`)).toHaveClass(/is-active/);
      const knop = page.locator('#period-month-picker');
      // Niet elk scherm toont de maandkeuze op elke breedte; waar hij ontbreekt
      // valt er niets buiten beeld te vallen. Wel vastleggen dat er gemeten is.
      if (!(await knop.isVisible())) return;
      gemeten.push(`${scherm}@${breedte}`);
      await knop.click();
      const paneel = page.locator('#period-month-panel');
      await expect(paneel).toBeVisible();
      const vak = await paneel.boundingBox();
      expect(vak, 'paneel heeft een positie').not.toBeNull();
      expect(vak!.x, `linkerrand op ${breedte}px`).toBeGreaterThanOrEqual(0);
      expect(vak!.x + vak!.width, `rechterrand op ${breedte}px`).toBeLessThanOrEqual(breedte);
      await page.keyboard.press('Escape');
      await expect(paneel).toBeHidden();
    });
  }
  await test.step('And is de maandkeuze op minstens de desktopbreedtes van Mijn uren echt gemeten', async () => {
    expect(gemeten, gemeten.join(', ')).toEqual(expect.arrayContaining(['timesheet@1024', 'timesheet@1280']));
  });
});

test('[KLV-N-003] in de menubalk van de medewerker overlapt niets elkaar, op geen enkele desktopbreedte', async ({ page }) => {
  // Vondst bij KLV-N-002 (screenshot 821px): het label "LOKAAL · Versie 2.0.77" van
  // de testbalk liep dwars over de tab Berichten. Overlappende tekst is onleesbaar
  // en een tab waar iets overheen ligt, is slecht te raken. Grenswaarden rond de
  // breekpunten van de menubalk plus gangbare breedtes, in licht en donker.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  await test.step('Given een medewerker in Klassiek met de testbalk in de menubalk', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });

  for (const thema of ['light', 'dark'] as const) for (const breedte of [721, 768, 820, 821, 900, 999, 1000, 1079, 1080, 1180, 1280, 1440]) {
    await test.step(`Then overlapt er in ${thema} bij ${breedte}px niets in de menubalk`, async () => {
      await page.evaluate(t => {
        const s = (0, eval)('state') as { preferences: Record<string, unknown> };
        s.preferences.theme = t;
        ((0, eval)('applyTheme') as () => void)();
      }, thema);
      await page.setViewportSize({ width: breedte, height: 900 });
      await expect(page.locator('.nav-item[data-view="employee-announcements"]:visible')).toBeVisible();
      const overlap = await page.evaluate(() => {
        // De bladeren van de menubalk: tabs, logo, testbalklabel en -knoppen en de
        // knoppen rechts. Een ouder bevat zijn kinderen altijd; alleen bladeren
        // onderling vergelijken.
        const balk = document.querySelector('.sidebar');
        if (!balk) return ['geen menubalk'];
        const bladeren = Array.from(balk.querySelectorAll<HTMLElement>('.nav-item, .brand, #sidebar-brand, .testbalk-label, .testbalk button, .appearance-switch, #switch-role, #notification-button, #profile-menu-button'))
          .filter(el => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden]');
          })
          .filter((el, _, alle) => !alle.some(ander => ander !== el && el.contains(ander)));
        const naam = (el: HTMLElement) => `${el.id ? '#' + el.id : el.className.toString().split(' ')[0]} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 20)}"`;
        const gevonden: string[] = [];
        for (let i = 0; i < bladeren.length; i++) for (let j = i + 1; j < bladeren.length; j++) {
          const a = bladeren[i].getBoundingClientRect();
          const b = bladeren[j].getBoundingClientRect();
          const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (x > 1 && y > 1) gevonden.push(`${naam(bladeren[i])} x ${naam(bladeren[j])} (${Math.round(x)}x${Math.round(y)}px)`);
        }
        return gevonden;
      });
      expect(overlap, `overlap bij ${breedte}px (${thema})`).toEqual([]);
    });
  }
});

test('[KLV-N-004] een trage opslag die pas na herladen aankomt, blokkeert de volgende invoer niet', async ({ page }) => {
  // Vondst seeds 15 en 26: klikken, meteen herladen, weer klikken gaf "Niet
  // gesynchroniseerd: … door iemand anders gewijzigd. Ververs de pagina" en de
  // nieuwe invoer bleef onopgeslagen. Vastgepind (15 sep): een opslag die al
  // onderweg is, komt pas op de server aan NA de lezing van de herladen pagina
  // (traag mobiel netwerk). De server staat dan een versie verder dan de pagina.
  // Verwacht: de app haalt de actuele versie op en slaat de invoer alsnog op wat
  // er op het scherm staat. De medewerker hoeft niets te verversen.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  let houdVast = false;
  let laatLos: () => void = () => undefined;
  page.on('dialog', dialoog => { dialoog.accept().catch(() => undefined); });
  await page.route('**/server/api/timesheets.php', async route => {
    if (route.request().method() !== 'POST' || !houdVast) return route.continue();
    houdVast = false;
    // Vasthouden VÓÓR de server het ziet: zo komt hij pas aan na het herladen.
    await new Promise<void>(resolve => { laatLos = resolve; });
    const response = await route.fetch().catch(() => null);
    if (response) await route.fulfill({ response }).catch(() => undefined);
  });

  await test.step('Given een medewerker op Mijn uren met een urenstaat die al een serverversie heeft', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('.nav-item[data-view="timesheet"]:visible').first().click();
    await expect(page.locator('#hours-grid .hours-input:not([disabled]):visible').nth(2)).toBeVisible();
  });
  const velden = page.locator('#hours-grid .hours-input:not([disabled]):visible');
  const oorspronkelijk = [await velden.nth(0).inputValue(), await velden.nth(1).inputValue(), await velden.nth(2).inputValue()];
  try {
    await velden.nth(0).fill('1.5');
    await expect(page.locator('#hours-autosave-status')).toContainText('Gesynchroniseerd', { timeout: 20_000 });

    await test.step('When een opslag onderweg is, de pagina herlaadt en die opslag pas daarna aankomt', async () => {
      houdVast = true;
      const verzonden = page.waitForRequest(r => r.url().includes('/server/api/timesheets.php') && r.method() === 'POST');
      await velden.nth(1).fill('3.5');
      await verzonden;
      // Niet networkidle: de app blijft periodiek ophalen. Wel precies wachten op
      // de lezing van deze urenstaat door de herladen pagina.
      const lezing = page.waitForResponse(r => r.url().includes('/server/api/timesheets.php?') && r.request().method() === 'GET', { timeout: 30_000 });
      await page.reload({ timeout: 20_000 });
      await lezing;
      await expect(page.locator('#hours-grid .hours-input:not([disabled]):visible').nth(2)).toBeVisible({ timeout: 20_000 });
      laatLos();
      // De vertraagde opslag landt nu op de server (een versie verder).
      await page.waitForTimeout(1_000);
    });

    await test.step('And de medewerker daarna gewoon verder invult', async () => {
      await page.locator('#hours-grid .hours-input:not([disabled]):visible').nth(2).fill('2.5');
    });

    await test.step('Then wordt die invoer zonder foutmelding opgeslagen en staat hij na nog een herlading op de server', async () => {
      const status = page.locator('#hours-autosave-status');
      await expect(status).toContainText('Gesynchroniseerd', { timeout: 20_000 });
      await expect(status).not.toContainText('Niet gesynchroniseerd');
      await page.unroute('**/server/api/timesheets.php');
      await page.reload({ timeout: 20_000 });
      const naHerladen = page.locator('#hours-grid .hours-input:not([disabled]):visible');
      await expect(naHerladen.nth(2)).toHaveValue(/^2[.,]5$/, { timeout: 20_000 });
    });
  } finally {
    await page.unroute('**/server/api/timesheets.php').catch(() => undefined);
    const terug = page.locator('#hours-grid .hours-input:not([disabled]):visible');
    for (let i = 0; i < 3; i++) await terug.nth(i).fill(oorspronkelijk[i]).catch(() => undefined);
    await expect(page.locator('#hours-autosave-status')).toContainText('Gesynchroniseerd', { timeout: 20_000 }).catch(() => undefined);
  }
});

test('[KLV-N-005] op geen enkel medewerkerscherm valt inhoud buiten de rechterrand rond de breekpunten', async ({ page }) => {
  // Zachte vondst seeds 11 en 25: bij 821px stonden een sectielabel, een h3 en een
  // summary-note 5px voorbij de rechterrand. Net boven een breekpunt klopt de
  // rekensom van de kolommen niet meer. Wat buiten de rand valt, is afgekapt.
  // Een bewust horizontaal scrollbare container telt niet mee (die veeg je).
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  await test.step('Given een medewerker in Klassiek', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
  });
  // Elke breedte vanaf smaller én vanaf breder benaderen: een deel van de indeling
  // verhuist via JavaScript bij het passeren van een breekpunt (plaatsKopBediening,
  // plaatsTestknoppen), en de monkey kwam er juist door te schalen.
  for (const scherm of ['employee-dashboard', 'timesheet', 'historie', 'employee-announcements']) for (const breedte of [390, 720, 721, 820, 821, 1024, 1079, 1080]) for (const vanaf of [360, 1440]) {
    await test.step(`Then valt er op ${scherm} bij ${breedte}px (vanaf ${vanaf}px) niets buiten de rechterrand`, async () => {
      await page.setViewportSize({ width: vanaf, height: 900 });
      await page.locator(`.nav-item[data-view="${scherm}"]:visible`).first().click();
      await expect(page.locator(`#view-${scherm}`)).toHaveClass(/is-active/);
      await page.setViewportSize({ width: breedte, height: 900 });
      await page.waitForTimeout(200);
      const buiten = await inhoudBuitenRechterrand(page);
      expect(buiten, `${scherm} @ ${breedte}px`).toEqual([]);
    });
  }
});

test('[KLV-N-006] op geen enkel beheerscherm valt inhoud buiten de rechterrand rond de breekpunten', async ({ page }) => {
  // Vondst monkey op de beheerkant (MONKEY_ROL=beheer, seeds 1 en 2): in Teambeheer
  // stonden de accountgroepen bij 821px 92px buiten beeld, en in Instellingen viel
  // de keuze "per pagina" van de mailgeschiedenis bij 1024 en 1280px bijna 80px
  // buiten de rand. Zelfde meting als KLV-N-005, nu voor de Backoffice.
  test.setTimeout(240_000);
  const loginPage = new LoginPage(page);
  await test.step('Given een beheerder in Klassiek', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
  });
  for (const scherm of ['dashboard', 'approvals', 'invoices', 'employees', 'announcements', 'settings']) for (const breedte of [390, 720, 721, 820, 821, 1024, 1280]) for (const vanaf of [360, 1440]) {
    await test.step(`Then valt er op ${scherm} bij ${breedte}px (vanaf ${vanaf}px) niets buiten de rechterrand`, async () => {
      await page.setViewportSize({ width: vanaf, height: 900 });
      await page.locator(`.nav-item[data-view="${scherm}"]:visible`).first().click();
      await expect(page.locator(`#view-${scherm}`)).toHaveClass(/is-active/);
      await page.setViewportSize({ width: breedte, height: 900 });
      await page.waitForTimeout(250);
      expect(await inhoudBuitenRechterrand(page), `${scherm} @ ${breedte}px`).toEqual([]);
    });
  }
});

test('[KLV-N-007] elk scherm heeft een paginatitel, ook Klanturenstaten bij de beheerder', async ({ page }) => {
  // Vondst monkey beheerkant (seeds 6 en 7, al na 3 handelingen): "Bekijk
  // klanturenstaten →" op het dashboard opende een scherm met een lege
  // paginatitel. pageTitles miste customer-timesheet-admin. Case in twee delen:
  // de echte route via de knop, en een controle dat geen enkel scherm (.view) in
  // de app zonder titel zit, zodat een volgend nieuw scherm niet hetzelfde overkomt.
  const loginPage = new LoginPage(page);
  await test.step('Given een beheerder op het dashboard', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await expect(page.locator('#view-dashboard')).toHaveClass(/is-active/);
  });
  await test.step('When de beheerder de klanturenstaten opent vanaf het dashboard', async () => {
    const knop = page.getByRole('button', { name: /Bekijk klanturenstaten/ }).first();
    await expect(knop).toBeVisible();
    await knop.click();
    await expect(page.locator('#view-customer-timesheet-admin')).toHaveClass(/is-active/);
  });
  await test.step('Then staat er een paginatitel', async () => {
    await expect(page.locator('#page-title')).toHaveText('Klanturenstaten');
  });
  await test.step('And heeft ieder scherm in de app een eigen titel', async () => {
    const zonderTitel = await page.evaluate(() => {
      const titels = (0, eval)('pageTitles') as Record<string, string>;
      return Array.from(document.querySelectorAll<HTMLElement>('.view[id^="view-"]'))
        .map(v => v.id.replace(/^view-/, ''))
        .filter(naam => !String(titels[naam] || '').trim());
    });
    expect(zonderTitel).toEqual([]);
  });
});

test('[KLV-N-001] snel achter elkaar uren invullen botst nooit met de eigen, net opgeslagen versie', async ({ page }) => {
  // Vondst seed 5 (5 handelingen): 9 aanklikken en meteen doortypen gaf een 409
  // stale-version, "door iemand anders gewijzigd", terwijl er maar één
  // medewerker in één tabblad werkte. De volgorde die dat veroorzaakt, wordt
  // hier afgedwongen met een vastgehouden serverrespons:
  //   A onderweg -> B komt in de wachtrij -> A slaagt -> C komt binnen het
  //   debounce-venster van B.
  // C werd opgebouwd uit de lokale serverversie, die bij "A slaagt met B in de
  // wachtrij" niet werd bijgewerkt. C ging dus met een achterhaalde versie de
  // deur uit.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  const schrijfStatussen: number[] = [];
  let houdVast = false;
  let laatLos: () => void = () => undefined;

  await page.route('**/server/api/timesheets.php', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    if (houdVast) await new Promise<void>(resolve => { laatLos = resolve; });
    schrijfStatussen.push(response.status());
    await route.fulfill({ response });
  });

  await test.step('Given een medewerker op Mijn uren van een open maand', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('.nav-item[data-view="timesheet"]:visible').first().click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('#hours-grid .hours-input:not([disabled]):visible').nth(2)).toBeVisible();
  });

  const herstel = await bewaarUrenstaat(page);
  const velden = page.locator('#hours-grid .hours-input:not([disabled]):visible');
  const oorspronkelijk = [await velden.nth(0).inputValue(), await velden.nth(1).inputValue(), await velden.nth(2).inputValue()];
  try {
    const isSchrijf = (r: Request) => r.url().includes('/server/api/timesheets.php') && r.method() === 'POST';

    await test.step('And de urenstaat staat al met een versie op de server', async () => {
      // Zonder serverversie stuurt de app geen expected_version mee en kan de
      // server dus nooit "achterhaald" melden: dan bewijst de case niets.
      await velden.nth(0).fill('1.5');
      await expect(page.locator('#hours-autosave-status')).toContainText('Gesynchroniseerd', { timeout: 20_000 });
      const versie = await page.evaluate(() => {
        const rt = window as unknown as { recordFor: (id: number) => { serverVersion: number | null }; currentEmployee: () => { id: number } };
        return Number(rt.recordFor(rt.currentEmployee().id).serverVersion || 0);
      });
      expect(versie).toBeGreaterThan(0);
      schrijfStatussen.length = 0;
    });

    await test.step('When de eerste invoer onderweg is en er intussen twee nieuwe invoeren volgen', async () => {
      houdVast = true;
      const eersteVerzoek = page.waitForRequest(isSchrijf);
      await velden.nth(0).fill('3.5');
      await eersteVerzoek;
      // A is onderweg en wordt vastgehouden: B komt in de wachtrij.
      await velden.nth(1).fill('6.5');
      houdVast = false;
      laatLos();
      // Wachten tot de app A echt heeft afgehandeld en B op zijn debounce-timer
      // staat. Eerder typen laat C nog in de wachtrij van A vallen, en die
      // route ging al goed -- dan bewijst de case niets.
      await page.waitForFunction(() => {
        const w = (0, eval)('writeRuntime') as { draftInFlight: boolean; draftTimer: unknown };
        return w.draftInFlight === false && w.draftTimer !== null;
      }, null, { timeout: 15_000, polling: 5 });
      // Binnen het debounce-venster van B: invoer C.
      await velden.nth(2).fill('2.5');
    });

    await test.step('Then slaagt elke opslag en staan alle drie de waarden daarna op de server', async () => {
      await expect.poll(() => schrijfStatussen.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
      await expect(page.locator('#hours-autosave-status')).toContainText('Gesynchroniseerd', { timeout: 20_000 });
      expect(schrijfStatussen.filter(status => status !== 200), `statussen: ${schrijfStatussen.join(', ')}`).toEqual([]);
      await page.unroute('**/server/api/timesheets.php');
      await page.reload();
      const naHerladen = page.locator('#hours-grid .hours-input:not([disabled]):visible');
      await expect(naHerladen.nth(2)).toBeVisible({ timeout: 20_000 });
      await expect(naHerladen.nth(0)).toHaveValue(/^3[.,]5$/);
      await expect(naHerladen.nth(1)).toHaveValue(/^6[.,]5$/);
      await expect(naHerladen.nth(2)).toHaveValue(/^2[.,]5$/);
    });
  } finally {
    // Ook de server terugzetten: deze case schrijft echt, en latere cases in
    // dezelfde run lezen die dagen.
    await page.unroute('**/server/api/timesheets.php').catch(() => undefined);
    const terug = page.locator('#hours-grid .hours-input:not([disabled]):visible');
    for (let i = 0; i < 3; i++) await terug.nth(i).fill(oorspronkelijk[i]).catch(() => undefined);
    await expect(page.locator('#hours-autosave-status')).toContainText('Gesynchroniseerd', { timeout: 20_000 }).catch(() => undefined);
    await herstel().catch(() => undefined);
  }
});
