import { expect, test, type Page } from '@playwright/test';

type FeedCase = { id: string; title: string; platform: string; gherkin: string };
type Feed = { appVersion: string; delivered: Array<{ version: string; wish: string; cases: FeedCase[] }>; open: Array<{ status: string }> };

const STORAGE_KEY = 'path-pipeline-demo-v1';

async function feedVanServer(page: Page): Promise<Feed> {
  const response = await page.request.get('/pilot/path-pipeline-data.json');
  expect(response.status(), 'de echte projectstand moet mee-uitgerold zijn').toBe(200);
  return response.json();
}

function verwachteSleutels(feed: Feed): string[] {
  const gebruikt = new Set<string>();
  return feed.delivered.slice(0, 5).map((row) => {
    const versie = row.version.match(/\d+\.\d+\.\d+/);
    const basis = row.cases[0]?.id ?? (versie ? versie[0] : (row.version.split(/[\s(]/)[0] || 'oplevering').toUpperCase());
    let sleutel = basis;
    for (let n = 2; gebruikt.has(sleutel); n += 1) sleutel = `${basis}-${n}`;
    gebruikt.add(sleutel);
    return sleutel;
  });
}

test.describe('Path Pipeline TEST-demo', () => {
  test('[PIPE-H-001] de demo toont de echte laatste opleveringen uit GIO-WENSEN met hun cases en Gherkin', async ({ page }) => {
    let feed: Feed;
    await test.step('Given de zelfstandige TEST-only pipelinepagina met de echte projectstand', async () => {
      expect((await page.goto('/pilot/path-pipeline.html'))?.status()).toBe(200);
      feed = await feedVanServer(page);
      expect(feed.delivered.length, 'GIO-WENSEN "Klaar" levert opleveringen').toBeGreaterThanOrEqual(5);
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      await expect(page.locator('[data-feed-version]')).toContainText(`projectstand app ${feed.appVersion}`);
    });

    await test.step('When de pagina is geladen, staan de vier fasen en de laatste vijf echte opleveringen op het bord', async () => {
      await expect(page.locator('body')).toHaveAttribute('data-pilot-design', 'path-pipeline');
      await expect(page.locator('[data-phase]')).toHaveCount(4);
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(5);
      await expect(page.locator('[data-ticket-list="done"] .issue-key')).toHaveText(verwachteSleutels(feed!));
      await expect(page.locator('[data-ticket-list="done"] [data-source="feed"]')).toHaveCount(5);
      const metGherkin = feed!.delivered.slice(0, 5).filter((row) => row.cases.length).length;
      await expect(page.locator('[data-ticket-list="done"] .gherkin')).toHaveCount(metGherkin);
      const openOpBord = feed!.open.length;
      const todo = Number(await page.locator('[data-count="todo"]').textContent());
      const doing = Number(await page.locator('[data-count="doing"]').textContent());
      expect(todo + doing, 'open wensen uit GIO-WENSEN staan in Te doen of In uitvoering').toBe(openOpBord);
      await expect(page.getByRole('button', { name: 'Jira Backlog' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Confluence Kennisbank' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Zephyr Testbeheer' })).toBeVisible();
    });

    await test.step('And Kennisbank en Testbeheer projecteren dezelfde echte cases en de Living Doc toont hooguit tien', async () => {
      const eersteMetCase = feed!.delivered.find((row) => row.cases.length)!;
      const uniekeCases = new Map<string, FeedCase>();
      feed!.delivered.forEach((row) => row.cases.forEach((c) => { if (!uniekeCases.has(c.id)) uniekeCases.set(c.id, c); }));

      await page.getByRole('tab', { name: /Kennisbank/ }).click();
      await expect(page.locator('[data-doc-tree] li')).toHaveCount(5);
      await page.locator(`[data-doc-select="${eersteMetCase.cases[0].id}"]`).click();
      await expect(page.locator('[data-doc-title]')).toContainText(eersteMetCase.cases[0].id);
      await expect(page.locator('[data-doc-page]')).toContainText('FUNCTIONEEL ONTWERP');
      await expect(page.locator('[data-doc-page]')).toContainText('TECHNISCH ONTWERP');
      await expect(page.locator('[data-doc-to]')).toContainText(eersteMetCase.cases[0].id);
      await expect(page.locator('[data-doc-gherkin]')).toContainText(eersteMetCase.cases[0].gherkin.split('\n')[0]);
      await expect(page.locator('[data-living-doc] li')).toHaveCount(Math.min(10, feed!.delivered.length));
      await expect(page.locator('[data-living-doc] li').first()).toContainText(verwachteSleutels(feed!)[0]);
      // Een wens mag een link bevatten, maar in de leesbare projectie hoort geen kale URL.
      await expect(page.locator('[data-doc-page]')).not.toContainText('https://');

      await page.getByRole('tab', { name: /Testbeheer/ }).click();
      const verwachtAantal = Math.min(12, uniekeCases.size);
      await expect(page.locator('[data-test-table] tr')).toHaveCount(verwachtAantal);
      for (const c of [...uniekeCases.values()].slice(0, verwachtAantal)) {
        await expect(page.locator(`[data-testcase="${c.id}"]`)).toContainText(c.title.slice(0, 40));
      }
      await expect(page.locator('[data-test-table] .gherkin')).toHaveCount(verwachtAantal);
      await expect(page.locator('[data-test-metrics]')).toContainText(`Geslaagd${verwachtAantal}`);
    });
  });

  test('[PIPE-H-002] een doorgezette wens wordt een GitHub-issue voor VS Code en kan daarna gesimuleerd worden', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await context.route('https://github.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>GitHub (onderschept in de test)</p>' }));
    await page.goto('/pilot/path-pipeline.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');

    await test.step('Given een nieuwe wens met acceptatiecriterium', async () => {
      await page.getByLabel('Samenvatting').fill('Maandtotalen blijven gelijk na filterwissel');
      await page.getByLabel('Stakeholder').selectOption('Backoffice');
      await page.getByLabel('Type').selectOption('bug');
      await page.getByLabel('Gewenste waarde').fill('Backoffice altijd dezelfde betrouwbare maandtotalen ziet');
      await page.getByLabel('Acceptatiecriterium').fill('de gebruiker wisselt tussen Backoffice en medewerkers');
    });

    await test.step('When de flow wordt gestart', async () => {
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.locator('[data-ticket-form] button[type="submit"]').click(),
      ]);
      await expect(page.locator('[data-ticket-form] button[type="submit"]')).toContainText('Start de flow');
      const url = new URL(popup.url());
      expect(url.origin + url.pathname).toBe('https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App/issues/new');
      expect(url.searchParams.get('title')).toBe('PATH-198 Maandtotalen blijven gelijk na filterwissel');
      expect(url.searchParams.get('labels')).toBe('pipeline-intake');
      const body = url.searchParams.get('body') ?? '';
      expect(body).toContain('**Stakeholder:** Backoffice');
      expect(body).toContain('**Acceptatiecriterium:** de gebruiker wisselt tussen Backoffice en medewerkers');
      expect(body).toContain('Scenario: Maandtotalen blijven gelijk na filterwissel');
      expect(body).toContain('PIPELINE-INTAKE.md');
      await popup.close();
    });

    await test.step('Then staat de wens op het bord als wachtend op VS Code, ook na herladen', async () => {
      const kaart = page.locator('[data-ticket="PATH-198"]');
      await expect(kaart).toBeVisible();
      await expect(page.locator('[data-ticket-list="todo"] [data-ticket="PATH-198"] .status-pill')).toHaveText('Wacht op VS Code');
      await expect(kaart.locator('.issue-link')).toHaveAttribute('href', /issues\?q=.*pipeline-intake/);
      await expect(page.locator('[data-flow-title]')).toContainText('PATH-198 is doorgezet naar VS Code');
      await expect(page.locator('[data-form-feedback]')).toContainText('Submit new issue');
      await expect(page.getByLabel('Samenvatting')).toHaveValue('');
      await page.reload();
      await expect(page.locator('[data-ticket-list="todo"] [data-ticket="PATH-198"] .status-pill')).toHaveText('Wacht op VS Code');
    });

    await test.step('And een simulatie op dezelfde kaart loopt door vier fasen naar Zephyr en de Living Doc', async () => {
      await page.locator('[data-run-ticket="PATH-198"]').click();
      await expect(page.locator('[data-ticket="PATH-198"]')).toHaveClass(/is-running/);
      await expect(page.locator('[data-phase].is-active')).toHaveCount(1);
      await expect(page.getByRole('tab', { name: /Kennisbank/ })).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
      await expect(page.locator('[data-living-doc] li').first()).toContainText('PATH-198');
      await expect(page.locator('[data-living-doc] li').first()).toHaveClass(/is-new/);
      await expect(page.locator('[data-living-doc] li').first()).toContainText('simulatie');
      await expect(page.locator('[data-living-doc] li')).toHaveCount(10);
      await expect(page.locator('[data-flow-monitor]')).toContainText('volledig verwerkt (simulatie)');
      await expect(page.locator('[data-doc-title]')).toContainText('PATH-198');
      await expect(page.locator('[data-doc-story]')).toContainText('Als Backoffice');

      await page.getByRole('tab', { name: /Testbeheer/ }).click();
      await expect(page.locator('[data-testcase="TC-DEMO-H-001"]')).toContainText('Maandtotalen blijven gelijk');
      await expect(page.locator('[data-testcase="TC-DEMO-H-001"] .status-pill')).toHaveText(/Geslaagd|Aandacht/);

      await page.getByRole('tab', { name: /Backlog/ }).click();
      await expect(page.locator('[data-ticket-list="done"] [data-ticket="PATH-198"]')).toBeVisible();
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(5);
    });
  });

  test('[PIPE-H-004] zoeken, filteren, sorteren en het detailpaneel werken in alle drie de werkruimtes', async ({ page }) => {
    let feed: Feed;
    await test.step('Given de pipelinepagina met de echte projectstand', async () => {
      await page.goto('/pilot/path-pipeline.html');
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      feed = await feedVanServer(page);
    });

    await test.step('When er wordt gezocht, gefilterd, gesorteerd en een kaart wordt geopend', async () => {
      const alleKaarten = await page.locator('.ticket-card').count();
      expect(alleKaarten).toBeGreaterThan(0);

      // Zoeken beperkt het bord en meldt hoeveel er getoond wordt.
      const eersteCase = feed!.delivered.find((row) => row.cases.length)!.cases[0];
      await page.locator('[data-search]').fill(eersteCase.id);
      await expect(page.locator('[data-board-meta]')).toContainText('getoond');
      const naZoeken = await page.locator('.ticket-card').count();
      expect(naZoeken).toBeLessThan(alleKaarten);
      await page.locator('[data-search-clear]').click();
      await expect(page.locator('.ticket-card')).toHaveCount(alleKaarten);

      // Filteren op bron laat alleen de echte projectstand zien.
      await page.getByRole('button', { name: 'Filters' }).click();
      await expect(page.locator('[data-panel="filters"]')).toBeVisible();
      await page.locator('[data-sourcefilter="local"]').click();
      await expect(page.locator('[data-filter-summary]')).toContainText('eigen demo-wensen');
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(0);
      await page.locator('[data-sourcefilter="all"]').click();
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(5);
      await page.locator('#page-title').click();
      await expect(page.locator('[data-panel="filters"]')).toBeHidden();
    });

    await test.step('Then tonen bord, kennisbank en testbeheer telkens de bijbehorende selectie', async () => {
      // Detailpaneel opent met velden en stuurt door naar de Kennisbank.
      await page.locator('[data-ticket-list="done"] .card-open').first().click();
      await expect(page.locator('[data-detail-drawer]')).toBeVisible();
      const detailKey = await page.locator('[data-detail-key]').textContent();
      expect(detailKey).toBeTruthy();
      expect(await page.locator('[data-detail-fields] dt').count()).toBeGreaterThanOrEqual(6);
      await page.locator('[data-detail-doc]').click();
      await expect(page.locator('[data-detail-drawer]')).toBeHidden();
      await expect(page.getByRole('tab', { name: /Kennisbank/ })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('[data-doc-title]')).toContainText(String(detailKey));

      // Een vaste pagina in de boom laat zich openen en weer verlaten.
      await page.locator('[data-doc-fixed="teststrategie"]').click();
      await expect(page.locator('[data-doc-title]')).toContainText('Teststrategie');
      await page.locator('[data-doc-select]').first().click();
      await expect(page.locator('[data-doc-title]')).not.toContainText('Teststrategie');

      // Zephyr: mappenboom, sorteren op assertions en filteren op status.
      await page.getByRole('tab', { name: /Testbeheer/ }).click();
      expect(await page.locator('[data-test-folders] button').count()).toBeGreaterThan(1);
      await page.locator('[data-sort="assertions"]').click();
      const oplopend = (await page.locator('[data-test-table] .assert-count').allTextContents()).map(Number);
      expect(oplopend.slice().sort((a, b) => a - b)).toEqual(oplopend);
      await page.locator('[data-sort="assertions"]').click();
      const aflopend = (await page.locator('[data-test-table] .assert-count').allTextContents()).map(Number);
      expect(aflopend).toEqual(oplopend.slice().reverse());
      await page.locator('[data-expand-all]').click();
      const rijen = await page.locator('[data-test-table] tr').count();
      await expect(page.locator('[data-test-table] details[open]')).toHaveCount(rijen);
      await page.locator('[data-status="fail"]').click();
      await expect(page.locator('[data-test-table]')).toContainText('Geen testcases met dit filter');
      await page.locator('[data-status="all"]').click();
      await expect(page.locator('[data-test-table] tr')).toHaveCount(rijen);
    });
  });

  test('[PIPE-H-003] de Kennisbank leest in de Atlassian-letterstapel op 16px met regelhoogte 24px, licht en donker', async ({ page }) => {
    await test.step('Given de Kennisbank van de pipelinepagina', async () => {
      await page.goto('/pilot/path-pipeline.html');
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      await page.getByRole('tab', { name: /Kennisbank/ }).click();
      await expect(page.locator('[data-doc-fo]')).toBeVisible();
    });

    for (const schema of ['light', 'dark'] as const) {
      await test.step(`When de lopende tekst in ${schema === 'light' ? 'licht' : 'donker'} wordt gemeten, gebruikt die de Atlassian-letterstapel op 16px/24px`, async () => {
        await page.emulateMedia({ colorScheme: schema });
        const meting = await page.evaluate(() => {
          const lees = (selector: string) => {
            const stijl = getComputedStyle(document.querySelector(selector)!);
            return { font: stijl.fontFamily, size: stijl.fontSize, line: stijl.lineHeight };
          };
          return { lede: lees('[data-doc-summary]'), fo: lees('[data-doc-fo]'), criterium: lees('[data-doc-criterion]') };
        });
        for (const deel of [meting.lede, meting.fo, meting.criterium]) {
          expect(deel.font.replace(/"/g, '')).toMatch(/^-apple-system, BlinkMacSystemFont, Segoe UI, Roboto/);
        }
        expect(meting.fo.size).toBe('16px');
        expect(meting.fo.line).toBe('24px');
        // Intake-proef #43: vóór de fix stond de lopende tekst op 15px met regelhoogte 1.7 in IBM Plex Sans (rood).
      });
    }
  });

  test('[PIPE-H-005] de weergaveknop kiest licht, donker of systeem en onthoudt die keuze', async ({ page }) => {
    const stand = () => page.evaluate(() => ({
      attribuut: document.documentElement.getAttribute('data-theme'),
      canvas: getComputedStyle(document.body).backgroundColor,
    }));

    await test.step('Given een bezoeker met een donkere systeeminstelling', async () => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/pilot/path-pipeline.html');
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      const start = await stand();
      expect(start.attribuut, 'zonder keuze volgt de pagina het systeem').toBeNull();
      expect(start.canvas).toBe('rgb(29, 33, 37)');
    });

    await test.step('When de weergaveknop wordt gebruikt', async () => {
      const knop = page.locator('[data-theme-toggle]');
      await knop.click();
      await expect(knop).toHaveAttribute('data-theme-state', 'light');
      const licht = await stand();
      expect(licht.attribuut, 'een eigen keuze wint van de systeeminstelling').toBe('light');
      expect(licht.canvas).toBe('rgb(247, 248, 249)');

      await knop.click();
      await expect(knop).toHaveAttribute('data-theme-state', 'dark');
      expect((await stand()).canvas).toBe('rgb(29, 33, 37)');

      await knop.click();
      await expect(knop).toHaveAttribute('data-theme-state', 'system');
      expect((await stand()).attribuut, 'terug naar systeem laat het attribuut weer los').toBeNull();
    });

    await test.step('Then blijft de keuze staan na herladen', async () => {
      await page.locator('[data-theme-toggle]').click();
      await page.reload();
      await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('data-theme-state', 'light');
      expect((await stand()).canvas).toBe('rgb(247, 248, 249)');
      await expect(page.locator('[data-theme-toggle]')).toHaveAttribute('aria-label', /licht/);
    });
  });

  test('[PIPE-N-001] de demo blijft lokaal, begrenst de Living Doc op tien en past op een telefoon', async ({ page }) => {
    await page.addInitScript(([key]) => {
      localStorage.setItem(key, JSON.stringify({
        schemaVersion: 3,
        sequence: 198,
        customTickets: [],
        customTests: [],
        activePhase: 0,
        activeTicket: '',
        livingDoc: Array.from({ length: 14 }, (_, index) => ({
          key: `PATH-${300 + index}`,
          text: `Lokale demoregel ${index + 1}`,
          result: 'Geslaagd (simulatie)',
          time: '15 sep · 20:00',
        })),
      }));
    }, [STORAGE_KEY]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pilot/path-pipeline.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');

    await test.step('When de Kennisbank op de telefoon wordt geopend', async () => {
      await page.getByRole('tab', { name: /Kennisbank/ }).click();
    });

    await test.step('Then toont de Living Doc precies tien regels, lokaal vóór echt, en bewaart hij er tien', async () => {
      await expect(page.locator('[data-living-doc] li')).toHaveCount(10);
      await expect(page.locator('[data-living-doc] li').first()).toContainText('PATH-300');
      await expect(page.locator('[data-living-doc]')).not.toContainText('PATH-310');
      const bewaard = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').livingDoc.length, STORAGE_KEY);
      expect(bewaard).toBe(10);
    });

    await test.step('And de pagina heeft geen horizontale overflow of gedeelde appcode', async () => {
      const breedte = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        buitenBeeld: Array.from(document.querySelectorAll<HTMLElement>('body *'))
          .map(element => ({ element: element.tagName.toLowerCase(), className: element.className, rect: element.getBoundingClientRect() }))
          .filter(item => item.rect.right > window.innerWidth + 1 || item.rect.left < -1)
          .slice(0, 12)
          .map(item => `${item.element}.${String(item.className)} [${Math.round(item.rect.left)}, ${Math.round(item.rect.right)}]`),
      }));
      expect(breedte.document, `Elementen buiten beeld: ${breedte.buitenBeeld.join(', ')}`).toBeLessThanOrEqual(breedte.viewport + 1);
      // Alle drie de werkruimtes moeten op een telefoon zichtbaar naast elkaar passen.
      const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]'))
        .map((tab) => ({ naam: (tab.textContent || '').replace(/\s+/g, ' ').trim(), rechts: Math.round(tab.getBoundingClientRect().right) })));
      expect(tabs).toHaveLength(3);
      const buitenBeeld = tabs.filter((tab) => tab.rechts > 391);
      expect(buitenBeeld, `Tabbladen buiten beeld: ${buitenBeeld.map((t) => t.naam).join(', ')}`).toEqual([]);
      await expect(page.locator('script[src*="assets/app.js"], link[href*="assets/styles.css"]')).toHaveCount(0);
      await expect(page.locator('footer')).toContainText('geen koppeling met een bestaand Jira-, Confluence- of Zephyr-account');
      await expect(page.locator('footer')).toContainText('GitHub-issue');
    });
  });

  test('[PIPE-H-006] de Living Doc leest op vijftien pixels, in licht en in donker', async ({ page }) => {
    // Intake #45 van Gio via de demo-pagina: de regels moeten ook op een
    // telefoon goed leesbaar zijn. Dertien pixels was te klein. Deze case meet
    // de berekende stijl in beide kleurschema's, zodat een latere opmaakronde
    // het niet ongemerkt terugdraait.
    await test.step('Given de Living Doc in de Kennisbank', async () => {
      await page.goto('/pilot/path-pipeline.html');
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      await page.getByRole('tab', { name: /Kennisbank/ }).click();
      await expect(page.locator('[data-living-doc] li').first()).toBeVisible();
    });

    for (const schema of ['light', 'dark'] as const) {
      await test.step(`When de tekst in ${schema === 'light' ? 'licht' : 'donker'} wordt gemeten, staat hij op vijftien pixels`, async () => {
        await page.emulateMedia({ colorScheme: schema });
        const regel = await page.evaluate(() => {
          const stijl = getComputedStyle(document.querySelector('[data-living-doc] li p')!);
          return { grootte: stijl.fontSize, hoogte: stijl.lineHeight };
        });
        expect(regel.grootte, 'de tekst van een Living Doc-regel').toBe('15px');
      });
    }

    await test.step('Then blijft de regel ook op een telefoon binnen beeld', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ colorScheme: 'light' });
      const breedte = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      expect(breedte.document).toBeLessThanOrEqual(breedte.viewport + 1);
      await expect(page.locator('[data-living-doc] li').first()).toBeVisible();
    });
  });
});
