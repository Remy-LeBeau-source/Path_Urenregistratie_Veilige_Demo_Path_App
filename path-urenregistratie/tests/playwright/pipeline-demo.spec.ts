import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { AuthApi } from './api/AuthApi';
import { appConfig, requirePassword } from './fixtures/appConfig';

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
        // Releases hoort bij Jira en staat daarom achter de Backlog, niet tussen
        // Confluence en Jira in: de leesvolgorde van de keten blijft leidend.
        expect.stringContaining('Releases'),
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

  test('[PIPE-H-010] een ticket opent als een echte Jira-story: details, beschrijving, traceability, ontwerp en historie', async ({ page }) => {
    // Opdracht Gio (17 sep, met schermafdrukken uit zijn eigen Jira): een ticket
    // moet er echt uitzien als een Jira-story, met FO/TO en de ERD erbij, en de
    // testcases als traceability. Dat is niet alleen vormgeving: dezelfde velden
    // gaan straks naar de Jira van een klant, dus de afbeelding veld-naar-veld
    // hoort vast te liggen vóór de eerste koppeling bestaat.
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
    const feed = await feedVanServer(page);
    const metCase = feed.delivered.find((row) => row.cases.length && row.cases[0].gherkin)!;
    expect(metCase, 'er is een oplevering met een case en een scenario').toBeTruthy();
    const sleutel = metCase.cases[0].id;

    await test.step('Given een opgeleverd ticket wordt geopend vanaf het bord', async () => {
      await page.getByRole('tab', { name: /Backlog/ }).click();
      // Scoped op de kolom Opgeleverd: dezelfde sleutel staat ook in de
      // paginaboom en in Testbeheer, en dat zijn andere ingangen naar hetzelfde
      // ticket -- precies de kruisverwijzingen die we juist willen hebben.
      await page.locator(`[data-ticket-list="done"] [data-open-ticket="${sleutel}"]`).first().click();
      await expect(page.locator('[data-detail-drawer]')).toBeVisible();
      await expect(page.locator('[data-detail-key]')).toHaveText(sleutel);
    });

    await test.step('Then staan de vaste blokken van een Jira-issuepagina er', async () => {
      for (const blok of ['details', 'beschrijving', 'traceability', 'ontwerp', 'subtaken', 'activiteit']) {
        await expect(page.locator(`[data-detail-blok="${blok}"]`), `blok ${blok}`).toBeVisible();
      }
      // Beschrijving in de vaste PO-opbouw, niet één brok tekst.
      const beschrijving = page.locator('[data-detail-beschrijving]');
      await expect(beschrijving).toContainText('Omschrijving context');
      await expect(beschrijving).toContainText('Acceptatiecriterium');
      await expect(beschrijving).toContainText(`versie ${metCase.version}`);
    });

    await test.step('And toont Traceability de echte testcases met techniek en assertions', async () => {
      const rijen = page.locator('[data-detail-traceability] tbody tr');
      await expect(rijen).toHaveCount(metCase.cases.length);
      const eerste = rijen.first();
      await expect(eerste).toContainText(metCase.cases[0].id);
      // Het aantal assertions is geen sier maar het bewijs; het moet echt zijn.
      const assertions = Number(await eerste.locator('.assert-count').textContent());
      expect(assertions, 'assertions komen uit de echte case').toBe(metCase.cases[0].assertions);
      await expect(page.locator('[data-detail-subtaken]')).toContainText(metCase.cases[0].id);
    });

    await test.step('And staan FO, TO en het databasemodel bij de story', async () => {
      const ontwerp = page.locator('[data-detail-ontwerp]');
      await expect(ontwerp).toContainText('Functioneel ontwerp');
      await expect(ontwerp).toContainText('Technisch ontwerp');
      const erd = ontwerp.locator('a[href*="ERD"]');
      await expect(erd).toBeVisible();
      // Een dode link naar het databasemodel is erger dan geen link.
      const href = await erd.getAttribute('href');
      const antwoord = await page.request.get(new URL(href!, new URL(page.url()).href).toString());
      expect(antwoord.status(), 'het databasemodel moet echt bereikbaar zijn').toBe(200);
    });

    await test.step('And vertelt de historie wat er echt is gebeurd', async () => {
      const historie = page.locator('[data-detail-historie] li');
      await expect(historie.first()).toContainText('GIO-WENSEN.md');
      await expect(page.locator('[data-detail-historie]')).toContainText(`versie ${metCase.version}`);
    });

    await test.step('And laat "Toon als Jira-ticket" zien welk veld waar landt', async () => {
      await expect(page.locator('[data-detail-blok="jira"]')).toBeHidden();
      await page.locator('[data-detail-jira]').click();
      const vorm = page.locator('[data-detail-jira-vorm]');
      await expect(vorm).toBeVisible();
      for (const veld of ['summary', 'issuetype', 'description', 'fixVersion', 'status', 'testcases (Zephyr)']) {
        await expect(vorm, `veld ${veld}`).toContainText(veld);
      }
      await expect(vorm).toContainText(metCase.version);
      await expect(vorm).toContainText(metCase.cases[0].id);
      // Een opgeleverd ticket hoort als Done over te gaan, niet als To Do.
      await expect(vorm).toContainText('Done');
    });

    await test.step('And zijn de blokken in te klappen zoals in Jira', async () => {
      const kop = page.locator('[data-blok-toggle="traceability"]');
      await expect(kop).toHaveAttribute('aria-expanded', 'true');
      await kop.click();
      await expect(kop).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('[data-detail-traceability]')).toBeHidden();
      await kop.click();
      await expect(page.locator('[data-detail-traceability]')).toBeVisible();
    });
  });

  test('[PIPE-H-013] een kaart verplaatsen verandert de stand echt en blijft staan na herladen', async ({ page, request }) => {
    // Opdracht Gio (17 sep): "we kunnen geen kaarten slepen?" Dat kon bewust niet,
    // omdat er niets was om de verplaatsing in op te slaan -- je zou een stand
    // tonen die niemand anders ziet. Nu bewaart de gedeelde opslag hem. Dat is
    // precies het verschil tussen een demo en een product, dus dit wordt getoetst
    // op wat de server ervan vindt, niet op wat het scherm laat zien.
    const store = '/pilot/path-kwaliteitsstraat-store.php';

    await test.step('Given anoniem verplaatsen wordt geweigerd', async () => {
      // Lezen mag iedereen zolang deze pagina openbaar is; schrijven niet, anders
      // kan een voorbijganger het bord van een ander door elkaar gooien.
      const zonderLogin = await request.post(store, { data: { key: 'PATH-000', status: 'doing' } });
      expect(zonderLogin.status()).toBe(401);
      expect((await zonderLogin.json()).error).toBe('niet-ingelogd');
      // De melding moet bruikbaar zijn voor wie hem op het scherm krijgt.
      expect((await (await request.post(store, { data: { key: 'PATH-000', status: 'doing' } })).json()).message).toMatch(/log in/i);
    });

    // De sessiecookie van deze login geldt ook voor de pagina zelf: page.request
    // deelt zijn koekjes met de browsercontext.
    await new AuthApi(page.request).login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
    await expect(page.locator('body')).toHaveAttribute('data-stand', 'loaded');
    await page.getByRole('tab', { name: /Backlog/ }).click();

    const eersteOpgeleverd = page.locator('[data-ticket-list="done"] .ticket-card').first();
    const sleutel = await eersteOpgeleverd.getAttribute('data-ticket');
    expect(sleutel, 'er staat een kaart in Opgeleverd').toBeTruthy();

    await test.step('Given de opslag kent deze kaart nog niet', async () => {
      const stand = await (await request.get(store)).json();
      expect(stand.items[sleutel!], 'schone start').toBeFalsy();
    });

    await test.step('When de kaart naar In uitvoering wordt gesleept', async () => {
      await eersteOpgeleverd.dragTo(page.locator('[data-ticket-list="doing"]'));
      await expect(page.locator(`[data-ticket-list="doing"] [data-ticket="${sleutel}"]`)).toBeVisible();
      await expect(page.locator(`[data-ticket-list="done"] [data-ticket="${sleutel}"]`)).toHaveCount(0);
    });

    await test.step('Then weet de server het, met een geschiedenisregel erbij', async () => {
      const stand = await (await request.get(store)).json();
      expect(stand.items[sleutel!].status, 'de server kent de nieuwe kolom').toBe('doing');
      const regel = stand.historie.find((h: { key: string }) => h.key === sleutel);
      expect(regel, 'de verplaatsing staat in de geschiedenis').toBeTruthy();
      expect(regel.from).toBe('done');
      expect(regel.to).toBe('doing');
      // Dit antwoord is ANONIEM opgehaald, en deze pagina is openbaar: dan hoort
      // er geen naam van een collega in te staan. Tot 18 sep verwachtte deze
      // regel hier letterlijk "Gio Maatsen" -- de test legde daarmee een lek vast
      // als gewenst gedrag. Wel zichtbaar blijft DAT een mens het deed.
      expect(regel.by, 'een voorbijganger ziet geen naam').toBe('Path-medewerker');
      expect(JSON.stringify(stand), 'nergens in het anonieme antwoord een naam').not.toContain('Gio Maatsen');

      // Ingelogd zie je wel wie het was. Wie het deed komt van de server, niet
      // uit het verzoek: anders is de geschiedenis waardeloos zodra iemand zijn
      // eigen naam mag invullen.
      const ingelogd = await (await page.request.get(store)).json();
      const eigenRegel = ingelogd.historie.find((h: { key: string }) => h.key === sleutel);
      expect(eigenRegel.by, 'ingelogd noemt de geschiedenis de echte gebruiker').toBe('Gio Maatsen');
    });

    await test.step('And blijft hij daar na herladen, ook zonder de browseropslag', async () => {
      // Bewust de browseropslag leeggooien: als de kaart dan nog goed staat,
      // komt het echt van de server en niet uit deze browser.
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.locator('body')).toHaveAttribute('data-stand', 'loaded');
      await page.getByRole('tab', { name: /Backlog/ }).click();
      await expect(page.locator(`[data-ticket-list="doing"] [data-ticket="${sleutel}"]`)).toBeVisible();
    });

    await test.step('And een tweede lezer ziet dezelfde stand', async () => {
      // Een verse context zonder gedeelde opslag in de browser: alleen de server
      // kan hem vertellen waar de kaart staat.
      const tweede = await page.context().browser()!.newContext();
      const anderePagina = await tweede.newPage();
      await anderePagina.goto(new URL('/pilot/path-kwaliteitsstraat.html', page.url()).toString());
      await expect(anderePagina.locator('body')).toHaveAttribute('data-stand', 'loaded');
      await anderePagina.getByRole('tab', { name: /Backlog/ }).click();
      await expect(anderePagina.locator(`[data-ticket-list="doing"] [data-ticket="${sleutel}"]`)).toBeVisible();
      await tweede.close();
    });

    await test.step('And de kaart gaat terug, zodat deze case geen sporen achterlaat', async () => {
      // De opslag is gedeeld en blijft staan tussen cases door -- dat is juist de
      // winst ervan, maar het betekent ook dat een schrijvende case zijn eigen
      // rommel opruimt. Zonder dit struikelt de volgende case over een kaart die
      // hier is verplaatst.
      // Via de ingelogde context: schrijven mag alleen ingelogd, en dat geldt ook
      // voor het opruimen.
      const terug = await page.request.post(store, { data: { key: sleutel, status: 'done', from: 'doing' } });
      expect(terug.status()).toBe(200);
    });
  });

  test('[PIPE-N-005] een haperende verbinding kost de pagina geen echte stand, maar drie keer mislukken wordt wel gemeld', async ({ page }) => {
    // Aanleiding: in een volledige testronde vielen twee cases om op een
    // projectstand die niet binnenkwam, terwijl dezelfde cases los gewoon groen
    // waren. Oorzaak was niet de pagina maar de eenvoudige testserver, die
    // verzoeken een voor een afhandelt terwijl deze pagina er drie tegelijk doet.
    // Dat kan bij een echte gebruiker net zo goed gebeuren op een trage
    // verbinding, en een lezer heeft niets aan voorbeelddata: dan staat er een
    // verzonnen stand op het scherm van de pagina die juist onze echte
    // administratie hoort te zijn. Vandaar herkansingen met oplopende wachttijd.
    //
    // Techniek (TMap/ISTQB): foutinjectie op de netwerklaag met grenswaardeanalyse
    // op het aantal pogingen -- twee mislukkingen moeten nog goed aflopen (de
    // grens die net goed is), drie mislukkingen moeten de eerlijke terugvalmelding
    // geven (de grens die net fout is). Zonder die tweede helft toetst dit alleen
    // dat het herprobeert, niet dat het ooit nog opgeeft.
    const feedPad = '**/path-kwaliteitsstraat-data.json*';

    await test.step('Given de projectstand pas bij de derde poging binnenkomt', async () => {
      let pogingen = 0;
      await page.route(feedPad, async (route) => {
        pogingen += 1;
        if (pogingen <= 2) return route.abort('connectionfailed');
        return route.continue();
      });
      await page.goto('/pilot/path-kwaliteitsstraat.html');
    });

    await test.step('Then toont de pagina toch de echte stand, niet de voorbeelddata', async () => {
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      // Niet alleen het label: er moeten ook echte kaarten staan.
      await page.getByRole('tab', { name: /Backlog/ }).click();
      expect(await page.locator('[data-ticket-list="done"] .ticket-card').count()).toBeGreaterThan(0);
    });

    await test.step('And blijft de pagina het eerlijk melden als het echt niet lukt', async () => {
      // De andere kant van de grens: herkansen mag nooit betekenen dat een
      // kapotte verbinding onzichtbaar wordt.
      await page.unroute(feedPad);
      await page.route(feedPad, (route) => route.abort('connectionfailed'));
      await page.goto('/pilot/path-kwaliteitsstraat.html');
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'fallback');
    });
  });

  test('[PIPE-H-018] elke openstaande kaart toont hoe lang hij al open is, en valt op vanaf een week', async ({ page }) => {
    // Nice-to-have uit onze eigen lijst: "Op het demobord per kaart tonen hoe lang
    // een wens al open staat -- een PO ziet dan meteen wat blijft liggen zonder de
    // datum te hoeven lezen."
    //
    // Techniek (TMap/ISTQB): datagedreven over ALLE openstaande kaarten (elk
    // getal wordt nagerekend tegen zijn eigen begindatum), plus grenswaarden op
    // de drempel van een week (6 dagen: gewoon, 7 dagen: valt op) en op de
    // enkelvoud/meervoud-grens (0 = vandaag, 1 dag, meer dagen). De klok staat
    // vast, anders hangt de uitkomst af van de dag waarop de test draait.
    const dag = 86_400_000;
    const opDag = (iso: string, extraDagen: number) => new Date(new Date(iso + 'T10:00:00').getTime() + extraDagen * dag);

    async function laad(klok: Date) {
      await page.clock.setFixedTime(klok);
      await page.goto('/pilot/path-kwaliteitsstraat.html');
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      await page.getByRole('tab', { name: /Backlog/ }).click();
    }
    const labels = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.open-duur')].map((s) => ({
      kolom: s.closest('[data-ticket-list]')?.getAttribute('data-ticket-list') || '',
      dagen: Number(s.dataset.openDagen), sinds: s.dataset.openSinds || '', tekst: s.textContent!.trim(), lang: s.classList.contains('is-lang'),
    })));

    await laad(new Date('2026-09-25T10:00:00'));
    const eerst = await labels();

    await test.step('Then heeft elke openstaande kaart een label, en opgeleverd werk niet', async () => {
      expect(eerst.length, 'er horen openstaande kaarten te zijn, anders toetst deze case niets').toBeGreaterThan(0);
      const openKaarten = await page.locator('[data-ticket-list="todo"] .ticket-card, [data-ticket-list="doing"] .ticket-card').count();
      expect(eerst.filter((l) => l.kolom !== 'done').length, 'elke kaart in Te doen en In uitvoering').toBe(openKaarten);
      expect(eerst.filter((l) => l.kolom === 'done'), 'opgeleverd werk staat niet meer open').toEqual([]);
    });

    await test.step('And klopt het getal voor elke kaart met zijn eigen begindatum', async () => {
      for (const l of eerst) {
        const verwacht = Math.round((Date.UTC(2026, 8, 25) - Date.parse(l.sinds + 'T00:00:00Z')) / dag);
        expect(l.dagen, `${l.sinds} -> ${l.tekst}`).toBe(verwacht);
        expect(l.lang, `${l.tekst} valt ${l.lang ? '' : 'niet '}op`).toBe(verwacht >= 7);
      }
    });

    // Grenswaarden rond de jongste kaart, zodat hij precies op de grens valt.
    const jongste = [...eerst].sort((a, b) => b.sinds.localeCompare(a.sinds))[0].sinds;
    const vanJongste = async () => (await labels()).filter((l) => l.sinds === jongste)[0];

    await test.step('And zegt hij "vandaag open" op de dag zelf en "1 dag open" de dag erna', async () => {
      await laad(opDag(jongste, 0));
      expect((await vanJongste()).tekst).toBe('vandaag open');
      await laad(opDag(jongste, 1));
      expect((await vanJongste()).tekst).toBe('1 dag open');
    });

    await test.step('And valt hij pas op vanaf zeven dagen', async () => {
      await laad(opDag(jongste, 6));
      const zes = await vanJongste();
      expect(zes.tekst).toBe('6 dagen open');
      expect(zes.lang, 'zes dagen is nog gewoon').toBe(false);
      await laad(opDag(jongste, 7));
      const zeven = await vanJongste();
      expect(zeven.tekst).toBe('7 dagen open');
      expect(zeven.lang, 'zeven dagen valt op').toBe(true);
    });
  });

  test('[PIPE-N-006] geen enkele openbare bron van de kwaliteitsstraat bevat namen of mailadressen van medewerkers', async ({ request }) => {
    // Aanleiding (18 sep): de openbare projectstand bevatte de volledige namen
    // van collega's, met hun werkpatroon erbij (dagen en uren). Dat kwam uit
    // GIO-WENSEN.md, dat bij ons wel namen mag bevatten, via de generator die er
    // een openbaar bestand van maakt. Ook de pagina zelf noemde in tekst en
    // broncode-opmerkingen een naam -- en ook die opmerkingen zijn openbaar.
    //
    // Techniek (TMap/ISTQB): datagedreven over de VOLLEDIGE personenlijst uit
    // het zaaibestand (geen handmatige steekproef, zodat een nieuwe collega
    // vanzelf mee getoetst wordt), gecombineerd met equivalentieklassen over
    // elke openbare bron die de pagina laadt.
    const zaai = await readFile(join(process.cwd(), 'database', 'seed-demo-data.sql'), 'utf8');
    const personen = [...zaai.matchAll(/\(\s*\d+\s*,\s*\d+\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'(?:administrator|employee)'/g)]
      .map((m) => ({ mail: m[1], naam: m[2] }));
    expect(personen.length, 'het zaaibestand hoort de medewerkers te bevatten, anders toetst deze case niets').toBeGreaterThanOrEqual(4);

    // Volledige naam, voornaam en de delen van een dubbele voornaam.
    const verboden = [...new Set(personen.flatMap(({ naam }) => {
      const voornaam = naam.split(' ')[0];
      return [naam, voornaam, ...voornaam.split('-')];
    }))].filter((d) => d.length > 2);

    const bronnen: Array<[string, string]> = [
      ['projectstand', await (await request.get('/pilot/path-kwaliteitsstraat-data.json')).text()],
      ['pagina', await (await request.get('/pilot/path-kwaliteitsstraat.html')).text()],
      ['paginascript', await (await request.get('/pilot/path-kwaliteitsstraat.js')).text()],
      // Anoniem opgehaald: zo ziet een voorbijganger hem.
      ['opslag', await (await request.get('/pilot/path-kwaliteitsstraat-store.php')).text()],
      ['koppelingen', await (await request.get('/pilot/path-kwaliteitsstraat-koppelingen.php')).text()],
    ];

    for (const [bron, inhoud] of bronnen) {
      expect(inhoud.length, `${bron} hoort inhoud te hebben`).toBeGreaterThan(20);
      for (const deel of verboden) {
        // Hele woorden: "Marc" hoort te vallen, "Marcering" niet.
        const woord = new RegExp(`(?<![\\p{L}])${deel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u');
        expect(woord.test(inhoud), `${bron} noemt "${deel}"`).toBe(false);
      }
      for (const { mail } of personen) {
        expect(inhoud.includes(mail), `${bron} bevat het mailadres ${mail}`).toBe(false);
      }
    }
  });

  test('[PIPE-H-017] de stappenbalk toont echte voortgang van de pijplijn en beweegt mee zonder herladen', async ({ page, request }) => {
    // De pagina haalt zijn stand elke tien seconden op, en deze case wacht vier
    // keer op zo'n ronde. Dat past niet in de standaardtijd van een case, en de
    // ronde korter maken voor de test zou het product aanpassen aan de test.
    test.setTimeout(150_000);
    // Opdracht Gio (17 sep): "het systeem moet dynamisch meebewegen zodat ik kan
    // zien waar we zijn, en de kaarten moet hij zelf op in uitvoering zetten".
    // Tot nu toe was de 1-2-3-4-balk een simulatie met een dobbelsteen: leuk om
    // de flow te laten zien, maar hij vertelde niets over echt werk. Nu meldt de
    // pijplijn zijn stappen aan de opslag en toont de pagina die.
    //
    // Techniek (TMap/ISTQB): toestandsovergangtest over de vier fasen (elke stap
    // moet op het scherm terechtkomen, en teruggeven naar 0 moet hem ook weer
    // loslaten), met grenswaarden op de fase (0 en 4 horen erbij, -1 en 5 niet)
    // en een negatieve klasse voor het schrijfrecht (anoniem melden mag niet).
    const store = '/pilot/path-kwaliteitsstraat-store.php';
    const wens = 'PATH-VOORTGANG-TOETS';

    await test.step('Given anoniem voortgang melden wordt geweigerd', async () => {
      // Voortgang melden verandert wat de pagina beweert over lopend werk. Kan
      // iedereen dat, dan kan iedereen laten zien dat iets op TEST staat terwijl
      // dat niet zo is, en dan is dit geen administratie meer.
      const zonder = await request.post(store, { data: { action: 'voortgang', key: wens, fase: 2 } });
      expect(zonder.status()).toBe(401);
      expect((await zonder.json()).error).toBe('niet-ingelogd');
    });

    await new AuthApi(page.request).login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    await test.step('And een fase buiten 0 tot en met 4 wordt geweigerd', async () => {
      for (const fase of [-1, 5, 99]) {
        const fout = await page.request.post(store, { data: { action: 'voortgang', key: wens, fase } });
        expect(fout.status(), `fase ${fase} hoort te botsen`).toBe(422);
      }
      const geenGetal = await page.request.post(store, { data: { action: 'voortgang', key: wens, fase: 'twee' } });
      expect(geenGetal.status()).toBe(422);
      const zonderSleutel = await page.request.post(store, { data: { action: 'voortgang', fase: 2 } });
      expect(zonderSleutel.status()).toBe(422);
    });

    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-stand', 'loaded');
    const monitor = page.locator('[data-flow-monitor]');

    await test.step('Then staat de balk op de simulatie zolang er niets loopt', async () => {
      await expect(monitor).toHaveAttribute('data-bron', 'simulatie');
    });

    await test.step('When de pijplijn stap voor stap voortgang meldt', async () => {
      for (const fase of [1, 2, 3, 4]) {
        const gemeld = await page.request.post(store, {
          data: { action: 'voortgang', key: wens, fase, toelichting: 'Stap ' + fase + ' bezig' },
        });
        expect(gemeld.status()).toBe(200);
        expect((await gemeld.json()).voortgang.fase).toBe(fase);

        // Niet herladen: de pagina hoort zelf bij te trekken. De wachttijd is
        // ruim genomen omdat de ronde elke tien seconden loopt.
        await expect(monitor).toHaveAttribute('data-wens', wens, { timeout: 20_000 });
        await expect(monitor).toHaveAttribute('data-bron', 'pijplijn');
        await expect(page.locator('[data-flow-title]')).toContainText('stap ' + fase + ' van 4', { timeout: 20_000 });
        await expect(page.locator('[data-flow-status]')).toContainText('Stap ' + fase + ' bezig', { timeout: 20_000 });
        // De bolletjes ervoor horen afgevinkt te zijn, het huidige actief.
        await expect(page.locator(`[data-checkpoint="${fase}"]`)).toHaveClass(/is-active/, { timeout: 20_000 });
        if (fase > 1) await expect(page.locator(`[data-checkpoint="${fase - 1}"]`)).toHaveClass(/is-complete/);
      }
    });

    await test.step('And schuift de kaart vanzelf mee met de fase', async () => {
      // Tweede helft van dezelfde wens: "de kaarten moet hij zelf op in
      // uitvoering zetten". Dat gebeurt op de server, in dezelfde handeling als
      // het melden van de fase, zodat kolom en fase niet uit elkaar kunnen lopen.
      const stand = await (await request.get(store)).json();
      expect(stand.items[wens]?.status, 'fase 4 hoort de kaart op Opgeleverd te zetten').toBe('done');
      const regel = stand.historie.find((h: { key: string }) => h.key === wens);
      expect(regel, 'de verplaatsing hoort in de geschiedenis te staan').toBeTruthy();
      expect(regel.by, 'zichtbaar dat de pijplijn het deed, niet een mens').toBe('Pijplijn');

      // En tijdens het werk stond hij op In uitvoering; dat is de stand die Gio
      // op het scherm wil zien terwijl er gewerkt wordt.
      const terug = await page.request.post(store, { data: { action: 'voortgang', key: wens, fase: 2, toelichting: 'Weer bezig' } });
      expect(terug.status()).toBe(200);
      expect((await terug.json()).kaart.status).toBe('doing');
    });

    await test.step('And mag een pijplijnsleutel niets anders dan voortgang melden', async () => {
      // Deze sleutel leeft in een pijplijn en in omgevingsvariabelen, en zulke
      // sleutels lekken vaker dan wachtwoorden van mensen. Hij hoort daarom
      // precies één ding te mogen. De testserver draait met een eigen sleutel
      // (gezet door scripts/run-playwright-e2e.mjs), zodat hier een ECHT geldige
      // sleutel getoetst kan worden -- met alleen een verkeerde sleutel zou deze
      // stap niets bewijzen, want die strandt sowieso al bij de deur.
      const sleutelVanDeRun = process.env.PATH_AGENT_SLEUTEL || '';
      expect(sleutelVanDeRun, 'de testopstelling hoort een pijplijnsleutel te zetten').not.toBe('');
      const metSleutel = { 'X-Path-Agent': sleutelVanDeRun };

      // Wat hij wél mag.
      const melden = await request.post(store, { headers: metSleutel, data: { action: 'voortgang', key: wens, fase: 1 } });
      expect(melden.status(), 'voortgang melden hoort te mogen').toBe(200);

      // En wat hij niet mag: de werkwijze van het hele bord omzetten, of een
      // willekeurige kaart verslepen.
      const bordOmzetten = await request.post(store, { headers: metSleutel, data: { action: 'bord', modus: 'scrum', wip: 0 } });
      expect(bordOmzetten.status(), 'de werkwijze omzetten hoort niet te mogen').toBe(403);
      expect((await bordOmzetten.json()).error).toBe('alleen-voortgang');

      const kaartSlepen = await request.post(store, { headers: metSleutel, data: { key: wens, status: 'todo', from: 'doing' } });
      expect(kaartSlepen.status(), 'een kaart verslepen hoort niet te mogen').toBe(403);

      // Een verzonnen sleutel strandt al eerder, bij de deur.
      const verzonnen = await request.post(store, { headers: { 'X-Path-Agent': 'deze-sleutel-klopt-niet' }, data: { action: 'voortgang', key: wens, fase: 4 } });
      expect(verzonnen.status(), 'een verkeerde sleutel hoort niet binnen te komen').toBe(401);

      // En het bord staat er daarna nog net zo bij als ervoor.
      const stand = await (await request.get(store)).json();
      expect(stand.bord.modus, 'de werkwijze hoort niet gewijzigd te zijn').toBe('kanban');
      expect(stand.voortgang[wens].fase, 'alleen de toegestane melding is aangekomen').toBe(1);
    });

    await test.step('And laat fase 0 de balk weer los', async () => {
      const vrij = await page.request.post(store, { data: { action: 'voortgang', key: wens, fase: 0 } });
      expect(vrij.status()).toBe(200);
      await expect(monitor).toHaveAttribute('data-bron', 'simulatie', { timeout: 20_000 });
      await expect(monitor).not.toHaveAttribute('data-wens', wens);
    });
  });

  test('[PIPE-H-016] de opslag vertelt eerlijk waar de stand vandaan komt, zonder verbindingsgegevens', async ({ page, request }) => {
    // De keuze tussen "bestand" en "eigen tabellen in een database" is een
    // instelling geworden (zie pilot/path-kwaliteitsstraat-opslag-lib.php), zodat
    // die keuze later een configuratieregel is en geen verbouwing. Twee dingen
    // moeten dan kloppen en blijven kloppen:
    //   1. het antwoord noemt de gebruikte achterkant, zodat een ingestelde maar
    //      onbereikbare database opvalt in plaats van stil terug te vallen;
    //   2. het antwoord noemt alleen de achterkant, nooit hoe je erbij komt.
    // De achterkanten zelf worden functioneel getoetst in
    // server/scripts/kwaliteitsstraat-opslag-check.php; dat kan hier niet, want
    // van achterkant wisselen betekent de serverinstelling omzetten terwijl deze
    // testserver draait.
    //
    // Techniek (TMap/ISTQB): beslistabel op het veld `opslag` (drie toegestane
    // uitkomsten) gecombineerd met een structurele geheimhoudingscontrole op
    // verboden sleutels -- structureel en niet op woorden, omdat een woordfilter
    // eerder op onze eigen tekst struikelt dan op een echt lek.
    const store = '/pilot/path-kwaliteitsstraat-store.php';
    const toegestaneBronnen = ['bestand', 'mysql', 'bestand (database niet bereikbaar)'];
    // Alles waarmee je zelf verbinding zou kunnen maken. Staat er ooit een van
    // deze sleutels in het antwoord, dan lekt de opslag zijn eigen sleutelbos.
    // agent_sleutel staat er sinds 18 sep bij: dat is de sleutel waarmee de
    // pijplijn voortgang meldt, en die hoort net zo hard buiten elk antwoord te
    // blijven als de databasegegevens.
    const verbodenSleutels = ['dsn', 'user', 'username', 'password', 'wachtwoord', 'host', 'database', 'pad', 'path', 'bestand_pad', 'agent_sleutel', 'agent'];

    await test.step('Given het leesantwoord noemt de gebruikte achterkant', async () => {
      const lees = await request.get(store);
      expect(lees.status()).toBe(200);
      const stand = await lees.json();
      expect(toegestaneBronnen, `onbekende bron: ${stand.opslag}`).toContain(stand.opslag);
    });

    await test.step('And het leesantwoord bevat geen verbindingsgegevens', async () => {
      const stand = await (await request.get(store)).json();
      for (const sleutel of verbodenSleutels) {
        expect(Object.keys(stand), `het antwoord mag geen ${sleutel} bevatten`).not.toContain(sleutel);
      }
      // Ook niet verstopt in de bordinstelling.
      for (const sleutel of verbodenSleutels) {
        expect(Object.keys(stand.bord ?? {}), `het bord mag geen ${sleutel} bevatten`).not.toContain(sleutel);
      }
    });

    await new AuthApi(page.request).login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));

    await test.step('When er iets wordt opgeslagen', async () => {
      const zet = await page.request.post(store, { data: { key: 'PATH-OPSLAG-TOETS', status: 'doing', from: 'todo' } });
      expect(zet.status()).toBe(200);

      await test.step('Then noemt het schrijfantwoord dezelfde achterkant als het leesantwoord', async () => {
        const naSchrijven = await zet.json();
        const naLezen = await (await request.get(store)).json();
        // Lezen en schrijven via dezelfde laag: gaan die uit elkaar lopen, dan
        // schrijf je ergens anders dan je leest -- precies de fout die je pas
        // maanden later ontdekt.
        expect(naSchrijven.opslag).toBe(naLezen.opslag);
        expect(toegestaneBronnen).toContain(naSchrijven.opslag);
      });
    });

    await test.step('And deze case laat geen kaart achter', async () => {
      // Deze toetssleutel bestaat niet in de projectstand, dus hij is op het bord
      // onzichtbaar -- maar hij zou wel in de geschiedenis van de volgende case
      // blijven staan. Terugzetten naar de beginkolom houdt de stand schoon.
      const terug = await page.request.post(store, { data: { key: 'PATH-OPSLAG-TOETS', status: 'todo', from: 'doing' } });
      expect(terug.status()).toBe(200);
    });
  });

  test('[PIPE-H-015] het bord staat op Kanban, met Scrum klaar om aan te zetten', async ({ page, request }) => {
    // Besluit na de vraag van Gio ("of wil je een andere manier van werken dan
    // sprint? ik ben de naam kwijt"): dat woord is Kanban, en dat is wat we
    // feitelijk doen -- wensen komen binnen, worden opgepakt, gaan eruit als
    // opgeleverd, zonder timeboxen. Scrum staat klaar om te proberen. Zijn eigen
    // idee (een sprint zonder einddatum blijft open staan) klopt technisch, en de
    // pagina benoemt dat dan ook eerlijk in plaats van een aftelling te verzinnen.
    const store = '/pilot/path-kwaliteitsstraat-store.php';
    await new AuthApi(page.request).login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-stand', 'loaded');
    await page.getByRole('tab', { name: /Backlog/ }).click();

    await test.step('Then staat Kanban aan als standaard', async () => {
      await expect(page.locator('[data-modus="kanban"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-modus="scrum"]')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('[data-modus-uitleg]')).toContainText('geen timeboxen');
    });

    await test.step('And zegt Scrum zonder einddatum eerlijk dat de sprint doorloopt', async () => {
      const gezet = await page.request.post(store, { data: { action: 'bord', modus: 'scrum', sprint: 'Proefsprint', sprint_eind: '' } });
      expect(gezet.status()).toBe(200);
      await page.reload();
      await expect(page.locator('body')).toHaveAttribute('data-stand', 'loaded');
      await page.getByRole('tab', { name: /Backlog/ }).click();
      await expect(page.locator('[data-modus="scrum"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-modus-uitleg]')).toContainText('Proefsprint');
      await expect(page.locator('[data-modus-uitleg]')).toContainText('geen einddatum, loopt door');
    });

    await test.step('And telt hij met een einddatum wel echt af', async () => {
      const overTienDagen = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
      await page.request.post(store, { data: { action: 'bord', modus: 'scrum', sprint: 'Sprint 1', sprint_eind: overTienDagen } });
      await page.reload();
      await expect(page.locator('body')).toHaveAttribute('data-stand', 'loaded');
      await page.getByRole('tab', { name: /Backlog/ }).click();
      await expect(page.locator('[data-modus-uitleg]')).toContainText('Sprint 1');
      await expect(page.locator('[data-modus-uitleg]')).toContainText(/nog 1[01] dag/);
    });

    await test.step('And weigert de server onzin en anonieme wijzigingen', async () => {
      const anoniem = await request.post(store, { data: { action: 'bord', modus: 'scrum' } });
      expect(anoniem.status()).toBe(401);
      const onbekend = await page.request.post(store, { data: { action: 'bord', modus: 'waterval' } });
      expect(onbekend.status()).toBe(422);
      const kromDatum = await page.request.post(store, { data: { action: 'bord', modus: 'scrum', sprint_eind: '31-12-2026' } });
      expect(kromDatum.status()).toBe(422);
    });

    await test.step('And het bord gaat terug naar Kanban, zodat deze case geen sporen achterlaat', async () => {
      const terug = await page.request.post(store, { data: { action: 'bord', modus: 'kanban', sprint: '', sprint_eind: '' } });
      expect(terug.status()).toBe(200);
    });
  });

  test('[PIPE-H-014] de rechtermuisknop op een kaart geeft alleen acties die echt iets doen', async ({ page, request }) => {
    // Opdracht Gio (17 sep, met een schermafdruk van het Jira-bordmenu): zulke
    // functies moet je ook kennen. Overgenomen is wat hier betekenis heeft;
    // bewust niet overgenomen zijn Archiveren en Verwijderen, want we gooien
    // projecthistorie niet weg en een knop die dat suggereert hoort er dan ook
    // niet te staan.
    await new AuthApi(page.request).login(appConfig.adminEmail, requirePassword(appConfig.adminPassword, 'PLAYWRIGHT_ADMIN_PASSWORD'));
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-stand', 'loaded');
    await page.getByRole('tab', { name: /Backlog/ }).click();

    const kaart = page.locator('[data-ticket-list="done"] .ticket-card').first();
    const sleutel = await kaart.getAttribute('data-ticket');
    const menu = page.locator('[data-kaart-menu]');

    await test.step('Given het menu is dicht tot je rechtsklikt', async () => {
      await expect(menu).toBeHidden();
      await kaart.click({ button: 'right' });
      await expect(menu).toBeVisible();
      await expect(menu).toContainText(sleutel!);
    });

    await test.step('Then staan er alleen acties in die hier betekenis hebben', async () => {
      for (const actie of ['Openen', 'Open in Kennisbank', 'Open in Testbeheer', 'Naar Te doen', 'Naar In uitvoering', 'Kopieer link']) {
        await expect(menu.getByRole('menuitem', { name: actie }), `actie ${actie}`).toBeVisible();
      }
      // Wat we niet doen, staat er ook niet.
      for (const nooit of ['Archiveren', 'Verwijderen', 'Bulkwijziging']) {
        await expect(menu, `${nooit} hoort er niet te staan`).not.toContainText(nooit);
      }
      // De kolom waar de kaart al in staat is geen zinnige actie.
      await expect(menu.getByRole('menuitem', { name: 'Naar Opgeleverd' })).toBeDisabled();
    });

    await test.step('And verplaatst "Naar In uitvoering" de kaart echt, ook op de server', async () => {
      await menu.getByRole('menuitem', { name: 'Naar In uitvoering' }).click();
      await expect(menu).toBeHidden();
      await expect(page.locator(`[data-ticket-list="doing"] [data-ticket="${sleutel}"]`)).toBeVisible();
      const stand = await (await request.get('/pilot/path-kwaliteitsstraat-store.php')).json();
      expect(stand.items[sleutel!].status, 'de server kent de verplaatsing uit het menu').toBe('doing');
    });

    await test.step('And sluit Escape het menu zonder iets te doen', async () => {
      await page.locator(`[data-ticket-list="doing"] [data-ticket="${sleutel}"]`).click({ button: 'right' });
      await expect(menu).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(page.locator(`[data-ticket-list="doing"] [data-ticket="${sleutel}"]`)).toBeVisible();
    });

    await test.step('And de kaart gaat terug, zodat deze case geen sporen achterlaat', async () => {
      const terug = await page.request.post('/pilot/path-kwaliteitsstraat-store.php', { data: { key: sleutel, status: 'done', from: 'doing' } });
      expect(terug.status()).toBe(200);
    });
  });

  test('[PIPE-H-012] elk ticket heeft een deelbare link en zichtbare verwijzingen naar Confluence en Zephyr', async ({ page }) => {
    // Opdracht Gio (17 sep): "we moeten linkjes maken met ID's en van Jira naar
    // Confluence kunnen gaan". Plus: de verwijzing naar ons GitHub-issue moest
    // weg -- dat is onze eigen implementatie en geen informatie voor wie het bord
    // leest, zeker niet zodra een klant meekijkt.
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
    const feed = await feedVanServer(page);
    const metCase = feed.delivered.find((row) => row.cases.length)!;
    const sleutel = metCase.cases[0].id;

    await test.step('Then claimt de pagina geen gereedschap dat we niet gebruiken', async () => {
      // Gevonden op 17 sep na een vraag van Gio: de fasestrook zei "Playwright ·
      // Cypress · API" terwijl er geen Cypress in dit project zit -- geen
      // afhankelijkheid, geen map, geen configuratie. Op een pagina waarvan het
      // hele punt is dat alles klopt, is zo'n claim het gevaarlijkste wat erop kan
      // staan. Deze controle vergelijkt met wat package.json echt kent.
      const pkg = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));
      const afhankelijk = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
      const paginaTekst = (await page.locator('body').textContent()) || '';
      for (const gereedschap of ['Cypress', 'Selenium', 'Jest', 'Vitest', 'Puppeteer']) {
        const gebruiktHet = afhankelijk.some((naam) => naam.toLowerCase().includes(gereedschap.toLowerCase()));
        if (!gebruiktHet) {
          expect(paginaTekst, `de pagina noemt ${gereedschap} terwijl het niet in package.json staat`)
            .not.toMatch(new RegExp(`\\b${gereedschap}\\b`));
        }
      }
      // En wat we wél gebruiken hoort er te staan.
      expect(afhankelijk.some((naam) => naam.includes('playwright'))).toBe(true);
      expect(paginaTekst).toMatch(/\bPlaywright\b/);
    });

    await test.step('And stuurt geen enkele knop of link de lezer nog naar GitHub', async () => {
      // Bewust op links en knoppen toetsen, niet op het woord: onze eigen
      // projecthistorie noemt GitHub gewoon, want zo is het toen opgeschreven.
      // Wat weg moest is de verwijzing zelf -- onze implementatie is geen
      // informatie voor wie het bord leest.
      await expect(page.locator('a[href*="github.com"]')).toHaveCount(0);
      await expect(page.locator('[data-issue-url]')).toHaveCount(0);
      // Bewust geen tekstcontrole meer. Twee keer geprobeerd, twee keer viel hij
      // om op onze eigen inhoud: eerst op Gherkin-scenario's die GitHub noemen,
      // daarna op de changelogregel van precies deze wijziging ("waarom verwijzen
      // we naar GitHub?"). Die teksten horen er te staan -- het is onze historie.
      // Wat weg moest is de verwijzing, en dat is structureel te toetsen.
      await expect(page.locator('.ticket-card a[href]')).toHaveCount(0);
    });

    await test.step('And staan in het ticket de verwijzingen met hun echte nummer', async () => {
      await page.getByRole('tab', { name: /Backlog/ }).click();
      await page.locator(`[data-ticket-list="done"] [data-open-ticket="${sleutel}"]`).first().click();
      const links = page.locator('[data-detail-links]');
      await expect(links).toContainText('Jira');
      await expect(links).toContainText(sleutel);
      await expect(links).toContainText('Confluence');
      await expect(links).toContainText('Zephyr');
      // Het nummer moet zichtbaar zijn: een verwijzing zonder nummer dwingt tot zoeken.
      await expect(links.locator(`[data-open-case="${metCase.cases[0].id}"]`)).toBeVisible();
    });

    await test.step('And is de link naar dit ticket deelbaar', async () => {
      // De URL wijst nu naar het geopende ticket.
      expect(new URL(page.url()).hash).toBe(`#ticket/${sleutel}`);
      const deelbaar = page.url();
      await page.locator('[data-detail-close]').click();
      await expect(page.locator('[data-detail-drawer]')).toBeHidden();
      // Opnieuw openen via alleen die link moet hetzelfde ticket tonen.
      await page.goto(deelbaar);
      await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
      await expect(page.locator('[data-detail-drawer]')).toBeVisible();
      await expect(page.locator('[data-detail-key]')).toHaveText(sleutel);
    });

    await test.step('And wijst de keten door naar de uitkomst in de Living Doc', async () => {
      // Vraag Gio: kom je op enig moment ook bij de Living Doc uit? Die stond er
      // wel, maar was vanuit een ticket niet te bereiken.
      await page.locator('[data-detail-links] [data-naar-living]').click();
      await expect(page.locator('#panel-knowledge')).toBeVisible();
      const regel = page.locator(`[data-living-key="${sleutel}"]`);
      await expect(regel).toBeVisible();
      await expect(regel).toContainText(sleutel);
    });

    await test.step('And brengt de Confluence-verwijzing je naar de pagina van hetzelfde nummer', async () => {
      await page.goto(`/pilot/path-kwaliteitsstraat.html#ticket/${sleutel}`);
      await expect(page.locator('[data-detail-drawer]')).toBeVisible();
      await page.locator('[data-detail-links] [data-detail-doc-ontwerp]').click();
      await expect(page.locator('#panel-knowledge')).toBeVisible();
      await expect(page.locator('[data-doc-title]')).toContainText(sleutel);
    });
  });

  test('[PIPE-H-011] Releases bundelt de echte versies met hun wensen, cases en assertions', async ({ page }) => {
    // Opdracht Gio (17 sep, naar het Releases-scherm van zijn eigen Jira): een
    // release is bij ons een versienummer met alles wat daarin is opgeleverd.
    // Alle cijfers moeten herleidbaar zijn tot de projectstand -- een voortgangs-
    // balk die iets anders vertelt dan de onderliggende cases is erger dan geen balk.
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');
    const feed = await feedVanServer(page);

    // Zelfde groepering als de pagina: versies uit de opleveringen, nieuwste eerst.
    const versies: string[] = [];
    const perVersie = new Map<string, { wensen: number; cases: number; assertions: number }>();
    for (const rij of feed.delivered) {
      const versie = (rij.version.match(/\d+\.\d+\.\d+/) || [])[0];
      if (!versie) continue;
      if (!perVersie.has(versie)) { perVersie.set(versie, { wensen: 0, cases: 0, assertions: 0 }); versies.push(versie); }
      const stand = perVersie.get(versie)!;
      stand.wensen += 1;
      stand.cases += rij.cases.length;
      stand.assertions += rij.cases.reduce((som, c) => som + Number(c.assertions || 0), 0);
    }
    expect(versies.length, 'er zijn meerdere versies opgeleverd').toBeGreaterThan(3);

    await test.step('Given het tabblad Releases', async () => {
      await page.getByRole('tab', { name: /Releases/ }).click();
      await expect(page.locator('#panel-releases')).toBeVisible();
      // Plus één rij voor de open wensen zonder versie ("Geen oplevering").
      await expect(page.locator('[data-release-count]').first()).toHaveText(String(versies.length + (feed.open.length ? 1 : 0)));
    });

    await test.step('Then staat de nieuwste versie bovenaan met haar echte aantallen', async () => {
      const eerste = page.locator('[data-release-table] tr').first();
      const verwacht = perVersie.get(versies[0])!;
      await expect(eerste).toContainText(versies[0]);
      await expect(eerste).toContainText(`${verwacht.wensen} wens(en)`);
      await expect(eerste).toContainText(`${verwacht.cases} case(s)`);
      await expect(eerste).toContainText(`${verwacht.assertions} assertions`);
    });

    await test.step('And scheidt het filter gereleaste versies van wat nog op een versie wacht', async () => {
      await page.locator('[data-release-filter="open"]').click();
      const open = page.locator('[data-release-table] tr:not(.toon-meer-rij)');
      await expect(open).toHaveCount(feed.open.length ? 1 : 0);
      if (feed.open.length) {
        await expect(open.first()).toContainText('Niet gereleased');
        await expect(open.first()).toContainText(`${feed.open.length} wens(en)`);
      }
      await page.locator('[data-release-filter="released"]').click();
      await expect(page.locator('[data-release-table]')).not.toContainText('Niet gereleased');
      await page.locator('[data-release-filter="all"]').click();
    });

    await test.step('And brengt klikken op een versie je naar precies die opleveringen', async () => {
      await page.locator(`[data-release-open="${versies[1]}"]`).click();
      await expect(page.locator('#panel-backlog')).toBeVisible();
      await expect(page.locator('[data-search]')).toHaveValue(versies[1]);
      const kaarten = page.locator('[data-ticket-list="done"] .ticket-card');
      await expect(kaarten).not.toHaveCount(0);
      await expect(page.locator('[data-ticket-list="done"]')).toContainText(versies[1]);
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
      // Sinds 18 sep meldt de pijplijn zelf voortgang, met een sleutel die alleen
      // dat mag. Een klant die zijn eigen omgeving koppelt, hoort dat hier te lezen.
      await expect(page.locator('[data-doc-page]')).toContainText('melden hoe ver een wens is');
      // Ook hier: de uitleg mag geen echte omgeving van een klant noemen.
      await expect(page.locator('[data-doc-page]')).not.toContainText('atlassian.net');
    });

    await test.step('And zegt de pagina over gegevens wat een voorbijganger wel en niet ziet', async () => {
      await page.locator('[data-doc-fixed="gegevens"]').click();
      await expect(page.locator('[data-doc-page]')).toContainText('rollen in plaats van namen');
      await expect(page.locator('[data-doc-page]')).toContainText('pas na inloggen');
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
    // Een vaste keuzelijst in de feed. Eerder las de case de actuele GIO-WENSEN, en
    // toen de laatste nice-to-have klaar was en de lijst leeg werd, viel hij om
    // zonder dat er aan het formulier iets mis was (CI 2.0.184, 19 sep; TW-1).
    // De rest van de feed (versie, tijdstip) blijft echt.
    const echteFeed = await page.request.get('/pilot/path-kwaliteitsstraat-data.json').then((r) => r.json()) as Record<string, unknown>;
    const feed = {
      ...echteFeed,
      niceToHave: [
        { date: '19 sep', improvement: 'Proefverbetering A voor de keuzelijst: een zin die lang genoeg is om af te kappen in de samenvatting van het formulier', why: 'Waarom A: zodat de case altijd iets heeft om te kiezen, los van de actuele wensenlijst' },
        { date: '19 sep', improvement: 'Proefverbetering B voor de keuzelijst', why: 'Waarom B' },
      ],
    } as { appVersion: string; generatedAt: string; niceToHave: Array<{ improvement: string; why: string }> };
    await page.route('**/pilot/path-kwaliteitsstraat-data.json*', (route) => route.fulfill({ json: feed }));
    await page.goto('/pilot/path-kwaliteitsstraat.html');
    await expect(page.locator('body')).toHaveAttribute('data-feed', 'loaded');

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
      // De volgorde-knoppen (▲▼) blijven alleen in Te doen: daar bepaalt de
      // volgorde wat er als eerste wordt opgepakt. In de andere kolommen zegt de
      // volgorde niets, dus daar zijn ze er niet.
      await expect(page.locator('[data-ticket-list="done"] [data-verplaats]')).toHaveCount(0);
      // Slepen zelf kan sinds 17 sep wél overal: een kaart verplaatsen verandert
      // de stand echt, want die wordt op de server opgeslagen (zie PIPE-H-013).
      await expect(page.locator('[data-ticket-list="done"] .ticket-card[draggable="true"]')).not.toHaveCount(0);
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
      // Alle werkruimtes moeten op een telefoon zichtbaar naast elkaar passen.
      // Sinds 17 sep is Releases erbij gekomen (vier tabbladen); het vaste aantal
      // staat hier zodat een vijfde tab een bewuste keuze blijft en niet stil de
      // balk buiten beeld duwt.
      const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]'))
        .map((tab) => ({ naam: (tab.textContent || '').replace(/\s+/g, ' ').trim(), rechts: Math.round(tab.getBoundingClientRect().right) })));
      expect(tabs).toHaveLength(4);
      const buitenBeeld = tabs.filter((tab) => tab.rechts > 391);
      expect(buitenBeeld, `Tabbladen buiten beeld: ${buitenBeeld.map((t) => t.naam).join(', ')}`).toEqual([]);

      // Waarom hier niet alleen op die grens van 391px wordt getoetst: precies
      // deze case was lokaal groen en in de pipeline rood, omdat het lettertype
      // daar iets breder is en het vierde tabblad er dan net buiten schoof. Een
      // grens die van de toevallige lettermaat van de machine afhangt, bewijst
      // niets. Getoetst wordt daarom de eigenschap die dat onmogelijk maakt: de
      // vier tabbladen verdelen de balk, in plaats van dat hun tekst hun breedte
      // bepaalt. Meting 18 sep: met die eigenschap eindigt het laatste tabblad
      // altijd op de rand van de balk; zonder liep het mee met de tekst (387px
      // in plaats van 376px) en dan is een bredere letter genoeg om eruit te
      // lopen.
      // Gezien 18 sep op TEST, met een screenshot op 390px: de namen van de
      // tabbladen werden afgekapt ("Kennisba…") en stap 4 van de stappenbalk viel
      // in zijn eentje naar een tweede regel. Een tabblad dat binnen beeld valt,
      // is nog geen leesbaar tabblad; daarom hier ook de tekst zelf en de regel.
      const leesbaar = await page.evaluate(() => {
        const namen = [...document.querySelectorAll<HTMLElement>('.workspace-tabs button > span:nth-child(2)')]
          .map((s) => ({ naam: s.textContent!.trim(), afgekapt: s.scrollWidth > s.clientWidth + 1 }));
        const stappen = [...document.querySelectorAll<HTMLElement>('.flow-checkpoints li')]
          .map((li) => { const r = li.getBoundingClientRect(); return { boven: Math.round(r.top), rechts: Math.round(r.right) }; });
        return { namen, stappen, breedte: window.innerWidth };
      });
      const afgekapt = leesbaar.namen.filter((n) => n.afgekapt).map((n) => n.naam);
      expect(afgekapt, `afgekapte tabbladnamen op ${leesbaar.breedte}px`).toEqual([]);
      expect(leesbaar.stappen).toHaveLength(4);
      const regels = new Set(leesbaar.stappen.map((s) => s.boven));
      expect(regels.size, `de vier stappen horen op één regel te staan (bovenkanten: ${[...regels].join(', ')})`).toBe(1);
      for (const stap of leesbaar.stappen) expect(stap.rechts, 'geen stap buiten beeld').toBeLessThanOrEqual(leesbaar.breedte);

      const balkRechts = await page.evaluate(() => Math.round(document.querySelector('.workspace-tabs')!.getBoundingClientRect().right));
      await page.addStyleTag({ content: '.workspace-tabs button > span:nth-child(2) { font-size: 17px !important; }' });
      const tabsGroot = await page.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]'))
        .map((tab) => ({ naam: (tab.textContent || '').replace(/\s+/g, ' ').trim(), rechts: Math.round(tab.getBoundingClientRect().right) })));
      const groteBuitenBeeld = tabsGroot.filter((tab) => tab.rechts > 391);
      expect(groteBuitenBeeld, `Tabbladen buiten beeld bij een bredere letter: ${groteBuitenBeeld.map((t) => t.naam + '@' + t.rechts).join(', ')}`).toEqual([]);
      expect(
        Math.abs(tabsGroot[tabsGroot.length - 1].rechts - balkRechts),
        `het laatste tabblad hoort op de rand van de balk te eindigen (balk @${balkRechts}, tabblad @${tabsGroot[tabsGroot.length - 1].rechts}): groeit het mee met de tekst, dan valt het bij een breder lettertype buiten beeld`
      ).toBeLessThanOrEqual(1);
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
