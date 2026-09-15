'use strict';

(function () {
  var STORAGE_KEY = 'path-pipeline-demo-v1';
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP_DELAY = prefersReducedMotion ? 120 : 900;

  var seeds = [
    {
      key: 'PATH-196', title: 'Ingetrokken mededeling toont label en reden', type: 'bug', status: 'done',
      testId: 'TC-NOT-H-012', platform: 'desktop-chromium', result: 'pass',
      gherkin: 'Scenario: Ingetrokken mededeling toont label en reden\n  Given Stasjo opent Berichten met ingetrokken voorbeeldmededelingen in de TEST-basis\n  When hij het filter Ingetrokken kiest\n  Then staan alleen ingetrokken berichten er, ingeklapt met label\n  And zie je de reden zodra je het bericht openklapt'
    },
    {
      key: 'PATH-194', title: 'PROD-poort breekt release alleen af bij een nieuwere release', type: 'ci', status: 'done',
      testId: 'TC-PROD-WEKKER-01', platform: 'CI', result: 'pass',
      gherkin: 'Scenario: PROD-poort breekt release alleen af bij een nieuwere release\n  Given een release na TEST-deploy wacht op de handmatige PROD-poort\n  When na tien minuten geen nieuwere commit op main staat\n  Then blijft de goedkeuring open\n  But zodra main een nieuwere commit bevat\n  Then wordt alleen de oudere wachtende run afgebroken'
    },
    {
      key: 'PATH-197', title: 'Hele maand blijft staan na een hertekening op de achtergrond', type: 'bug', status: 'done',
      testId: 'TC-DASH-N-032', platform: 'desktop-chromium', result: 'pass',
      gherkin: 'Scenario: Hele maand blijft staan na een hertekening op de achtergrond\n  Given Klassiek op Mijn uren met Hele maand gekozen\n  When de app op de achtergrond opnieuw tekent\n  Then blijft Hele maand staan met de indienknop\n  And geldt dat ook in Modern op Mijn uren'
    },
    {
      key: 'PATH-188', title: 'Testfuncties uit de balken, alleen Herstel blijft bovenin', type: 'feature', status: 'done',
      testId: 'TC-KLV-H-018', platform: 'desktop-chromium', result: 'pass',
      gherkin: 'Scenario: Testfuncties uit de balken, alleen Herstel blijft bovenin\n  Given de medewerker de app op TEST opent\n  Then staat alleen Herstel in de balk\n  And staan thema, vormgeving, omgeving en versie in het profielmenu\n  And houdt Beheer Herstel in zijn eigen topbalk'
    },
    {
      key: 'PATH-191', title: 'Inlogklik wacht tot de scrollanimatie stopt', type: 'chore', status: 'done',
      testId: 'TC-AUTH-H-025', platform: 'mobile-safari', result: 'pass',
      gherkin: 'Scenario: Inlogklik wacht tot de scrollanimatie stopt\n  Given mobile-safari de inlogknop naar het midden scrolt\n  When de pagina nog zacht doorscrolt\n  Then wacht de helper tot de scroll tien frames stilstaat\n  And klikt hij daarna op het midden van de volledig zichtbare knop'
    }
  ];

  var seedAnalysis = {
    'PATH-196': {
      stakeholder: 'Backoffice & communicatie',
      goal: 'medewerkers direct begrijpen waarom een mededeling niet meer geldig is',
      criterion: 'Bij het filter Ingetrokken staan alleen ingetrokken berichten en wordt na openklappen de reden zichtbaar.',
      fo: 'Berichten krijgt een aparte status Ingetrokken. Het overzicht filtert hierop, toont het label op de ingeklapte kaart en toont de vastgelegde reden in het geopende bericht.',
      to: 'Projecteer status en intrekreden uit dezelfde berichtenbron. Filter client-side op de ingetrokken status en bewaak label, inklappen en reden met TC-NOT-H-012 op desktop-chromium.'
    },
    'PATH-194': {
      stakeholder: 'Release manager',
      goal: 'een geldige productiegoedkeuring openblijft zolang er geen nieuwere release klaarstaat',
      criterion: 'De PROD-poort breekt uitsluitend een wachtende run af wanneer main aantoonbaar een nieuwere commit bevat.',
      fo: 'De releasewachter controleert periodiek of de wachtende release nog de nieuwste is. Zonder nieuwere release blijft de handmatige goedkeuring open.',
      to: 'Vergelijk de commit van de wachtende workflow met de actuele commit op main. Annuleer alleen bij een echte opvolger en dek de beslissingstabel af met TC-PROD-WEKKER-01 in CI.'
    },
    'PATH-197': {
      stakeholder: 'Medewerker',
      goal: 'de gekozen maandweergave stabiel blijft tijdens achtergrondverversing',
      criterion: 'Hele maand blijft geselecteerd wanneer de urenpagina op de achtergrond opnieuw wordt getekend.',
      fo: 'De keuze Hele maand is gebruikersstatus en blijft behouden bij een hertekening. De indienactie blijft in dezelfde context beschikbaar.',
      to: 'Bewaar de gekozen scope buiten de tijdelijke renderstructuur en lees deze bij iedere render terug. TC-DASH-N-032 bewaakt dit op desktop-chromium.'
    },
    'PATH-188': {
      stakeholder: 'Product Owner',
      goal: 'TEST zo veel mogelijk op PROD lijkt zonder herstelbaarheid te verliezen',
      criterion: 'Alleen Herstel staat in de balk en overige testfuncties staan gegroepeerd in het profielmenu.',
      fo: 'De primaire balk toont uitsluitend Herstel. Thema, vormgeving, omgeving en versie zijn beschikbaar onder Testfuncties in het profielmenu.',
      to: 'Projecteer testbediening op basis van omgeving en rol, zonder testelementen in PROD. TC-KLV-H-018 bewaakt de zichtbaarheid op desktop-chromium.'
    },
    'PATH-191': {
      stakeholder: 'QA & mobiele gebruikers',
      goal: 'de inlogactie betrouwbaar werkt terwijl mobiel scrollen nog uitloopt',
      criterion: 'De klik vindt pas plaats nadat de scrollanimatie aantoonbaar tot stilstand is gekomen.',
      fo: 'De gebruiker kan op mobiel betrouwbaar inloggen, ook wanneer de knop eerst naar het midden van het scherm wordt gescrold.',
      to: 'Meet opeenvolgende stabiele scrollframes, bepaal daarna het zichtbare middelpunt en klik pas dan. TC-AUTH-H-025 bewaakt dit op mobile-safari.'
    }
  };

  function seedLivingDoc() {
    return seeds.map(function (ticket, index) {
      return { key: ticket.key, text: ticket.title, result: 'Geslaagd', time: '15 sep · ' + String(16 + index).padStart(2, '0') + ':2' + index };
    });
  }

  function initialState() {
    return { schemaVersion: 2, sequence: 198, customTickets: [], customTests: [], livingDoc: seedLivingDoc(), activePhase: 0, activeTicket: '' };
  }

  function loadState() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || stored.schemaVersion !== 2 || !Array.isArray(stored.customTickets) || !Array.isArray(stored.customTests) || !Array.isArray(stored.livingDoc)) return initialState();
      stored.livingDoc = stored.livingDoc.slice(0, 10);
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
  var selectedDocKey = state.customTickets.length ? state.customTickets[0].key : seeds[0].key;

  var phaseCopy = {
    1: { title: 'Vraag en acceptatiecriterium vastgelegd', status: 'Jira maakt het ticket aan en Confluence vertaalt de vraag naar een leesbaar Gherkin-scenario.' },
    2: { title: 'Testcase staat in Zephyr', status: 'De traceerbare testcase is toegevoegd en gekoppeld aan hetzelfde PATH-ticket.' },
    3: { title: 'Automatische controles draaien lokaal', status: 'Playwright, Cypress en de API-controle simuleren het bewijs vóór een push.' },
    4: { title: 'CI verwerkt de feedback op TEST', status: 'Het resultaat wordt gepubliceerd en als nieuwste bewijsregel aan de Living Doc toegevoegd.' }
  };

  function saveState() {
    var snapshot = Object.assign({}, state, { activePhase: 0, activeTicket: '' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function iconFor(type) {
    return { bug: '!', feature: '◆', chore: '●', ci: '↯' }[type] || '◆';
  }

  function statusLabel(ticket) {
    if (ticket.status === 'doing') return '<span class="status-pill running">Fase ' + state.activePhase + ' van 4</span>';
    if (ticket.result === 'fail') return '<span class="status-pill fail">CI aandacht</span>';
    if (ticket.status === 'done') return '<span class="status-pill pass">Op TEST</span>';
    return '<span class="status-pill running">Te doen</span>';
  }

  function ticketHtml(ticket) {
    var canRun = ticket.status === 'todo';
    return '<article class="ticket-card' + (ticket.status === 'doing' ? ' is-running' : '') + '" data-ticket="' + escapeHtml(ticket.key) + '">' +
      '<div class="ticket-card-top"><span><i class="issue-icon ' + escapeHtml(ticket.type) + '">' + iconFor(ticket.type) + '</i> <code class="issue-key">' + escapeHtml(ticket.key) + '</code></span>' + statusLabel(ticket) + '</div>' +
      '<h4>' + escapeHtml(ticket.title) + '</h4>' +
      '<div class="ticket-meta"><span>' + escapeHtml(ticket.testId) + '</span><span>' + escapeHtml(ticket.platform) + '</span></div>' +
      '<details class="gherkin"><summary>Gherkin</summary><pre>' + escapeHtml(ticket.gherkin) + '</pre></details>' +
      (canRun ? '<div class="ticket-actions"><span class="issue-key">Klaar voor planning</span><button type="button" data-run-ticket="' + escapeHtml(ticket.key) + '">Voer pipeline uit</button></div>' : '') +
      '</article>';
  }

  function allTickets() {
    return state.customTickets.concat(seeds);
  }

  function allTests() {
    return state.customTests.concat(seeds);
  }

  function latestTickets() {
    return allTickets().slice(0, 5);
  }

  function analysisFor(ticket) {
    var fixed = seedAnalysis[ticket.key] || {};
    var stakeholder = ticket.stakeholder || fixed.stakeholder || 'Stakeholder';
    var goal = ticket.goal || fixed.goal || 'de gevraagde verandering aantoonbaar waarde oplevert';
    var criterion = ticket.criterion || fixed.criterion || 'De beschreven verandering is zichtbaar en automatisch gecontroleerd.';
    var fo = ticket.fo || fixed.fo || ('De oplossing ondersteunt "' + ticket.title + '". Het gedrag is voor ' + stakeholder + ' zichtbaar en voldoet aan het vastgelegde acceptatiecriterium.');
    var to = ticket.to || fixed.to || ('Koppel ' + ticket.key + ' aan ' + ticket.testId + ', automatiseer het scenario op ' + ticket.platform + ' en publiceer de uitslag via de TEST-pipeline naar de Living Doc.');
    return {
      stakeholder: stakeholder,
      goal: goal,
      criterion: criterion,
      fo: fo,
      to: to,
      story: 'Als ' + stakeholder + ' wil ik ' + ticket.title.charAt(0).toLowerCase() + ticket.title.slice(1) + ', zodat ' + goal + '.',
      question: 'Hoe zorgen we dat ' + ticket.title.charAt(0).toLowerCase() + ticket.title.slice(1) + ' en dat dit controleerbaar wordt opgeleverd?'
    };
  }

  function renderBoard() {
    ['todo', 'doing', 'done'].forEach(function (column) {
      var list = document.querySelector('[data-ticket-list="' + column + '"]');
      if (!list) return;
      var tickets = latestTickets().filter(function (ticket) { return ticket.status === column; });
      list.innerHTML = tickets.length ? tickets.map(ticketHtml).join('') : '<p class="empty-column">Geen tickets</p>';
      var count = document.querySelector('[data-count="' + column + '"]');
      if (count) count.textContent = String(tickets.length);
    });
    var total = document.querySelector('[data-backlog-count]');
    if (total) total.textContent = String(latestTickets().length);
  }

  function renderPhases() {
    document.querySelectorAll('[data-phase]').forEach(function (element) {
      var phase = Number(element.getAttribute('data-phase'));
      element.classList.toggle('is-active', phase === state.activePhase);
      element.classList.toggle('is-complete', state.activePhase > phase || (state.activePhase === 4 && phase < 4));
    });
  }

  function resultPill(result) {
    if (result === 'running') return '<span class="status-pill running">Draait nu</span>';
    if (result === 'fail') return '<span class="status-pill fail">Aandacht</span>';
    return '<span class="status-pill pass">Geslaagd</span>';
  }

  function renderTests() {
    var tests = allTests().slice(0, 5);
    var table = document.querySelector('[data-test-table]');
    if (table) {
      table.innerHTML = tests.map(function (testCase) {
        return '<tr data-testcase="' + escapeHtml(testCase.testId) + '"><td><code>' + escapeHtml(testCase.testId) + '</code></td><td>' + escapeHtml(testCase.title) + '</td><td>' + escapeHtml(testCase.platform) + '</td><td>' + resultPill(testCase.result) + '</td><td><details class="gherkin"><summary>Gherkin</summary><pre>' + escapeHtml(testCase.gherkin) + '</pre></details></td></tr>';
      }).join('');
    }
    var passed = tests.filter(function (testCase) { return testCase.result === 'pass'; }).length;
    var failed = tests.filter(function (testCase) { return testCase.result === 'fail'; }).length;
    var running = tests.filter(function (testCase) { return testCase.result === 'running'; }).length;
    var metrics = document.querySelector('[data-test-metrics]');
    if (metrics) metrics.innerHTML = '<div class="metric"><span>Testcases</span><strong>' + tests.length + '</strong></div><div class="metric pass"><span>Geslaagd</span><strong>' + passed + '</strong></div><div class="metric fail"><span>Aandacht</span><strong>' + failed + '</strong></div><div class="metric running"><span>Draait nu</span><strong>' + running + '</strong></div>';
    var count = document.querySelector('[data-test-count]');
    if (count) count.textContent = String(tests.length);
  }

  function renderLivingDoc() {
    state.livingDoc = state.livingDoc.slice(0, 10);
    var list = document.querySelector('[data-living-doc]');
    if (!list) return;
    list.innerHTML = state.livingDoc.slice(0, 5).map(function (entry) {
      return '<li data-living-key="' + escapeHtml(entry.key) + '" class="' + (entry.key === lastCompletedKey ? 'is-new' : '') + '"><code>' + escapeHtml(entry.key) + '</code><p>' + escapeHtml(entry.text) + ' · ' + escapeHtml(entry.result) + '</p><time>' + escapeHtml(entry.time) + '</time></li>';
    }).join('');
  }

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function renderKnowledge() {
    var tickets = latestTickets();
    if (!tickets.some(function (ticket) { return ticket.key === selectedDocKey; })) selectedDocKey = tickets[0].key;
    var selected = tickets.find(function (ticket) { return ticket.key === selectedDocKey; }) || tickets[0];
    var analysis = analysisFor(selected);
    var tree = document.querySelector('[data-doc-tree]');
    if (tree) {
      tree.innerHTML = tickets.map(function (ticket) {
        return '<li class="' + (ticket.key === selected.key ? 'is-current' : '') + '"><button type="button" data-doc-select="' + escapeHtml(ticket.key) + '"><code>' + escapeHtml(ticket.key) + '</code><span>' + escapeHtml(ticket.title) + '</span></button></li>';
      }).join('');
    }

    setText('[data-doc-key]', selected.key);
    setText('[data-doc-title]', selected.key + ' · ' + selected.title);
    setText('[data-doc-summary]', 'Analyse en ontwerp bij de stakeholdervraag, gekoppeld aan Jira en de uitvoerbare testbasis in Zephyr.');
    setText('[data-doc-author]', 'Analyse voor ' + analysis.stakeholder);
    setText('[data-doc-updated]', selected.key === lastCompletedKey ? 'Zojuist bijgewerkt' : 'Onderdeel van de laatste 5');
    setText('[data-doc-stakeholder]', analysis.stakeholder);
    setText('[data-doc-question]', analysis.question);
    setText('[data-doc-story-title]', selected.key + ' · User Story');
    setText('[data-doc-story]', analysis.story);
    setText('[data-doc-fo]', analysis.fo);
    setText('[data-doc-to]', analysis.to);
    setText('[data-doc-criterion]', analysis.criterion);
    setText('[data-doc-gherkin]', selected.gherkin);

    var trace = document.querySelector('[data-doc-trace]');
    if (trace) {
      var result = selected.status === 'doing' ? 'In uitvoering' : (selected.result === 'fail' ? 'Aandacht' : 'Opgeleverd');
      trace.innerHTML = '<span><small>Jira</small><strong>' + escapeHtml(selected.key) + '</strong></span><i>→</i><span><small>Confluence</small><strong>FO + TO</strong></span><i>→</i><span><small>Zephyr</small><strong>' + escapeHtml(selected.testId) + '</strong></span><i>→</i><span><small>Living Doc</small><strong>' + escapeHtml(result) + '</strong></span>';
    }
  }

  function renderFlowMonitor() {
    var monitor = document.querySelector('[data-flow-monitor]');
    var title = document.querySelector('[data-flow-title]');
    var status = document.querySelector('[data-flow-status]');
    if (!monitor || !title || !status) return;

    var running = state.activePhase >= 1 && state.activePhase <= 4;
    var complete = state.activePhase > 4 && lastCompletedKey;
    monitor.classList.toggle('is-running', running);
    monitor.classList.toggle('is-complete', Boolean(complete));

    if (running) {
      title.textContent = state.activeTicket + ' · stap ' + state.activePhase + ' van 4';
      status.textContent = phaseCopy[state.activePhase].title + '. ' + phaseCopy[state.activePhase].status;
    } else if (complete) {
      title.textContent = lastCompletedKey + ' is volledig verwerkt';
      status.textContent = 'De flow is afgerond met ' + (lastCompletedResult === 'pass' ? 'een geslaagde controle' : 'een aandachtspunt') + '. De nieuwste regel staat nu bovenaan de Living Doc.';
    } else {
      title.textContent = 'Klaar om een volledige flow te starten';
      status.textContent = 'Vul rechts één vraag in. De demo maakt daarna automatisch het ticket, de testcase, het testresultaat en de Living Doc-regel.';
    }

    document.querySelectorAll('[data-checkpoint]').forEach(function (checkpoint) {
      var phase = Number(checkpoint.getAttribute('data-checkpoint'));
      checkpoint.classList.toggle('is-active', running && phase === state.activePhase);
      checkpoint.classList.toggle('is-complete', state.activePhase > phase);
    });

    var form = document.querySelector('[data-ticket-form]');
    if (form) {
      Array.prototype.forEach.call(form.elements, function (control) { control.disabled = Boolean(state.activeTicket); });
    }
  }

  function render() {
    renderPhases();
    renderBoard();
    renderTests();
    renderKnowledge();
    renderLivingDoc();
    renderFlowMonitor();
  }

  function switchTab(name, focus) {
    document.querySelectorAll('[data-tab]').forEach(function (tab) {
      var active = tab.getAttribute('data-tab') === name;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
      if (active && focus) tab.focus();
    });
    document.querySelectorAll('[data-panel]').forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-panel') !== name;
    });
    document.querySelectorAll('[data-tab-target]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-tab-target') === name);
    });
  }

  function delay() {
    return new Promise(function (resolve) { window.setTimeout(resolve, STEP_DELAY); });
  }

  function nowLabel() {
    return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(',', ' ·');
  }

  async function runPipeline(key) {
    var ticket = state.customTickets.find(function (item) { return item.key === key; });
    if (!ticket || ticket.status !== 'todo' || state.activeTicket) return;
    state.activeTicket = key;
    lastCompletedKey = '';
    lastCompletedResult = '';
    ticket.status = 'doing';
    switchTab('backlog', false);

    for (var phase = 1; phase <= 4; phase += 1) {
      state.activePhase = phase;
      if (phase === 2) {
        state.customTests.push(Object.assign({}, ticket, { status: 'done', result: 'running' }));
      }
      render();
      await delay();
    }

    var result = Math.random() < .82 ? 'pass' : 'fail';
    ticket.status = 'done';
    ticket.result = result;
    var testCase = state.customTests.find(function (item) { return item.key === key; });
    if (testCase) testCase.result = result;
    state.livingDoc.unshift({ key: ticket.key, text: ticket.title, result: result === 'pass' ? 'Geslaagd op TEST' : 'Aandacht in CI', time: nowLabel() });
    state.livingDoc = state.livingDoc.slice(0, 10);
    state.activePhase = 5;
    state.activeTicket = '';
    lastCompletedKey = ticket.key;
    lastCompletedResult = result;
    saveState();
    render();
    switchTab('knowledge', false);
    var livingEntry = document.querySelector('[data-living-key="' + ticket.key + '"]');
    if (livingEntry) livingEntry.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  }

  function addTicket(form) {
    var data = new FormData(form);
    var title = String(data.get('title') || '').trim();
    var criterion = String(data.get('criterion') || '').trim();
    var stakeholder = String(data.get('stakeholder') || 'Product Owner').trim();
    var goal = String(data.get('goal') || '').trim();
    var type = String(data.get('type') || 'feature');
    if (!title || !criterion || !goal) return;
    var key = 'PATH-' + state.sequence++;
    var testId = 'TC-DEMO-H-' + String(state.sequence - 198).padStart(3, '0');
    state.customTickets.unshift({
      key: key, title: title, type: type, status: 'todo', testId: testId, platform: 'desktop-chromium', result: '',
      stakeholder: stakeholder, goal: goal, criterion: criterion,
      gherkin: 'Scenario: ' + title + '\n  Given een gebruiker de nieuwe werkwijze gebruikt\n  When ' + criterion + '\n  Then is de uitkomst zichtbaar en automatisch gecontroleerd'
    });
    selectedDocKey = key;
    saveState();
    render();
    form.reset();
    var feedback = document.querySelector('[data-form-feedback]');
    if (feedback) feedback.textContent = key + ' is aangemaakt. De volledige flow start nu automatisch.';
    runPipeline(key);
  }

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    var tab = target.closest('[data-tab], [data-tab-target]');
    if (tab) switchTab(tab.getAttribute('data-tab') || tab.getAttribute('data-tab-target'), true);
    var runButton = target.closest('[data-run-ticket]');
    if (runButton) runPipeline(runButton.getAttribute('data-run-ticket'));
    var docButton = target.closest('[data-doc-select]');
    if (docButton) {
      selectedDocKey = docButton.getAttribute('data-doc-select');
      renderKnowledge();
    }
    if (target.closest('[data-reset]')) {
      localStorage.removeItem(STORAGE_KEY);
      state = initialState();
      lastCompletedKey = '';
      lastCompletedResult = '';
      selectedDocKey = seeds[0].key;
      switchTab('backlog', false);
      render();
      var feedback = document.querySelector('[data-form-feedback]');
      if (feedback) feedback.textContent = 'De demo is hersteld naar de vijf vaste opleveringen.';
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === '/' && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      event.preventDefault();
      var search = document.querySelector('[data-search]');
      if (search) search.focus();
    }
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && event.target instanceof Element && event.target.matches('[data-tab]')) {
      var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
      var current = tabs.indexOf(event.target);
      var next = (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      switchTab(tabs[next].getAttribute('data-tab'), true);
    }
  });

  var form = document.querySelector('[data-ticket-form]');
  if (form) form.addEventListener('submit', function (event) { event.preventDefault(); addTicket(form); });

  // De grens van tien is opslaggedrag, niet alleen een visueel filter:
  // een oudere reeks uit een vorige sessie wordt bij openen echt opgeschoond.
  saveState();
  render();
})();
