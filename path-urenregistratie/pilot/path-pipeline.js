'use strict';

(function () {
  var STORAGE_KEY = 'path-pipeline-demo-v1';
  var DATA_URL = 'path-pipeline-data.json';
  var INTAKE_URL = 'path-pipeline-intake.php';
  var REPO_URL = 'https://github.com/Remy-LeBeau-source/Path_Urenregistratie_Veilige_Demo_Path_App';
  var INTAKE_LABEL = 'pipeline-intake';
  var LIVING_DOC_CAP = 10;
  var BOARD_DONE_CAP = 10;
  var DOC_TREE_CAP = 10;
  var TEST_CAP = 20;
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP_DELAY = prefersReducedMotion ? 120 : 900;

  var products = {
    backlog: { logo: 'J', name: 'Jira', scope: 'Path Uren & Facturatie', color: 'var(--jira)' },
    knowledge: { logo: 'C', name: 'Confluence', scope: 'Ruimte Path Kwaliteit', color: 'var(--confluence)' },
    tests: { logo: 'Z', name: 'Zephyr Scale', scope: 'Testcyclus TC-24', color: 'var(--zephyr)' }
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
      leftText: 'Een wens die hier wordt ingediend, wordt een GitHub-issue met label pipeline-intake. De agent in VS Code pakt dat issue op en loopt de keten af.',
      rightLabel: 'Keten', rightTitle: 'Acht stappen tot TEST',
      rightText: 'GIO-WENSEN → feature + spec + steps → impactregressie → LIVING-DOC → versie → push → CI → TEST, en daarna de wens naar "Klaar".',
      fo: 'De pagina toont geen verzonnen data: de opleveringen, cases, technieken en assertions komen uit GIO-WENSEN.md en de feature-bestanden, via scripts/pipeline-demo-data.mjs.',
      to: 'npm run check faalt als pilot/path-pipeline-data.json achterloopt op de projectstand. Zo kan de demo niet stilletjes verouderen.',
      criterion: 'Wat hier staat, is terug te vinden in de repository.',
      gherkin: 'Scenario: Een wens loopt van het loket tot TEST\n  Given Gio dient een wens in op deze pagina\n  When de agent het issue met label pipeline-intake oppakt\n  Then ontstaan er een feature, een spec en een groene regressie\n  And staat de oplevering daarna in de Living Doc en op TEST',
      summary: 'Hoe een wens op deze pagina uiteindelijk op TEST terechtkomt.', author: 'Bron: PIPELINE-INTAKE.md', updated: 'Vaste pagina', trace: 'Vast', testId: 'PIPE-H-002'
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
  var ui = { view: 'backlog', query: '', type: 'all', source: 'all', status: 'all', sort: '', sortDir: 'asc', expandAll: false, docKey: '', fixedDoc: '', detail: '', keuze: -1 };

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
      stored.livingDoc = stored.livingDoc.slice(0, LIVING_DOC_CAP);
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
    var done = local.filter(function (t) { return t.status === 'done'; }).concat(deliveredTickets()).slice(0, BOARD_DONE_CAP);
    var open = openTickets();
    return {
      todo: sorteerOpVolgorde(local.filter(function (t) { return t.status === 'todo' || t.status === 'ingediend'; }).concat(open.filter(function (t) { return t.status === 'todo'; }))).filter(matchesFilters),
      doing: local.filter(function (t) { return t.status === 'doing'; }).concat(open.filter(function (t) { return t.status === 'doing'; })).filter(matchesFilters),
      done: done.filter(matchesFilters)
    };
  }

  function docTickets() {
    return state.customTickets.filter(function (t) { return t.status !== 'todo'; }).concat(deliveredTickets()).slice(0, DOC_TREE_CAP);
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
    return rows.slice(0, TEST_CAP);
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
    return state.livingDoc.concat(real).slice(0, LIVING_DOC_CAP);
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
      (ticket.status === 'ingediend' ? '<div class="ticket-card-foot"><a class="issue-link" href="' + escapeHtml(issueSearchUrl()) + '" target="_blank" rel="noopener">Bekijk issue op GitHub ↗</a></div>' : '') +
      (canRun ? '<div class="ticket-card-foot"><button type="button" class="card-run" data-run-ticket="' + escapeHtml(ticket.key) + '">Simuleer de flow</button></div>' : '') +
      '</article>';
  }

  function renderBoard() {
    var columns = boardColumns();
    ['todo', 'doing', 'done'].forEach(function (column) {
      var list = $('[data-ticket-list="' + column + '"]');
      if (!list) return;
      list.innerHTML = columns[column].length ? columns[column].map(ticketHtml).join('')
        : '<p class="empty-column">' + (ui.query || ui.type !== 'all' || ui.source !== 'all' ? 'Geen resultaten met dit filter' : 'Geen tickets') + '</p>';
      var count = $('[data-count="' + column + '"]');
      if (count) count.textContent = String(columns[column].length);
    });
    koppelSlepen();
    var total = columns.todo.length + columns.doing.length + columns.done.length;
    var badge = $('[data-backlog-count]');
    if (badge) badge.textContent = String(total);
    var meta = $('[data-board-meta]');
    if (meta) meta.textContent = ui.query || ui.type !== 'all' || ui.source !== 'all' ? total + ' van ' + (boardTotalOngefilterd()) + ' getoond' : 'Actuele demo';
  }

  function boardTotalOngefilterd() {
    var local = state.customTickets;
    return local.filter(function (t) { return t.status === 'done'; }).concat(deliveredTickets()).slice(0, BOARD_DONE_CAP).length
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
    var rows = visibleTests();
    var table = $('[data-test-table]');
    if (table) {
      table.innerHTML = rows.length ? rows.map(function (row) {
        var detail = row.assertions ? '<small>' + escapeHtml(row.technique) + ' · ' + row.assertions + ' assertions</small>' : '';
        return '<tr data-testcase="' + escapeHtml(row.id) + '">' +
          '<td><button type="button" class="row-open" data-open-ticket="' + escapeHtml(row.ticketKey) + '">' + escapeHtml(row.id) + '</button></td>' +
          '<td>' + escapeHtml(row.title) + detail + '</td>' +
          '<td>' + escapeHtml(row.platform) + '</td>' +
          '<td class="assert-count">' + (row.assertions || '—') + '</td>' +
          '<td>' + resultPill(row.result) + '</td>' +
          '<td><details class="gherkin"' + (ui.expandAll ? ' open' : '') + '><summary>Gherkin</summary><pre>' + escapeHtml(row.gherkin) + '</pre></details></td></tr>';
      }).join('') : '<tr><td colspan="6"><p class="empty-column">Geen testcases met dit filter</p></td></tr>';
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

  function renderLivingDoc() {
    state.livingDoc = state.livingDoc.slice(0, LIVING_DOC_CAP);
    var list = $('[data-living-doc]');
    if (!list) return;
    list.innerHTML = livingDocEntries().map(function (entry) {
      return '<li data-living-key="' + escapeHtml(entry.key) + '" class="' + (entry.key === lastCompletedKey ? 'is-new' : '') + '">' +
        '<code>' + escapeHtml(entry.key) + '</code><p>' + escapeHtml(entry.text) + ' · ' + escapeHtml(entry.result) + '</p><time>' + escapeHtml(entry.time) + '</time></li>';
    }).join('');
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
      tree.innerHTML = tickets.map(function (t) {
        return '<li class="' + (!ui.fixedDoc && t.key === ui.docKey ? 'is-current' : '') + '"><button type="button" data-doc-select="' + escapeHtml(t.key) + '"><code>' + escapeHtml(t.key) + '</code><span>' + escapeHtml(t.title) + '</span></button></li>';
      }).join('');
    }
    var docCount = $('[data-doc-count]');
    if (docCount) docCount.textContent = String(tickets.length);
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
    if (ticket.wish && ticket.wish !== ticket.title) fields.push(['Volledige wens', ticket.wish]);
    if (ticket.criterion) fields.push(['Acceptatiecriterium', ticket.criterion]);
    if (ticket.cases && ticket.cases.length) fields.push(['Cases', ticket.cases.map(function (c) { return c.id + ' (' + (c.assertions || 0) + ' assertions)'; }).join(', ')]);
    $('[data-detail-fields]').innerHTML = fields.map(function (pair) {
      return '<dt>' + escapeHtml(pair[0]) + '</dt><dd>' + escapeHtml(pair[1]) + '</dd>';
    }).join('');
    setText('[data-detail-gherkin]', ticket.gherkin || 'Geen Gherkin bij dit ticket.');
    var run = $('[data-detail-run]');
    if (run) run.hidden = !(isLocal && (ticket.status === 'todo' || ticket.status === 'ingediend'));
    $('[data-detail-drawer]').hidden = false;
    $('[data-detail-backdrop]').hidden = false;
    var close = $('[data-detail-close]');
    if (close) close.focus();
  }

  function closeDetail() {
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
    state.livingDoc = state.livingDoc.slice(0, LIVING_DOC_CAP);
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

  function gherkinVoor(title, criterion) {
    return 'Scenario: ' + (title || 'Nieuwe wens') + '\n  Given een gebruiker de nieuwe werkwijze gebruikt\n  When ' + (criterion || 'de wens is doorgevoerd') + '\n  Then is de uitkomst zichtbaar en automatisch gecontroleerd';
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

  // De wens gaat naar de eigen wachtrij op de server (pilot/path-pipeline-intake.php),
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
        feedback.innerHTML = '<b>Niet in de wachtrij gezet.</b> ' + escapeHtml(String(fout && fout.message ? fout.message : fout))
          + ' ' + escapeHtml(key) + ' staat daarom alleen in deze browser; niemand anders ziet hem. '
          + '<a href="' + escapeHtml(issueUrlFor(state.customTickets[0])) + '" target="_blank" rel="noopener" data-issue-url>Toch zelf als GitHub-issue indienen.</a>';
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

    var typeFilter = target.closest('[data-type]');
    if (typeFilter) { ui.type = typeFilter.getAttribute('data-type'); render(); return; }
    var sourceFilter = target.closest('[data-sourcefilter]');
    if (sourceFilter) { ui.source = sourceFilter.getAttribute('data-sourcefilter'); render(); return; }
    var statusFilter = target.closest('[data-status]');
    if (statusFilter) { ui.status = statusFilter.getAttribute('data-status'); render(); return; }
    var folderButton = target.closest('[data-folder]');
    if (folderButton) { ui.folder = folderButton.getAttribute('data-folder'); render(); return; }

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
    if (target.closest('[data-detail-doc]')) { ui.docKey = ui.detail; ui.fixedDoc = ''; closeDetail(); switchTab('knowledge', false); render(); return; }
    if (target.closest('[data-detail-test]')) {
      var ticket = findTicket(ui.detail);
      ui.query = ticket && ticket.testId ? ticket.testId.toLowerCase() : '';
      var zoek = $('[data-search]');
      if (zoek) zoek.value = ui.query;
      ui.status = 'all'; ui.folder = '';
      closeDetail(); switchTab('tests', false); render();
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

    if (target.closest('[data-create-focus]')) {
      // Het loket staat in Confluence, niet op het Jira-bord: daar hoort de vraag
      // achter de wens thuis. Elke "nieuwe wens"-knop brengt je dus daarheen.
      switchTab('knowledge', false);
      closePanels();
      var veld = $('[data-create-field]');
      if (veld) { veld.focus(); veld.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' }); }
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
      render();
      return;
    }
    if (target && target.closest('[data-ticket-form]')) updateGherkinPreview();
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

  function applyHash() {
    var hash = String(window.location.hash || '').replace('#', '');
    if (!hash) return;
    var parts = hash.split('/');
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

  if (window.fetch) {
    fetch(DATA_URL, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('feed ' + response.status);
      return response.json();
    }).then(function (json) {
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
