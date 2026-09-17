'use strict';

(function () {
  var STORAGE_KEY = 'path-pipeline-demo-v1';
  var DATA_URL = 'path-kwaliteitsstraat-data.json';
  var INTAKE_URL = 'path-kwaliteitsstraat-intake.php';
  // Het databasemodel hoort bij elke story (wens Gio, 17 sep). Het bestand wordt
  // gegenereerd uit het echte schema (npm run erd) en gaat met de gewone uitrol
  // mee, dus dit blijft vanzelf gelijklopen met de database.
  var ERD_PAD = '../database/ERD-nieuw.svg';
  var REPO_URL = 'https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App';
  var INTAKE_LABEL = 'pipeline-intake';
  // Opdracht Gio (17 sep): dit is onze eigen administratie, geen etalage. De
  // volledige projecthistorie zit in de feed; deze getallen bepalen alleen hoeveel
  // er per keer wordt getekend. Eerder waren het harde caps die vóór het filteren
  // werden toegepast -- daardoor zocht de zoekbalk aantoonbaar alleen in de
  // nieuwste tien en was oudere oplevering onvindbaar. Nu: alles filteren, daarna
  // pas afkappen, met "Toon meer" om verder te gaan.
  var PER_KEER = { todo: 12, doing: 12, done: 12, tests: 25, doc: 12, living: 10, releases: 15 };
  var LIVING_DOC_BEWAAR = 25;
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP_DELAY = prefersReducedMotion ? 120 : 900;

  var products = {
    backlog: { logo: 'J', name: 'Jira', scope: 'Path Uren & Facturatie', color: 'var(--jira)' },
    knowledge: { logo: 'C', name: 'Confluence', scope: 'Ruimte Path Kwaliteit', color: 'var(--confluence)' },
    tests: { logo: 'Z', name: 'Zephyr Scale', scope: 'Testcyclus TC-24', color: 'var(--zephyr)' },
    releases: { logo: 'J', name: 'Jira', scope: 'Releases', color: 'var(--jira)' }
  };

  // Terugval als de feed niet laadt (bijvoorbeeld rechtstreeks vanaf schijf openen).
  var fallbackSeeds = [
    { key: 'PATH-196', title: 'Ingetrokken mededeling toont label en reden', type: 'bug', testId: 'TC-NOT-H-012', platform: 'desktop-chromium',
      gherkin: 'Scenario: Ingetrokken mededeling toont label en reden\n  Given Stasjo opent Berichten met ingetrokken voorbeeldmededelingen in de TEST-basis\n  When hij het filter Ingetrokken kiest\n  Then staan alleen ingetrokken berichten er, ingeklapt met label\n  And zie je de reden zodra je het bericht openklapt' },
    { key: 'PATH-194', title: 'PROD-poort breekt release alleen af bij een nieuwere release', type: 'ci', testId: 'TC-PROD-WEKKER-01', platform: 'CI',
      gherkin: 'Scenario: PROD-poort breekt release alleen af bij een nieuwere release\n  Given een release na TEST-deploy wacht op de handmatige PROD-poort\n  When na tien minuten geen nieuwere commit op main staat\n  Then blijft de goedkeuring open\n  And wordt alleen een oudere wachtende run afgebroken zodra main verder is' },
    { key: 'PATH-197', title: 'Hele maand blijft staan na een hertekening op de achtergrond', type: 'bug', testId: 'TC-DASH-N-032', platform: 'desktop-chromium',
      gherkin: 'Scenario: Hele maand blijft staan na een hertekening op de achtergrond\n  Given Klassiek op Mijn uren met Hele maand gekozen\n  When de app op de achtergrond opnieuw tekent\n  Then blijft Hele maand staan met de indienknop\n  And geldt dat ook in Modern op Mijn uren' },
    { key: 'PATH-188', title: 'Testfuncties uit de balken, alleen Herstel blijft bovenin', type: 'feature', testId: 'TC-KLV-H-018', platform: 'desktop-chromium',
      gherkin: 'Scenario: Testfuncties uit de balken, alleen Herstel blijft bovenin\n  Given de medewerker de app op TEST opent\n  Then staat alleen Herstel in de balk\n  And staan thema, vormgeving, omgeving en versie in het profielmenu' },
    { key: 'PATH-191', title: 'Inlogklik wacht tot de scrollanimatie stopt', type: 'chore', testId: 'TC-AUTH-H-025', platform: 'mobile-safari',
      gherkin: 'Scenario: Inlogklik wacht tot de scrollanimatie stopt\n  Given mobile-safari de inlogknop naar het midden scrolt\n  When de pagina nog zacht doorscrolt\n  Then wacht de helper tot de scroll tien frames stilstaat\n  And klikt hij daarna op het midden van de volledig zichtbare knop' }
  ].map(function (seed, index) {
    return Object.assign({ status: 'done', result: 'pass', source: 'fallback', version: 'voorbeeld', date: '15 sep',
      cases: [{ id: seed.testId, title: seed.title, platform: seed.platform, technique: 'Voorbeeld', assertions: 0, gherkin: seed.gherkin, feature: '' }],
      livingTime: '15 sep · ' + String(16 + index).padStart(2, '0') + ':2' + index }, seed);
  });

  var vastePaginas = {
    teststrategie: {
      key: 'TESTSTRATEGIE', title: 'Teststrategie', leftLabel: 'Uitgangspunt', leftTitle: 'Bewijs boven belofte',
      leftText: 'Elke wens of fix krijgt een uitvoerbare Playwright-case met harde assertions, een benoemde TMap/ISTQB-techniek en een tegenproef die rood is op de oude code.',
      rightLabel: 'Bereik', rightTitle: 'Desktop, telefoon en database',
      rightText: 'Desktop-chromium, mobile-chrome en mobile-safari, aangevuld met een directe SQL/DB-smoke voor de infrastructuur.',
      fo: 'De Living Documentation maakt dezelfde uitvoerbare cases leesbaar: .feature voor het gedrag, .steps.ts voor de navigatie, .spec.ts als uitvoerbare waarheid, plus Allure voor de rapportage.',
      to: 'scripts/sync-living-docs.mjs bouwt LIVING-DOC.md uit de specs. Een nieuw specbestand moet in de definitions van dat script staan, anders vallen de feature en steps weg en faalt npm run test:design.',
      criterion: 'Geen enkele oplevering gaat naar TEST zonder groene regressie en een aantoonbare case.',
      gherkin: 'Scenario: Elke oplevering is aantoonbaar\n  Given een wens of fix is gebouwd\n  When de regressie lokaal en in CI draait\n  Then is er een case met assertions die deze wens bewaakt\n  And staat de uitkomst in de Living Doc',
      summary: 'Hoe we bewijzen dat een oplevering doet wat is afgesproken.', author: 'Bron: LIVING-DOC.md en de werkwijze uit GIO-WENSEN.md', updated: 'Vaste pagina', trace: 'Vast', testId: 'n.v.t.'
    },
    releaseafspraken: {
      key: 'RELEASEAFSPRAKEN', title: 'Releaseafspraken', leftLabel: 'Omgevingen', leftTitle: 'Lokaal → CI → TEST → PROD',
      leftText: 'Lokaal draait de gerichte regressie vóór het pushen. CI draait de volledige suite in tien shards. TEST is uren-test.pathconsultancy.nl en volgt automatisch na een groene run.',
      rightLabel: 'Productie', rightTitle: 'Handmatige keuze, altijd',
      rightText: 'De stap naar productie is een handmatige goedkeuring die alleen Gio geeft. Geen enkele agent keurt die poort goed; een wachtende run wordt hooguit afgebroken als er een nieuwere release klaarstaat.',
      fo: 'Eén agent per branch tegelijk (het "stokje"). Overdragen betekent: alles gepusht, CI-uitkomst erbij en de regel bijgewerkt.',
      to: 'Versienummer: altijd het hoogste nummer op origin/main en origin/herontwerp plus 1, gezet met npm run version:set. Nooit een nummer hergebruiken.',
      criterion: 'PROD wijzigt alleen na een bewuste klik van Gio, nooit automatisch.',
      gherkin: 'Scenario: De poort naar productie blijft van Gio\n  Given een release staat groen op TEST\n  When de pipeline bij de productiepoort komt\n  Then wacht hij op een handmatige goedkeuring\n  And breekt hij alleen af als er een nieuwere release klaarstaat',
      summary: 'Welke stappen automatisch gaan en welke keuze bij een mens blijft.', author: 'Bron: BESLISTABEL.md (R45) en CODEX_HANDOFF.md', updated: 'Vaste pagina', trace: 'Vast', testId: 'TC-PROD-WEKKER-01'
    },
    intake: {
      key: 'INTAKE', title: 'Intake en werkwijze', leftLabel: 'Loket', leftTitle: 'Deze pagina',
      leftText: 'Een wens die hier wordt ingediend krijgt meteen een eigen nummer (PATH-nnn) en komt in de wachtrij. Dat nummer is overal hetzelfde: op het bord, op deze pagina en bij de testcase.',
      rightLabel: 'Keten', rightTitle: 'Acht stappen tot TEST',
      rightText: 'GIO-WENSEN → feature + spec + steps → impactregressie → LIVING-DOC → versie → push → CI → TEST, en daarna de wens naar "Klaar".',
      fo: 'De pagina toont geen verzonnen data: de opleveringen, cases, technieken en assertions komen uit GIO-WENSEN.md en de feature-bestanden, via scripts/pipeline-demo-data.mjs.',
      to: 'npm run check faalt als pilot/path-kwaliteitsstraat-data.json achterloopt op de projectstand. Zo kan de demo niet stilletjes verouderen.',
      criterion: 'Wat hier staat, is terug te vinden in de repository.',
      gherkin: 'Scenario: Een wens loopt van het loket tot TEST\n  Given Gio dient een wens in op deze pagina\n  When de agent het issue met label pipeline-intake oppakt\n  Then ontstaan er een feature, een spec en een groene regressie\n  And staat de oplevering daarna in de Living Doc en op TEST',
      summary: 'Hoe een wens op deze pagina uiteindelijk op TEST terechtkomt.', author: 'Bron: PIPELINE-INTAKE.md', updated: 'Vaste pagina', trace: 'Vast', testId: 'PIPE-H-002'
    },
    // Toegevoegd 17 sep op verzoek van Gio: de kennisbank moet onze échte
    // werkwijze bevatten, niet drie losse pagina's. Bewust met de hand geschreven
    // en niet automatisch uit de MD-bestanden gegenereerd: die bevatten echte
    // e-mailadressen, serverdetails en zelfs een testwachtwoord, en deze pagina is
    // openbaar zonder inloggen (besluit Gio 16 sep: geen persoons- of
    // klantgegevens zolang dat zo is).
    dekkingsronde: {
      key: 'DEKKINGSRONDE', title: 'Dekkingsronde', leftLabel: 'Aanleiding', leftTitle: 'Niet wachten tot iets stukgaat',
      leftText: 'Een dekkingsronde loopt elk scherm en elke flow langs en legt dat naast wat de regressieset werkelijk afdekt. Een scenario zonder inhoudelijke assertie telt daarbij niet als dekking.',
      rightLabel: 'Twee soorten gaten', rightTitle: 'Geen case, of een te zwakke case',
      rightText: 'Gedrag zonder case is het eerste soort. Het tweede is verraderlijker: een case die groen blijft terwijl het gedrag stuk is, bijvoorbeeld omdat hij alleen telt dat er "meer dan nul" van iets is.',
      fo: 'Per gat: een vrij case-nummer, één scenario in het passende feature-bestand, een spec met echte assertions, en waar het onderdeel op een telefoon zichtbaar is ook een mobiele case.',
      to: 'Raakt het gat de database, dan controleert de case de opgeslagen rij terug via de lees-API, niet alleen wat het scherm toont. Alles wat aantoonbaar niet te automatiseren is, wordt expliciet als handwerk benoemd in plaats van stil overgeslagen.',
      criterion: 'Elk gevonden gat is óf gedicht met een groene case, óf expliciet vastgelegd als bewuste keuze.',
      gherkin: 'Scenario: Een zwakke case wordt als gat behandeld\n  Given een bestaande case dekt gedrag alleen oppervlakkig af\n  When de dekkingsronde die case naast het echte gedrag legt\n  Then telt hij als gat, ook al is hij groen\n  And wordt hij vervangen door een case met een tegenproef die rood is op de oude code',
      summary: 'Hoe we systematisch zoeken naar wat de testset nog niet bewijst.', author: 'Bron: DEKKINGSRONDE.md', updated: 'Vaste pagina', trace: 'Vast', testId: 'n.v.t.'
    },
    gegevens: {
      key: 'GEGEVENS', title: 'Gegevens en zichtbaarheid', leftLabel: 'Uitgangspunt', leftTitle: 'Iedereen ziet alleen wat hij nodig heeft',
      leftText: 'Een medewerker ziet zijn eigen uren, zijn eigen opdracht en de mededelingen die aan hem gericht zijn. Tarieven, klant- en tussenpersoongegevens en mailroutering van collega\'s horen daar niet bij, ook niet verstopt in een antwoord van de server.',
      rightLabel: 'Afzender', rightTitle: 'Altijd "Beheerder", nooit een naam',
      rightText: 'Bij een mededeling ziet een medewerker de neutrale aanduiding Beheerder. Welke beheerder het bericht stuurde is iets wat beheerders onderling zien, niet iets wat de ontvanger nodig heeft.',
      fo: 'Deze regel geldt ook voor wat de server meestuurt en niet toont: een veld dat geen scherm gebruikt maar wel in het antwoord zit, is alsnog zichtbaar voor wie kijkt.',
      to: 'Releasenotities in de app worden geschreven vanuit wat er nu goed gaat, niet vanuit wat er mis was — een notitie mag nooit verraden dat er iets is dichtgezet dat eerder openstond. Geen namen, geen bedragen.',
      criterion: 'Geen enkel veld bereikt een rol die het niet nodig heeft, ook niet ongebruikt in een antwoord.',
      gherkin: 'Scenario: De ontvanger ziet geen naam van de afzender\n  Given een beheerder stuurt een mededeling aan een medewerker\n  When de medewerker die mededeling opent\n  Then staat er "Beheerder" als afzender\n  And is de echte naam nergens in het antwoord van de server te vinden',
      summary: 'Welke gegevens welke rol mag zien, en waarom dat ook voor verborgen velden geldt.', author: 'Bron: BESLISTABEL.md en de rollen-cases in de regressieset', updated: 'Vaste pagina', trace: 'Vast', testId: 'ANN-N-011'
    },
    poorten: {
      key: 'POORTEN', title: 'Kwaliteitspoorten', leftLabel: 'Lokaal', leftTitle: 'Impactregressie vóór het pushen',
      leftText: 'Niet de hele suite, maar de set die uit de wijziging zelf volgt: de geraakte specs, de gedeelde functies eromheen en de schermen die dezelfde gegevens tonen. Die set wordt per wijziging afgeleid, niet uit het hoofd gekozen.',
      rightLabel: 'CI', rightTitle: 'De volledige suite, verdeeld over shards',
      rightText: 'De volledige regressie draait in de pijplijn, verdeeld over tien parallelle delen met elk een eigen database. Pas bij groen volgt de uitrol naar TEST.',
      fo: 'Naast de browsertests draait er een reeks controles die geen browser nodig hebben: een structuurcontrole op de app-bundel, taalcontrole op serverberichten, contrastmeting in licht en donker, en broncontracten die bewaken dat beveiligingsinstellingen aanwezig en niet leeg zijn.',
      to: 'Sommige controles kunnen niet over HTTP: een instelling die per omgeving verschilt is lokaal niet te meten zonder een gedeeld configuratiebestand aan te passen. Die worden dan als broncontrole uitgevoerd, met een tegenproef die bewijst dat de controle echt iets meet.',
      criterion: 'Niets gaat naar TEST zonder een groene volledige run in de pijplijn.',
      gherkin: 'Scenario: Een rode controle houdt de uitrol tegen\n  Given een wijziging is gepusht\n  When een van de tien delen van de regressie rood wordt\n  Then stopt de pijplijn vóór de uitrol naar TEST\n  And blijft de vorige versie op TEST staan',
      summary: 'Welke controles wanneer draaien, en wat er gebeurt als er één rood wordt.', author: 'Bron: de pijplijndefinitie en de controlescripts in de repository', updated: 'Vaste pagina', trace: 'Vast', testId: 'n.v.t.'
    },
    koppelingen: {
      key: 'KOPPELINGEN', title: 'Koppelingen', leftLabel: 'Twee smaken', leftTitle: 'Onze omgeving of die van de klant',
      leftText: 'De keten is dezelfde, alleen de bron verschilt. Standaard draait alles op onze eigen administratie. Heeft een klant al Jira, Confluence of Zephyr, dan kan de bron per onderdeel worden omgezet naar hun omgeving zonder dat de werkwijze verandert.',
      rightLabel: 'Stand vandaag', rightTitle: 'Eigen bron operationeel, klantbronnen voorbereid',
      rightText: 'De eigen bron levert nu tickets, documenten en testcases. De drie klantkoppelingen staan klaar qua vorm en instelling, maar zijn nog niet aangesloten: dat vraagt per klant echte gegevens en een afspraak over rechten.',
      fo: 'Wat we van een klant nodig hebben staat vast per koppeling: voor Jira de basis-URL, de projectsleutel en een API-token van een serviceaccount; voor Confluence dezelfde omgeving plus de ruimtesleutel; voor Zephyr Scale een eigen API-token, want dat staat los van het Atlassian-token.',
      to: 'Die gegevens staan in de serverconfiguratie buiten de webroot, nooit in de pagina zelf: deze pagina is openbaar en zonder inloggen bereikbaar. Het koppelingen-endpoint vertelt daarom alleen WELKE bron aan staat en of hij volledig is ingesteld, nooit waarmee.',
      criterion: 'Een klantkoppeling is pas "gekoppeld" als hij aan staat en zowel een basis-URL als een token heeft; anders meldt hij zichzelf eerlijk als voorbereid of onvolledig.',
      gherkin: 'Scenario: Een halve instelling meldt zich niet als gekoppeld\n  Given een klantkoppeling staat aan maar mist een token\n  When de pagina de koppelingen opvraagt\n  Then meldt die bron zich als onvolledig ingesteld\n  And staat er nergens een waarde uit de instelling in het antwoord',
      summary: 'Hoe dezelfde keten werkt op onze eigen omgeving of op die van een klant.', author: 'Bron: pilot/path-kwaliteitsstraat-koppelingen.php', updated: 'Vaste pagina', trace: 'Vast', testId: 'PIPE-H-009'
    },
    tegenproef: {
      key: 'TEGENPROEF', title: 'De tegenproef', leftLabel: 'Waarom', leftTitle: 'Een groene test bewijst niets uit zichzelf',
      leftText: 'Een test die groen is op zowel de kapotte als de gerepareerde code meet niet wat hij beweert te meten. De tegenproef is de enige manier om dat verschil hard te maken.',
      rightLabel: 'Hoe', rightTitle: 'Rood op de oude code, groen op de nieuwe',
      rightText: 'De fix wordt tijdelijk teruggedraaid, de case wordt gedraaid en moet rood zijn met een melding die de fout benoemt. Daarna wordt de fix teruggezet en is dezelfde case groen.',
      fo: 'Bij een vondst zonder fix — gedrag dat al goed was maar nog niet vastlag — wordt de code tijdelijk expres kapotgemaakt om dezelfde zekerheid te krijgen, en daarna aantoonbaar teruggezet.',
      to: 'De uitkomst van beide runs wordt vastgelegd bij de oplevering, inclusief de exacte foutmelding waarop de rode run viel. Zonder dat spoor is "getest" een bewering.',
      criterion: 'Elke opgeleverde case heeft een aantoonbaar rode run op de oude situatie.',
      gherkin: 'Scenario: Een nieuwe case bewijst zichzelf\n  Given een fix met een bijbehorende nieuwe case\n  When de fix tijdelijk wordt teruggedraaid\n  Then valt de case om met een melding die de fout benoemt\n  And is dezelfde case groen zodra de fix terugstaat',
      summary: 'Waarom elke case eerst rood moet zijn geweest voordat hij meetelt.', author: 'Bron: de vaste werkwijze uit GIO-WENSEN.md', updated: 'Vaste pagina', trace: 'Vast', testId: 'n.v.t.'
    }
  };

  // ---- Weergave: licht, donker of de systeeminstelling volgen ----
  var THEME_KEY = 'path-pipeline-theme';
  var themes = [
    { id: 'system', icon: '◐', label: 'systeem' },
    { id: 'light', icon: '☀', label: 'licht' },
    { id: 'dark', icon: '☾', label: 'donker' }
  ];

  function applyTheme(id) {
    var keuze = themes.find(function (t) { return t.id === id; }) || themes[0];
    if (keuze.id === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', keuze.id);
    var knop = document.querySelector('[data-theme-toggle]');
    if (knop) {
      knop.setAttribute('aria-label', 'Weergave: ' + keuze.label + '. Klik voor de volgende.');
      knop.setAttribute('title', 'Weergave: ' + keuze.label);
      knop.setAttribute('data-theme-state', keuze.id);
      var icoon = knop.querySelector('[data-theme-icon]');
      if (icoon) icoon.textContent = keuze.icon;
    }
    try { localStorage.setItem(THEME_KEY, keuze.id); } catch (_error) { /* geen opslag */ }
    return keuze.id;
  }

  function huidigeTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (_error) { return 'system'; }
  }

  function volgendeTheme() {
    var index = themes.findIndex(function (t) { return t.id === huidigeTheme(); });
    return applyTheme(themes[(index + 1) % themes.length].id);
  }

  applyTheme(huidigeTheme());

  var feed = { delivered: [], open: [], niceToHave: [], appVersion: '', generatedAt: '', loaded: false };
  var ui = { view: 'backlog', query: '', type: 'all', source: 'all', status: 'all', sort: '', sortDir: 'asc', expandAll: false, docKey: '', fixedDoc: '', detail: '', keuze: -1, toon: {}, releaseFilter: 'all' };

  // Hoeveel er op dit moment van een lijst getekend wordt. Begint op PER_KEER en
  // groeit met "Toon meer"; een nieuw filter of een nieuwe zoekterm zet hem terug,
  // anders staat een lange lijst open terwijl er nog maar drie treffers zijn.
  function toonAantal(naam) {
    return ui.toon[naam] || PER_KEER[naam] || 12;
  }
  function toonMeerHtml(naam, totaal) {
    var zichtbaar = toonAantal(naam);
    if (totaal <= zichtbaar) return '';
    var rest = totaal - zichtbaar;
    return '<button type="button" class="toon-meer" data-toon-meer="' + naam + '">Toon meer <b>(' + rest + ')</b></button>';
  }
  function resetToon() {
    ui.toon = {};
  }

  function initialState() {
    return { schemaVersion: 3, sequence: 198, customTickets: [], customTests: [], livingDoc: [], activePhase: 0, activeTicket: '' };
  }

  function loadState() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || !Array.isArray(stored.customTickets) || !Array.isArray(stored.customTests) || !Array.isArray(stored.livingDoc)) return initialState();
      if (stored.schemaVersion !== 3) {
        stored.livingDoc = stored.livingDoc.filter(function (entry) { return !/^PATH-19[1-7]$/.test(entry.key); });
        stored.schemaVersion = 3;
      }
      stored.livingDoc = stored.livingDoc.slice(0, LIVING_DOC_BEWAAR);
      stored.activePhase = 0;
      stored.activeTicket = '';
      stored.customTickets.forEach(function (ticket) { if (ticket.status === 'doing') ticket.status = 'todo'; });
      return stored;
    } catch (_error) {
      return initialState();
    }
  }

  var state = loadState();
  var lastCompletedKey = '';
  var lastCompletedResult = '';

  var phaseCopy = {
    1: { title: 'Vraag en acceptatiecriterium vastgelegd', status: 'Het ticket staat in Jira en Confluence vertaalt de vraag naar een leesbaar Gherkin-scenario.' },
    2: { title: 'Testcase staat in Zephyr', status: 'De traceerbare testcase is toegevoegd en gekoppeld aan hetzelfde ticket.' },
    3: { title: 'Automatische controles draaien lokaal', status: 'Playwright, Cypress en de API-controle simuleren het bewijs vóór een push.' },
    4: { title: 'CI verwerkt de feedback op TEST', status: 'Het resultaat wordt gepubliceerd en als nieuwste bewijsregel aan de Living Doc toegevoegd.' }
  };

  function $(selector) { return document.querySelector(selector); }
  function $$(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }

  function saveState() {
    var snapshot = Object.assign({}, state, { activePhase: 0, activeTicket: '' });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch (_error) { /* opslag niet beschikbaar */ }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function toegewezen(ticket) {
    var wie = String(ticket.who || (ticket.source === 'feed' ? 'main' : 'Gio')).toLowerCase();
    if (wie.indexOf('herontwerp') >= 0) return { naam: 'Herontwerp', initialen: 'HW' };
    if (wie.indexOf('gio') >= 0) return { naam: 'Gio', initialen: 'GM' };
    if (wie.indexOf('besluit') >= 0) return { naam: 'Besluit', initialen: 'BO' };
    return { naam: 'Main', initialen: 'MA' };
  }

  function iconFor(type) { return { bug: '!', feature: '◆', chore: '●', ci: '↯' }[type] || '◆'; }

  // Een kale URL midden in een kop leest slecht; alleen het domein is genoeg.
  function zonderLinks(text) {
    return String(text).replace(/https?:\/\/(\S+)/g, function (_geheel, rest) {
      return rest.split('/')[0].replace(/[),.]+$/, '');
    });
  }

  function shorten(text, max) {
    var clean = zonderLinks(text).replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    var cut = clean.slice(0, max);
    return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)) + '…';
  }

  function typeFor(wish) {
    var text = String(wish).toLowerCase();
    if (/pipeline|ci\b|prod-|wekker|release|deploy/.test(text)) return 'ci';
    if (/werkwijze|stokje|seed|documentatie|erd\b/.test(text)) return 'chore';
    if (/fout|bug|kapot|stak uit|onleesbaar|vervuil|verspring|niet meer|herstel/.test(text)) return 'bug';
    return 'feature';
  }

  function deliveryKey(row, used) {
    var base;
    if (row.cases[0]) base = row.cases[0].id;
    else {
      var match = String(row.version).match(/\d+\.\d+\.\d+/);
      base = match ? match[0] : (String(row.version).split(/[\s(]/)[0] || 'oplevering').toUpperCase();
    }
    var key = base;
    for (var n = 2; used[key]; n += 1) key = base + '-' + n;
    used[key] = true;
    return key;
  }

  function deliveredTickets() {
    if (!feed.loaded) return fallbackSeeds;
    var used = {};
    return feed.delivered.map(function (row) {
      var first = row.cases[0];
      return {
        key: deliveryKey(row, used), title: shorten(row.wish, 110), wish: row.wish, type: typeFor(row.wish),
        status: 'done', result: 'pass', source: 'feed', version: row.version, date: row.date,
        testId: first ? first.id : '', platform: first ? first.platform : '',
        gherkin: row.cases.map(function (c) { return c.gherkin; }).join('\n\n'),
        cases: row.cases, livingTime: row.date
      };
    });
  }

  function openTickets() {
    return feed.open.map(function (row, index) {
      return {
        key: 'WENS-' + (index + 1), title: shorten(row.wish, 110), wish: row.wish, type: typeFor(row.wish),
        status: /bezig/.test(row.status) ? 'doing' : 'todo', result: '', source: 'feed', who: row.who, openStatus: row.status,
        date: row.date, testId: '', platform: '', gherkin: '', cases: []
      };
    });
  }

  function matchesFilters(ticket) {
    if (ui.type !== 'all' && ticket.type !== ui.type) return false;
    var isLocal = ticket.source !== 'feed' && ticket.source !== 'fallback';
    if (ui.source === 'feed' && isLocal) return false;
    if (ui.source === 'local' && !isLocal) return false;
    if (!ui.query) return true;
    var haystack = [ticket.key, ticket.title, ticket.wish, ticket.testId, ticket.platform, ticket.version, ticket.gherkin].join(' ').toLowerCase();
    return haystack.indexOf(ui.query) >= 0;
  }

  function boardColumns() {
    var local = state.customTickets;
    var done = local.filter(function (t) { return t.status === 'done'; }).concat(deliveredTickets())
    var open = openTickets();
    return {
      todo: sorteerOpVolgorde(local.filter(function (t) { return t.status === 'todo' || t.status === 'ingediend'; }).concat(open.filter(function (t) { return t.status === 'todo'; }))).filter(matchesFilters),
      doing: local.filter(function (t) { return t.status === 'doing'; }).concat(open.filter(function (t) { return t.status === 'doing'; })).filter(matchesFilters),
      done: done.filter(matchesFilters)
    };
  }

  function docTickets() {
    return state.customTickets.filter(function (t) { return t.status !== 'todo'; }).concat(deliveredTickets());
  }

  function allTests() {
    var seen = {};
    var rows = state.customTests.map(function (t) {
      return { id: t.testId, title: t.title, platform: t.platform, result: t.result, gherkin: t.gherkin, technique: 'Demo-simulatie', assertions: 0, folder: 'Demo-wensen', ticketKey: t.key };
    });
    deliveredTickets().forEach(function (ticket) {
      ticket.cases.forEach(function (c) {
        if (seen[c.id]) return;
        seen[c.id] = true;
        rows.push({ id: c.id, title: c.title, platform: c.platform, result: 'pass', gherkin: c.gherkin, technique: c.technique, assertions: c.assertions, feature: c.feature, folder: folderFor(c.id), ticketKey: ticket.key });
      });
    });
    return rows;
  }

  function folderFor(id) {
    var prefix = String(id).split('-')[0];
    return { TC: 'Regressie', NOT: 'Berichten', KLV: 'Klassiek', DASH: 'Dashboard', AUTH: 'Inloggen', PIPE: 'Pipeline-demo', SKIN: 'Vormgeving' }[prefix] || 'Overig';
  }

  function visibleTests() {
    var rows = allTests().filter(function (row) {
      if (ui.status !== 'all' && row.result !== ui.status) return false;
      if (ui.folder && row.folder !== ui.folder) return false;
      if (!ui.query) return true;
      return [row.id, row.title, row.platform, row.technique, row.gherkin].join(' ').toLowerCase().indexOf(ui.query) >= 0;
    });
    if (ui.sort) {
      rows.sort(function (a, b) {
        var x = a[ui.sort] === undefined ? '' : a[ui.sort];
        var y = b[ui.sort] === undefined ? '' : b[ui.sort];
        var result = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'nl');
        return ui.sortDir === 'desc' ? -result : result;
      });
    }
    return rows;
  }

  function livingDocEntries() {
    var real = deliveredTickets().map(function (t) {
      return { key: t.key, text: t.title, result: t.source === 'feed' ? 'Opgeleverd · ' + t.version : 'Geslaagd', time: t.livingTime };
    });
    return state.livingDoc.concat(real);
  }

  // ===================== Weergave =====================
  function statusLabel(ticket) {
    if (ticket.status === 'ingediend') return '<span class="status-pill waiting">Wacht op VS Code</span>';
    if (ticket.status === 'doing' && ticket.source === 'feed') return '<span class="status-pill running">' + escapeHtml(ticket.who || 'bezig') + '</span>';
    if (ticket.status === 'doing') return '<span class="status-pill running">Fase ' + state.activePhase + ' van 4</span>';
    if (ticket.status === 'todo' && ticket.source === 'feed') return '<span class="status-pill open">' + escapeHtml(ticket.openStatus || 'open') + '</span>';
    if (ticket.result === 'fail') return '<span class="status-pill fail">CI aandacht</span>';
    if (ticket.status === 'done') return '<span class="status-pill pass">Op TEST</span>';
    return '<span class="status-pill open">Te doen</span>';
  }

  function ticketHtml(ticket) {
    var isLocal = ticket.source !== 'feed' && ticket.source !== 'fallback';
    var canRun = isLocal && (ticket.status === 'todo' || ticket.status === 'ingediend');
    var meta = '';
    if (ticket.version && ticket.source === 'feed') meta += '<span class="version-chip">' + escapeHtml(ticket.version) + '</span>';
    if (ticket.platform) meta += '<span>' + escapeHtml(ticket.platform) + '</span>';
    if (ticket.who && ticket.status !== 'done') meta += '<span>' + escapeHtml(ticket.who) + '</span>';
    // Alleen in Te doen mag de volgorde veranderen (slepen of ▲▼); een kaart tussen
    // kolommen verplaatsen zou een stand tonen die de keten niet kent.
    var inTeDoen = ticket.status === 'todo' || ticket.status === 'ingediend';
    return '<article class="ticket-card' + (ticket.status === 'doing' && isLocal ? ' is-running' : '') + '" data-ticket="' + escapeHtml(ticket.key) + '" data-source="' + escapeHtml(isLocal ? 'local' : ticket.source) + '"' + (inTeDoen ? ' draggable="true"' : '') + '>' +
      (inTeDoen ? '<span class="sleep-handvat" aria-hidden="true" title="Sleep om de volgorde te wijzigen">⋮⋮</span>' : '') +
      '<button type="button" class="card-open" data-open-ticket="' + escapeHtml(ticket.key) + '"><h4>' + escapeHtml(ticket.title) + '</h4></button>' +
      (inTeDoen ? '<span class="verplaats-knoppen"><button type="button" data-verplaats="-1" aria-label="Omhoog in Te doen">▲</button><button type="button" data-verplaats="1" aria-label="Omlaag in Te doen">▼</button></span>' : '') +
      '<div class="ticket-card-foot">' +
        '<i class="issue-icon ' + escapeHtml(ticket.type) + '" aria-hidden="true">' + iconFor(ticket.type) + '</i>' +
        '<code class="issue-key">' + escapeHtml(ticket.key) + '</code>' +
        statusLabel(ticket) +
        (meta ? '<span class="ticket-meta">' + meta + '</span>' : '') +
        '<span class="card-avatar" title="' + escapeHtml(toegewezen(ticket).naam) + '">' + escapeHtml(toegewezen(ticket).initialen) + '</span>' +
      '</div>' +
      (ticket.gherkin ? '<details class="gherkin"' + (ui.expandAll ? ' open' : '') + '><summary>Gherkin</summary><pre>' + escapeHtml(ticket.gherkin) + '</pre></details>' : '') +
      // 17 sep: hier stond een link naar het GitHub-issue. Dat is onze eigen
      // implementatie en geen informatie voor wie het bord leest -- zeker niet
      // zodra een klant meekijkt. In plaats daarvan onze eigen verwijzing: de
      // sleutel van het ticket, die overal in de drie werkruimtes dezelfde is.
      (ticket.status === 'ingediend' ? '<div class="ticket-card-foot"><button type="button" class="issue-link" data-open-ticket="' + escapeHtml(ticket.key) + '">Bekijk ' + escapeHtml(ticket.key) + ' →</button></div>' : '') +
      (canRun ? '<div class="ticket-card-foot"><button type="button" class="card-run" data-run-ticket="' + escapeHtml(ticket.key) + '">Simuleer de flow</button></div>' : '') +
      '</article>';
  }

  function renderBoard() {
    var columns = boardColumns();
    ['todo', 'doing', 'done'].forEach(function (column) {
      var list = $('[data-ticket-list="' + column + '"]');
      if (!list) return;
      var alles = columns[column];
      var zichtbaar = alles.slice(0, toonAantal(column));
      list.innerHTML = alles.length ? zichtbaar.map(ticketHtml).join('') + toonMeerHtml(column, alles.length)
        : '<p class="empty-column">' + (ui.query || ui.type !== 'all' || ui.source !== 'all' ? 'Geen resultaten met dit filter' : 'Geen tickets') + '</p>';
      // De kolomteller telt de hele kolom, niet alleen wat er nu getekend staat --
      // anders lijkt een kolom te krimpen zodra je hem nog niet hebt uitgeklapt.
      var count = $('[data-count="' + column + '"]');
      if (count) count.textContent = String(alles.length);
    });
    koppelSlepen();
    var total = columns.todo.length + columns.doing.length + columns.done.length;
    var badge = $('[data-backlog-count]');
    if (badge) badge.textContent = String(total);
    var meta = $('[data-board-meta]');
    if (meta) meta.textContent = ui.query || ui.type !== 'all' || ui.source !== 'all' ? total + ' van ' + (boardTotalOngefilterd()) + ' getoond' : total + ' in de hele backlog';
  }

  function boardTotalOngefilterd() {
    var local = state.customTickets;
    return local.filter(function (t) { return t.status === 'done'; }).concat(deliveredTickets()).length
      + local.filter(function (t) { return t.status !== 'done'; }).length + openTickets().length;
  }

  function renderPhases() {
    $$('[data-phase]').forEach(function (element) {
      var phase = Number(element.getAttribute('data-phase'));
      element.classList.toggle('is-active', phase === state.activePhase);
      element.classList.toggle('is-complete', state.activePhase > phase);
    });
  }

  function resultPill(result) {
    if (result === 'running') return '<span class="status-pill running">Draait nu</span>';
    if (result === 'fail') return '<span class="status-pill fail">Aandacht</span>';
    return '<span class="status-pill pass">Geslaagd</span>';
  }

  function renderTests() {
    var alleRijen = visibleTests();
    var rows = alleRijen.slice(0, toonAantal('tests'));
    var table = $('[data-test-table]');
    if (table) {
      table.innerHTML = (rows.length ? rows.map(function (row) {
        var detail = row.assertions ? '<small>' + escapeHtml(row.technique) + ' · ' + row.assertions + ' assertions</small>' : '';
        return '<tr data-testcase="' + escapeHtml(row.id) + '">' +
          '<td><button type="button" class="row-open" data-open-ticket="' + escapeHtml(row.ticketKey) + '">' + escapeHtml(row.id) + '</button></td>' +
          '<td>' + escapeHtml(row.title) + detail + '</td>' +
          '<td>' + escapeHtml(row.platform) + '</td>' +
          '<td class="assert-count">' + (row.assertions || '—') + '</td>' +
          '<td>' + resultPill(row.result) + '</td>' +
          '<td><details class="gherkin"' + (ui.expandAll ? ' open' : '') + '><summary>Gherkin</summary><pre>' + escapeHtml(row.gherkin) + '</pre></details></td></tr>';
      }).join('') : '<tr><td colspan="6"><p class="empty-column">Geen testcases met dit filter</p></td></tr>')
        + (alleRijen.length > rows.length ? '<tr class="toon-meer-rij"><td colspan="6">' + toonMeerHtml('tests', alleRijen.length) + '</td></tr>' : '');
    }
    var alle = allTests();
    var passed = alle.filter(function (r) { return r.result === 'pass'; }).length;
    var failed = alle.filter(function (r) { return r.result === 'fail'; }).length;
    var running = alle.filter(function (r) { return r.result === 'running'; }).length;
    var metrics = $('[data-test-metrics]');
    if (metrics) {
      metrics.innerHTML = '<div class="metric"><span>Testcases</span><strong>' + alle.length + '</strong></div>' +
        '<div class="metric pass"><span>Geslaagd</span><strong>' + passed + '</strong></div>' +
        '<div class="metric fail"><span>Aandacht</span><strong>' + failed + '</strong></div>' +
        '<div class="metric running"><span>Draait nu</span><strong>' + running + '</strong></div>';
    }
    var count = $('[data-test-count]');
    if (count) count.textContent = String(alle.length);

    var folders = {};
    alle.forEach(function (row) { folders[row.folder] = (folders[row.folder] || 0) + 1; });
    var tree = $('[data-test-folders]');
    if (tree) {
      tree.innerHTML = '<li><button type="button" class="' + (ui.folder ? '' : 'is-current') + '" data-folder="">Alle mappen <b>' + alle.length + '</b></button></li>' +
        Object.keys(folders).sort().map(function (name) {
          return '<li><button type="button" class="' + (ui.folder === name ? 'is-current' : '') + '" data-folder="' + escapeHtml(name) + '">' + escapeHtml(name) + ' <b>' + folders[name] + '</b></button></li>';
        }).join('');
    }
    $$('[data-sort-arrow]').forEach(function (arrow) {
      arrow.textContent = arrow.getAttribute('data-sort-arrow') === ui.sort ? (ui.sortDir === 'asc' ? '↑' : '↓') : '';
    });
  }

  // ---- Releases --------------------------------------------------------------
  // Een release is een versienummer met alles wat daarin is opgeleverd. Alle
  // gegevens komen uit de projectstand: nergens een verzonnen datum of status.
  function releases() {
    var perVersie = {};
    var volgorde = [];
    deliveredTickets().forEach(function (ticket) {
      var versie = (String(ticket.version || '').match(/\d+\.\d+\.\d+/) || [])[0];
      if (!versie) return;
      if (!perVersie[versie]) {
        perVersie[versie] = { versie: versie, datum: ticket.date || '', wensen: [], cases: 0, assertions: 0 };
        volgorde.push(versie);
      }
      var regel = perVersie[versie];
      regel.wensen.push(ticket);
      (ticket.cases || []).forEach(function (c) {
        regel.cases += 1;
        regel.assertions += Number(c.assertions || 0);
      });
      // De oudste datum binnen een versie is de datum waarop eraan begonnen is.
      if (!regel.datum) regel.datum = ticket.date || '';
    });
    var uit = volgorde.map(function (versie) {
      var regel = perVersie[versie];
      // Gereleased = staat op TEST. Een versie zonder testcase is opgeleverd maar
      // nog niet aantoonbaar; dat verschil hoort zichtbaar te zijn.
      regel.status = regel.cases > 0 ? 'Gereleased' : 'Zonder eigen case';
      regel.omschrijving = korteOmschrijving(regel.wensen[0]);
      return regel;
    });
    // Open wensen hebben nog geen versie: die vormen samen de niet-gereleaste rij,
    // net als "Geen oplevering" in Jira.
    var open = openTickets();
    if (open.length) {
      uit.push({
        versie: 'Geen oplevering', datum: '', wensen: open, cases: 0, assertions: 0,
        status: 'Niet gereleased',
        omschrijving: open.length + ' wens(en) die nog op een versie wachten.'
      });
    }
    return uit;
  }

  function korteOmschrijving(ticket) {
    if (!ticket) return '';
    var tekst = String(ticket.wish || ticket.title || '').replace(/\s+/g, ' ').trim();
    // Eerste zin, of afgekapt: de tabel moet te scannen zijn, het hele verhaal
    // staat in het ticket zelf.
    var punt = tekst.indexOf('. ');
    if (punt > 30 && punt < 160) return tekst.slice(0, punt + 1);
    return tekst.length > 160 ? tekst.slice(0, 157) + '…' : tekst;
  }

  function renderReleases() {
    var lijst = releases().filter(function (regel) {
      if (ui.releaseFilter === 'released') return regel.status === 'Gereleased';
      if (ui.releaseFilter === 'open') return regel.status === 'Niet gereleased';
      return true;
    }).filter(function (regel) {
      if (!ui.query) return true;
      return [regel.versie, regel.omschrijving, regel.status].join(' ').toLowerCase().indexOf(ui.query) >= 0;
    });

    var tabel = $('[data-release-table]');
    if (tabel) {
      var zichtbaar = lijst.slice(0, toonAantal('releases'));
      tabel.innerHTML = (zichtbaar.length ? zichtbaar.map(function (regel) {
        var klaar = regel.wensen.length ? Math.round((regel.wensen.filter(function (t) { return (t.cases || []).length; }).length / regel.wensen.length) * 100) : 0;
        return '<tr data-release="' + escapeHtml(regel.versie) + '">'
          + '<td><button type="button" class="row-open" data-release-open="' + escapeHtml(regel.versie) + '">' + escapeHtml(regel.versie) + '</button></td>'
          + '<td>' + (regel.status === 'Gereleased'
            ? '<span class="status-pill pass">Gereleased</span>'
            : '<span class="status-pill open">' + escapeHtml(regel.status) + '</span>') + '</td>'
          + '<td><span class="voortgang" role="img" aria-label="' + klaar + ' procent van de wensen heeft een testcase">'
            + '<i style="width:' + klaar + '%"></i></span>'
            + '<small>' + regel.wensen.length + ' wens(en) · ' + regel.cases + ' case(s) · ' + regel.assertions + ' assertions</small></td>'
          + '<td>' + escapeHtml(regel.datum || '—') + '</td>'
          + '<td>' + escapeHtml(regel.omschrijving) + '</td>'
          + '</tr>';
      }).join('') : '<tr><td colspan="5"><p class="empty-column">Geen releases met dit filter</p></td></tr>')
        + (lijst.length > zichtbaar.length ? '<tr class="toon-meer-rij"><td colspan="5">' + toonMeerHtml('releases', lijst.length) + '</td></tr>' : '');
    }

    var alle = releases();
    $$('[data-release-count]').forEach(function (el) { el.textContent = String(alle.length); });
    var meta = $('[data-release-meta]');
    if (meta) meta.textContent = lijst.length === alle.length ? alle.length + ' releases' : lijst.length + ' van ' + alle.length + ' getoond';
    $$('[data-release-filter]').forEach(function (knop) {
      knop.setAttribute('aria-pressed', knop.getAttribute('data-release-filter') === ui.releaseFilter ? 'true' : 'false');
    });
  }

  function renderLivingDoc() {
    state.livingDoc = state.livingDoc.slice(0, LIVING_DOC_BEWAAR);
    var list = $('[data-living-doc]');
    if (!list) return;
    var alle = livingDocEntries();
    list.innerHTML = alle.slice(0, toonAantal('living')).map(function (entry) {
      return '<li data-living-key="' + escapeHtml(entry.key) + '" class="' + (entry.key === lastCompletedKey ? 'is-new' : '') + '">' +
        '<code>' + escapeHtml(entry.key) + '</code><p>' + escapeHtml(entry.text) + ' · ' + escapeHtml(entry.result) + '</p><time>' + escapeHtml(entry.time) + '</time></li>';
    }).join('') + (alle.length > toonAantal('living') ? '<li class="toon-meer-rij">' + toonMeerHtml('living', alle.length) + '</li>' : '');
  }

  function setText(selector, value) {
    var element = $(selector);
    if (element) element.textContent = value;
  }

  function analysisForLocal(ticket) {
    var stakeholder = ticket.stakeholder || 'Stakeholder';
    var goal = ticket.goal || 'de gevraagde verandering aantoonbaar waarde oplevert';
    var lower = ticket.title.charAt(0).toLowerCase() + ticket.title.slice(1);
    return {
      leftLabel: 'STAKEHOLDERVRAAG', leftTitle: stakeholder, leftText: 'Hoe zorgen we dat ' + lower + ' en dat dit controleerbaar wordt opgeleverd?',
      rightLabel: 'USER STORY', rightTitle: ticket.key + ' · User Story', rightText: 'Als ' + stakeholder + ' wil ik ' + lower + ', zodat ' + goal + '.',
      fo: 'De oplossing ondersteunt "' + ticket.title + '". Het gedrag is voor ' + stakeholder + ' zichtbaar en voldoet aan het vastgelegde acceptatiecriterium.',
      to: ticket.status === 'ingediend'
        ? 'Aangenomen in de intakewachtrij. De agent in VS Code haalt hem daar op, maakt het feature-bestand en de Playwright-case, draait de impactregressie, werkt LIVING-DOC.md en GIO-WENSEN.md bij en pusht naar CI en TEST. Het issue met label ' + INTAKE_LABEL + ' maakt de agent zelf aan; dat hoef jij niet te doen.'
        : 'Koppel ' + ticket.key + ' aan ' + ticket.testId + ', automatiseer het scenario op ' + ticket.platform + ' en publiceer de uitslag via de TEST-pipeline naar de Living Doc.',
      criterion: ticket.criterion || 'De beschreven verandering is zichtbaar en automatisch gecontroleerd.',
      gherkin: ticket.gherkin, author: 'Analyse voor ' + stakeholder,
      updated: ticket.status === 'ingediend' ? 'Ingediend, wacht op VS Code' : (ticket.key === lastCompletedKey ? 'Zojuist bijgewerkt' : 'Lokale demo'),
      summary: 'Analyse en ontwerp bij de stakeholdervraag, gekoppeld aan Jira en de uitvoerbare testbasis in Zephyr.',
      trace: ticket.status === 'ingediend' ? 'Wacht op VS Code' : (ticket.status === 'doing' ? 'In uitvoering' : (ticket.result === 'fail' ? 'Aandacht' : 'Opgeleverd')),
      testId: ticket.testId
    };
  }

  function analysisForDelivered(ticket) {
    var cases = ticket.cases || [];
    var caseLines = cases.length
      ? cases.map(function (c) { return c.id + ' — ' + (c.technique || 'techniek n.t.b.') + (c.assertions ? ' · ' + c.assertions + ' assertions' : '') + (c.feature ? '\n' + c.feature : ''); }).join('\n\n')
      : 'Voor deze oplevering is geen aparte Playwright-case vastgelegd in GIO-WENSEN (werkwijze, seed of documentatie).';
    return {
      leftLabel: 'WENS VAN GIO (GIO-WENSEN.MD)', leftTitle: ticket.date + ' · ' + ticket.version, leftText: zonderLinks(ticket.wish || ticket.title),
      rightLabel: 'BEWIJS', rightTitle: cases.length ? cases.length + ' Playwright-case' + (cases.length === 1 ? '' : 's') : 'Geen aparte case',
      rightText: cases.length ? cases.map(function (c) { return c.id + ': ' + c.title; }).join(' · ') : 'Vastgelegd als werkwijze of data, zonder eigen testcase.',
      fo: zonderLinks(ticket.wish || ticket.title), to: caseLines,
      criterion: cases.length ? cases[0].title : ticket.title,
      gherkin: ticket.gherkin || 'Geen Gherkin: deze oplevering heeft geen eigen Playwright-case.',
      author: 'Bron: GIO-WENSEN.md · tests/playwright/features · LIVING-DOC.md',
      updated: 'Opgeleverd in ' + ticket.version + (feed.appVersion ? ' · app ' + feed.appVersion : ''),
      summary: 'Echte oplevering uit de projectstand: de wens uit GIO-WENSEN.md met de gekoppelde cases uit de feature-bestanden.',
      trace: 'Opgeleverd', testId: ticket.testId
    };
  }

  function renderKnowledge() {
    var tickets = docTickets();
    var tree = $('[data-doc-tree]');
    if (tree) {
      // De geselecteerde pagina blijft altijd in de boom staan, ook als hij verder
      // naar achteren staat dan wat er nu getekend is -- anders verdwijnt de pagina
      // die je aan het lezen bent uit de navigatie.
      var zichtbaar = tickets.slice(0, toonAantal('doc'));
      if (!ui.fixedDoc && ui.docKey && !zichtbaar.some(function (t) { return t.key === ui.docKey; })) {
        var huidige = tickets.find(function (t) { return t.key === ui.docKey; });
        if (huidige) zichtbaar = zichtbaar.concat([huidige]);
      }
      tree.innerHTML = zichtbaar.map(function (t) {
        return '<li class="' + (!ui.fixedDoc && t.key === ui.docKey ? 'is-current' : '') + '"><button type="button" data-doc-select="' + escapeHtml(t.key) + '"><code>' + escapeHtml(t.key) + '</code><span>' + escapeHtml(t.title) + '</span></button></li>';
      }).join('') + (tickets.length > zichtbaar.length ? '<li class="toon-meer-rij">' + toonMeerHtml('doc', tickets.length) + '</li>' : '');
    }
    // Twee plekken tonen dit getal: het tabblad-badge en de kop boven de boom.
    $$('[data-doc-count]').forEach(function (el) { el.textContent = String(tickets.length); });
    $$('[data-doc-fixed]').forEach(function (button) {
      button.classList.toggle('is-current', ui.fixedDoc === button.getAttribute('data-doc-fixed'));
    });

    var selected = null;
    var a = null;
    if (ui.fixedDoc && vastePaginas[ui.fixedDoc]) {
      a = vastePaginas[ui.fixedDoc];
      selected = { key: a.key, title: a.title };
    } else {
      if (!tickets.some(function (t) { return t.key === ui.docKey; })) ui.docKey = tickets.length ? tickets[0].key : '';
      selected = tickets.find(function (t) { return t.key === ui.docKey; }) || tickets[0];
      if (!selected) return;
      a = selected.source === 'feed' || selected.source === 'fallback' ? analysisForDelivered(selected) : analysisForLocal(selected);
    }

    setText('[data-doc-key]', selected.key);
    setText('[data-doc-title]', selected.key + ' · ' + selected.title);
    setText('[data-doc-summary]', a.summary);
    setText('[data-doc-author]', a.author);
    setText('[data-doc-updated]', a.updated);
    setText('[data-doc-left-label]', a.leftLabel);
    setText('[data-doc-stakeholder]', a.leftTitle);
    setText('[data-doc-question]', a.leftText);
    setText('[data-doc-right-label]', a.rightLabel);
    setText('[data-doc-story-title]', a.rightTitle);
    setText('[data-doc-story]', a.rightText);
    setText('[data-doc-fo]', a.fo);
    setText('[data-doc-to]', a.to);
    setText('[data-doc-criterion]', a.criterion);
    setText('[data-doc-gherkin]', a.gherkin);

    var trace = $('[data-doc-trace]');
    if (trace) {
      trace.innerHTML = '<span><small>Jira</small><strong>' + escapeHtml(selected.key) + '</strong></span><i>→</i>' +
        '<span><small>Confluence</small><strong>FO + TO</strong></span><i>→</i>' +
        '<span><small>Zephyr</small><strong>' + escapeHtml(a.testId || '—') + '</strong></span><i>→</i>' +
        '<span><small>Living Doc</small><strong>' + escapeHtml(a.trace) + '</strong></span>';
    }
    var toTest = $('[data-doc-to-test]');
    if (toTest) toTest.hidden = !a.testId || a.testId === 'n.v.t.';
  }

  function renderFlowMonitor() {
    var monitor = $('[data-flow-monitor]');
    var title = $('[data-flow-title]');
    var status = $('[data-flow-status]');
    if (!monitor || !title || !status) return;

    var running = state.activePhase >= 1 && state.activePhase <= 4;
    var complete = state.activePhase > 4 && lastCompletedKey;
    var waiting = state.customTickets.filter(function (t) { return t.status === 'ingediend'; });
    monitor.classList.toggle('is-running', running);
    monitor.classList.toggle('is-complete', Boolean(complete));

    if (running) {
      title.textContent = state.activeTicket + ' · stap ' + state.activePhase + ' van 4';
      status.textContent = phaseCopy[state.activePhase].title + '. ' + phaseCopy[state.activePhase].status;
    } else if (complete) {
      title.textContent = lastCompletedKey + ' is volledig verwerkt (simulatie)';
      status.textContent = 'De gesimuleerde flow is afgerond met ' + (lastCompletedResult === 'pass' ? 'een geslaagde controle' : 'een aandachtspunt') + '. De nieuwste regel staat nu bovenaan de Living Doc.';
    } else if (waiting.length) {
      title.textContent = waiting[0].key + ' is aangenomen';
      status.textContent = 'De wens staat in de intakewachtrij. De agent in VS Code haalt hem daar op, maakt het feature-bestand en de Playwright-case, draait de impactregressie en werkt de Living Doc bij; na CI verschijnt de oplevering hier vanzelf bij "Opgeleverd". Jij hoeft niets meer te doen.';
    } else {
      title.textContent = 'Klaar om de flow te starten';
      status.textContent = 'Vul rechts één wens in en klik "Start de flow". Opslaan is genoeg: de wens landt in de intakewachtrij, waar de agent hem oppakt, de testcase maakt, de regressie draait en de Living Doc bijwerkt — tot en met TEST.';
    }

    $$('[data-checkpoint]').forEach(function (checkpoint) {
      var phase = Number(checkpoint.getAttribute('data-checkpoint'));
      checkpoint.classList.toggle('is-active', running && phase === state.activePhase);
      checkpoint.classList.toggle('is-complete', state.activePhase > phase);
    });

    var form = $('[data-ticket-form]');
    if (form) Array.prototype.forEach.call(form.elements, function (control) { control.disabled = Boolean(state.activeTicket); });
    // Bovenin hoe vers de stand is (daar heeft een PO iets aan); het versienummer zelf
    // staat in de voettekst, zoals in de urenapp.
    setText('[data-feed-version]', feed.loaded ? 'Bijgewerkt ' + versheidLabel(feed.generatedAt) : 'voorbeelddata (feed niet geladen)');
    setText('[data-demo-versie]', feed.loaded ? 'versie ' + feed.appVersion : 'versie onbekend');
    renderKeuzelijst();
  }

  function renderFilterSummary() {
    var parts = [];
    if (ui.query) parts.push('zoekterm "' + ui.query + '"');
    if (ui.type !== 'all') parts.push('type ' + ui.type);
    if (ui.source !== 'all') parts.push(ui.source === 'feed' ? 'echte projectstand' : 'eigen demo-wensen');
    if (ui.status !== 'all') parts.push('status ' + ui.status);
    setText('[data-filter-summary]', parts.length ? 'Actief: ' + parts.join(', ') + '.' : 'Geen filters actief.');
    $$('[data-type-filters] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-type') === ui.type)); });
    $$('[data-source-filters] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sourcefilter') === ui.source)); });
    $$('[data-status-filters] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-status') === ui.status)); });
    var clear = $('[data-search-clear]');
    if (clear) clear.hidden = !ui.query;
  }

  function render() {
    renderPhases();
    renderBoard();
    renderTests();
    renderReleases();
    renderKnowledge();
    renderLivingDoc();
    renderFlowMonitor();
    renderFilterSummary();
  }

  // ===================== Navigatie =====================
  function switchTab(name, focus) {
    if (!products[name]) return;
    ui.view = name;
    document.body.setAttribute('data-workspace', name);
    $$('[data-tab]').forEach(function (tab) {
      var active = tab.getAttribute('data-tab') === name;
      if (tab.getAttribute('role') === 'tab') {
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.setAttribute('tabindex', active ? '0' : '-1');
        if (active && focus) tab.focus();
      }
    });
    $$('[data-panel-view]').forEach(function (panel) { panel.hidden = panel.getAttribute('data-panel-view') !== name; });
    $$('[data-tab-target]').forEach(function (button) { button.classList.toggle('is-active', button.getAttribute('data-tab-target') === name); });
    var product = products[name];
    setText('[data-product-name]', product.name);
    setText('[data-product-scope]', product.scope);
    var logo = $('[data-product-logo]');
    if (logo) { logo.textContent = product.logo; logo.style.background = product.color; }
    var hash = '#' + name + (name === 'knowledge' && ui.docKey ? '/' + ui.docKey : '');
    if (window.location.hash !== hash) history.replaceState(null, '', hash);
  }

  function closePanels(except) {
    $$('[data-panel]').forEach(function (panel) {
      if (panel.getAttribute('data-panel') !== except) panel.hidden = true;
    });
    $$('[data-panel-toggle]').forEach(function (button) {
      button.setAttribute('aria-expanded', String(!$('[data-panel="' + button.getAttribute('data-panel-toggle') + '"]').hidden));
    });
  }

  var toastTimer = 0;
  function toast(text) {
    var element = $('[data-toast]');
    if (!element) return;
    element.textContent = text;
    element.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { element.hidden = true; }, 3200);
  }

  function findTicket(key) {
    return state.customTickets.concat(deliveredTickets(), openTickets()).find(function (t) { return t.key === key; });
  }

  // ---- Issuedetail in Jira-opbouw -------------------------------------------
  // De blokken hieronder vullen elk een vast deel van de issuepagina. Alles komt
  // uit de projectstand; waar een gegeven niet bestaat staat dat er eerlijk bij
  // in plaats van een leeg vakje of een verzonnen waarde.

  function veiligeTekst(waarde, terugval) {
    var tekst = String(waarde == null ? '' : waarde).trim();
    return tekst === '' ? (terugval || '—') : tekst;
  }

  function vulLinks(ticket) {
    var doel = $('[data-detail-links]');
    if (!doel) return;
    var cases = ticket.cases || [];
    var delen = [
      '<span class="link-groep"><small>Jira</small><code>' + escapeHtml(ticket.key) + '</code></span>',
      '<span class="link-pijl" aria-hidden="true">→</span>',
      '<button type="button" class="link-knop" data-detail-doc-ontwerp><small>Confluence</small><span>Pagina van ' + escapeHtml(ticket.key) + '</span></button>'
    ];
    if (cases.length) {
      delen.push('<span class="link-pijl" aria-hidden="true">→</span>');
      delen.push('<button type="button" class="link-knop" data-open-case="' + escapeHtml(cases[0].id) + '"><small>Zephyr</small><span>'
        + escapeHtml(cases.length === 1 ? cases[0].id : cases[0].id + ' +' + (cases.length - 1)) + '</span></button>');
    }
    // De Living Doc is het sluitstuk van de keten: daar staat de uitkomst van de
    // oplevering. Hij was alleen via Confluence te vinden, dus vanuit een ticket
    // kwam je er nooit -- terwijl dat juist de plek is waar je hem wilt hebben.
    if (ticket.status === 'done') {
      delen.push('<span class="link-pijl" aria-hidden="true">→</span>');
      delen.push('<button type="button" class="link-knop" data-naar-living="' + escapeHtml(ticket.key) + '"><small>Living Doc</small><span>Uitkomst</span></button>');
    }
    delen.push('<button type="button" class="link-knop kopieer" data-kopieer-link="' + escapeHtml(ticket.key) + '"><small>Link</small><span>Kopieer</span></button>');
    doel.innerHTML = delen.join('');
  }

  function vulBeschrijving(ticket, isLocal) {
    var doel = $('[data-detail-beschrijving]');
    if (!doel) return;
    // Vaste opbouw zoals een PO hem schrijft, met dezelfde koppen als in Jira.
    var delen = [
      ['Omschrijving context', veiligeTekst(ticket.wish || ticket.goal || ticket.title)],
      ['Gewenste waarde', veiligeTekst(ticket.goal, isLocal ? 'Niet ingevuld bij het indienen.' : 'Volgt uit de omschrijving hierboven.')],
      ['Acceptatiecriterium', veiligeTekst(ticket.criterion, 'Nog geen apart criterium vastgelegd; het scenario hieronder geldt als criterium.')]
    ];
    if (ticket.version) {
      delen.push(['Opgeleverd in', 'versie ' + ticket.version + (ticket.date ? ' (' + ticket.date + ')' : '')]);
    }
    doel.innerHTML = delen.map(function (paar) {
      return '<div class="beschrijving-deel"><strong>' + escapeHtml(paar[0]) + '</strong><p>' + escapeHtml(paar[1]) + '</p></div>';
    }).join('');
  }

  function vulTraceability(ticket) {
    var doel = $('[data-detail-traceability]');
    if (!doel) return;
    var cases = ticket.cases || [];
    if (!cases.length) {
      // Zelfde eerlijke melding als Jira bij een issue zonder testcase.
      doel.innerHTML = '<p class="leeg-blok">Nog geen testcase gekoppeld. Een wens krijgt zijn case zodra hij gebouwd wordt;'
        + ' zonder case met een rode tegenproef telt een oplevering niet mee.</p>';
      return;
    }
    doel.innerHTML = '<table class="trace-tabel"><thead><tr><th>Testcase</th><th>Techniek</th><th>Assertions</th><th>Platform</th></tr></thead><tbody>'
      + cases.map(function (c) {
        return '<tr>'
          + '<td><button type="button" class="row-open" data-open-case="' + escapeHtml(c.id) + '">' + escapeHtml(c.id) + '</button>'
            + '<small>' + escapeHtml(c.title || '') + '</small></td>'
          + '<td>' + escapeHtml(c.technique || '—') + '</td>'
          + '<td class="assert-count">' + (c.assertions || '—') + '</td>'
          + '<td>' + escapeHtml(c.platform || '—') + '</td>'
          + '</tr>';
      }).join('') + '</tbody></table>';
  }

  function vulOntwerp(ticket, isLocal) {
    var doel = $('[data-detail-ontwerp]');
    if (!doel) return;
    var analyse = isLocal ? analysisForLocal(ticket) : analysisForDelivered(ticket);
    doel.innerHTML = '<div class="beschrijving-deel"><strong>Functioneel ontwerp</strong><p>' + escapeHtml(veiligeTekst(analyse.fo)) + '</p></div>'
      + '<div class="beschrijving-deel"><strong>Technisch ontwerp</strong><p>' + escapeHtml(veiligeTekst(analyse.to)) + '</p></div>'
      + '<p class="ontwerp-links">'
        // Eigen attribuut: data-detail-doc staat al op de knop in de actiebalk, en
        // twee elementen met dezelfde haak maken elke verwijzing dubbelzinnig.
        + '<button type="button" class="ghost-button small" data-detail-doc-ontwerp>Open de Confluence-pagina</button> '
        + '<a class="ghost-button small" href="' + ERD_PAD + '" target="_blank" rel="noopener">Databasemodel (ERD) ↗</a>'
      + '</p>';
  }

  function vulSubtaken(ticket) {
    var doel = $('[data-detail-subtaken]');
    if (!doel) return;
    var cases = ticket.cases || [];
    if (!cases.length) {
      doel.innerHTML = '<p class="leeg-blok">Geen subtaken.</p>';
      return;
    }
    // De cases zijn onze subtaken: elk is een af te ronden stuk werk met een
    // eigen uitkomst, precies zoals een subtaak in Jira.
    doel.innerHTML = '<ol class="subtaken-lijst">' + cases.map(function (c) {
      return '<li><button type="button" class="row-open" data-open-case="' + escapeHtml(c.id) + '">' + escapeHtml(c.id) + '</button>'
        + '<span>' + escapeHtml(c.title || '') + '</span>'
        + '<span class="status-pill pass">Geslaagd</span></li>';
    }).join('') + '</ol>';
  }

  function vulHistorie(ticket, isLocal) {
    var doel = $('[data-detail-historie]');
    if (!doel) return;
    // Alleen gebeurtenissen die we echt kunnen aantonen uit de projectstand.
    var regels = [];
    if (isLocal) {
      regels.push(['Ingediend via het wensenloket', ticket.date || 'zojuist']);
      if (ticket.status !== 'todo' && ticket.status !== 'ingediend') regels.push(['Opgepakt in VS Code', '—']);
    } else {
      regels.push(['Ingediend en vastgelegd in GIO-WENSEN.md', ticket.date || '—']);
      if (ticket.status === 'doing') regels.push(['In uitvoering', veiligeTekst(ticket.who, 'agent')]);
      if (ticket.status === 'done') {
        if (ticket.cases && ticket.cases.length) {
          regels.push([ticket.cases.length + ' testcase(s) toegevoegd met tegenproef', '—']);
        }
        regels.push(['Groene regressie in CI', '—']);
        regels.push(['Uitgerold naar TEST in versie ' + veiligeTekst(ticket.version), ticket.date || '—']);
      }
    }
    doel.innerHTML = regels.map(function (paar) {
      return '<li><span>' + escapeHtml(paar[0]) + '</span><time>' + escapeHtml(paar[1]) + '</time></li>';
    }).join('');
  }

  // Vertaalt een ticket naar de velden van een Jira-issue. Deze ene functie is
  // straks ook wat de klantkoppeling gebruikt: wat hier staat, gaat daar de deur
  // uit. Daarom geen vrije tekst maar een vaste afbeelding van veld naar veld.
  function jiraVelden(ticket) {
    var isLocal = ticket.source !== 'feed' && ticket.source !== 'fallback';
    var analyse = isLocal ? analysisForLocal(ticket) : analysisForDelivered(ticket);
    var soort = { feature: 'Story', bug: 'Bug', chore: 'Task', ci: 'Task' }[ticket.type] || 'Story';
    var beschrijving = [
      'Omschrijving context:', veiligeTekst(ticket.wish || ticket.title), '',
      'Acceptatiecriterium:', veiligeTekst(ticket.criterion, 'Zie het scenario hieronder.'), '',
      'Functioneel ontwerp:', veiligeTekst(analyse.fo), '',
      'Technisch ontwerp:', veiligeTekst(analyse.to), '',
      'Scenario:', veiligeTekst(ticket.gherkin, 'Geen scenario vastgelegd.')
    ].join('\n');
    return [
      ['summary', ticket.key + ' ' + ticket.title],
      ['issuetype', soort],
      ['description', beschrijving],
      ['labels', ['path-kwaliteitsstraat', ticket.type].join(', ')],
      ['fixVersion', veiligeTekst(ticket.version, 'nog niet opgeleverd')],
      ['status', ticket.status === 'done' ? 'Done' : (ticket.status === 'doing' ? 'In Progress' : 'To Do')],
      ['testcases (Zephyr)', (ticket.cases || []).map(function (c) { return c.id; }).join(', ') || 'nog geen'],
      ['remote link (Confluence)', 'de pagina van ' + ticket.key + ' in de Kennisbank']
    ];
  }

  function toonAlsJiraTicket(key) {
    var ticket = findTicket(key);
    var blok = $('[data-detail-blok="jira"]');
    var doel = $('[data-detail-jira-vorm]');
    if (!ticket || !blok || !doel) return;
    doel.innerHTML = '<p class="leeg-blok">Deze velden gaan mee zodra de Jira van een klant gekoppeld is.</p>'
      + '<dl class="detail-fields">' + jiraVelden(ticket).map(function (paar) {
        return '<dt>' + escapeHtml(paar[0]) + '</dt><dd><pre class="jira-waarde">' + escapeHtml(paar[1]) + '</pre></dd>';
      }).join('') + '</dl>';
    blok.hidden = false;
    blok.scrollIntoView({ block: 'nearest' });
  }

  function openDetail(key) {
    var ticket = findTicket(key);
    if (!ticket) return;
    ui.detail = key;
    var isLocal = ticket.source !== 'feed' && ticket.source !== 'fallback';
    var icon = $('[data-detail-icon]');
    if (icon) { icon.className = 'issue-icon ' + ticket.type; icon.textContent = iconFor(ticket.type); }
    setText('[data-detail-key]', ticket.key);
    setText('[data-detail-title]', ticket.title);
    $('[data-detail-pills]').innerHTML = statusLabel(ticket) + (ticket.platform ? '<span class="status-pill open">' + escapeHtml(ticket.platform) + '</span>' : '');
    var fields = [
      ['Type', { feature: 'Feature', bug: 'Bug', chore: 'Onderhoud', ci: 'CI/CD' }[ticket.type] || ticket.type],
      ['Bron', isLocal ? 'Eigen demo-wens (lokaal bewaard)' : 'Echte projectstand (GIO-WENSEN.md)'],
      ['Versie', ticket.version || '—'],
      ['Datum', ticket.date || '—'],
      ['Testcase', ticket.testId || '—'],
      ['Wie', ticket.who || (isLocal ? 'Jij, via dit formulier' : 'main')]
    ];
    $('[data-detail-fields]').innerHTML = fields.map(function (pair) {
      return '<dt>' + escapeHtml(pair[0]) + '</dt><dd>' + escapeHtml(pair[1]) + '</dd>';
    }).join('');
    // Het Jira-blok hoort bij het vorige ticket; bij een nieuw ticket weer dicht.
    var jiraBlok = $('[data-detail-blok="jira"]');
    if (jiraBlok) jiraBlok.hidden = true;
    vulLinks(ticket);
    vulBeschrijving(ticket, isLocal);
    vulTraceability(ticket);
    vulOntwerp(ticket, isLocal);
    vulSubtaken(ticket);
    vulHistorie(ticket, isLocal);
    setText('[data-detail-gherkin]', ticket.gherkin || 'Geen Gherkin bij dit ticket.');
    var run = $('[data-detail-run]');
    if (run) run.hidden = !(isLocal && (ticket.status === 'todo' || ticket.status === 'ingediend'));
    // De URL wijst nu naar dit ticket, zodat hij te delen en te bookmarken is.
    try { history.replaceState(null, '', '#ticket/' + encodeURIComponent(ticket.key)); } catch (_fout) { /* geen geschiedenis */ }
    $('[data-detail-drawer]').hidden = false;
    $('[data-detail-backdrop]').hidden = false;
    var close = $('[data-detail-close]');
    if (close) close.focus();
  }

  function closeDetail() {
    // De adresbalk mag geen geopend ticket blijven claimen nadat je het hebt
    // gesloten: dan wijst een gedeelde of teruggebladerde link naar iets dat niet
    // op het scherm staat.
    if (ui.detail) {
      try { history.replaceState(null, '', '#' + ui.view); } catch (_fout) { /* geen geschiedenis */ }
    }
    ui.detail = '';
    $('[data-detail-drawer]').hidden = true;
    $('[data-detail-backdrop]').hidden = true;
  }

  function delay() { return new Promise(function (resolve) { window.setTimeout(resolve, STEP_DELAY); }); }

  function nowLabel() {
    return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(',', ' ·');
  }

  async function runPipeline(key) {
    var ticket = state.customTickets.find(function (item) { return item.key === key; });
    if (!ticket || (ticket.status !== 'todo' && ticket.status !== 'ingediend') || state.activeTicket) return;
    closeDetail();
    state.activeTicket = key;
    lastCompletedKey = '';
    lastCompletedResult = '';
    ticket.status = 'doing';
    switchTab('backlog', false);

    for (var phase = 1; phase <= 4; phase += 1) {
      state.activePhase = phase;
      if (phase === 2) state.customTests.push(Object.assign({}, ticket, { status: 'done', result: 'running' }));
      render();
      await delay();
    }

    var result = Math.random() < 0.82 ? 'pass' : 'fail';
    ticket.status = 'done';
    ticket.result = result;
    var testCase = state.customTests.find(function (item) { return item.key === key; });
    if (testCase) testCase.result = result;
    state.livingDoc.unshift({ key: ticket.key, text: ticket.title, result: result === 'pass' ? 'Geslaagd (simulatie)' : 'Aandacht in CI (simulatie)', time: nowLabel() });
    state.livingDoc = state.livingDoc.slice(0, LIVING_DOC_BEWAAR);
    state.activePhase = 5;
    state.activeTicket = '';
    lastCompletedKey = ticket.key;
    lastCompletedResult = result;
    ui.docKey = ticket.key;
    ui.fixedDoc = '';
    saveState();
    render();
    switchTab('knowledge', false);
    var livingEntry = $('[data-living-key="' + ticket.key + '"]');
    if (livingEntry) livingEntry.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  }

  // ===================== Intake naar GitHub =====================
  function issueSearchUrl() {
    return REPO_URL + '/issues?q=' + encodeURIComponent('is:issue label:' + INTAKE_LABEL + ' sort:created-desc');
  }

  // Het "Then" mag niet voor elke wens dezelfde lege zin worden ("is de uitkomst
  // zichtbaar en automatisch gecontroleerd") -- main wees er terecht op dat zo'n
  // vast zinnetje niet helpt bij het schrijven van de latere Playwright-assertion.
  // Daarom eerst zoeken naar iets concreets dat de PO zelf al typte: een getal, een
  // bekend statuswoord, en anders het criterium zelf als kern van de bewering.
  var STATUSWOORDEN = ['open', 'gesloten', 'goedgekeurd', 'afgekeurd', 'ingediend', 'aangenomen',
    'opgepakt', 'opgeleverd', 'actief', 'inactief', 'gelezen', 'ongelezen', 'bezig', 'klaar',
    'geweigerd', 'geaccepteerd', 'ingetrokken', 'verwijderd'];

  function thenClauseVoor(criterion, title) {
    var tekst = String(criterion || '').trim();
    var getal = tekst.match(/\d+([.,]\d+)?/);
    if (getal) return 'blijft het getal ' + getal[0] + ' exact kloppen, niet afgerond of veranderd';
    for (var i = 0; i < STATUSWOORDEN.length; i += 1) {
      if (new RegExp('\\b' + STATUSWOORDEN[i] + '\\b', 'i').test(tekst)) {
        return 'toont de status "' + STATUSWOORDEN[i] + '" correct, niet een andere status';
      }
    }
    // Geen getal en geen bekend statuswoord: de titel herhalen (de belofte, niet de
    // trigger) is concreter dan een vaste zin, en anders dan de When-regel hierboven
    // -- die is namelijk het criterium zelf, dus die niet ook nog als Then herhalen.
    var titelKern = String(title || '').trim().replace(/\.$/, '');
    if (titelKern) return 'blijft aantoonbaar dat ' + titelKern.charAt(0).toLowerCase() + titelKern.slice(1);
    if (!tekst) return 'is de uitkomst zichtbaar en automatisch gecontroleerd';
    var kern = tekst.replace(/\.$/, '');
    return 'is aantoonbaar dat ' + kern.charAt(0).toLowerCase() + kern.slice(1) + ' klopt';
  }

  function gherkinVoor(title, criterion) {
    return 'Scenario: ' + (title || 'Nieuwe wens') + '\n  Given een gebruiker de nieuwe werkwijze gebruikt\n  When ' + (criterion || 'de wens is doorgevoerd') + '\n  Then ' + thenClauseVoor(criterion, title);
  }

  // Deterministisch sjabloon voor het acceptatiecriterium zelf (besluit Gio, 16 sep):
  // geen live AI-aanroep vanaf een publieke pagina, dus geen sleutel nodig. Het
  // sjabloon verzint geen nieuwe werkwoorden bij vrije tekst (dat gaat al snel fout
  // in het Nederlands); het hergebruikt woordelijk wat de PO zelf al typte in
  // Samenvatting en Gewenste waarde, zodat de zin altijd grammaticaal veilig is en
  // een concreet startpunt geeft dat de PO met één klik overneemt of aanpast.
  function criteriumVoorstel(title, goal, stakeholder) {
    var titelKern = String(title || '').trim().replace(/\.$/, '');
    var doelKern = String(goal || '').trim().replace(/\.$/, '');
    if (!titelKern || !doelKern) return '';
    var wie = String(stakeholder || 'de gebruiker').trim() || 'de gebruiker';
    var voorstel = wie + ' kan aantonen dat ' + titelKern.charAt(0).toLowerCase() + titelKern.slice(1) +
      ', zodat ' + doelKern.charAt(0).toLowerCase() + doelKern.slice(1) + '.';
    var max = 220;
    return voorstel.length > max ? voorstel.slice(0, max - 1).trimEnd() + '…' : voorstel;
  }

  function issueUrlFor(ticket) {
    var body = [
      '**Bron:** Path Pipeline-demo op TEST · **Type:** ' + ticket.type + ' · **Stakeholder:** ' + ticket.stakeholder,
      '', '**Gewenste waarde:** ' + ticket.goal,
      '', '**Acceptatiecriterium:** ' + ticket.criterion,
      '', '```gherkin', ticket.gherkin, '```',
      '', '**Afspraak voor de agent in VS Code (zie PIPELINE-INTAKE.md):** GIO-WENSEN → feature + spec + steps (en aanmelden in scripts/sync-living-docs.mjs) → impactregressie → LIVING-DOC → versie → push → CI → TEST → GIO-WENSEN "Klaar" → `npm run pipeline:data`.'
    ].join('\n');
    return REPO_URL + '/issues/new?title=' + encodeURIComponent(ticket.key + ' ' + ticket.title) +
      '&labels=' + encodeURIComponent(INTAKE_LABEL) + '&body=' + encodeURIComponent(body);
  }

  function ticketVan(wens, bron) {
    // Elke wens die deze browser voor het eerst ziet krijgt het volgende
    // demo-casenummer. Bij de simulatie hangt de Zephyr-kaart daaraan, dus zonder
    // nummer zou er in Testbeheer niets verschijnen.
    state.demoCase = (state.demoCase || 0) + 1;
    return {
      key: wens.key, title: wens.title, type: wens.type || 'feature', status: 'ingediend',
      testId: 'TC-DEMO-H-' + String(state.demoCase).padStart(3, '0'),
      platform: 'desktop-chromium', result: '', source: bron,
      stakeholder: wens.stakeholder || 'Product Owner', goal: wens.goal || '', criterion: wens.criterion || '',
      date: wens.date || nowLabel(), gherkin: wens.gherkin || gherkinVoor(wens.title, wens.criterion)
    };
  }

  // De wens gaat naar de eigen wachtrij op de server (pilot/path-kwaliteitsstraat-intake.php),
  // niet naar een voorgevuld GitHub-formulier dat Gio zelf moet afmaken. Het
  // GitHub-issue maakt de agent later zelf aan; dat tussenstation hoort onzichtbaar
  // te zijn. Lukt opslaan niet (pagina via file:// geopend, of de server antwoordt
  // niet), dan zeggen we dat ook eerlijk in plaats van te doen alsof het gelukt is.
  function addTicket(form) {
    var data = new FormData(form);
    var title = String(data.get('title') || '').trim();
    var criterion = String(data.get('criterion') || '').trim();
    var stakeholder = String(data.get('stakeholder') || 'Product Owner').trim();
    var goal = String(data.get('goal') || '').trim();
    var type = String(data.get('type') || 'feature');
    if (!title || !criterion || !goal) return;

    var feedback = $('[data-form-feedback]');
    var knop = form.querySelector('button[type="submit"]');
    if (knop) knop.disabled = true;
    if (feedback) {
      feedback.classList.remove('is-blocked');
      feedback.textContent = 'Bezig met opslaan in de wachtrij…';
    }

    var wens = { title: title, goal: goal, criterion: criterion, stakeholder: stakeholder, type: type };

    opslaanInWachtrij(wens).then(function (opgeslagen) {
      plaatsTicket(ticketVan({
        key: opgeslagen.key, title: title, type: type, stakeholder: stakeholder,
        goal: goal, criterion: criterion, date: nowLabel(), gherkin: gherkinVoor(title, criterion)
      }, 'queue'), form);
      if (feedback) {
        feedback.classList.remove('is-blocked');
        feedback.innerHTML = '<b>' + escapeHtml(opgeslagen.key) + ' is aangenomen.</b> Hij staat nu in de wachtrij en in "Te doen". '
          + 'De agent in VS Code haalt hem daar op, maakt het feature-bestand en de testcase, draait de impactregressie, werkt de Living Doc bij en pusht naar CI en TEST. '
          + 'Je hoeft verder niets te doen; zodra hij is opgeleverd verschijnt hij hier bij "Opgeleverd".';
      }
      toast(opgeslagen.key + ' aangenomen in de wachtrij');
    }).catch(function (fout) {
      var key = 'PATH-' + state.sequence++;
      plaatsTicket(ticketVan({
        key: key, title: title, type: type, stakeholder: stakeholder,
        goal: goal, criterion: criterion, date: nowLabel(), gherkin: gherkinVoor(title, criterion)
      }, 'local'), form);
      if (feedback) {
        feedback.classList.add('is-blocked');
        // Geen uitwijk naar GitHub meer: dat is onze eigen keuken en lost voor de
        // indiener niets op. Eerlijk melden wat er is gebeurd en wat hij kan doen.
        feedback.innerHTML = '<b>Niet in de wachtrij gezet.</b> ' + escapeHtml(String(fout && fout.message ? fout.message : fout))
          + ' ' + escapeHtml(key) + ' staat daarom alleen in deze browser; niemand anders ziet hem. '
          + 'Probeer het zo opnieuw — de tekst blijft staan.';
      }
      toast('Opslaan mislukt — ' + key + ' staat alleen lokaal');
    }).then(function () {
      if (knop) knop.disabled = false;
    });
  }

  function plaatsTicket(ticket, form) {
    state.customTickets.unshift(ticket);
    ui.docKey = ticket.key;
    ui.fixedDoc = '';
    ui.query = '';
    var search = $('[data-search]');
    if (search) search.value = '';
    saveState();
    render();
    if (form) {
      form.reset();
      ui.keuze = -1;
      renderKeuzelijst();
      updateGherkinPreview();
    }
  }

  function opslaanInWachtrij(wens) {
    if (!window.fetch) return Promise.reject(new Error('Deze browser kan geen wensen opslaan.'));
    return fetch(INTAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(wens)
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (json) {
        if (!response.ok || !json || !json.wish || !json.wish.key) {
          throw new Error(json && json.error ? json.error : 'De wachtrij antwoordde met code ' + response.status + '.');
        }
        return json.wish;
      });
    }, function () {
      throw new Error('De wachtrij was niet bereikbaar (open de pagina via TEST, niet als bestand).');
    });
  }

  // De wachtrij staat op de server, dus een wens die iemand anders indiende is
  // hier ook zichtbaar. Een wens die deze browser zelf al kent wordt niet dubbel
  // toegevoegd, en een wens die inmiddels is opgeleverd komt uit de feed en hoort
  // dus niet meer bij "Te doen".
  function mergeWachtrij(wensen) {
    if (!Array.isArray(wensen)) return false;

    // De kaart verschuift vanzelf mee met de echte stand van de keten. Zodra een
    // wens in de projectstand opduikt -- open en bezig, of opgeleverd -- is die
    // projectie de waarheid en hoort de wachtrijkaart weg. Zonder deze opruiming
    // zou dezelfde wens twee kaarten krijgen: een in "Te doen" uit de wachtrij en
    // een in "In uitvoering" uit de projectstand.
    var inProjectstand = {};
    deliveredTickets().forEach(function (t) { inProjectstand[t.key] = true; });
    openTickets().forEach(function (t) { inProjectstand[t.key] = true; });

    var voor = state.customTickets.length;
    state.customTickets = state.customTickets.filter(function (t) {
      return !(t.source === 'queue' && inProjectstand[t.key]);
    });
    var veranderd = state.customTickets.length !== voor;

    var bekend = {};
    state.customTickets.forEach(function (t) { bekend[t.key] = true; });
    wensen.slice().reverse().forEach(function (wens) {
      if (!wens || !wens.key || bekend[wens.key] || inProjectstand[wens.key]) return;
      bekend[wens.key] = true;
      state.customTickets.unshift(ticketVan(wens, 'queue'));
      veranderd = true;
    });

    if (veranderd) saveState();
    return veranderd;
  }

  // Het loket staat in Confluence en wordt door een stakeholder ingevuld, dus het
  // denkt mee in diens taal: de losse velden worden meteen een leesbare user story
  // en een Gherkin-scenario. Wie invult ziet zo wat de agent straks oppakt.
  function updateGherkinPreview() {
    var form = $('[data-ticket-form]');
    if (!form) return;
    var data = new FormData(form);
    var title = String(data.get('title') || '').trim();
    var criterion = String(data.get('criterion') || '').trim();
    var goal = String(data.get('goal') || '').trim();
    var stakeholder = String(data.get('stakeholder') || 'Product Owner').trim();

    var preview = $('[data-gherkin-preview]');
    if (preview) preview.textContent = title || criterion ? gherkinVoor(title, criterion) : 'Vul hierboven een samenvatting en acceptatiecriterium in.';

    var story = $('[data-story-preview]');
    if (story) {
      if (!title && !goal) {
        story.textContent = 'Kies een stakeholder en vul de samenvatting en de gewenste waarde in.';
      } else {
        var lager = title ? title.charAt(0).toLowerCase() + title.slice(1) : '…';
        story.textContent = 'Als ' + stakeholder + ' wil ik ' + lager + ', zodat ' + (goal || '…') + '.';
      }
    }
  }

  // ===================== Keuzelijst: verbeteringen die wij al zien =====================
  // Basisregel van Gio (16 sep): het formulier toont de nice-to-haves uit GIO-WENSEN.md
  // als keuzelijst. Kiezen vult de velden voor; vrij typen blijft altijd mogelijk. Haakt
  // aan op [data-ticket-form] waar dat ook staat, zodat een verhuizing van het formulier
  // deze code niet raakt.
  function renderKeuzelijst() {
    var form = $('[data-ticket-form]');
    if (!form) return;
    var vak = form.querySelector('[data-keuzelijst]');
    if (!vak) {
      vak = document.createElement('div');
      vak.className = 'keuzelijst';
      vak.setAttribute('data-keuzelijst', '');
      form.insertBefore(vak, form.firstElementChild);
    }
    var lijst = feed.loaded ? (feed.niceToHave || []) : [];
    if (!lijst.length) { vak.hidden = true; return; }
    vak.hidden = false;
    var gekozen = ui.keuze;
    var html = '<p class="keuzelijst-kop">Verbeteringen die wij al zien <small>kies er een, of typ zelf hieronder</small></p>' +
      '<div class="keuzelijst-chips" role="group" aria-label="Voorgestelde verbeteringen">';
    lijst.forEach(function (item, index) {
      var actief = gekozen === index;
      html += '<button type="button" class="keuzelijst-chip" data-keuze="' + index + '" aria-pressed="' + actief + '" title="' + escapeHtml(item.why) + '">' +
        '<span class="keuzelijst-bol" aria-hidden="true">' + (actief ? '✓' : '+') + '</span>' + escapeHtml(item.improvement) + '</button>';
    });
    html += '</div>';
    if (gekozen !== -1 && lijst[gekozen]) {
      html += '<p class="keuzelijst-waarom"><b>Waarom:</b> ' + escapeHtml(lijst[gekozen].why) +
        ' <button type="button" class="keuzelijst-los" data-keuze="-1">Zelf typen</button></p>';
    }
    vak.innerHTML = html;
  }

  function kiesVerbetering(index) {
    var form = $('[data-ticket-form]');
    var lijst = feed.niceToHave || [];
    ui.keuze = index;
    if (form && index !== -1 && lijst[index]) {
      var item = lijst[index];
      var titel = form.querySelector('[name="title"]');
      var doel = form.querySelector('[name="goal"]');
      var criterium = form.querySelector('[name="criterion"]');
      if (titel) titel.value = item.improvement.slice(0, Number(titel.getAttribute('maxlength') || 90));
      if (doel) doel.value = item.why.slice(0, Number(doel.getAttribute('maxlength') || 140));
      updateGherkinPreview();
      // Het acceptatiecriterium blijft van de PO: daar hoort de cursor.
      if (criterium && !criterium.value.trim()) criterium.focus();
      toast('Voorgevuld — pas aan wat je wilt en vul het acceptatiecriterium in');
    }
    // "Zelf typen" maakt de keuze los, maar wist niets wat de PO al typte.
    renderKeuzelijst();
  }

  function versheidLabel(iso) {
    var datum = iso ? new Date(iso) : null;
    if (!datum || isNaN(datum.getTime())) return 'onbekend';
    try {
      return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(datum);
    } catch (_error) {
      return datum.toLocaleString();
    }
  }

  // ===================== Slepen binnen Te doen =====================
  // Alleen de volgorde binnen Te doen, nooit tussen kolommen: een kaart die je naar
  // Opgeleverd sleept zou een oplevering tonen die nooit gebeurd is. De volgorde is per
  // bezoeker (localStorage), zoals de rest van deze demo; ▲▼ is de toetsenbordroute.
  var ORDER_KEY = 'path-pipeline-volgorde-v1';
  function volgordeLezen() {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); } catch (_error) { return []; }
  }
  function volgordeBewaren(sleutels) {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(sleutels)); } catch (_error) { /* geen opslag */ }
  }
  function sorteerOpVolgorde(tickets) {
    var volgorde = volgordeLezen();
    if (!volgorde.length) return tickets;
    var rang = {};
    volgorde.forEach(function (key, i) { rang[key] = i; });
    return tickets.slice().sort(function (a, b) {
      var ra = a.key in rang ? rang[a.key] : Number.MAX_SAFE_INTEGER;
      var rb = b.key in rang ? rang[b.key] : Number.MAX_SAFE_INTEGER;
      return ra - rb;
    });
  }
  function huidigeTeDoenVolgorde() {
    return $$('[data-ticket-list="todo"] .ticket-card').map(function (el) { return el.getAttribute('data-ticket'); });
  }
  function verplaatsInTeDoen(key, richting) {
    var sleutels = huidigeTeDoenVolgorde();
    var i = sleutels.indexOf(key);
    var j = i + richting;
    if (i < 0 || j < 0 || j >= sleutels.length) return;
    sleutels.splice(i, 1);
    sleutels.splice(j, 0, key);
    volgordeBewaren(sleutels);
    renderBoard();
    var knop = $('[data-ticket-list="todo"] .ticket-card[data-ticket="' + key + '"] [data-verplaats="' + richting + '"]');
    if (knop) knop.focus();
  }
  function koppelSlepen() {
    var lijst = $('[data-ticket-list="todo"]');
    if (!lijst || lijst.getAttribute('data-sleep-gekoppeld')) return;
    lijst.setAttribute('data-sleep-gekoppeld', '1');
    var gesleept = '';
    lijst.addEventListener('dragstart', function (event) {
      var kaart = event.target instanceof Element ? event.target.closest('.ticket-card') : null;
      if (!kaart) return;
      gesleept = kaart.getAttribute('data-ticket');
      kaart.classList.add('is-sleept');
      if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', gesleept); }
    });
    lijst.addEventListener('dragend', function () {
      gesleept = '';
      $$('.ticket-card.is-sleept, .ticket-card.is-doel').forEach(function (el) { el.classList.remove('is-sleept', 'is-doel'); });
    });
    lijst.addEventListener('dragover', function (event) {
      if (!gesleept) return;
      event.preventDefault();
      var doel = event.target instanceof Element ? event.target.closest('.ticket-card') : null;
      $$('.ticket-card.is-doel').forEach(function (el) { el.classList.remove('is-doel'); });
      if (doel && doel.getAttribute('data-ticket') !== gesleept) doel.classList.add('is-doel');
    });
    lijst.addEventListener('drop', function (event) {
      if (!gesleept) return;
      event.preventDefault();
      var doel = event.target instanceof Element ? event.target.closest('.ticket-card') : null;
      var sleutels = huidigeTeDoenVolgorde();
      var van = sleutels.indexOf(gesleept);
      var naar = doel ? sleutels.indexOf(doel.getAttribute('data-ticket')) : sleutels.length - 1;
      if (van < 0 || naar < 0 || van === naar) return;
      sleutels.splice(van, 1);
      sleutels.splice(naar, 0, gesleept);
      volgordeBewaren(sleutels);
      renderBoard();
      toast('Volgorde in Te doen aangepast');
    });
  }

  // ===================== Klikafhandeling =====================
  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    var keuze = target.closest('[data-keuze]');
    if (keuze) { kiesVerbetering(Number(keuze.getAttribute('data-keuze'))); return; }
    var verplaats = target.closest('[data-verplaats]');
    if (verplaats) {
      var kaartVan = verplaats.closest('.ticket-card');
      if (kaartVan) verplaatsInTeDoen(kaartVan.getAttribute('data-ticket'), Number(verplaats.getAttribute('data-verplaats')));
      return;
    }

    var panelToggle = target.closest('[data-panel-toggle]');
    if (panelToggle) {
      var naam = panelToggle.getAttribute('data-panel-toggle');
      var panel = $('[data-panel="' + naam + '"]');
      var wasHidden = panel.hidden;
      closePanels();
      panel.hidden = !wasHidden;
      panelToggle.setAttribute('aria-expanded', String(!panel.hidden));
      return;
    }

    var tab = target.closest('[data-tab], [data-tab-target]');
    if (tab) {
      closePanels();
      switchTab(tab.getAttribute('data-tab') || tab.getAttribute('data-tab-target'), tab.getAttribute('role') === 'tab');
      return;
    }

    var meerKnop = target.closest('[data-toon-meer]');
    if (meerKnop) {
      var lijst = meerKnop.getAttribute('data-toon-meer');
      ui.toon[lijst] = toonAantal(lijst) + (PER_KEER[lijst] || 12);
      render();
      return;
    }

    var releaseFilter = target.closest('[data-release-filter]');
    if (releaseFilter) { ui.releaseFilter = releaseFilter.getAttribute('data-release-filter'); resetToon(); render(); return; }

    // Klikken op een versie toont precies wat er in die release zat, op het bord.
    var releaseOpen = target.closest('[data-release-open]');
    if (releaseOpen) {
      var versie = releaseOpen.getAttribute('data-release-open');
      ui.query = versie === 'Geen oplevering' ? '' : versie.toLowerCase();
      var zoekbalk = $('[data-search]');
      if (zoekbalk) zoekbalk.value = ui.query;
      ui.type = 'all'; ui.source = 'all'; resetToon();
      switchTab('backlog', false); render();
      return;
    }

    var typeFilter = target.closest('[data-type]');
    if (typeFilter) { ui.type = typeFilter.getAttribute('data-type'); resetToon(); render(); return; }
    var sourceFilter = target.closest('[data-sourcefilter]');
    if (sourceFilter) { ui.source = sourceFilter.getAttribute('data-sourcefilter'); resetToon(); render(); return; }
    var statusFilter = target.closest('[data-status]');
    if (statusFilter) { ui.status = statusFilter.getAttribute('data-status'); resetToon(); render(); return; }
    var folderButton = target.closest('[data-folder]');
    if (folderButton) { ui.folder = folderButton.getAttribute('data-folder'); resetToon(); render(); return; }

    var sortButton = target.closest('[data-sort]');
    if (sortButton) {
      var veld = sortButton.getAttribute('data-sort');
      if (ui.sort === veld) ui.sortDir = ui.sortDir === 'asc' ? 'desc' : 'asc';
      else { ui.sort = veld; ui.sortDir = 'asc'; }
      renderTests();
      return;
    }

    var expandAll = target.closest('[data-expand-all]');
    if (expandAll) {
      ui.expandAll = !ui.expandAll;
      expandAll.setAttribute('aria-pressed', String(ui.expandAll));
      expandAll.textContent = ui.expandAll ? 'Alle scenario\'s inklappen' : 'Alle scenario\'s uitklappen';
      render();
      return;
    }

    var runButton = target.closest('[data-run-ticket], [data-detail-run]');
    if (runButton) { runPipeline(runButton.getAttribute('data-run-ticket') || ui.detail); return; }

    var openTicket = target.closest('[data-open-ticket]');
    if (openTicket) { openDetail(openTicket.getAttribute('data-open-ticket')); return; }

    if (target.closest('[data-detail-close], [data-detail-backdrop]')) { closeDetail(); return; }
    if (target.closest('[data-detail-doc], [data-detail-doc-ontwerp]')) { ui.docKey = ui.detail; ui.fixedDoc = ''; closeDetail(); switchTab('knowledge', false); render(); return; }
    if (target.closest('[data-detail-test]')) {
      var ticket = findTicket(ui.detail);
      ui.query = ticket && ticket.testId ? ticket.testId.toLowerCase() : '';
      var zoek = $('[data-search]');
      if (zoek) zoek.value = ui.query;
      ui.status = 'all'; ui.folder = '';
      closeDetail(); switchTab('tests', false); render();
      return;
    }

    // Klikken op een testcase in Traceability of Subtaken springt naar die case
    // in Testbeheer -- de andere kant van dezelfde koppeling.
    var openCase = target.closest('[data-open-case]');
    if (openCase) {
      ui.query = String(openCase.getAttribute('data-open-case') || '').toLowerCase();
      var zoekveld = $('[data-search]');
      if (zoekveld) zoekveld.value = ui.query;
      ui.status = 'all'; ui.folder = ''; resetToon();
      closeDetail(); switchTab('tests', false); render();
      return;
    }

    if (target.closest('[data-detail-jira]')) { toonAlsJiraTicket(ui.detail); return; }

    var kopieer = target.closest('[data-kopieer-link]');
    if (kopieer) {
      var adres = window.location.href.split('#')[0] + '#ticket/' + encodeURIComponent(kopieer.getAttribute('data-kopieer-link'));
      // Het klembord kan geweigerd worden (geen toestemming, of geen veilige
      // verbinding). Dan de link tonen in plaats van doen alsof het gelukt is.
      var klaar = function () { toast('Link gekopieerd'); };
      var mislukt = function () { toast(adres); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(adres).then(klaar, mislukt);
      } else {
        mislukt();
      }
      return;
    }

    // Blokken in- en uitklappen, zoals de secties op een Jira-issuepagina.
    var blokKop = target.closest('[data-blok-toggle]');
    if (blokKop) {
      var blokNaam = blokKop.getAttribute('data-blok-toggle');
      var blok = $('[data-detail-blok="' + blokNaam + '"]');
      if (blok) {
        var open = blok.classList.toggle('is-dicht');
        blokKop.setAttribute('aria-expanded', open ? 'false' : 'true');
        var pijl = blokKop.querySelector('span');
        if (pijl) pijl.textContent = open ? '▸' : '▾';
      }
      return;
    }

    var docSelect = target.closest('[data-doc-select]');
    if (docSelect) { ui.docKey = docSelect.getAttribute('data-doc-select'); ui.fixedDoc = ''; renderKnowledge(); history.replaceState(null, '', '#knowledge/' + ui.docKey); return; }
    var docFixed = target.closest('[data-doc-fixed]');
    if (docFixed) { ui.fixedDoc = docFixed.getAttribute('data-doc-fixed'); renderKnowledge(); return; }

    if (target.closest('[data-doc-copy]')) {
      var tekst = $('[data-doc-gherkin]').textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tekst).then(function () { toast('Gherkin gekopieerd'); }, function () { toast('Kopiëren niet toegestaan'); });
      else toast('Kopiëren niet beschikbaar in deze browser');
      return;
    }
    if (target.closest('[data-doc-to-test]')) {
      var trace = $('[data-doc-trace] strong:nth-of-type(1)');
      var caseId = $$('[data-doc-trace] span')[2];
      ui.query = caseId ? caseId.textContent.replace('Zephyr', '').trim().toLowerCase() : '';
      var zoekveld = $('[data-search]');
      if (zoekveld) zoekveld.value = ui.query;
      ui.status = 'all'; ui.folder = '';
      switchTab('tests', false); render();
      return;
    }

    if (target.closest('[data-suggest-criterion]')) {
      var invoerForm = $('[data-ticket-form]');
      if (!invoerForm) return;
      var data = new FormData(invoerForm);
      var titelVeld = String(data.get('title') || '').trim();
      var doelVeld = String(data.get('goal') || '').trim();
      var hint = $('[data-suggest-criterion-hint]');
      if (!titelVeld || !doelVeld) {
        if (hint) hint.hidden = false;
        return;
      }
      if (hint) hint.hidden = true;
      var voorstel = criteriumVoorstel(titelVeld, doelVeld, String(data.get('stakeholder') || ''));
      var criteriumVeld = invoerForm.querySelector('[name="criterion"]');
      if (criteriumVeld && voorstel) {
        criteriumVeld.value = voorstel;
        updateGherkinPreview();
        toast('Voorstel ingevuld — pas aan wat je wilt');
      }
      return;
    }

    if (target.closest('[data-create-focus]')) {
      // Het loket staat in Confluence, niet op het Jira-bord: daar hoort de vraag
      // achter de wens thuis. Elke "nieuwe wens"-knop brengt je dus daarheen.
      switchTab('knowledge', false);
      closePanels();
      var veld = $('[data-create-field]');
      if (veld) { veld.focus(); veld.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' }); }
      return;
    }
    // Vanuit een ticket naar de uitkomst in de Living Doc, met de regel van dat
    // ticket gemarkeerd -- anders sta je in een lijst van tientallen regels te
    // zoeken naar de jouwe.
    var naarLiving = target.closest('[data-naar-living]');
    if (naarLiving) {
      var livingSleutel = naarLiving.getAttribute('data-naar-living');
      closeDetail();
      switchTab('knowledge', false);
      render();
      var regel = $('[data-living-key="' + livingSleutel + '"]');
      var doelLiving = regel || $('#living-doc');
      if (doelLiving) doelLiving.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      if (regel) {
        regel.classList.add('is-aangewezen');
        window.setTimeout(function () { regel.classList.remove('is-aangewezen'); }, 2400);
      }
      return;
    }

    if (target.closest('[data-jump-living]')) {
      switchTab('knowledge', false);
      var living = $('#living-doc');
      if (living) living.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (target.closest('[data-search-clear]')) {
      ui.query = '';
      var zoek2 = $('[data-search]');
      if (zoek2) { zoek2.value = ''; zoek2.focus(); }
      render();
      return;
    }

    if (target.closest('[data-theme-toggle]')) {
      var gekozen = volgendeTheme();
      toast('Weergave: ' + (themes.find(function (t) { return t.id === gekozen; }) || themes[0]).label);
      return;
    }

    if (target.closest('[data-reset]')) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_error) { /* geen opslag */ }
      state = initialState();
      lastCompletedKey = '';
      lastCompletedResult = '';
      ui.docKey = ''; ui.fixedDoc = ''; ui.query = ''; ui.type = 'all'; ui.source = 'all'; ui.status = 'all'; ui.folder = '';
      var zoekveld2 = $('[data-search]');
      if (zoekveld2) zoekveld2.value = '';
      closeDetail();
      switchTab('backlog', false);
      render();
      var feedback = $('[data-form-feedback]');
      if (feedback) feedback.textContent = 'De lokale demo-tickets zijn gewist; de echte opleveringen blijven staan.';
      toast('Demo hersteld');
      return;
    }

    if (!target.closest('.drop-panel') && !target.closest('[data-panel-toggle]')) closePanels();
  });

  document.addEventListener('input', function (event) {
    var target = event.target;
    if (target && target.matches('[data-search]')) {
      ui.query = String(target.value || '').trim().toLowerCase();
      resetToon();
      render();
      return;
    }
    if (target && target.closest('[data-ticket-form]')) {
      updateGherkinPreview();
      var hint = $('[data-suggest-criterion-hint]');
      if (hint && !hint.hidden) hint.hidden = true;
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === '/' && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      event.preventDefault();
      var search = $('[data-search]');
      if (search) search.focus();
      return;
    }
    if (event.key === 'Escape') {
      if (!$('[data-detail-drawer]').hidden) { closeDetail(); return; }
      closePanels();
      return;
    }
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && event.target instanceof Element && event.target.matches('[role="tab"]')) {
      var tabs = $$('[role="tab"]');
      var current = tabs.indexOf(event.target);
      var next = (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      switchTab(tabs[next].getAttribute('data-tab'), true);
    }
  });

  var form = $('[data-ticket-form]');
  if (form) form.addEventListener('submit', function (event) { event.preventDefault(); addTicket(form); });

  // De binnenkomende link wordt hier meteen gelezen, vóór de eerste switchTab.
  // Die schrijft namelijk zijn eigen tabnaam in de adresbalk, en bij het openen
  // van de pagina gebeurt dat al voordat applyHash() ooit aan bod komt -- de
  // ticketverwijzing was dan allang overschreven. Blijft staan tot het ticket
  // echt geopend is, want de projectstand is bij het laden nog niet binnen.
  var wachtOpTicket = (function () {
    var eerste = String(window.location.hash || '').replace('#', '').split('/');
    return eerste[0] === 'ticket' && eerste[1] ? decodeURIComponent(eerste[1]) : '';
  })();

  function applyHash() {
    var hash = String(window.location.hash || '').replace('#', '');
    if (!hash) return;
    var parts = hash.split('/');
    // Deelbare link naar één ticket: #ticket/PATH-201 opent dat ticket meteen,
    // waar het ook in de drie werkruimtes staat. Zonder zo'n link kun je een
    // collega alleen "zoek even op PATH-201" sturen, en dat is geen verwijzing.
    //
    // De sleutel wordt apart onthouden omdat switchTab() de hash overschrijft met
    // zijn eigen tabnaam. Bij het openen van de pagina is de projectstand nog niet
    // binnen, dus de eerste poging vindt het ticket niet; tegen de tijd dat de
    // feed er is, stond er alleen nog "#backlog" in de adresbalk en was de
    // verwijzing weg. Vandaar dat hij hier blijft staan tot hij gelukt is.
    if (parts[0] === 'ticket' && parts[1]) {
      wachtOpTicket = decodeURIComponent(parts[1]);
    }
    if (wachtOpTicket) {
      switchTab('backlog', false);
      render();
      openDetail(wachtOpTicket);
      if (ui.detail === wachtOpTicket) wachtOpTicket = '';
      return;
    }
    if (products[parts[0]]) {
      if (parts[1]) { ui.docKey = decodeURIComponent(parts[1]); ui.fixedDoc = ''; }
      switchTab(parts[0], false);
    }
  }
  window.addEventListener('hashchange', function () { applyHash(); render(); });

  // De grens van tien is opslaggedrag, niet alleen een visueel filter:
  // een oudere reeks uit een vorige sessie wordt bij openen echt opgeschoond.
  saveState();
  // De pagina opent in Confluence, want daar begint de keten: de PO schrijft de
  // vraag op, pas daarna verschijnt het ticket in Jira en de testcase in Zephyr.
  switchTab('knowledge', false);
  render();
  updateGherkinPreview();
  applyHash();

  // Eén herkansing voordat de pagina terugvalt op voorbeelddata. De feed draagt
  // sinds 17 sep de volledige projecthistorie en is daarmee een stuk groter; een
  // enkele mislukte of afgebroken verbinding zette de pagina daardoor stil op
  // "voorbeelddata (feed niet geladen)" terwijl een tweede poging gewoon lukt.
  // Voor een lezer is verouderde-maar-echte stand altijd beter dan voorbeelddata.
  function haalFeed(pogingen) {
    return fetch(DATA_URL, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('feed ' + response.status);
      return response.json();
    }).catch(function (fout) {
      if (pogingen <= 1) throw fout;
      return new Promise(function (klaar) { setTimeout(klaar, 250); }).then(function () {
        return haalFeed(pogingen - 1);
      });
    });
  }

  if (window.fetch) {
    haalFeed(2).then(function (json) {
      feed = { delivered: json.delivered || [], open: json.open || [], niceToHave: json.niceToHave || [], appVersion: json.appVersion || '', generatedAt: json.generatedAt || '', loaded: true };
      document.body.setAttribute('data-feed', 'loaded');
      render();
      applyHash();
    }).catch(function () {
      document.body.setAttribute('data-feed', 'fallback');
      render();
    // De wachtrij wordt pas daarna opgehaald: het samenvoegen moet weten wat er al
    // in de projectstand staat, anders krijgt een opgepakte wens twee kaarten.
    }).then(function () {
      return fetch(INTAKE_URL, { cache: 'no-store' });
    }).then(function (response) {
      if (!response.ok) throw new Error('wachtrij ' + response.status);
      return response.json();
    }).then(function (json) {
      document.body.setAttribute('data-queue', 'loaded');
      if (mergeWachtrij(json && json.wishes)) render();
    }).catch(function () {
      document.body.setAttribute('data-queue', 'offline');
    });
  } else {
    document.body.setAttribute('data-feed', 'fallback');
  }
})();
