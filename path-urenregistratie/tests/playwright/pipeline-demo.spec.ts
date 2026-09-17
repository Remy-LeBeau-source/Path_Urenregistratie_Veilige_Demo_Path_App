import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type FeedCase = { id: string; title: string; platform: string; gherkin: string };
type Feed = { appVersion: string; delivered: Array<{ version: string; wish: string; cases: FeedCase[] }>; open: Array<{ status: string }> };

const STORAGE_KEY = 'path-pipeline-demo-v1';

async function feedVanServer(page: Page): Promise<Feed> {
  const response = await page.request.get('/pilot/path-kwaliteitsstraat-data.json');
  expect(response.status(), 'de echte projectstand moet mee-uitgerold zijn').toBe(200);
  return response.json();
}

// Hoeveel kaarten/regels de pagina per keer tekent (PER_KEER in
// pilot/path-kwaliteitsstraat.js). De feed bevat sinds 17 sep de volledige
// historie; deze getallen gaan alleen over wat er zonder "Toon meer" staat.
const PER_KEER_DONE = 12;
const PER_KEER_DOC = 12;
const PER_KEER_TESTS = 25;
const PER_KEER_LIVING = 10;

function verwachteSleutels(feed: Feed, aantal: number = PER_KEER_DONE): string[] {
  const gebruikt = new Set<string>();
  return feed.delivered.slice(0, aantal).map((row) => {
    const versie = row.version.match(/\d+\.\d+\.\d+/);
    const basis = row.cases[0]?.id ?? (versie ? versie[0] : (row.version.split(/[\s(]/)[0] || 'oplevering').toUpperCase());
    let sleutel = basis;
    for (let n = 2; gebruikt.has(sleutel); n += 1) sleutel = `${basis}-${n}`;
    gebruikt.add(sleutel);
    return sleutel;
  });
}

/**
 * De intakewachtrij weigert meer dan vijf wensen per kwartier vanaf hetzelfde
 * adres. Die grens is er voor de open demo-omgeving en blijft staan; hem voor de
 * test verruimen zou precies de bescherming weghalen die we willen. In plaats
 * daarvan begint elke run met een lege wachtrij. Het pad wordt niet geraden maar
 * bij de code zelf opgevraagd, zodat test en endpoint nooit uit elkaar lopen.
 */
function leegDeWachtrij(): void {
  const projectMap = join(__dirname, '..', '..');
  const pad = execFileSync('php', ['-r', "require 'pilot/path-kwaliteitsstraat-intake-lib.php'; echo intake_omgeving_en_pad()[1];"], {
    cwd: projectMap,
    encoding: 'utf8',
  }).trim();
  expect(pad, 'de wachtrij moet een echt pad hebben').toContain('path-kwaliteitsstraat-intake.json');
  rmSync(pad, { force: true });
}

test.describe('Path Pipeline TEST-demo', () => {
  test.beforeAll(() => {
    leegDeWachtrij();
  });

  test('[PIPE-N-003] de oude bestandsnaam wijst door naar Path Kwaliteitsstraat, en de bestemming laadt zijn eigen stylesheet en script echt', async ({ page }) => {
    // Hernoemd op 16 sep (2.0.136): pilot/path-pipeline.html -> pilot/path-kwaliteitsstraat.html.
    // De naam mocht niet Jira/Confluence/Zephyr worden, want dat zijn Atlassian-merknamen
    // en dit staat op een publieke pagina onder Path's eigen domein. De oude URL blijft
    // bereikbaar zodat een eerder gedeelde link niet zomaar 404 geeft.
    //
    // Waarom dit meer test dan alleen de doorverwijzing: bij de eerste versie van deze
    // hernoeming (0de7ed5b) verwees de bestemmingspagina zelf nog naar de oude
    // path-pipeline.css en path-pipeline.js -- een staging-fout, de werkboom had de
    // juiste inhoud maar die was nooit gestaged. De pagina laadde toen ongestyled,
    // want beide bestanden bestaan onder hun oude naam niet meer. Een test die alleen
    // DOM-structuur of computed style controleert, kan zoiets missen als een
    // toevallige browserstandaard erop lijkt; dit telt de echte netwerkantwoorden.
    const mislukteEigenVerzoeken: string[] = [];
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.hostname === new URL(page.url() || 'http://localhost').hostname || url.pathname.startsWith('/pilot/')) {
        if (!response.ok() && !response.url().endsWith('path-pipeline.html')) {
          mislukteEigenVerzoeken.push(`${response.status()} ${response.url()}`);
        }
      }
    });

    const response = await page.goto('/pilot/path-pipeline.html');
    expect(response?.status()).toBe(200);
    // De meta-refresh (content="0") vuurt na het laden van de stub, niet erbinnen:
    // expliciet wachten op de nieuwe URL in plaats van er meteen op te vertrouwen.
    await page.waitForURL(/path-kwaliteitsstraat\.html$/);
    await expect(page.locator('body')).toHaveAttribute('data-pilot-design', 'path-kwaliteitsstraat');

    // Het doorslaggevende bewijs: geen enkel eigen verzoek (css/js/data) mag mislukken.
    // Een computed-style-vergelijking (kleur, font) bleek hier te broos om als bewijs te
    // dienen -- welke kleur "actief" hoort te zijn hangt af van welke tab actief is, en
    // dat verandert legitiem mee met andere wensen (de pagina landt sinds 2.0.134 op
    // Confluence, niet Jira). Een mislukt netwerkverzoek naar onze eigen bestanden kan
    // nooit legitiem zijn, en dat is precies waarop dit incident (0de7ed5b) omviel: de
    // pagina verwees naar path-pipeline.css/.js die niet meer bestonden. Tegenproef
    // gedraaid: met die oude verwijzingen terug geeft deze assertie exact deze twee
    // regels als mislukt, en niets anders.
    expect(mislukteEigenVerzoeken, 'geen enkel eigen verzoek (css/js/data) mag 404 of een andere foutstatus geven').toEqual([]);

    // 17 sep: de pagina laadde zijn eigen stylesheet en script zónder
    // versieparameter, waardoor een browser na een uitrol de oude versie bleef
    // gebruiken -- hetzelfde probleem dat index.html eerder had. Gevonden doordat
    // een testcase in de volledige run op gecachte JS viel en los wél slaagde.
    // set-version.mjs schrijft dit nummer nu mee, dus het volgt automatisch de app.
    const verwachteVersie = JSON.parse(
      await readFile(join(process.cwd(), 'package.json'), 'utf8'),
    ).version as string;
    const eigenAssets = await page.evaluate(() => ({
      css: Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((el) => el.getAttribute('href') || '')
        .filter((href) => href.includes('path-kwaliteitsstraat')),
      js: Array.from(document.querySelectorAll('script[src]'))
        .map((el) => el.getAttribute('src') || '')
        .filter((src) => src.includes('path-kwaliteitsstraat')),
    }));
    expect(eigenAssets.css, 'de pagina laadt zijn eigen stylesheet').toHaveLength(1);
    expect(eigenAssets.js, 'de pagina laadt zijn eigen script').toHaveLength(1);
    for (const verwijzing of [...eigenAssets.css, ...eigenAssets.js]) {
      expect(verwijzing, `${verwijzing} hoort de huidige appversie als cache-buster te dragen`).toContain(`?v=${verwachteVersie}`);
    }
  });

  test('[PIPE-H-001] de demo toont de echte laatste opleveringen uit GIO-WENSEN met hun cases en Gherkin', async ({ page }) => {
    let feed: Feed;
    await test.step('Given de zelfstandige TEST-only pipelinepagina met de echte projectstand', async () => {
      expect((await page.goto('/pilot/path-kwaliteitsstraat.html'))?.status()).toBe(200);
      feed = await feedVanServer(page);
      expect(feed.delivered.length, 'GIO-WENSEN "Klaar" levert opleveringen').toBeGreaterThanOrEqual(5);
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      // Bovenin de versheid van de stand; het versienummer staat in de voettekst (wens Gio, 16 sep).
      await expect(page.locator('[data-feed-version]')).toContainText('Bijgewerkt');
      await expect(page.locator('footer [data-demo-versie]')).toContainText(`versie ${feed.appVersion}`);
    });

    await test.step('When de pagina is geladen, staan de vier fasen en de eerste echte opleveringen op het bord', async () => {
      await expect(page.locator('body')).toHaveAttribute('data-pilot-design', 'path-kwaliteitsstraat');
      await expect(page.locator('[data-phase]')).toHaveCount(4);
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(PER_KEER_DONE);
      await expect(page.locator('[data-ticket-list="done"] .issue-key')).toHaveText(verwachteSleutels(feed!));
      await expect(page.locator('[data-ticket-list="done"] [data-source="feed"]')).toHaveCount(PER_KEER_DONE);
      const metGherkin = feed!.delivered.slice(0, PER_KEER_DONE).filter((row) => row.cases.some((c) => c.gherkin)).length;
      await expect(page.locator('[data-ticket-list="done"] .gherkin')).toHaveCount(metGherkin);
      // De kolomteller telt de hele kolom, niet alleen wat getekend is -- anders
      // lijkt de historie te krimpen zolang je niet hebt uitgeklapt.
      await expect(page.locator('[data-count="done"]')).toHaveText(String(feed!.delivered.length));
    });

    await test.step('And "Toon meer" haalt de rest van de historie erbij in plaats van hem af te kappen', async () => {
      // De pagina landt op Confluence (besluit 2.0.134); klikken kan pas als het
      // bord echt zichtbaar is. De tellingen hierboven werken ook verborgen.
      await page.getByRole('tab', { name: /Backlog/ }).click();
      const totaal = feed!.delivered.length;
      expect(totaal, 'de feed draagt de volledige historie, niet alleen de laatste tien').toBeGreaterThan(PER_KEER_DONE);
      const meer = page.locator('[data-ticket-list="done"] [data-toon-meer="done"]');
      await expect(meer).toContainText(String(totaal - PER_KEER_DONE));
      await meer.click();
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(Math.min(totaal, PER_KEER_DONE * 2));
    });

    await test.step('And de zoekbalk vindt ook een oplevering die buiten de eerste lading valt', async () => {
      // Dit is precies wat vóór 17 sep niet kon: de afkap stond vóór het filteren,
      // dus alles ouder dan de nieuwste tien was onvindbaar via zoeken.
      const oud = feed!.delivered[feed!.delivered.length - 1];
      const oudeSleutel = verwachteSleutels(feed!, feed!.delivered.length).slice(-1)[0];
      expect(oud, 'er is een oudste oplevering').toBeTruthy();
      const zoekterm = (oud.version.match(/\d+\.\d+\.\d+/) || [oudeSleutel])[0];
      await page.locator('[data-search]').fill(zoekterm);
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).not.toHaveCount(0);
      await expect(page.locator('[data-ticket-list="done"]')).toContainText(zoekterm);
      await page.locator('[data-search]').fill('');
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(PER_KEER_DONE);
      const openOpBord = feed!.open.length;
      const todo = Number(await page.locator('[data-count="todo"]').textContent());
      const doing = Number(await page.locator('[data-count="doing"]').textContent());
      expect(todo + doing, 'open wensen uit GIO-WENSEN staan in Te doen of In uitvoering').toBe(openOpBord);
      await expect(page.getByRole('button', { name: 'Jira Backlog' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Confluence Kennisbank' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Zephyr Testbeheer' })).toBeVisible();
    });

    await test.step('And Kennisbank en Testbeheer projecteren dezelfde echte cases, met paginering in plaats van een afkap', async () => {
      const eersteMetCase = feed!.delivered.find((row) => row.cases.length)!;
      const uniekeCases = new Map<string, FeedCase>();
      feed!.delivered.forEach((row) => row.cases.forEach((c) => { if (!uniekeCases.has(c.id)) uniekeCases.set(c.id, c); }));

      await page.getByRole('tab', { name: /Kennisbank/ }).click();
      // 12 pagina's plus de "Toon meer"-regel eronder.
      await expect(page.locator('[data-doc-tree] li:not(.toon-meer-rij)')).toHaveCount(PER_KEER_DOC);
      await expect(page.locator('[data-doc-tree] [data-toon-meer="doc"]')).toBeVisible();
      await page.locator(`[data-doc-select="${eersteMetCase.cases[0].id}"]`).click();
      await expect(page.locator('[data-doc-title]')).toContainText(eersteMetCase.cases[0].id);
      await expect(page.locator('[data-doc-page]')).toContainText('FUNCTIONEEL ONTWERP');
      await expect(page.locator('[data-doc-page]')).toContainText('TECHNISCH ONTWERP');
      await expect(page.locator('[data-doc-to]')).toContainText(eersteMetCase.cases[0].id);
      await expect(page.locator('[data-doc-gherkin]')).toContainText(eersteMetCase.cases[0].gherkin.split('\n')[0]);
      await expect(page.locator('[data-living-doc] li:not(.toon-meer-rij)')).toHaveCount(Math.min(PER_KEER_LIVING, feed!.delivered.length));
      await expect(page.locator('[data-living-doc] li').first()).toContainText(verwachteSleutels(feed!)[0]);
      // Een wens mag een link bevatten, maar in de leesbare projectie hoort geen kale URL.
      await expect(page.locator('[data-doc-page]')).not.toContainText('https://');

      await page.getByRole('tab', { name: /Testbeheer/ }).click();
      const verwachtAantal = Math.min(PER_KEER_TESTS, uniekeCases.size);
      await expect(page.locator('[data-test-table] tr:not(.toon-meer-rij)')).toHaveCount(verwachtAantal);
      for (const c of [...uniekeCases.values()].slice(0, verwachtAantal)) {
        await expect(page.locator(`[data-testcase="${c.id}"]`)).toContainText(c.title.slice(0, 40));
      }
      await expect(page.locator('[data-test-table] .gherkin')).toHaveCount(verwachtAantal);
      // De metriek telt álle cases uit de historie, niet alleen de getekende rijen.
      await expect(page.locator('[data-test-metrics]')).toContainText(`Geslaagd${uniekeCases.size}`);
      await expect(page.locator('[data-test-count]')).toHaveText(String(uniekeCases.size));
    });
  });

  test('[PIPE-H-002] opslaan in het Confluence-loket is genoeg: de wens landt in de wachtrij op de server, niet bij GitHub', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Tegenbewijs voor de oude werkwijze: de pagina opende zelf een GitHub-tabblad
    // dat Gio nog moest afmaken. Elk verzoek naar github.com faalt hier hard, dus
    // als de pagina dat opnieuw zou doen valt deze case om in plaats van stil door
    // te gaan.
    let githubBezocht = 0;
    await context.route('https://github.com/**', (route) => { githubBezocht += 1; return route.abort(); });

    // De Confluence-pagina heeft zelf ook een kop "Stakeholdervraag", dus de velden
    // worden binnen het formulier gezocht en niet op de hele pagina.
    const formulier = page.locator('[data-ticket-form]');

    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');

    await test.step('Given de pagina opent in Confluence, want daar begint de keten', async () => {
      // De volgorde volgt de werkelijkheid: de vraag ontstaat in Confluence, wordt
      // daarna een ticket in Jira en landt als testcase in Zephyr. Zowel de landing
      // als de leesvolgorde van de tabs moet dat aanhouden.
      await expect(page.getByRole('tab', { name: /Kennisbank/ })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('[data-ticket-form]')).toBeVisible();
      const tabVolgorde = await page.getByRole('tab').allTextContents();
      expect(tabVolgorde.map((t) => t.replace(/\s+/g, ' ').trim())).toEqual([
        expect.stringContaining('Confluence'),
        expect.stringContaining('Jira'),
        expect.stringContaining('Zephyr'),
      ]);
      // Deze pagina mag openbaar staan onder één voorwaarde, en die voorwaarde
      // hoort zichtbaar naast het invoerveld te staan -- niet in de kleine letters.
      await expect(page.locator('#nieuwe-wens')).toContainText('openbaar');
      await expect(page.locator('#nieuwe-wens')).toContainText('geen persoonsgegevens en geen klantgegevens');
      await expect(page.locator('#nieuwe-wens')).toContainText('Jouw vraag als stakeholder');
    });

    await test.step('And vanaf het Jira-bord wijst een knop terug naar het loket', async () => {
      await page.getByRole('tab', { name: /Backlog/ }).click();
      await expect(page.locator('[data-ticket-form]')).toBeHidden();
      await page.getByRole('button', { name: /Naar het wensenloket/ }).click();
      await expect(page.getByRole('tab', { name: /Kennisbank/ })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('[data-ticket-form]')).toBeVisible();
    });

    await test.step('And een nieuwe wens met acceptatiecriterium', async () => {
      await formulier.getByLabel('Samenvatting').fill('Maandtotalen blijven gelijk na filterwissel');
      await formulier.getByLabel('Stakeholder').selectOption('Backoffice');
      await formulier.getByLabel('Type').selectOption('bug');
      await formulier.getByLabel('Gewenste waarde').fill('Backoffice altijd dezelfde betrouwbare maandtotalen ziet');
      await formulier.getByLabel('Acceptatiecriterium').fill('de gebruiker wisselt tussen Backoffice en medewerkers');

      // Het loket denkt mee in de taal van de rol die invult: de losse velden
      // worden meteen een leesbare user story, niet pas na het opslaan.
      await expect(page.locator('[data-story-preview]')).toHaveText(
        'Als Backoffice wil ik maandtotalen blijven gelijk na filterwissel, zodat Backoffice altijd dezelfde betrouwbare maandtotalen ziet.'
      );
      await expect(page.locator('[data-gherkin-preview]')).toContainText('Scenario: Maandtotalen blijven gelijk na filterwissel');
    });

    let sleutel = '';
    await test.step('When de flow wordt gestart, gaat de wens naar de eigen wachtrij en niet naar GitHub', async () => {
      const [antwoord] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('path-kwaliteitsstraat-intake.php') && r.request().method() === 'POST'),
        page.locator('[data-ticket-form] button[type="submit"]').click(),
      ]);
      expect(antwoord.status(), 'de wachtrij neemt de wens aan').toBe(201);
      const json = await antwoord.json();
      sleutel = json.wish.key;
      expect(sleutel).toMatch(/^PATH-\d+$/);
      expect(json.wish.status).toBe('aangenomen');
      expect(json.wish.stakeholder).toBe('Backoffice');
      expect(json.wish.criterion).toBe('de gebruiker wisselt tussen Backoffice en medewerkers');
      expect(json.wish.ip_hash, 'het IP-kenmerk blijft binnen de server').toBeUndefined();
      expect(githubBezocht, 'de pagina stuurt niemand meer naar GitHub').toBe(0);
      expect(context.pages().length, 'er gaat geen tweede tabblad open').toBe(1);
    });

    await test.step('Then meldt de pagina dat hij is aangenomen en staat hij op het bord, ook na herladen', async () => {
      await expect(page.locator('[data-form-feedback]')).toContainText(`${sleutel} is aangenomen`);
      await expect(page.locator('[data-form-feedback]')).not.toContainText('Submit new issue');
      await expect(formulier.getByLabel('Samenvatting')).toHaveValue('');
      await expect(page.locator('[data-flow-title]')).toContainText(`${sleutel} is aangenomen`);
      await page.getByRole('tab', { name: /Backlog/ }).click();
      await expect(page.locator(`[data-ticket-list="todo"] [data-ticket="${sleutel}"] .status-pill`)).toHaveText('Wacht op VS Code');
      await page.reload();
      await expect(page.locator(`[data-ticket-list="todo"] [data-ticket="${sleutel}"] .status-pill`)).toHaveText('Wacht op VS Code');
    });

    await test.step('And een tweede bezoeker met een schone browser ziet dezelfde wens, want de wachtrij staat op de server', async () => {
      const tweede = await context.browser()!.newPage();
      await tweede.goto('/pilot/path-kwaliteitsstraat.html');
      await expect(tweede.locator('body')).toHaveAttribute('data-queue', 'loaded');
      await tweede.getByRole('tab', { name: /Backlog/ }).click();
      await expect(tweede.locator(`[data-ticket-list="todo"] [data-ticket="${sleutel}"]`)).toBeVisible();
      await tweede.close();
    });

    await test.step('And een simulatie op dezelfde kaart loopt door vier fasen naar Zephyr en de Living Doc', async () => {
      // Na het herladen staat de pagina weer op Confluence; de simulatieknop hoort
      // bij de kaart op het Jira-bord.
      await page.getByRole('tab', { name: /Backlog/ }).click();
      await page.locator(`[data-run-ticket="${sleutel}"]`).click();
      await expect(page.locator(`[data-ticket="${sleutel}"]`)).toHaveClass(/is-running/);
      await expect(page.locator('[data-phase].is-active')).toHaveCount(1);
      await expect(page.getByRole('tab', { name: /Kennisbank/ })).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
      await expect(page.locator('[data-living-doc] li').first()).toContainText(sleutel);
      await expect(page.locator('[data-living-doc] li').first()).toHaveClass(/is-new/);
      await expect(page.locator('[data-living-doc] li').first()).toContainText('simulatie');
      await expect(page.locator('[data-living-doc] li:not(.toon-meer-rij)')).toHaveCount(PER_KEER_LIVING);
      await expect(page.locator('[data-flow-monitor]')).toContainText('volledig verwerkt (simulatie)');
      await expect(page.locator('[data-doc-title]')).toContainText(sleutel);
      await expect(page.locator('[data-doc-story]')).toContainText('Als Backoffice');

      await page.getByRole('tab', { name: /Testbeheer/ }).click();
      await expect(page.locator('[data-testcase="TC-DEMO-H-001"]')).toContainText('Maandtotalen blijven gelijk');
      await expect(page.locator('[data-testcase="TC-DEMO-H-001"] .status-pill')).toHaveText(/Geslaagd|Aandacht/);

      await page.getByRole('tab', { name: /Backlog/ }).click();
      await expect(page.locator(`[data-ticket-list="done"] [data-ticket="${sleutel}"]`)).toBeVisible();
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(PER_KEER_DONE);
    });
  });

  test('[PIPE-H-009] de koppelingen tonen welke bron geldt en lekken nooit een instelling', async ({ page, request }) => {
    // Opdracht Gio (17 sep): naast onze eigen omgeving moet een klant zijn eigen
    // Jira, Confluence of Zephyr kunnen koppelen. Dit pint de vorm daarvan vast
    // vóór de eerste echte koppeling bestaat, want het gevaarlijke deel is niet
    // het koppelen zelf maar wat er dan zichtbaar wordt: deze pagina is openbaar
    // en zonder inloggen bereikbaar, dus een basis-URL of token van een klant
    // mag er nooit in het antwoord staan.
    const url = '/pilot/path-kwaliteitsstraat-koppelingen.php';
    let body: {
      environment: string;
      actief: string;
      bronnen: Array<{ sleutel: string; label: string; soort: string; status: string; levert: string[]; benodigd: string[] }>;
    };

    await test.step('Given het koppelingen-endpoint van de open demo-omgeving', async () => {
      const antwoord = await request.get(url);
      expect(antwoord.status()).toBe(200);
      body = await antwoord.json();
      expect(body.environment).not.toBe('production');
    });

    await test.step('Then geldt onze eigen bron en staan de drie klantbronnen klaar', async () => {
      expect(body.actief).toBe('eigen');
      expect(body.bronnen.map((b) => b.sleutel)).toEqual(['eigen', 'jira', 'confluence', 'zephyr']);

      const eigen = body.bronnen.find((b) => b.sleutel === 'eigen')!;
      expect(eigen.soort).toBe('intern');
      expect(eigen.status).toBe('operationeel');
      expect(eigen.levert).toEqual(['tickets', 'documenten', 'testcases']);

      // Lokaal is er niets ingesteld, dus de drie externe bronnen horen zich
      // eerlijk als "voorbereid" te melden -- niet als gekoppeld.
      for (const sleutel of ['jira', 'confluence', 'zephyr']) {
        const bron = body.bronnen.find((b) => b.sleutel === sleutel)!;
        expect(bron.soort, `${sleutel} is een externe bron`).toBe('extern');
        expect(bron.status, `${sleutel} is nog niet aangesloten`).toBe('voorbereid');
        expect(bron.benodigd.length, `${sleutel} vertelt wat we van de klant nodig hebben`).toBeGreaterThan(1);
      }
      // Zephyr heeft een eigen token, los van Atlassian: dat staat er expliciet in,
      // anders wordt dat bij de eerste echte koppeling gegarandeerd vergeten.
      const zephyr = body.bronnen.find((b) => b.sleutel === 'zephyr')!;
      expect(zephyr.benodigd.join(' ')).toMatch(/eigen Zephyr Scale API-token/i);
    });

    await test.step('And staat er nergens een instelling in het antwoord', async () => {
      // Niet op losse woorden toetsen: de uitleg mag "API-token" gewoon noemen,
      // dat beschrijft juist wat we van een klant nodig hebben. Wat nooit mag, is
      // een instelling zelf -- dus getoetst op de vorm: geen configuratiesleutels
      // in de objecten, en geen enkele waarde die eruitziet als een adres of een
      // sleutel. Zodra het endpoint ooit base_url of token meestuurt, valt dit om.
      const verbodenSleutels = ['base_url', 'token', 'api_key', 'apikey', 'password', 'secret', 'email'];
      const controleer = (waarde: unknown, pad: string): void => {
        if (Array.isArray(waarde)) {
          waarde.forEach((item, i) => controleer(item, `${pad}[${i}]`));
          return;
        }
        if (waarde && typeof waarde === 'object') {
          for (const [sleutel, inhoud] of Object.entries(waarde)) {
            expect(verbodenSleutels, `${pad}.${sleutel} is een configuratiesleutel en hoort niet in een openbaar antwoord`)
              .not.toContain(sleutel.toLowerCase());
            controleer(inhoud, `${pad}.${sleutel}`);
          }
          return;
        }
        if (typeof waarde === 'string') {
          expect(waarde, `${pad} bevat een adres`).not.toMatch(/https?:\/\//i);
          expect(waarde, `${pad} bevat een omgevingsnaam van een klant`).not.toMatch(/atlassian\.net/i);
        }
      };
      controleer(body, 'antwoord');
    });

    await test.step('And legt de Kennisbank uit wat er per koppeling nodig is', async () => {
      await page.goto('/pilot/path-kwaliteitsstraat.html');
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      await page.getByRole('tab', { name: /Kennisbank/ }).click();
      await page.locator('[data-doc-fixed="koppelingen"]').click();
      await expect(page.locator('[data-doc-title]')).toContainText('Koppelingen');
      await expect(page.locator('[data-doc-page]')).toContainText('projectsleutel');
      await expect(page.locator('[data-doc-page]')).toContainText('serviceaccount');
      // Ook hier: de uitleg mag geen echte omgeving van een klant noemen.
      await expect(page.locator('[data-doc-page]')).not.toContainText('atlassian.net');
    });
  });

  test('[PIPE-N-002] de intakewachtrij weigert onvolledige, te grote en verkeerd geadresseerde invoer, en bestaat niet op productie', async ({ request }) => {
    const url = '/pilot/path-kwaliteitsstraat-intake.php';

    await test.step('Given de intakewachtrij van de open demo-omgeving', async () => {
      const antwoord = await request.get(url);
      expect(antwoord.status()).toBe(200);
      expect((await antwoord.json()).environment).not.toBe('production');
    });

    await test.step('When er onvolledige, onleesbare, te grote en verkeerd geadresseerde verzoeken binnenkomen', async () => {
      const zonderCriterium = await request.post(url, { data: { title: 'Alleen een titel', goal: 'iets', criterion: '' } });
      expect(zonderCriterium.status()).toBe(422);
      expect((await zonderCriterium.json()).error).toContain('alle drie nodig');

      const onleesbaar = await request.post(url, { headers: { 'Content-Type': 'application/json' }, data: 'dit is geen json' });
      expect(onleesbaar.status()).toBe(400);

      const teGroot = await request.post(url, { data: { title: 'x'.repeat(5000), goal: 'g', criterion: 'c' } });
      expect(teGroot.status()).toBe(413);

      const verkeerdeMethode = await request.fetch(url, { method: 'DELETE' });
      expect(verkeerdeMethode.status()).toBe(405);
      expect(verkeerdeMethode.headers()['allow']).toBe('GET, POST');
    });

    await test.step('Then staat er van al die pogingen niets in de wachtrij en lekt er geen IP-kenmerk', async () => {
      const antwoord = await request.get(url);
      expect(antwoord.status()).toBe(200);
      const json = await antwoord.json();
      expect(json.wishes.some((w: { title: string }) => w.title.startsWith('Alleen een titel'))).toBe(false);
      expect(json.wishes.some((w: { title: string }) => w.title.startsWith('xxxx'))).toBe(false);
      expect(json.wishes.every((w: Record<string, unknown>) => w.ip_hash === undefined)).toBe(true);
      expect(JSON.stringify(json)).not.toContain('127.0.0.1');
    });

    await test.step('And op een productieomgeving bestaat de wachtrij helemaal niet', async () => {
      const projectMap = join(__dirname, '..', '..');
      const opProductie = execFileSync('php', ['pilot/path-kwaliteitsstraat-intake.php'], {
        cwd: projectMap, encoding: 'utf8', env: { ...process.env, PATH_APP_ENVIRONMENT: 'production' },
      });
      expect(opProductie).toContain('bestaat alleen op TEST');
      expect(opProductie).not.toContain('wishes');

      // Tegenproef: dezelfde aanroep zonder dat slot geeft wel de wachtrij terug,
      // dus de weigering hierboven komt door de omgeving en niet doordat het
      // endpoint sowieso niets doet.
      const opTest = execFileSync('php', ['pilot/path-kwaliteitsstraat-intake.php'], {
        cwd: projectMap, encoding: 'utf8', env: { ...process.env, PATH_APP_ENVIRONMENT: 'test' },
      });
      expect(opTest).toContain('wishes');
      expect(opTest).not.toContain('bestaat alleen op TEST');
    });
  });

  test('[PIPE-H-007] de keuzelijst vult het formulier voor, Te doen laat zich ordenen en de versie staat in de voet', async ({ page }) => {
    // Beslistabel op de keuzelijst (kiezen vult voor, zelf typen blijft mogelijk, loslaten
    // maakt vrij) + toestandsovergang op de volgorde in Te doen (slepen en toetsenbord,
    // blijft na herladen) + inhoudscontrole van de versheidsregel en de voettekst.
    // Basisregel van Gio, 16 sep: verbeteringen die wij al zien staan in GIO-WENSEN.md
    // onder "Nice to have" en het formulier toont ze; slepen mag alleen binnen Te doen.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // De Confluence-pagina heeft zelf ook koppen als Stakeholdervraag: velden binnen het formulier zoeken.
    const formulier = page.locator('[data-ticket-form]');
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
    const feed = await page.request.get('/pilot/path-kwaliteitsstraat-data.json').then((r) => r.json()) as {
      appVersion: string; generatedAt: string; niceToHave: Array<{ improvement: string; why: string }>;
    };
    expect(feed.niceToHave.length, 'GIO-WENSEN "Nice to have" levert de keuzelijst').toBeGreaterThan(0);

    await test.step('Given de keuzelijst toont de nice-to-haves uit GIO-WENSEN', async () => {
      const chips = page.locator('[data-keuzelijst] [data-keuze]:not([data-keuze="-1"])');
      await expect(chips).toHaveCount(feed.niceToHave.length);
      await expect(chips.first()).toContainText(feed.niceToHave[0].improvement.slice(0, 30));
      await expect(chips.first()).toHaveAttribute('aria-pressed', 'false');
    });

    await test.step('When de PO een verbetering kiest, then staan samenvatting en waarde ingevuld en blijft het criterium aan hem', async () => {
      await page.locator('[data-keuzelijst] [data-keuze="0"]').click();
      await expect(page.locator('[data-keuzelijst] [data-keuze="0"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(formulier.getByLabel('Samenvatting')).toHaveValue(feed.niceToHave[0].improvement.slice(0, 90));
      await expect(formulier.getByLabel('Gewenste waarde')).toHaveValue(feed.niceToHave[0].why.slice(0, 140));
      await expect(formulier.getByLabel('Acceptatiecriterium')).toHaveValue('');
      await expect(formulier.getByLabel('Acceptatiecriterium')).toBeFocused();
      await expect(page.locator('[data-gherkin-preview]')).toContainText(feed.niceToHave[0].improvement.slice(0, 30));
    });

    await test.step('And zelf typen blijft mogelijk: aanpassen maakt de keuze niet ongedaan, loslaten wel', async () => {
      await formulier.getByLabel('Samenvatting').fill('Eigen formulering van dezelfde verbetering');
      await expect(page.locator('[data-keuzelijst] [data-keuze="0"]')).toHaveAttribute('aria-pressed', 'true');
      await page.locator('[data-keuzelijst] [data-keuze="-1"]').click();
      await expect(page.locator('[data-keuzelijst] [data-keuze="0"]')).toHaveAttribute('aria-pressed', 'false');
      await expect(formulier.getByLabel('Samenvatting'), 'loslaten wist niet wat de PO zelf typte').toHaveValue('Eigen formulering van dezelfde verbetering');
    });

    await test.step('And het type heet Onderhoud, niet Chore', async () => {
      const opties = await formulier.getByLabel('Type').locator('option').allTextContents();
      expect(opties).toContain('Onderhoud');
      expect(opties.join(' ')).not.toMatch(/chore/i);
    });

    await test.step('And de volgorde in Te doen is met het toetsenbord te wijzigen en blijft na herladen', async () => {
      await page.getByRole('tab', { name: /Backlog/ }).click();
      const kaarten = page.locator('[data-ticket-list="todo"] .ticket-card');
      expect(await kaarten.count(), 'minstens twee open wensen om te ordenen').toBeGreaterThanOrEqual(2);
      const eerste = await kaarten.nth(0).getAttribute('data-ticket');
      const tweede = await kaarten.nth(1).getAttribute('data-ticket');
      await kaarten.nth(1).locator('[data-verplaats="-1"]').click();
      await expect(kaarten.nth(0)).toHaveAttribute('data-ticket', tweede!);
      await expect(kaarten.nth(1)).toHaveAttribute('data-ticket', eerste!);
      await page.reload();
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      await page.getByRole('tab', { name: /Backlog/ }).click();
      await expect(page.locator('[data-ticket-list="todo"] .ticket-card').nth(0)).toHaveAttribute('data-ticket', tweede!);
      // Slepen is er alleen binnen Te doen; Opgeleverd kent geen handvat en geen knoppen.
      await expect(page.locator('[data-ticket-list="done"] [data-verplaats]')).toHaveCount(0);
      await expect(page.locator('[data-ticket-list="done"] .ticket-card[draggable="true"]')).toHaveCount(0);
    });

    await test.step('And bovenin staat hoe vers de stand is en de versie staat in de voet zoals in de urenapp', async () => {
      await expect(page.locator('[data-feed-version]')).toContainText('Bijgewerkt');
      await expect(page.locator('[data-feed-version]')).not.toContainText('projectstand app');
      await expect(page.locator('footer .demo-versie')).toContainText(feed.appVersion);
    });
  });

  test('[PIPE-H-008] het loket stelt zelf een testbaar acceptatiecriterium voor, zonder externe aanroep', async ({ page }) => {
    // Beslistabel op het criterium-voorstel (leeg -> hint, gevuld -> voorstel, getal/status/
    // generiek -> ander "Then") + negatieve controle dat er geen netwerkverzoek naar buiten
    // gaat (besluit Gio, 16 sep: deterministisch sjabloon, geen live AI-aanroep vanaf een
    // publieke pagina, dus geen sleutel nodig).
    let externVerzoek = false;
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://localhost') && !url.includes('127.0.0.1') && !url.includes('fonts.g')) externVerzoek = true;
    });
    const formulier = page.locator('[data-ticket-form]');
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');

    await test.step('Given Samenvatting en Gewenste waarde nog leeg zijn, then vraagt de knop erom in te vullen', async () => {
      await page.locator('[data-suggest-criterion]').click();
      await expect(page.locator('[data-suggest-criterion-hint]')).toBeVisible();
      await expect(formulier.getByLabel('Acceptatiecriterium')).toHaveValue('');
    });

    await test.step('When beide velden gevuld zijn en op voorstellen wordt geklikt, then komt er een testbaar criterium', async () => {
      await formulier.getByLabel('Samenvatting').fill('Maandtotalen blijven gelijk na filterwissel');
      await formulier.getByLabel('Stakeholder').selectOption('Backoffice');
      await formulier.getByLabel('Gewenste waarde').fill('Backoffice altijd dezelfde betrouwbare maandtotalen ziet');
      await page.locator('[data-suggest-criterion]').click();
      await expect(page.locator('[data-suggest-criterion-hint]')).toBeHidden();
      const criterium = await formulier.getByLabel('Acceptatiecriterium').inputValue();
      expect(criterium, 'het voorstel hoort de eigen woorden van de PO te hergebruiken').toContain('maandtotalen blijven gelijk na filterwissel');
      expect(criterium).toContain('Backoffice');
      const gherkin = await page.locator('[data-gherkin-preview]').textContent();
      expect(gherkin, 'het Then hoort de belofte uit de titel te bevatten, niet een lege standaardzin').toContain('blijft aantoonbaar dat maandtotalen blijven gelijk na filterwissel');
      expect(gherkin).not.toContain('is de uitkomst zichtbaar en automatisch gecontroleerd');
    });

    await test.step('And blijft het voorstel aanpasbaar: zelf typen overschrijft het gewoon', async () => {
      await formulier.getByLabel('Acceptatiecriterium').fill('Eigen tekst van de PO');
      await expect(formulier.getByLabel('Acceptatiecriterium')).toHaveValue('Eigen tekst van de PO');
    });

    await test.step('And geeft een getal in het criterium een concreet Then over dat getal', async () => {
      await formulier.getByLabel('Acceptatiecriterium').fill('het totaal 42 uur blijft staan');
      await expect(page.locator('[data-gherkin-preview]')).toContainText('blijft het getal 42 exact kloppen');
    });

    await test.step('And geeft een bekend statuswoord een concreet Then over die status', async () => {
      await formulier.getByLabel('Acceptatiecriterium').fill('de mededeling wordt ingetrokken');
      await expect(page.locator('[data-gherkin-preview]')).toContainText('toont de status "ingetrokken" correct');
    });

    await test.step('And gaat er voor dit alles geen enkel verzoek naar een externe dienst', async () => {
      expect(externVerzoek, 'een deterministisch sjabloon hoort geen netwerkverzoek te maken').toBe(false);
    });
  });

test('[PIPE-N-004] tussen de mobiele en de bureaubladdrempel blijft de Confluence-kolom leesbaar breed', async ({ page }) => {
  // Grenswaardenanalyse op viewportbreedte. Gemeld door Gio (17 sep) op een
  // telefoon met "Bureaubladsite aanvragen" aan (een brede virtuele
  // paginabreedte, rond 980px, op een fysiek smal scherm): de Confluence-
  // documentkolom viel terug tot enkele tientallen pixels, met woorden één
  // voor één op hun eigen regel. Meting op de kapotte pagina liet zien dat dit
  // elk browservenster tussen 901 en 1300px raakte, niet alleen "bureaubladsite"
  // op een telefoon -- .backlog-layout stapelde al bij 1100px, maar
  // .knowledge-layout/.zephyr-layout (met dezelfde vaste kolommen van 240px en
  // 330px) pas bij 900px. Eerste poging verlegde de gedeelde drempel naar
  // 1300px, maar dat verstopte de zijbalk óók op 1280px -- de standaard
  // testbreedte van het "Desktop Chrome"-profiel in playwright.config.ts, en
  // daarmee de veronderstelling van bijna elke andere case in dit bestand.
  // Drempel op 1200px gemeten: dekt het hele kapotte bereik af zonder 1280px
  // te raken (374px document, zijbalk zichtbaar, zoals voorheen).
  const documentBreedte = async () => page.evaluate(() => {
    const doc = document.querySelector('.knowledge-document');
    return doc ? doc.getBoundingClientRect().width : 0;
  });

  await test.step('Given 1200px (net onder de drempel): de lay-out is gestapeld en breed genoeg om te lezen', async () => {
    await page.setViewportSize({ width: 1200, height: 1000 });
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
    const breedte = await documentBreedte();
    expect(breedte, 'bij 1200px hoort de Confluence-kolom nog gestapeld en dus breed te zijn').toBeGreaterThan(390);
    await expect(page.locator('.icon-rail')).toBeHidden();
  });

  await test.step('When de viewport 1px breder wordt (1201px), then komt de zijbalk terug zonder de kolom kapot te knijpen', async () => {
    await page.setViewportSize({ width: 1201, height: 1000 });
    await page.waitForTimeout(50);
    const breedte = await documentBreedte();
    expect(breedte, 'vlak boven de drempel schakelt de zijbalk weer aan; de kolom mag smaller worden, maar niet naar een paar tientallen pixels').toBeGreaterThan(250);
    await expect(page.locator('.icon-rail')).toBeVisible();
  });

  await test.step('And op 1280px, de standaard testbreedte van deze hele suite, blijft de zijbalk zichtbaar en de kolom leesbaar', async () => {
    // Dit is precies de regressie die de eerste poging (drempel op 1300px)
    // veroorzaakte: PIPE-H-001 en PIPE-H-004 verwachten de zijbalkknoppen op
    // exact deze breedte. Die aanname hier expliciet vastleggen voorkomt dat
    // een volgende aanpassing aan deze drempel die aanname weer stilzwijgend
    // doorbreekt.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
    await expect(page.locator('.icon-rail')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jira Backlog' })).toBeVisible();
    const breedte = await documentBreedte();
    expect(breedte, 'op de standaard testbreedte hoort de kolom ruim leesbaar te zijn').toBeGreaterThan(350);
  });

  await test.step('And bij een brede virtuele paginabreedte zoals "Bureaubladsite aanvragen" (980px) blijft de kolom ruim leesbaar', async () => {
    // Het exacte scenario van de melding: een brede lay-outviewport op een
    // fysiek telefoonscherm. isMobile: false + een telefoon-userAgent is
    // precies wat die Chrome-instelling omzet.
    const context = await page.context().browser()!.newContext({
      viewport: { width: 980, height: 1600 },
      isMobile: false,
      hasTouch: true,
      deviceScaleFactor: 2.625,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
    });
    const bureaubladPagina = await context.newPage();
    await bureaubladPagina.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(bureaubladPagina.locator('body')).toHaveAttribute('data-feed', 'loaded');
    const breedte = await bureaubladPagina.evaluate(() => {
      const doc = document.querySelector('.knowledge-document');
      return doc ? doc.getBoundingClientRect().width : 0;
    });
    expect(breedte, '"Bureaubladsite aanvragen" op een telefoon mag de kolom niet tot een paar tientallen pixels terugbrengen').toBeGreaterThan(390);
    await context.close();
  });

  await test.step('And ook op een gewoon breed bureaubladscherm (1600px) is de kolom nog steeds leesbaar breed', async () => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
    const breedte = await documentBreedte();
    expect(breedte).toBeGreaterThan(390);
  });
});

  test('[PIPE-H-004] zoeken, filteren, sorteren en het detailpaneel werken in alle drie de werkruimtes', async ({ page }) => {
    let feed: Feed;
    await test.step('Given de pipelinepagina met de echte projectstand', async () => {
      await page.goto('/pilot/path-kwaliteitsstraat.html');
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      feed = await feedVanServer(page);
    });

    await test.step('When er wordt gezocht, gefilterd, gesorteerd en een kaart wordt geopend', async () => {
      // De pagina landt sinds 2.0.134 in Confluence; het bord staat een tab verder.
      await page.getByRole('tab', { name: /Backlog/ }).click();
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
      await expect(page.locator('[data-ticket-list="done"] .ticket-card')).toHaveCount(PER_KEER_DONE);
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
      // Sinds de tabel de volledige historie draagt en per 25 rijen tekent, is de
      // aflopende lijst niet langer de omgekeerde van de oplopende: je ziet in
      // beide gevallen een venster van 25 uit dezelfde 79. Getoetst wordt daarom
      // dat elk venster écht gesorteerd is, en dat de twee vensters van de
      // tegenovergestelde kant van de reeks komen.
      await page.locator('[data-sort="assertions"]').click();
      const oplopend = (await page.locator('[data-test-table] .assert-count').allTextContents()).map(Number);
      expect(oplopend.slice().sort((a, b) => a - b), 'oplopend venster is echt oplopend').toEqual(oplopend);
      await page.locator('[data-sort="assertions"]').click();
      const aflopend = (await page.locator('[data-test-table] .assert-count').allTextContents()).map(Number);
      expect(aflopend.slice().sort((a, b) => b - a), 'aflopend venster is echt aflopend').toEqual(aflopend);
      expect(aflopend[0], 'aflopend begint bij het hoogste aantal assertions').toBeGreaterThanOrEqual(oplopend[oplopend.length - 1]);
      expect(oplopend[0], 'oplopend begint bij het laagste aantal assertions').toBeLessThanOrEqual(aflopend[aflopend.length - 1]);
      await page.locator('[data-expand-all]').click();
      // De "Toon meer"-regel is een rij zonder Gherkin en telt dus niet mee.
      const rijen = await page.locator('[data-test-table] tr:not(.toon-meer-rij)').count();
      await expect(page.locator('[data-test-table] details[open]')).toHaveCount(rijen);
      await page.locator('[data-status="fail"]').click();
      await expect(page.locator('[data-test-table]')).toContainText('Geen testcases met dit filter');
      await page.locator('[data-status="all"]').click();
      await expect(page.locator('[data-test-table] tr:not(.toon-meer-rij)')).toHaveCount(rijen);
    });
  });

  test('[PIPE-H-003] de Kennisbank leest in de Atlassian-letterstapel op 16px met regelhoogte 24px, licht en donker', async ({ page }) => {
    await test.step('Given de Kennisbank van de pipelinepagina', async () => {
      await page.goto('/pilot/path-kwaliteitsstraat.html');
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
      await page.goto('/pilot/path-kwaliteitsstraat.html');
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

  test('[PIPE-N-001] de demo blijft lokaal, tekent de Living Doc in stappen en past op een telefoon', async ({ page }) => {
    await page.addInitScript(([key]) => {
      localStorage.setItem(key, JSON.stringify({
        schemaVersion: 3,
        sequence: 198,
        customTickets: [],
        customTests: [],
        activePhase: 0,
        activeTicket: '',
        livingDoc: Array.from({ length: 30 }, (_, index) => ({
          key: `PATH-${300 + index}`,
          text: `Lokale demoregel ${index + 1}`,
          result: 'Geslaagd (simulatie)',
          time: '15 sep · 20:00',
        })),
      }));
    }, [STORAGE_KEY]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');

    await test.step('When de Kennisbank op de telefoon wordt geopend', async () => {
      await page.getByRole('tab', { name: /Kennisbank/ }).click();
    });

    await test.step('Then tekent de Living Doc tien regels per keer, lokaal vóór echt, en bewaart hij er hooguit 25', async () => {
      await expect(page.locator('[data-living-doc] li:not(.toon-meer-rij)')).toHaveCount(PER_KEER_LIVING);
      await expect(page.locator('[data-living-doc] li').first()).toContainText('PATH-300');
      await expect(page.locator('[data-living-doc]')).not.toContainText('PATH-310');
      // De lokale simulatiehistorie in de browser blijft begrensd (25), zodat de
      // opslag niet ongelimiteerd groeit bij herhaald simuleren.
      const bewaard = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').livingDoc.length, STORAGE_KEY);
      expect(bewaard).toBe(25);
      await page.locator('[data-living-doc] [data-toon-meer="living"]').click();
      await expect(page.locator('[data-living-doc] li:not(.toon-meer-rij)')).toHaveCount(PER_KEER_LIVING * 2);
      await expect(page.locator('[data-living-doc]')).toContainText('PATH-310');
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
      await expect(page.locator('footer')).toContainText('aangenomen in de intakewachtrij');
      await expect(page.locator('footer'), 'Gio hoeft nergens meer zelf een issue aan te maken').not.toContainText('GitHub-issue');
    });
  });

  test('[PIPE-H-006] de Living Doc leest op vijftien pixels, in licht en in donker', async ({ page }) => {
    // Intake #45 van Gio via de demo-pagina: de regels moeten ook op een
    // telefoon goed leesbaar zijn. Dertien pixels was te klein. Deze case meet
    // de berekende stijl in beide kleurschema's, zodat een latere opmaakronde
    // het niet ongemerkt terugdraait.
    await test.step('Given de Living Doc in de Kennisbank', async () => {
      await page.goto('/pilot/path-kwaliteitsstraat.html');
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
