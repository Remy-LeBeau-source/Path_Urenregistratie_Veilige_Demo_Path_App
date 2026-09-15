import { expect, test, type Page, type Request } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { openProfielmenu } from './pages/TopbarMenu';
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
      // Wachten tot het paneel staat: onder "minder beweging" meet de browser de
      // translate-correctie pas later (gemeten 15 sep bij 821px: eerst 550-842, na
      // 300ms 521-813). De gebruiker ziet het eindbeeld; dat wordt hier getoetst.
      await expect.poll(async () => {
        const b = await paneel.boundingBox();
        return b ? b.x + b.width : Infinity;
      }, { timeout: 1_500, message: `rechterrand op ${breedte}px` }).toBeLessThanOrEqual(breedte);
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

test('[KLV-N-008] meer dan 24 uur op een dag wordt direct in het vak gemeld en niet naar de server gestuurd', async ({ page }) => {
  // Vondst monkey (zachte bevinding in bijna elke ronde): 24,01, 99999 of 1e9 in een
  // dagvak ging gewoon mee in de totalen en naar de server, die terecht weigerde met
  // 400 "tussen 0 en 24". De medewerker zag pas achteraf een melding. Grenswaarden:
  // 24 mag, 24,5 en 25 niet.
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);
  const geweigerd: number[] = [];
  const verstuurdeUren: number[] = [];
  page.on('request', r => {
    if (!r.url().includes('/server/api/timesheets.php') || r.method() !== 'POST') return;
    const body = r.postDataJSON() as { day_entries?: Array<{ hours: number }> };
    for (const dag of body.day_entries || []) verstuurdeUren.push(Number(dag.hours));
  });
  page.on('response', r => { if (r.url().includes('/server/api/timesheets.php') && r.status() === 400) geweigerd.push(r.status()); });

  await test.step('Given een medewerker op Mijn uren van een open maand', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await page.locator('.nav-item[data-view="timesheet"]:visible').first().click();
    await expect(page.locator('#hours-grid .hours-input:not([disabled]):visible').first()).toBeVisible();
  });
  const vak = page.locator('#hours-grid .hours-input:not([disabled]):visible').first();
  const oorspronkelijk = await vak.inputValue();
  const totaalVooraf = await page.locator('#hours-total').textContent();
  try {
    await test.step('When de medewerker 25 uur op een dag intypt', async () => {
      await vak.fill('25');
      await page.waitForTimeout(1_200);
    });
    await test.step('Then is het vak ongeldig, staat er een duidelijke melding en gaat er niets naar de server', async () => {
      await expect(vak).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#hours-target-help')).toContainText('maximaal 24 uur');
      await expect(page.locator('#hours-total')).toHaveText(totaalVooraf || '');
      expect(verstuurdeUren.filter(uren => uren > 24)).toEqual([]);
      expect(geweigerd).toEqual([]);
    });
    await test.step('And geldt 24,5 ook als te veel, maar 24 precies niet', async () => {
      await vak.fill('24.5');
      await expect(vak).toHaveAttribute('aria-invalid', 'true');
      await vak.fill('24');
      await expect(vak).toHaveAttribute('aria-invalid', 'false');
      await expect(page.locator('#hours-target-help')).not.toContainText('maximaal 24 uur');
    });
  } finally {
    await vak.fill(oorspronkelijk).catch(() => undefined);
    await page.waitForTimeout(1_500);
  }
});

test('[KLV-N-009] in Klassiek staat het klanturenstaatlabel niet op Mijn uren maar op het eigen Klanturenstaat-scherm', async ({ page }) => {
  // DESIGN-BESLUITEN "Klanturenstaatpaneel hoort niet op Mijn uren" (14 sep): Mijn uren
  // gaat over uren invullen. Het paneel met zijn statuslabel verhuist in Klassiek naar
  // het eigen scherm. Bewaakt, zodat een verhuizing die ergens misloopt het label niet
  // stilletjes terugzet op Mijn uren (open punt 15 sep, besloten: niet weghalen, wel bewaken).
  const loginPage = new LoginPage(page);
  await test.step('Given een medewerker in Klassiek', async () => {
    await loginPage.open();
    await loginPage.loginAsEmployee();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
  });
  await test.step('When de medewerker Mijn uren opent', async () => {
    await page.locator('.nav-item[data-view="timesheet"]:visible').first().click();
    await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
  });
  await test.step('Then staat er op Mijn uren geen klanturenstaatlabel of -paneel', async () => {
    await expect(page.locator('#view-timesheet #customer-timesheet-status')).toHaveCount(0);
    await expect(page.locator('#view-timesheet #customer-timesheet-upload-panel')).toHaveCount(0);
  });
  await test.step('And staat het label wel op het Klanturenstaat-scherm', async () => {
    await page.evaluate(() => ((0, eval)('showView') as (v: string) => void)('customer-timesheet'));
    await expect(page.locator('#view-customer-timesheet')).toHaveClass(/is-active/);
    await expect(page.locator('#view-customer-timesheet #customer-timesheet-status')).toBeVisible();
  });
});

test('[KLV-H-010] op TEST staat alleen Herstel bovenin; thema, vormgeving en versie staan in het profielmenu', async ({ page }) => {
  // Gio 15 sep: "op TEST moet het scherm zoveel mogelijk op PROD lijken", Herstel moet
  // wel zichtbaar blijven. Bewaakt voor medewerker en beheer, op telefoon en desktop:
  // geen thema- of vormgevingsknop in de balken, wel Herstel; in het profielmenu een
  // sectie "Testfuncties" met de schakelaars en daaronder de versie. Op PROD bestaat
  // die sectie niet (plaatsTestknoppen: alleen met omgevingsbadge of Herstel).
  test.setTimeout(120_000);
  const loginPage = new LoginPage(page);
  for (const rol of ['medewerker', 'beheer'] as const) for (const breedte of [390, 1280]) {
    await test.step(`Then staat bij ${rol} op ${breedte}px alleen Herstel bovenin en de rest in het profielmenu`, async () => {
      await page.setViewportSize({ width: breedte, height: 844 });
      await loginPage.open();
      if (rol === 'beheer') await loginPage.loginAsAdmin(); else await loginPage.loginAsEmployee();
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic');
      // Geen testpil meer, en buiten het profielmenu geen thema- of vormgevingsknop.
      await expect(page.locator('#testbalk-open')).toHaveCount(0);
      for (const knop of ['#quick-theme-toggle', '#quick-skin-toggle']) {
        await expect(page.locator(knop)).toHaveCount(1);
        expect(await page.locator(knop).evaluate(el => Boolean(el.closest('#profile-menu'))), `${knop} hoort in het profielmenu`).toBe(true);
        await expect(page.locator(knop)).toBeHidden();
      }
      const herstel = page.locator('#quick-reset-demo');
      await expect(herstel).toBeVisible();
      await expect(herstel).toContainText('Herstel');
      if (breedte < 821) expect((await herstel.boundingBox())!.height, 'Herstel is op de telefoon een touchdoel').toBeGreaterThanOrEqual(44);
      await openProfielmenu(page);
      await expect(page.locator('#profile-menu-testfuncties')).toBeVisible();
      await expect(page.locator('#profile-menu-testknoppen #quick-theme-toggle')).toBeVisible();
      await expect(page.locator('#profile-menu-testknoppen #quick-skin-toggle')).toBeVisible();
      await expect(page.locator('#profile-menu-versie')).toHaveText(/^Versie \d+\.\d+\.\d+$/);
      await page.keyboard.press('Escape');
      await loginPage.logout();
    });
  }
});

test('[KLV-N-011] de mailgeschiedenis in Instellingen blijft binnen beeld, ook met lange regels en een herstelknop', async ({ page }) => {
  // Zachte vondst monkey beheerkant (15 sep) en rood in release 34950426101: met echte
  // maildata stak een regel van de mailgeschiedenis bij 1024px 38px buiten beeld (grid
  // minmax(180px) plus een auto-kolom met statuspil en herstelknop). KLV-N-006 zag het
  // lokaal niet, want zonder verstuurde mails is de lijst leeg. Hier worden drie regels
  // neergezet via de echte renderfunctie, zodat de case altijd iets te meten heeft.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  await test.step('Given een beheerder op Instellingen met drie mailregels in de geschiedenis', async () => {
    await loginPage.open();
    await loginPage.loginAsAdmin();
    await page.locator('.nav-item[data-view="settings"]:visible').first().click();
    await expect(page.locator('#view-settings')).toHaveClass(/is-active/);
    await page.evaluate(() => {
      const debug = (0, eval)('readApiDebug') as { emailQueue: unknown };
      const nu = new Date().toISOString();
      debug.emailQueue = {
        total: 3, offset: 0, limit: 10,
        items: [
          { id: 1, status: 'sent', sent_at: nu, created_at: nu, subject_snapshot: 'Factuur en urenoverzicht september 2026 voor Path Consultancy', recipient_email: 'facturen-administratie-boekhouding@voorbeeldklant-met-lange-naam.example.invalid', invoice_number: 'PC-2026-0915', employee_name: 'Stasjo van Bakel', channel: 'invoice', attachment_policy: 'pdf', attempt_count: 1 },
          { id: 2, status: 'failed', created_at: nu, subject_snapshot: 'Klanturenstaat september', recipient_email: 'broker@example.invalid', attempt_count: 3, last_error: 'SMTP-verbinding geweigerd', can_retry: true, channel: 'customer_timesheet', attachment_policy: 'none' },
          { id: 3, status: 'queued', created_at: nu, subject_snapshot: 'Herinnering uren', recipient_email: 'marc@example.invalid', is_stalled: true, channel: 'reminder', attachment_policy: 'none', attempt_count: 1 },
        ],
      };
      ((0, eval)('renderMailDeliveryHistory') as () => void)();
    });
    await expect(page.locator('#mail-delivery-history-list .mail-delivery-history-item')).toHaveCount(3);
  });
  for (const breedte of [821, 1024, 1280, 1440]) {
    await test.step(`Then valt er bij ${breedte}px niets van de mailgeschiedenis buiten de rechterrand`, async () => {
      await page.setViewportSize({ width: breedte, height: 900 });
      await page.locator('#mail-delivery-history-list').scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      const buiten = (await inhoudBuitenRechterrand(page)).filter(regel => /mail-delivery|status-pill|small-button/.test(regel));
      expect(buiten, `mailgeschiedenis @ ${breedte}px`).toEqual([]);
    });
  }
});

// Indienlogica (Gio 15 sep): de maand is pas indienbaar als elke werkdag bewust is
// ingevuld, in welke week je ook staat.
//
// Opzet voor KLV-N-012/H-013/H-014: elke case krijgt per project een eigen maand ruim
// vooruit, die geen andere case gebruikt. De server verwijdert nooit dagregels, dus een
// herstel achteraf kan een gedeelde maand niet schoon terugzetten; gemeten 15 sep: met
// de huidige maand zag SKIN-H-006 daarna een volle september. De database gaat per run
// opnieuw op, dus binnen een run is dit genoeg. Bij een herhaalpoging schuift de open
// week één op, zodat de eerste poging die week niet al op de server heeft gezet.
//
// De maand is overal gevuld en bevestigd, behalve de open week (nooit de laatste week
// van de maand), en die stand staat ook op de server.
type IndienRt = { currentEmployee: () => { id: number }; currentPeriod: () => { key: string; weekRows: Array<{ days: unknown[] }> }; recordFor: (id: number, key?: string) => { entries: number[][]; confirmedEntries: boolean[][] }; persistState: () => void; renderAll: () => void; scheduleDraftTimesheetWrite: () => void; setPeriod: (key: string) => boolean };

const INDIEN_PROJECTEN = ['desktop-chromium', 'mobile-chrome', 'mobile-safari', 'tablet-chromium'];

async function kiesMaand(page: Page, maand: string): Promise<void> {
  await page.evaluate(key => { (window as unknown as IndienRt).setPeriod(key); }, maand);
  await expect.poll(() => page.evaluate(() => (window as unknown as IndienRt).currentPeriod().key)).toBe(maand);
}

async function eigenMaandMetOpenWeek(page: Page, caseNummer: 0 | 1 | 2 | 3): Promise<{ maand: string; openWeek: number; werkdagenOpen: number }> {
  const info = test.info();
  const project = Math.max(0, INDIEN_PROJECTEN.indexOf(info.project.name));
  // 8 t/m 23 maanden vooruit: ver van de maanden die andere cases gebruiken en binnen
  // de grens van 2 jaar (setPeriod, timesheets.php).
  const maandenVooruit = 8 + caseNummer * 4 + project;
  const { maand, openWeek } = await page.evaluate(({ vooruit, poging }) => {
    const periodFromKey = (0, eval)('periodFromKey') as (k: string) => { weekRows: Array<{ days: unknown[] }> };
    const nu = new Date();
    const d = new Date(nu.getFullYear(), nu.getMonth() + vooruit, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const weken = periodFromKey(key).weekRows;
    const kandidaten = weken.map((week, index) => ({ index, dagen: week.days.filter(Boolean).length }))
      // Een volle week: dan blijven er ook met een vrije dag van Beheer (werkpatroon)
      // genoeg werkdagen over om er één in te vullen en de rest open te zien.
      .filter(week => week.index < weken.length - 1 && week.dagen >= 5)
      .map(week => week.index);
    return { maand: key, openWeek: kandidaten[Math.min(poging, kandidaten.length - 1)] ?? -1 };
  }, { vooruit: maandenVooruit, poging: info.retry });
  expect(openWeek, `een volle week in ${maand}, niet de laatste`).toBeGreaterThanOrEqual(0);
  await kiesMaand(page, maand);
  const opgeslagen = page.waitForResponse(r => r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST' && r.status() === 200, { timeout: 20_000 });
  const werkdagenOpen = await page.evaluate(open => {
    const rt = window as unknown as IndienRt;
    const period = rt.currentPeriod();
    const record = rt.recordFor(rt.currentEmployee().id, period.key);
    period.weekRows.forEach((week, weekIndex) => week.days.forEach((dag, dagIndex) => {
      if (!dag) return;
      const leeg = weekIndex === open;
      record.entries[weekIndex][dagIndex] = leeg ? 0 : 8;
      record.confirmedEntries[weekIndex][dagIndex] = !leeg;
    }));
    const staat = (0, eval)('state') as { hoursWeekScope: string; hoursWeekScopeTouched: boolean };
    staat.hoursWeekScope = 'week-' + open;
    staat.hoursWeekScopeTouched = true;
    rt.persistState();
    rt.renderAll();
    rt.scheduleDraftTimesheetWrite();
    // De app bepaalt wat een werkdag is (een vrije dag volgens Beheer telt niet mee),
    // dus de verwachting komt uit dezelfde regel, niet uit een eigen telling.
    return ((0, eval)('ontbrekendeWerkdagen') as (r: unknown, p: unknown) => unknown[])(record, period).length;
  }, openWeek);
  await opgeslagen;
  return { maand, openWeek, werkdagenOpen };
}

async function naarMijnUren(page: Page): Promise<void> {
  await page.locator('.nav-item[data-view="timesheet"]:visible').first().click();
  await expect(page.locator('#view-timesheet')).toHaveClass(/is-active/);
}

const nogOpen = (aantal: number) => aantal === 1 ? 'Nog 1 werkdag niet ingevuld' : `Nog ${aantal} werkdagen niet ingevuld`;

test('[KLV-N-012] typen in één dag van de laatste open week maakt de rest van die week niet ingevuld', async ({ page }) => {
  // Gio 15 sep: bij een lege week stond "Alle werkdagen zijn ingevuld" en Maand
  // indienen. Oorzaak: elke conceptopslag bevestigde alle dagen van de bekeken week.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await naarMijnUren(page);
  const { maand, openWeek, werkdagenOpen } = await eigenMaandMetOpenWeek(page, 0);
  const hulp = page.locator('#hours-target-help');
  const indienen = page.locator('#submit-timesheet');
  await test.step('Given alleen één week van de maand is nog leeg', async () => {
    await expect(hulp).toContainText(nogOpen(werkdagenOpen));
    await expect(indienen).toBeHidden();
  });
  await test.step('When de medewerker in één dag van die week uren typt', async () => {
    const opgeslagen = page.waitForResponse(r => r.url().includes('/server/api/timesheets.php') && r.request().method() === 'POST', { timeout: 20_000 });
    await page.locator('#hours-grid .hours-input:not([disabled]):visible').first().fill('8');
    await opgeslagen;
  });
  await test.step('Then telt alleen die dag mee: nog steeds geen Maand indienen, ook niet na herladen', async () => {
    await expect(hulp).toContainText(nogOpen(werkdagenOpen - 1));
    await expect(indienen).toBeHidden();
    await page.reload();
    await naarMijnUren(page);
    await kiesMaand(page, maand);
    // Weer dezelfde week kiezen: onder Hele maand staat Maand indienen bewust altijd,
    // met het aantal lege dagen erachter (besluit 14 sep).
    await page.locator(`#hours-week-filter [data-hours-week-scope="week-${openWeek}"]`).click();
    await expect(page.locator('#hours-target-help')).toContainText(nogOpen(werkdagenOpen - 1));
    await expect(page.locator('#submit-timesheet')).toBeHidden();
  });
});

test('[KLV-H-013] Week opslaan telt lege dagen als bewust 0: daarna Maand indienen, ook buiten de laatste week', async ({ page }) => {
  // Gio 15 sep: "bij opslaan drukken terwijl alles leeg is verwacht ik Maand indienen
  // weer terug". Opslaan is een bewuste keuze voor deze week, ook met 0 uur.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await naarMijnUren(page);
  await eigenMaandMetOpenWeek(page, 1);
  await test.step('Given alleen één week is nog leeg en Maand indienen is er niet', async () => {
    await expect(page.locator('#submit-timesheet')).toBeHidden();
  });
  await test.step('When de medewerker die lege week opslaat', async () => {
    await page.locator('#save-timesheet').click();
  });
  await test.step('Then staat Maand indienen er in de weekweergave, zonder de tekst dat hij onder Hele maand staat', async () => {
    await expect(page.locator('#hours-target-help')).toContainText('Alle werkdagen zijn ingevuld');
    await expect(page.locator('#submit-timesheet')).toBeVisible();
    await expect(page.locator('#submit-timesheet-note')).not.toContainText('Hele maand');
  });
});

test('[KLV-H-014] Standaardweek vullen in de laatste open week maakt indienen mogelijk, op Mijn uren en op Vandaag', async ({ page }) => {
  // Gio 15 sep: "als ik standaardweek vullen druk verwacht ik ook dat ik weer de maand
  // kan indienen ... het hoeft niet de laatste week te zijn".
  test.setTimeout(90_000);
  // Telefoonbreedte: daar volgt Vandaag de gekozen maand (op desktop staat Vandaag
  // altijd op de lopende maand).
  await page.setViewportSize({ width: 390, height: 844 });
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await naarMijnUren(page);
  const { maand } = await eigenMaandMetOpenWeek(page, 2);
  await test.step('When de medewerker in de laatste open week op Standaardweek vullen drukt', async () => {
    await expect(page.locator('#submit-timesheet')).toBeHidden();
    await page.locator('#fill-standard-hours').click();
  });
  await test.step('Then kan de maand worden ingediend op Mijn uren', async () => {
    await expect(page.locator('#hours-target-help')).toContainText('Alle werkdagen zijn ingevuld');
    await expect(page.locator('#submit-timesheet')).toBeVisible();
  });
  await test.step('And wijst de hoofdknop op Vandaag naar Maand indienen', async () => {
    await page.locator('.nav-item[data-view="employee-dashboard"]:visible').first().click();
    await kiesMaand(page, maand);
    await expect(page.locator('#vdt-hoofdknop')).toHaveText('Maand indienen');
  });
});

test('[KLV-H-015] het label onder het weeknummer telt de open dagen van die week af tot Compleet', async ({ page }) => {
  // Gio 15 sep: "38Open. Zo dicht op elkaar en als je week 38 invult waarom staat er
  // nog steeds 38 open". Het label was altijd "Open" tot de maand werd ingediend, en
  // stond zonder spatie tegen het weeknummer.
  test.setTimeout(90_000);
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await naarMijnUren(page);
  const { openWeek, werkdagenOpen } = await eigenMaandMetOpenWeek(page, 3);
  const rij = page.locator(`#hours-grid tr[data-week-index="${openWeek}"]`);
  const label = rij.locator('.hours-weekcel small');
  await test.step('Given een week met nog open werkdagen', async () => {
    await expect(label).toHaveText(`${werkdagenOpen} open`);
    await expect(label).toHaveClass('is-open');
    // Weeknummer en label los van elkaar, ook waar ze naast elkaar staan.
    await expect(rij.locator('.hours-weekcel')).toHaveText(/^\d+ \d+ open$/);
  });
  const velden = rij.locator('.hours-input:not([disabled])');
  await test.step('When de medewerker één dag invult, dan telt het label één af', async () => {
    await velden.first().fill('8');
    await expect(label).toHaveText(werkdagenOpen - 1 > 0 ? `${werkdagenOpen - 1} open` : 'Compleet');
  });
  await test.step('Then staat er Compleet zodra elke werkdag van de week is ingevuld', async () => {
    const aantal = await velden.count();
    for (let i = 1; i < aantal; i += 1) await velden.nth(i).fill('8');
    await expect(label).toHaveText('Compleet');
    await expect(label).toHaveClass('is-compleet');
  });
});

test('[KLV-H-016] op de telefoon brengt een klein knopje bij de weekkeuze je terug naar Vandaag', async ({ page }) => {
  // Gio 15 sep: "een kleine button in het Mijn uren menu vlakbij weken om weer terug te
  // kunnen naar dashboard, niet storend knopje".
  test.setTimeout(60_000);
  const loginPage = new LoginPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await naarMijnUren(page);
  const terug = page.locator('#hours-terug-vandaag');
  await test.step('Given Mijn uren op telefoonbreedte: het knopje staat vlak boven de weekkeuze', async () => {
    await expect(terug).toBeVisible();
    const knop = (await terug.boundingBox())!;
    const weken = (await page.locator('#hours-week-filter').boundingBox())!;
    expect(knop.height, 'tikvlak').toBeGreaterThanOrEqual(44);
    expect(knop.y + knop.height, 'boven de weekkeuze').toBeLessThanOrEqual(weken.y + 1);
    expect(weken.y - (knop.y + knop.height), 'vlak bij de weekkeuze').toBeLessThanOrEqual(16);
    // Niet storend: geen gekleurde knop, gewoon tekst.
    expect(await terug.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  });
  await test.step('When de medewerker erop tikt, dan staat Vandaag open', async () => {
    await terug.click();
    await expect(page.locator('#view-employee-dashboard')).toHaveClass(/is-active/);
  });
  await test.step('And op desktopbreedte, waar de menubalk Vandaag al toont, staat het knopje er niet', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await naarMijnUren(page);
    await expect(terug).toBeHidden();
  });
});

test('[KLV-H-017] de standaardweek gebruikt hele dagen van 9 of 8 uur en de vrije dag die Beheer instelt', async ({ page }) => {
  // Gio 15 sep: "waarom maakt hij hier 7,2 ... 40 uur dan 5 × 8 of 36 uur 4 × 9, waarbij
  // Beheer instelt op welke dag iemand vrij is" en "als Beheer geen vrije dag heeft
  // ingesteld: zoveel mogelijk maandag t/m vrijdag, in dit geval ma t/m do 4 × 9".
  const loginPage = new LoginPage(page);
  await loginPage.open();
  // Beslistabel: weekuren × wat Beheer per dag heeft ingesteld (ISO 1 = maandag).
  const regels: Array<{ naam: string; medewerker: { weeklyHours: number; dayHours?: Record<number, number> }; verwacht: number[] }> = [
    { naam: '36 uur, niets ingesteld', medewerker: { weeklyHours: 36 }, verwacht: [9, 9, 9, 9, 0] },
    { naam: '40 uur, niets ingesteld', medewerker: { weeklyHours: 40 }, verwacht: [8, 8, 8, 8, 8] },
    { naam: '32 uur, niets ingesteld', medewerker: { weeklyHours: 32 }, verwacht: [8, 8, 8, 8, 0] },
    { naam: '45 uur, niets ingesteld', medewerker: { weeklyHours: 45 }, verwacht: [9, 9, 9, 9, 9] },
    { naam: '36 uur, vrijdag vrij', medewerker: { weeklyHours: 36, dayHours: { 5: 0 } }, verwacht: [9, 9, 9, 9, 0] },
    { naam: '36 uur, maandag vrij', medewerker: { weeklyHours: 36, dayHours: { 1: 0 } }, verwacht: [0, 9, 9, 9, 9] },
    { naam: '36 uur, woensdag vrij', medewerker: { weeklyHours: 36, dayHours: { 3: 0 } }, verwacht: [9, 9, 0, 9, 9] },
    { naam: '36 uur, volledig patroon van Beheer', medewerker: { weeklyHours: 36, dayHours: { 1: 9, 2: 9, 3: 9, 4: 9, 5: 0 } }, verwacht: [9, 9, 9, 9, 0] },
    { naam: '40 uur met een vrije dag past niet in 8 of 9: gelijk over de rest', medewerker: { weeklyHours: 40, dayHours: { 3: 0 } }, verwacht: [10, 10, 0, 10, 10] },
    { naam: '38 uur past niet in 8 of 9: gelijk verdeeld zoals voorheen', medewerker: { weeklyHours: 38 }, verwacht: [7.6, 7.6, 7.6, 7.6, 7.6] },
  ];
  const uitkomst = await page.evaluate(lijst => {
    const perDag = (0, eval)('standardHoursForDay') as (medewerker: unknown, dag: number) => number;
    return lijst.map(regel => ({ naam: regel.naam, dagen: [0, 1, 2, 3, 4].map(dag => perDag(regel.medewerker, dag)) }));
  }, regels);
  for (const [index, regel] of regels.entries()) {
    expect(uitkomst[index].dagen, regel.naam).toEqual(regel.verwacht);
  }
});

test('[KLV-H-018] Berichten toont "Nieuw in de app" met de laatste 5 versies, alleen buiten PROD', async ({ page }) => {
  // Gio 15 sep: "elke keer de laatste versie-updates daarin, alleen als het betrekking
  // heeft op de medewerkers ... zo niet, dan alleen in test".
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.loginAsEmployee();
  await page.locator('.nav-item[data-view="employee-announcements"]:visible').first().click();
  const blok = page.locator('#nieuw-in-de-app');
  await test.step('Then staat het blok er lokaal/op TEST met 5 versies, nieuwste eerst', async () => {
    await expect(blok).toBeVisible();
    const versies = await blok.locator('li strong').allTextContents();
    expect(versies).toHaveLength(5);
    versies.forEach(versie => expect(versie).toMatch(/^\d+\.\d+\.\d+$/));
    const alsGetal = (v: string) => v.split('.').reduce((som, deel) => som * 1000 + Number(deel), 0);
    expect([...versies].sort((a, b) => alsGetal(b) - alsGetal(a)), 'nieuwste bovenaan').toEqual(versies);
    // Nooit een versie die nog niet bestaat.
    const appVersie = (await page.locator('#profile-menu-versie').textContent() || '').match(/\d+\.\d+\.\d+/)?.[0] ?? '';
    expect(appVersie, 'versie van de app').not.toBe('');
    expect(alsGetal(versies[0]), `nieuwste notitie ${versies[0]} ≤ app ${appVersie}`).toBeLessThanOrEqual(alsGetal(appVersie));
    for (const zin of await blok.locator('li span').allTextContents()) expect(zin.trim().length).toBeGreaterThan(20);
  });
  await test.step('And op de PROD-host is het blok weg', async () => {
    await page.evaluate(() => ((0, eval)('syncEnvironmentChrome') as (host: string) => void)('uren.pathconsultancy.nl'));
    await expect(blok).toBeHidden();
    await page.evaluate(() => ((0, eval)('syncEnvironmentChrome') as () => void)());
    await expect(blok).toBeVisible();
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
