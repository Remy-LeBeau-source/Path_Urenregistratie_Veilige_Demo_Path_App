import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const outDir = join(root, 'live-doc-site');

const requiredPaths = [
  'LIVING-DOC.md',
  'TEST-BDD-MAPPING.md',
  'playwright-report',
  'allure-report',
];

async function assertExists(relativePath) {
  const absolutePath = join(root, relativePath);
  try {
    await access(absolutePath, fsConstants.F_OK);
  } catch {
    throw new Error(`Missing required path: ${relativePath}. Run test and report generation first.`);
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function collectMarkdownStats(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let listItems = 0;
  let codeFenceCount = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('## ')) {
      const title = line.slice(3).trim();
      sections.push({ id: slugify(title), title });
      continue;
    }
    if (line.startsWith('- ')) {
      listItems += 1;
      continue;
    }
    if (line.startsWith('```')) {
      codeFenceCount += 1;
    }
  }

  return {
    sections,
    listItems,
    codeBlocks: Math.floor(codeFenceCount / 2),
  };
}

function markdownToHtml(markdown, options = {}) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const toc = [];
  let inList = false;
  let inCode = false;
  let inTable = false;
  let tableHeaderOpen = false;
  let sectionDepth = 0;
  let skippedFirstH1 = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      html.push('</tbody></table></div>');
      inTable = false;
      tableHeaderOpen = false;
    }
  };

  const closeSectionsTo = (depth) => {
    while (sectionDepth > depth) {
      html.push('</section>');
      sectionDepth -= 1;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      closeList();
      closeTable();
      if (!inCode) {
        html.push('<pre class="doc-code"><code>');
        inCode = true;
      } else {
        html.push('</code></pre>');
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      html.push(`${escapeHtml(rawLine)}\n`);
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      closeList();
      const cells = trimmed.slice(1, -1).split('|').map(cell => cell.trim());
      const isSeparator = cells.every(cell => /^:?-{3,}:?$/.test(cell));
      if (!inTable) {
        html.push('<div class="doc-table-wrap"><table class="doc-table"><thead>');
        html.push(`<tr>${cells.map(cell => `<th>${renderInline(cell)}</th>`).join('')}</tr>`);
        inTable = true;
        tableHeaderOpen = true;
      } else if (isSeparator && tableHeaderOpen) {
        html.push('</thead><tbody>');
        tableHeaderOpen = false;
      } else if (!isSeparator) {
        if (tableHeaderOpen) {
          html.push('</thead><tbody>');
          tableHeaderOpen = false;
        }
        html.push(`<tr>${cells.map(cell => `<td>${renderInline(cell)}</td>`).join('')}</tr>`);
      }
      continue;
    }

    if (trimmed === '') {
      closeList();
      closeTable();
      continue;
    }

    if (trimmed.startsWith('# ')) {
      closeList();
      closeTable();
      closeSectionsTo(0);
      if (options.omitFirstH1 && !skippedFirstH1) {
        skippedFirstH1 = true;
        continue;
      }
      const title = trimmed.slice(2).trim();
      const id = slugify(title);
      toc.push({ depth: 1, id, title });
      html.push(`<h1 id="${id}">${renderInline(title)}</h1>`);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      closeList();
      closeTable();
      closeSectionsTo(1);
      const title = trimmed.slice(3).trim();
      const id = slugify(title);
      toc.push({ depth: 2, id, title });
      html.push(`<section class="doc-section" id="section-${id}">`);
      html.push(`<div class="doc-section-heading"><span class="doc-kicker">Sectie</span><h2 id="${id}">${renderInline(title)}</h2></div>`);
      sectionDepth = 1;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      closeList();
      closeTable();
      closeSectionsTo(2);
      const title = trimmed.slice(4).trim();
      const id = slugify(title);
      toc.push({ depth: 3, id, title });
      html.push('<section class="doc-subsection">');
      html.push(`<h3 id="${id}">${renderInline(title)}</h3>`);
      sectionDepth = 2;
      continue;
    }

    if (trimmed.startsWith('- ')) {
      if (!inList) {
        html.push('<ul class="doc-list">');
        inList = true;
      }
      html.push(`<li>${renderInline(trimmed.slice(2).trim())}</li>`);
      continue;
    }

    closeList();
    closeTable();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
  closeTable();
  if (inCode) {
    html.push('</code></pre>');
  }

  closeSectionsTo(0);

  return {
    html: html.join('\n'),
    toc,
  };
}

function renderStatCards(stats = [], variant = 'light') {
  return stats.map(stat => {
    const note = stat.note ? `<small>${escapeHtml(stat.note)}</small>` : '';
    return `<article class="stat-card stat-card-${variant}"><span class="stat-label">${escapeHtml(stat.label)}</span><strong>${escapeHtml(String(stat.value))}</strong>${note}</article>`;
  }).join('');
}

function renderQuickLinks(links = []) {
  return links.map(link => `<a class="quick-link-card" href="${link.href}"><span class="quick-link-eyebrow">${escapeHtml(link.eyebrow || 'Link')}</span><strong>${escapeHtml(link.title)}</strong><small>${escapeHtml(link.description || '')}</small></a>`).join('');
}

function renderDocToc(toc) {
  const items = toc.filter(item => item.depth >= 2);
  if (items.length === 0) {
    return '<p class="toc-empty">Geen secties gevonden.</p>';
  }

  return `<ul class="toc-list">${items.map(item => `<li class="toc-depth-${item.depth}"><a href="#${item.id}">${escapeHtml(item.title)}</a></li>`).join('')}</ul>`;
}

function renderCoverageCharts(features) {
  const domainLabels = { api: 'API', security: 'Security', ui: 'UI', integration: 'Integratie', db: 'Database' };
  const domainColors = { api: '#149f92', security: '#245b78', ui: '#d68335', integration: '#708b46', db: '#7e689b' };
  const domainCounts = new Map();
  let happy = 0;
  let negative = 0;

  for (const feature of features) {
    const domainTag = feature.featureTags.find(tag => ['@api', '@security', '@ui', '@integration', '@db'].includes(tag));
    const domain = domainTag?.slice(1) || 'other';
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + feature.scenarios.length);
    happy += feature.scenarios.filter(scenario => scenario.tags.includes('@happy')).length;
    negative += feature.scenarios.filter(scenario => scenario.tags.includes('@negative')).length;
  }

  const domains = [...domainCounts.entries()].sort((left, right) => right[1] - left[1]);
  const total = happy + negative;
  const bars = domains.map(([domain, count]) => `<a class="chart-row" href="living-doc.html?filter=${encodeURIComponent(`@${domain}`)}" title="Toon ${count} ${escapeHtml(domainLabels[domain] || domain)}-cases"><span>${escapeHtml(domainLabels[domain] || domain)}</span><div class="chart-track"><i style="width:${(count / total) * 100}%;background:${domainColors[domain] || '#70818b'}"></i></div><strong>${count}</strong></a>`).join('');

  return `<div class="coverage-grid">
    <article class="chart-panel">
      <div class="chart-heading"><div><span class="overline">Unieke cases</span><h3>Per testsoort</h3></div><strong>${total}</strong></div>
      <div class="bar-chart">${bars}</div>
    </article>
    <article class="chart-panel">
      <div class="chart-heading"><div><span class="overline">Scenarioflow</span><h3>Happy en negative</h3></div><strong>${total}</strong></div>
      <div class="flow-bar"><a href="living-doc.html?filter=%40happy" style="width:${(happy / total) * 100}%" title="Toon ${happy} happy-flow-cases"></a><a class="negative" href="living-doc.html?filter=%40negative" style="width:${(negative / total) * 100}%" title="Toon ${negative} negative-flow-cases"></a></div>
      <div class="flow-legend"><a href="living-doc.html?filter=%40happy"><i class="legend-happy"></i>Happy <strong>${happy}</strong></a><a href="living-doc.html?filter=%40negative"><i class="legend-negative"></i>Negative <strong>${negative}</strong></a></div>
      <p>Positieve gebruikersroutes en bewust geteste fout- en beveiligingssituaties.</p>
    </article>
  </div>`;
}

function renderTraceabilityIntro() {
  return `<section class="trace-intro">
    <span class="overline">Zo lees je deze pagina</span>
    <h2>Van gebruikersgedrag naar testbewijs</h2>
    <p>Iedere case gebruikt overal hetzelfde ID. Daardoor kun je zonder technisch zoekwerk volgen wat is beschreven, welke test draait en waar het resultaat staat.</p>
    <div class="trace-steps">
      <div><span>1</span><strong>Gedrag</strong><p>Het feature-scenario beschrijft wat de gebruiker verwacht.</p></div>
      <div><span>2</span><strong>Automatische test</strong><p>De Playwright-spec voert precies dezelfde case-ID uit.</p></div>
      <div><span>3</span><strong>Bewijs</strong><p>Playwright en Allure tonen status, screenshots en details.</p></div>
    </div>
  </section>`;
}

function parseFeatureDocument(file, source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const featureLine = lines.findIndex(line => /^Feature:/i.test(line.trim()));
  const title = featureLine >= 0 ? lines[featureLine].trim().replace(/^Feature:\s*/i, '') : file;
  const featureTags = lines.slice(0, Math.max(featureLine, 0)).map(line => line.trim()).filter(line => line.startsWith('@'));
  const spec = lines.map(line => line.trim()).find(line => line.startsWith('# Native Playwright-uitvoering:'))?.split(': ').slice(1).join(': ') || '';
  const steps = lines.map(line => line.trim()).find(line => line.startsWith('# Navigatiemapping:'))?.split(': ').slice(1).join(': ') || '';
  const scenarios = [];
  let pendingTags = [];

  for (let index = featureLine + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.startsWith('@')) {
      pendingTags = line.split(/\s+/).filter(Boolean);
      continue;
    }
    const scenarioMatch = line.match(/^Scenario:\s*\[([^\]]+)\]\s*(.+)$/i);
    if (!scenarioMatch) {
      continue;
    }

    const scenario = { id: scenarioMatch[1], title: scenarioMatch[2], tags: pendingTags, steps: [] };
    pendingTags = [];
    for (let stepIndex = index + 1; stepIndex < lines.length; stepIndex += 1) {
      const step = lines[stepIndex].trim();
      if (/^(?:@|Scenario:)/i.test(step)) {
        break;
      }
      const stepMatch = step.match(/^(Given|When|Then|And|But)\s+(.+)$/i);
      if (stepMatch) {
        scenario.steps.push({ keyword: stepMatch[1], text: stepMatch[2] });
      }
    }
    scenarios.push(scenario);
  }

  return { file, title, featureTags, spec, steps, scenarios };
}

function renderLivingDocViewer(features, generatedAt, allureSummary) {
  const featureData = JSON.stringify(features).replaceAll('<', '\\u003c');
  const scenarioTotal = features.reduce((sum, feature) => sum + feature.scenarios.length, 0);
  const happyTotal = features.reduce((sum, feature) => sum + feature.scenarios.filter(scenario => scenario.tags.includes('@happy')).length, 0);
  const negativeTotal = scenarioTotal - happyTotal;
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Path Living Documentation</title>
    <style>${portalCss()}</style>
  </head>
  <body class="viewer-body">
    <header class="viewer-header">
      <a class="brand" href="index.html"><span class="brand-mark">P</span><span>Path <small>Living Documentation</small></span></a>
      <nav class="viewer-nav" aria-label="Rapportages">
        <a href="index.html">Overzicht</a>
        <a href="test-bdd-mapping.html">Traceability</a>
        <a href="playwright-report/index.html">Playwright</a>
        <a href="allure-report/index.html">Allure</a>
      </nav>
      <span class="run-status"><span class="status-dot"></span>${allureSummary.passed}/${allureSummary.total} passed</span>
    </header>
    <div class="viewer-shell">
      <aside class="feature-sidebar">
        <div class="sidebar-heading">
          <span class="overline">Documentatie</span>
          <strong>Features</strong>
          <span id="feature-count">${features.length}</span>
        </div>
        <label class="feature-search">
          <span>Zoeken</span>
          <input id="feature-search" type="search" placeholder="Feature, scenario of case-ID" autocomplete="off" />
        </label>
        <button id="feature-overview-link" class="feature-item overview-item active" type="button"><span>Testoverzicht</span><small>${scenarioTotal} uitvoerbare cases</small></button>
        <div id="feature-list" class="feature-list"></div>
      </aside>
      <main class="viewer-main">
        <section id="feature-overview" class="viewer-overview">
          <span class="overline">Living Documentation</span>
          <h1>Testoverzicht</h1>
          <p>Start bij het totaalbeeld en zoom daarna in op een domein, feature of case-ID.</p>
          <div class="scenario-summary overview-summary">
            <div><strong>${scenarioTotal}</strong><span>Uitvoerbare cases</span></div>
            <div><strong>${happyTotal}</strong><span>Happy flow</span></div>
            <div><strong>${negativeTotal}</strong><span>Negative flow</span></div>
            <div><strong>${allureSummary.passed}/${allureSummary.total}</strong><span>Laatste regressie</span></div>
          </div>
          <div class="overview-guidance"><strong>Zo werkt dit overzicht</strong><p>Kies links een feature voor businessgedrag, gebruik zoeken voor een case-ID en open daarna Playwright of Allure voor screenshots, traces en uitvoeringsbewijs.</p></div>
        </section>
        <section id="feature-detail" hidden>
          <div class="viewer-toolbar">
            <div>
              <span class="overline">Feature</span>
              <h1 id="feature-title"></h1>
            </div>
            <a id="feature-source" class="source-link" href="#">Open bronbestand</a>
          </div>
          <div id="feature-meta" class="feature-meta"></div>
          <div class="scenario-summary">
            <div><strong id="scenario-count">0</strong><span>Scenario's</span></div>
            <div><strong id="happy-count">0</strong><span>Happy flow</span></div>
            <div><strong id="negative-count">0</strong><span>Negative flow</span></div>
          </div>
          <section id="scenario-list" class="scenario-list" aria-live="polite"></section>
          <p id="empty-state" class="empty-state" hidden>Geen scenario's gevonden voor deze zoekopdracht.</p>
        </section>
      </main>
    </div>
    <footer class="viewer-footer">Gegenereerd uit Native Playwright-documentatie op ${escapeHtml(generatedAt)}</footer>
    <script>
      const features = ${featureData};
      const params = new URLSearchParams(window.location.search);
      const requestedFeature = params.get('feature');
      const requestedCase = params.get('case');
      const requestedFilter = params.get('filter');
      const caseFeature = requestedCase ? features.find(feature => feature.scenarios.some(scenario => scenario.id === requestedCase)) : null;
      const initialQuery = requestedCase || requestedFilter || '';
      const state = { activeFile: caseFeature?.file || (features.some(feature => feature.file === requestedFeature) ? requestedFeature : ''), query: initialQuery.toLowerCase() };
      const elements = {
        search: document.querySelector('#feature-search'), featureList: document.querySelector('#feature-list'),
        overviewLink: document.querySelector('#feature-overview-link'), overview: document.querySelector('#feature-overview'),
        detail: document.querySelector('#feature-detail'),
        featureCount: document.querySelector('#feature-count'), title: document.querySelector('#feature-title'),
        source: document.querySelector('#feature-source'), meta: document.querySelector('#feature-meta'),
        scenarioCount: document.querySelector('#scenario-count'), happyCount: document.querySelector('#happy-count'),
        negativeCount: document.querySelector('#negative-count'), scenarios: document.querySelector('#scenario-list'),
        empty: document.querySelector('#empty-state')
      };
      const safe = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
      const formatDuration = result => {
        if (!result?.executions) return '';
        const average = result.durationMs / result.executions;
        return average < 1000 ? Math.round(average) + ' ms' : (average / 1000).toFixed(1) + ' s';
      };
      const statusLabel = result => result?.status ? result.status.charAt(0).toUpperCase() + result.status.slice(1) : 'Unknown';
      const resultLabel = result => result ? (result.executions > 1 ? result.executions + ' runs · ' : '') + formatDuration(result) : 'Geen resultaat';
      const matches = feature => {
        const haystack = [feature.title, feature.file, feature.spec, ...feature.featureTags, ...feature.scenarios.flatMap(scenario => [scenario.id, scenario.title, ...scenario.tags])].join(' ').toLowerCase();
        return haystack.includes(state.query);
      };
      const suiteOrder = ['api', 'security', 'ui-desktop', 'ui-mobile', 'integration'];
      const suiteLabel = { api: 'API', security: 'Security', 'ui-desktop': 'UI Desktop', 'ui-mobile': 'UI Mobile', integration: 'DB / Integratie' };
      const suiteKey = feature => {
        if (feature.featureTags.includes('@ui')) return feature.file.includes('mobile') ? 'ui-mobile' : 'ui-desktop';
        if (feature.featureTags.includes('@api')) return 'api';
        if (feature.featureTags.includes('@security')) return 'security';
        return 'integration';
      };
      function renderFeatures() {
        const visible = features.filter(matches);
        elements.featureCount.textContent = visible.length;
        if (state.query && !visible.some(feature => feature.file === state.activeFile) && visible[0]) state.activeFile = visible[0].file;
        elements.overviewLink.classList.toggle('active', !state.activeFile && !state.query);
        const grouped = new Map(suiteOrder.map(key => [key, []]));
        visible.forEach(feature => { const key = suiteKey(feature); if (grouped.has(key)) grouped.get(key).push(feature); else grouped.get('integration').push(feature); });
        const isSearching = state.query.length > 0;
        elements.featureList.innerHTML = [...grouped.entries()].filter(([, items]) => items.length > 0).map(([key, items]) => {
          const open = isSearching || items.some(feature => feature.file === state.activeFile);
          const count = items.reduce((sum, feature) => sum + feature.scenarios.length, 0);
          const featureButtons = items.map(feature => '<button class="feature-item ' + (feature.file === state.activeFile ? 'active' : '') + '" data-file="' + safe(feature.file) + '"><span>' + safe(feature.title) + '</span><small>' + feature.scenarios.length + " scenario's</small></button>").join('');
          return '<details class="suite-group" ' + (open ? 'open' : '') + '><summary class="suite-heading"><span>' + safe(suiteLabel[key] || key) + '</span><strong>' + count + '</strong></summary>' + featureButtons + '</details>';
        }).join('');
        elements.featureList.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { state.activeFile = button.dataset.file; render(); }));
      }
      function renderActiveFeature() {
        if (!state.activeFile && !state.query) {
          elements.overview.hidden = false;
          elements.detail.hidden = true;
          elements.empty.hidden = true;
          return;
        }
        elements.overview.hidden = true;
        elements.detail.hidden = false;
        const feature = features.find(item => item.file === state.activeFile && matches(item));
        if (!feature) {
          elements.title.textContent = 'Geen resultaten'; elements.meta.innerHTML = ''; elements.scenarios.innerHTML = ''; elements.empty.hidden = false; return;
        }
        const scenarios = feature.scenarios.filter(scenario => !state.query || [scenario.id, scenario.title, ...scenario.tags, ...feature.featureTags, feature.title].join(' ').toLowerCase().includes(state.query));
        elements.title.textContent = feature.title;
        elements.source.href = 'features/' + encodeURIComponent(feature.file);
        elements.meta.innerHTML = [...feature.featureTags.map(tag => '<span class="tag">' + safe(tag) + '</span>'), '<span class="meta-path">Spec: ' + safe(feature.spec) + '</span>', '<span class="meta-path">Steps: ' + safe(feature.steps) + '</span>'].join('');
        elements.scenarioCount.textContent = scenarios.length;
        elements.happyCount.textContent = scenarios.filter(scenario => scenario.tags.includes('@happy')).length;
        elements.negativeCount.textContent = scenarios.filter(scenario => scenario.tags.includes('@negative')).length;
        elements.scenarios.innerHTML = scenarios.map((scenario, index) => '<details class="scenario" ' + (index === 0 ? 'open' : '') + '><summary><span class="scenario-state ' + (scenario.tags.includes('@negative') ? 'negative' : 'happy') + '"></span><span><a class="case-link" href="?case=' + encodeURIComponent(scenario.id) + '" title="Directe link naar deze case">' + safe(scenario.id) + '</a><strong>' + safe(scenario.title) + '</strong></span><span class="scenario-badges"><span class="result-badge ' + safe(scenario.result?.status || 'unknown') + '">' + safe(statusLabel(scenario.result)) + ' · ' + safe(resultLabel(scenario.result)) + '</span><span class="scenario-flow">' + (scenario.tags.includes('@negative') ? 'Negative' : 'Happy') + '</span></span></summary><div class="gherkin">' + scenario.steps.map(step => '<div><b>' + safe(step.keyword) + '</b><span>' + safe(step.text) + '</span></div>').join('') + (scenario.result ? '<div class="result-row"><span>Laatste run: ' + safe(new Date(scenario.result.startedAt).toLocaleString('nl-NL')) + '</span><span>' + safe(scenario.result.projects.join(' · ')) + '</span></div>' : '') + '<div class="trace-row"><a href="features/' + encodeURIComponent(feature.file) + '">Feature</a><span>→</span><span>' + safe(feature.steps) + '</span><span>→</span><span>' + safe(feature.spec) + '</span></div></div></details>').join('');
        elements.empty.hidden = scenarios.length > 0;
      }
      function render() { renderFeatures(); renderActiveFeature(); }
      elements.search.value = initialQuery;
      elements.search.addEventListener('input', event => { state.query = event.target.value.trim().toLowerCase(); render(); });
      elements.overviewLink.addEventListener('click', () => { state.activeFile = ''; state.query = ''; elements.search.value = ''; render(); });
      render();
    </script>
  </body>
</html>`;
}

function portalCss() {
  return `
      :root {
        --ink: #10253a;
        --ink-soft: #5b7183;
        --mint: #2ec4b6;
        --mint-deep: #148f84;
        --navy: #0c1e2f;
        --sand: #eef5f6;
        --card: rgba(255, 255, 255, 0.94);
        --line: rgba(16, 37, 58, 0.1);
        --shadow: 0 20px 60px rgba(16, 37, 58, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(46, 196, 182, 0.16), transparent 28%),
          radial-gradient(circle at top right, rgba(13, 94, 122, 0.1), transparent 26%),
          linear-gradient(160deg, #f5fbfb, #e9f1f3 55%, #edf4f6);
        color: var(--ink);
      }
      a {
        color: #0d5e7a;
        text-decoration-thickness: 2px;
        text-underline-offset: 0.14em;
      }
      main {
        max-width: 1240px;
        margin: 0 auto;
        padding: 2rem 1.25rem 3rem;
      }
      .eyebrow,
      .panel-title,
      .stat-label,
      .quick-link-eyebrow,
      .toc-title,
      .doc-kicker,
      .stamp-label,
      .card-eyebrow {
        font-size: 0.76rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .hero {
        background: var(--card);
        border: 1px solid rgba(255, 255, 255, 0.78);
        border-radius: 28px;
        box-shadow: var(--shadow);
        padding: 1.6rem;
        overflow: hidden;
      }
      .hero-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr);
        gap: 1rem;
        align-items: start;
      }
      .hero-dark {
        background: linear-gradient(135deg, rgba(12, 30, 47, 0.98), rgba(18, 52, 73, 0.95));
        color: #f2fbfb;
      }
      .hero-dark p,
      .hero-dark .hero-panel p,
      .hero-dark .stat-card small {
        color: rgba(242, 251, 251, 0.8);
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        background: rgba(46, 196, 182, 0.14);
        color: var(--mint-deep);
      }
      .hero-dark .eyebrow {
        background: rgba(46, 196, 182, 0.16);
        color: #b7f3ec;
      }
      h1 {
        margin: 0.75rem 0 0.55rem;
        font-size: clamp(2rem, 4.8vw, 3.2rem);
        line-height: 1.04;
      }
      h2 {
        margin: 0;
        font-size: 1.4rem;
      }
      h3 {
        margin: 0 0 0.6rem;
        font-size: 1.02rem;
      }
      p {
        margin: 0.5rem 0;
        line-height: 1.6;
      }
      .hero-copy p { color: var(--ink-soft); max-width: 62ch; }
      .hero-panel,
      .toc-panel,
      .content-panel,
      .section {
        background: var(--card);
        border: 1px solid rgba(255, 255, 255, 0.78);
        border-radius: 24px;
        box-shadow: var(--shadow);
      }
      .hero-panel { padding: 1rem; }
      .hero-dark .hero-panel {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: none;
      }
      .stat-grid,
      .quick-links-grid,
      .doc-grid {
        display: grid;
        gap: 0.9rem;
      }
      .stat-grid {
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        margin-top: 1.15rem;
      }
      .hero-dark .stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .stat-card {
        border-radius: 20px;
        padding: 0.95rem 1rem;
      }
      .stat-card strong {
        display: block;
        font-size: 1.45rem;
        margin-top: 0.25rem;
      }
      .stat-card-light {
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid var(--line);
      }
      .stat-card-dark {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .stat-card small,
      .quick-link-card small,
      .stamp,
      .section-copy,
      .toc-empty {
        color: var(--ink-soft);
      }
      .quick-links-grid,
      .doc-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .quick-link-card,
      .doc-card {
        display: grid;
        gap: 0.35rem;
        padding: 1rem;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(243, 249, 250, 0.96));
        color: inherit;
        text-decoration: none;
        transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
      }
      .quick-link-card:hover,
      .doc-card:hover {
        transform: translateY(-2px);
        border-color: rgba(46, 196, 182, 0.42);
        box-shadow: 0 14px 30px rgba(16, 37, 58, 0.08);
      }
      .hero-dark .quick-link-card {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .hero-dark .quick-link-card small,
      .hero-dark .quick-link-eyebrow,
      .hero-dark .panel-title,
      .hero-dark .stat-label,
      .hero-dark .stamp {
        color: rgba(242, 251, 251, 0.75);
      }
      .doc-layout {
        display: grid;
        grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
        gap: 1rem;
        margin-top: 1.2rem;
      }
      .toc-panel {
        padding: 1rem;
        position: sticky;
        top: 1rem;
        align-self: start;
      }
      .toc-list {
        list-style: none;
        margin: 0.9rem 0 0;
        padding: 0;
        display: grid;
        gap: 0.35rem;
      }
      .toc-list a {
        display: block;
        padding: 0.5rem 0.65rem;
        border-radius: 12px;
        color: var(--ink);
        text-decoration: none;
      }
      .toc-list a:hover { background: rgba(46, 196, 182, 0.12); }
      .toc-depth-3 a { padding-left: 1rem; color: var(--ink-soft); }
      .content-panel { min-width: 0; padding: 1.3rem; }
      .doc-section {
        min-width: 0;
        overflow: hidden;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(244, 250, 250, 0.92));
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 1.15rem;
      }
      .doc-section + .doc-section { margin-top: 1rem; }
      .doc-subsection + .doc-subsection { margin-top: 0.9rem; }
      .doc-section-heading { margin-bottom: 0.8rem; }
      .doc-list,
      .resource-list { margin: 0.75rem 0 0; padding-left: 1.15rem; }
      .doc-code {
        overflow: auto;
        background: #10253a;
        color: #eef5f6;
        border-radius: 16px;
        padding: 0.9rem 1rem;
        margin: 0.9rem 0;
      }
      .doc-table-wrap { width: 100%; max-width: 100%; overflow: auto; border: 1px solid #d8e0e5; margin-top: 1rem; }
      .doc-table { width: max-content; min-width: 100%; border-collapse: collapse; background: #fff; font-size: 0.8rem; }
      .doc-table th { position: sticky; top: 0; z-index: 1; background: #172c3d; color: #fff; text-align: left; white-space: nowrap; }
      .doc-table th, .doc-table td { padding: 0.65rem 0.75rem; border-right: 1px solid #dfe5e9; border-bottom: 1px solid #dfe5e9; vertical-align: top; }
      .doc-table tbody tr:nth-child(even) { background: #f6f8f9; }
      .doc-table tbody tr:hover { background: #edf7f6; }
      code { font-family: Consolas, "Courier New", monospace; font-size: 0.94em; }
      .section { margin-top: 1rem; padding: 1.2rem; }
      .stamp { margin-top: 1rem; }
      .coverage-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-top: 1rem; }
      .chart-panel { border: 1px solid #dce4e8; background: #fff; padding: 1.1rem; }
      .chart-heading { display: flex; justify-content: space-between; align-items: start; gap: 1rem; }
      .chart-heading h3 { margin: 0; font-size: 1.05rem; }
      .chart-heading > strong { font: 750 1.9rem Bahnschrift, sans-serif; color: #172c3d; }
      .bar-chart { display: grid; gap: 0.7rem; margin-top: 1rem; }
      .chart-row { display: grid; grid-template-columns: 74px minmax(0, 1fr) 28px; align-items: center; gap: 0.65rem; color: #526874; font-size: 0.82rem; text-decoration: none; }
      .chart-row:hover { color: #08786f; }
      .chart-row > strong { text-align: right; color: #233b4c; }
      .chart-track { height: 9px; background: #e8edef; overflow: hidden; }
      .chart-track i { display: block; height: 100%; }
      .flow-bar { display: flex; height: 20px; margin-top: 1.25rem; overflow: hidden; }
      .flow-bar a { display: block; background: #1ea672; }
      .flow-bar a.negative { background: #d68335; }
      .flow-legend { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.85rem; color: #526874; font-size: 0.82rem; }
      .flow-legend a { display: inline-flex; align-items: center; gap: 0.4rem; color: #526874; text-decoration: none; }
      .flow-legend a:hover { color: #08786f; }
      .flow-legend i { width: 9px; height: 9px; display: inline-block; }
      .legend-happy { background: #1ea672; }
      .legend-negative { background: #d68335; }
      .chart-panel > p { margin-top: 1rem; color: #6d7f8a; font-size: 0.84rem; }
      .trace-intro { margin-bottom: 1rem; padding: 1.2rem; border: 1px solid #cfe0df; background: #f4faf9; }
      .trace-intro > p { color: #536b77; max-width: 76ch; }
      .trace-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; margin-top: 1rem; background: #cfe0df; border: 1px solid #cfe0df; }
      .trace-steps > div { position: relative; background: #fff; padding: 1rem 1rem 1rem 3.25rem; }
      .trace-steps > div > span { position: absolute; left: 1rem; top: 1rem; width: 1.5rem; height: 1.5rem; display: grid; place-items: center; background: #149f92; color: #fff; font-weight: 750; }
      .trace-steps strong { color: #203b4d; }
      .trace-steps p { margin: 0.25rem 0 0; color: #647985; font-size: 0.84rem; line-height: 1.45; }
      .portal-footer { display: flex; justify-content: space-between; gap: 1rem; padding: 1.25rem 0.4rem 0; color: #6d7f8a; font-size: 0.82rem; }
      .viewer-body { min-height: 100vh; background: #f4f6f8; font-family: Aptos, "Segoe UI", sans-serif; }
      .viewer-header { min-height: 64px; padding: 0 1.5rem; display: flex; align-items: center; gap: 1.5rem; background: #fff; border-bottom: 1px solid #dfe4e8; position: sticky; top: 0; z-index: 20; }
      .brand { display: flex; align-items: center; gap: 0.65rem; color: #172c3d; text-decoration: none; font-weight: 750; }
      .brand small { display: block; color: #687985; font-weight: 500; }
      .brand-mark { width: 34px; height: 34px; display: grid; place-items: center; background: #149f92; color: #fff; font: 800 1.1rem Bahnschrift, sans-serif; }
      .viewer-nav { display: flex; gap: 0.25rem; margin-left: auto; }
      .viewer-nav a { padding: 0.55rem 0.7rem; color: #425665; text-decoration: none; font-weight: 650; font-size: 0.9rem; }
      .viewer-nav a:hover { background: #edf7f6; color: #08786f; }
      .run-status { display: inline-flex; align-items: center; gap: 0.45rem; color: #355060; font-size: 0.86rem; font-weight: 650; }
      .status-dot, .scenario-state { width: 9px; height: 9px; border-radius: 50%; background: #1ea672; flex: 0 0 auto; }
      .viewer-shell { min-height: calc(100vh - 104px); display: grid; grid-template-columns: 310px minmax(0, 1fr); }
      .feature-sidebar { background: #172c3d; color: #fff; padding: 1.25rem 0; }
      .overview-item { width: 100%; border-top: 1px solid #31495a; border-bottom: 1px solid #31495a; margin-bottom: 0.4rem; }
      .viewer-overview { max-width: 980px; }
      .viewer-overview > p { color: #5b7183; font-size: 1.05rem; }
      .overview-summary { grid-template-columns: repeat(4, minmax(130px, 1fr)); }
      .overview-guidance { margin-top: 1rem; padding: 1.2rem; border-left: 4px solid #2ec4b6; background: #eef8f6; color: #294656; }
      .overview-guidance p { margin-bottom: 0; }
      .sidebar-heading { padding: 0 1.15rem 1rem; display: grid; grid-template-columns: 1fr auto; align-items: end; }
      .sidebar-heading .overline { grid-column: 1 / -1; color: #8fa3b1; }
      .sidebar-heading strong { font-size: 1.35rem; }
      .sidebar-heading > span:last-child { color: #9eafb9; font-weight: 700; }
      .overline { display: block; margin-bottom: 0.25rem; color: #748691; font-size: 0.72rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.08em; }
      .feature-search { display: block; padding: 0 1rem 1rem; }
      .feature-search > span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
      .feature-search input { width: 100%; min-height: 42px; border: 1px solid #425667; background: #213a4d; color: #fff; padding: 0.7rem 0.8rem; font: inherit; }
      .feature-search input::placeholder { color: #aebbc4; }
      .feature-search input:focus { outline: 2px solid #43c9bd; outline-offset: 1px; }
      .feature-list { display: block; max-height: calc(100vh - 205px); overflow-y: auto; }
      .suite-group { border: 0; }
      .suite-group > .feature-item { padding-left: 1.4rem; }
      .suite-heading { display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 1rem 0.55rem 1rem; background: #10263a; color: #8ab4c2; font-size: 0.72rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer; list-style: none; user-select: none; border-top: 1px solid #1d3648; }
      .suite-heading::-webkit-details-marker { display: none; }
      .suite-heading strong { color: #b8cfd8; font-size: 0.85rem; font-weight: 750; }
      .suite-group[open] .suite-heading { color: #6de8dc; border-left: 3px solid #43c9bd; padding-left: calc(1rem - 3px); }
      .suite-group[open] .suite-heading strong { color: #43c9bd; }
      .feature-item { border: 0; border-left: 3px solid transparent; background: transparent; color: #d9e2e7; padding: 0.75rem 1rem; text-align: left; cursor: pointer; font: inherit; }
      .feature-item span, .feature-item small { display: block; }
      .feature-item span { font-weight: 650; line-height: 1.3; }
      .feature-item small { color: #91a3af; margin-top: 0.25rem; }
      .feature-item:hover { background: #203b4e; }
      .feature-item.active { border-left-color: #43c9bd; background: #28485d; color: #fff; }
      .viewer-main { width: 100%; max-width: 1160px; padding: 2rem clamp(1rem, 3vw, 3rem) 3rem; }
      .viewer-toolbar { display: flex; justify-content: space-between; align-items: start; gap: 1rem; }
      .viewer-toolbar h1 { max-width: 780px; margin: 0; font: 750 clamp(1.65rem, 3vw, 2.3rem)/1.15 Bahnschrift, Aptos, sans-serif; color: #172c3d; letter-spacing: 0; }
      .source-link { flex: 0 0 auto; padding: 0.65rem 0.8rem; border: 1px solid #cdd6dc; color: #31566a; text-decoration: none; font-size: 0.86rem; font-weight: 700; }
      .source-link:hover { border-color: #149f92; color: #08786f; }
      .feature-meta { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; margin-top: 1rem; }
      .tag { padding: 0.25rem 0.45rem; background: #dff3f0; color: #08786f; font-size: 0.76rem; font-weight: 750; }
      .meta-path { color: #6b7d88; font: 0.78rem Consolas, monospace; margin-left: 0.35rem; }
      .scenario-summary { display: grid; grid-template-columns: repeat(3, minmax(120px, 190px)); gap: 1px; margin: 1.6rem 0; background: #dfe5e9; border: 1px solid #dfe5e9; }
      .scenario-summary > div { background: #fff; padding: 0.85rem 1rem; }
      .scenario-summary strong, .scenario-summary span { display: block; }
      .scenario-summary strong { color: #172c3d; font-size: 1.25rem; }
      .scenario-summary span { color: #71818b; font-size: 0.78rem; }
      .scenario-list { display: grid; gap: 0.65rem; }
      .scenario { border: 1px solid #d9e0e4; background: #fff; box-shadow: 0 3px 10px rgba(23, 44, 61, 0.04); }
      .scenario[open] { border-color: #a8c8c4; }
      .scenario summary { min-height: 68px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 0.85rem; padding: 0.75rem 1rem; cursor: pointer; list-style: none; }
      .scenario summary::-webkit-details-marker { display: none; }
      .scenario summary small, .scenario summary strong { display: block; }
      .scenario summary small { color: #788892; font: 0.76rem Consolas, monospace; margin-bottom: 0.15rem; }
      .case-link { display: block; width: fit-content; color: #788892; font: 0.76rem Consolas, monospace; margin-bottom: 0.15rem; text-decoration: none; }
      .case-link:hover { color: #08786f; text-decoration: underline; }
      .scenario summary strong { color: #233b4c; line-height: 1.35; }
      .scenario-state.negative { background: #d68335; }
      .scenario-flow { color: #687b87; background: #f0f3f5; padding: 0.3rem 0.5rem; font-size: 0.72rem; font-weight: 750; text-transform: uppercase; }
      .scenario-badges { display: flex; align-items: center; justify-content: end; gap: 0.45rem; }
      .result-badge { padding: 0.3rem 0.5rem; background: #edf1f3; color: #637681; font-size: 0.72rem; font-weight: 750; white-space: nowrap; }
      .result-badge.passed { background: #dff3e9; color: #16744f; }
      .result-badge.failed, .result-badge.broken { background: #f7e2df; color: #a13b31; }
      .gherkin { border-top: 1px solid #e3e8eb; background: #f8fafb; padding: 1rem 1rem 1.1rem 2.85rem; display: grid; gap: 0.6rem; }
      .gherkin > div:not(.trace-row) { display: grid; grid-template-columns: 62px minmax(0, 1fr); gap: 0.65rem; color: #394f5e; }
      .gherkin b { color: #08786f; }
      .trace-row { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.35rem; padding-top: 0.75rem; border-top: 1px dashed #cfd8dd; color: #71818b; font: 0.76rem Consolas, monospace; }
      .result-row { display: flex !important; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem 1rem; margin-top: 0.35rem; padding: 0.65rem 0; color: #59707d; font-size: 0.78rem; border-top: 1px solid #dfe6e9; }
      .empty-state { padding: 2rem; border: 1px dashed #bdc9d0; text-align: center; color: #657984; }
      .viewer-footer { padding: 0.75rem 1.5rem; background: #fff; border-top: 1px solid #dfe4e8; color: #71818b; font-size: 0.76rem; text-align: right; }
      @media (max-width: 900px) {
        .hero-grid,
        .doc-layout { grid-template-columns: 1fr; }
        .toc-panel { position: static; }
        .viewer-shell { grid-template-columns: 250px minmax(0, 1fr); }
        .coverage-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 640px) {
        main { padding-inline: 0.8rem; }
        .hero,
        .hero-panel,
        .toc-panel,
        .content-panel,
        .section,
        .doc-section,
        .quick-link-card,
        .doc-card,
        .stat-card { border-radius: 18px; }
        .viewer-header { padding: 0 0.8rem; gap: 0.75rem; }
        .viewer-nav { display: none; }
        .run-status { margin-left: auto; }
        .viewer-shell { display: block; }
        .feature-sidebar { padding-bottom: 0.75rem; }
        .feature-list { display: block; overflow-x: auto; max-height: none; padding: 0; }
        .suite-group { display: flex; align-items: center; overflow-x: auto; }
        .suite-heading { flex: 0 0 auto; padding: 0.6rem 0.7rem; border-top: 0; border-bottom: 3px solid transparent; min-width: 90px; flex-direction: column; align-items: start; gap: 0.15rem; }
        .suite-group[open] .suite-heading { border-left: 0; border-bottom-color: #43c9bd; padding-left: 0.7rem; }
        .suite-group > .feature-item { flex: 0 0 auto; min-width: 210px; border-left: 0; border-bottom: 3px solid transparent; padding-left: 1rem; }
        .feature-item.active { border-bottom-color: #43c9bd; border-left-color: transparent; }
        .viewer-main { padding: 1.4rem 0.85rem 2rem; }
        .viewer-toolbar { display: block; }
        .source-link { display: inline-block; margin-top: 0.8rem; }
        .meta-path { width: 100%; margin: 0.1rem 0 0; overflow-wrap: anywhere; }
        .scenario-summary { grid-template-columns: repeat(3, 1fr); }
        .scenario summary { grid-template-columns: auto minmax(0, 1fr); }
        .scenario-badges { grid-column: 2; justify-content: start; flex-wrap: wrap; }
        .scenario-flow { display: none; }
        .gherkin { padding-left: 1rem; }
        .trace-steps { grid-template-columns: 1fr; }
        .portal-footer { display: grid; }
        .hero-dark .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }`;
}

function wrapDocumentHtml({ title, heading, intro, contentHtml, generatedAt, tocHtml, stats, quickLinks }) {
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${portalCss()}</style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="hero-grid">
          <div class="hero-copy">
            <span class="eyebrow">Path Docs Portal</span>
            <h1>${heading}</h1>
            <p>${intro}</p>
            <div class="stat-grid">
${renderStatCards(stats || [], 'light')}
            </div>
          </div>
          <aside class="hero-panel">
            <div class="panel-title">Snelle links</div>
            <div class="quick-links-grid">
${renderQuickLinks(quickLinks || [])}
            </div>
            <p class="stamp"><span class="stamp-label">Gegenereerd op</span><br>${generatedAt}</p>
          </aside>
        </div>
      </section>
      <section class="doc-layout">
        <aside class="toc-panel">
          <div class="toc-title">Inhoud</div>
          ${tocHtml}
        </aside>
        <article class="content-panel">
${contentHtml}
        </article>
      </section>
    </main>
  </body>
</html>
`;
}

function wrapIndexHtml({ generatedAt, stats, features }) {
  const scenarioCount = features.reduce((sum, feature) => sum + feature.scenarios.length, 0);
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Path Live Documentatie</title>
    <style>${portalCss()}</style>
  </head>
  <body>
    <main>
      <section class="hero hero-dark">
        <div class="hero-grid">
          <div>
            <span class="eyebrow">Live Docs Bundle</span>
            <h1>Path Live Documentatie</h1>
            <p>Van businessscenario naar uitvoerbaar bewijs. Bekijk ${scenarioCount} functionele cases, hun traceability en de laatste regressieresultaten vanuit één ingang.</p>
            <div class="stat-grid">
${renderStatCards(stats, 'dark')}
            </div>
          </div>
          <aside class="hero-panel">
            <div class="panel-title">Laatste regressie</div>
            <p><strong>Alle controles geslaagd.</strong><br>De Living Documentation en rapportages zijn uit dezelfde Playwright-run opgebouwd.</p>
            <p class="stamp"><span class="stamp-label">Gegenereerd op</span><br>${generatedAt}</p>
          </aside>
        </div>
      </section>

      <section class="section">
        <span class="overline">Werkruimte</span>
        <h2>Waar wil je naartoe?</h2>
        <p class="section-copy">Start bij functioneel gedrag of ga direct naar uitvoerbaar bewijs.</p>
        <div class="doc-grid">
          <a class="doc-card" href="living-doc.html"><span class="card-eyebrow">Start hier</span><strong>Living Documentation</strong><small>Doorzoek features en open scenario's met hun Given, When en Then.</small></a>
          <a class="doc-card" href="test-bdd-mapping.html"><span class="card-eyebrow">Van gedrag naar bewijs</span><strong>Hoe is een scenario getest?</strong><small>Bekijk welk gedrag is beschreven, welke Playwright-test draait en waar het resultaat staat.</small></a>
          <a class="doc-card" href="playwright-report/index.html"><span class="card-eyebrow">Testresultaat</span><strong>Playwright HTML Report</strong><small>UI-runresultaten, retries, screenshots en traces.</small></a>
          <a class="doc-card" href="allure-report/index.html"><span class="card-eyebrow">Rapportage</span><strong>Allure Report</strong><small>Samenvatting, attachments en testdetail in een rijkere report-UI.</small></a>
        </div>
      </section>

      <section class="section">
        <span class="overline">Testoverzicht</span>
        <h2>Wat wordt automatisch gecontroleerd?</h2>
        <p class="section-copy">De ${scenarioCount} unieke cases controleren gebruikersschermen, API's, security, databases en integraties. De actuele aantallen testuitvoeringen en resultaten staan hierboven en worden bij iedere bundel opnieuw berekend.</p>
        ${renderCoverageCharts(features)}
      </section>

      <footer class="portal-footer">
        <span>Path Uren &amp; Facturatie · Living Documentation v0.9.88</span>
        <span><a href="LIVING-DOC.md">Markdown</a> · <a href="TEST-BDD-MAPPING.md">Mapping bron</a></span>
      </footer>
    </main>
  </body>
</html>
`;
}

async function readAllureSummary() {
  try {
    const raw = await readFile(join(root, 'allure-report', 'widgets', 'summary.json'), 'utf8');
    const parsed = JSON.parse(raw);
    const statistic = parsed?.statistic || {};
    return {
      passed: Number(statistic.passed || 0),
      failed: Number(statistic.failed || 0),
      broken: Number(statistic.broken || 0),
      total: Number(statistic.total || 0),
    };
  } catch {
    return { passed: 0, failed: 0, broken: 0, total: 0 };
  }
}

async function readAllureCases() {
  try {
    const resultsDir = join(root, 'allure-results');
    const files = (await readdir(resultsDir)).filter(file => file.endsWith('-result.json'));
    const cases = new Map();
    const statusPriority = { failed: 5, broken: 4, skipped: 3, unknown: 2, passed: 1 };

    for (const file of files) {
      const result = JSON.parse(await readFile(join(resultsDir, file), 'utf8'));
      const labels = new Map((result.labels || []).map(label => [label.name, label.value]));
      const caseId = labels.get('testCaseId') || result.name?.match(/^\[([^\]]+)\]/)?.[1];
      if (!caseId) {
        continue;
      }

      const current = cases.get(caseId) || { status: 'passed', executions: 0, durationMs: 0, startedAt: 0, projects: new Set() };
      const status = result.status || 'unknown';
      if ((statusPriority[status] || 0) > (statusPriority[current.status] || 0)) {
        current.status = status;
      }
      current.executions += 1;
      current.durationMs += Math.max(0, Number(result.stop || 0) - Number(result.start || 0));
      current.startedAt = Math.max(current.startedAt, Number(result.start || 0));
      const project = labels.get('project');
      const device = labels.get('device');
      if (project || device) {
        current.projects.add([project, device].filter(Boolean).join(' / '));
      }
      cases.set(caseId, current);
    }

    return Object.fromEntries([...cases].map(([caseId, result]) => [caseId, { ...result, projects: [...result.projects] }]));
  } catch {
    return {};
  }
}

async function readFeatureOverview() {
  const featuresDir = join(root, 'tests', 'playwright', 'features');
  const files = (await readdir(featuresDir)).filter(file => file.endsWith('.feature')).sort();
  const features = await Promise.all(files.map(async file => parseFeatureDocument(file, await readFile(join(featuresDir, file), 'utf8'))));
  const scenarioCount = features.reduce((total, feature) => total + feature.scenarios.length, 0);

  return {
    files,
    features,
    featureCount: files.length,
    scenarioCount,
  };
}

async function main() {
  for (const path of requiredPaths) {
    await assertExists(path);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await cp(join(root, 'LIVING-DOC.md'), join(outDir, 'LIVING-DOC.md'));
  await cp(join(root, 'TEST-BDD-MAPPING.md'), join(outDir, 'TEST-BDD-MAPPING.md'));
  await cp(join(root, 'tests', 'playwright', 'features'), join(outDir, 'features'), { recursive: true });
  await cp(join(root, 'playwright-report'), join(outDir, 'playwright-report'), { recursive: true });
  await cp(join(root, 'allure-report'), join(outDir, 'allure-report'), { recursive: true });

  const generatedAt = new Date().toISOString();
  const livingDocMarkdown = await readFile(join(root, 'LIVING-DOC.md'), 'utf8');
  const mappingMarkdown = await readFile(join(root, 'TEST-BDD-MAPPING.md'), 'utf8');
  const livingDocRender = markdownToHtml(livingDocMarkdown, { omitFirstH1: true });
  const mappingRender = markdownToHtml(mappingMarkdown, { omitFirstH1: true });
  const livingDocStats = collectMarkdownStats(livingDocMarkdown);
  const mappingStats = collectMarkdownStats(mappingMarkdown);
  const allureSummary = await readAllureSummary();
  const allureCases = await readAllureCases();
  const featureOverview = await readFeatureOverview();
  for (const feature of featureOverview.features) {
    for (const scenario of feature.scenarios) {
      scenario.result = allureCases[scenario.id] || null;
    }
  }

  const sharedQuickLinks = [
    { href: 'index.html', eyebrow: 'Portal', title: 'Terug naar overzicht', description: 'Open de centrale docs-landingspagina.' },
    { href: 'playwright-report/index.html', eyebrow: 'Report', title: 'Playwright HTML Report', description: 'Open UI-resultaten, screenshots, traces en retries.' },
    { href: 'allure-report/index.html', eyebrow: 'Report', title: 'Allure Report', description: 'Bekijk de rijkere rapportage en attachments.' },
  ];

  const livingDocHtml = renderLivingDocViewer(featureOverview.features, generatedAt, allureSummary);

  const mappingHtml = wrapDocumentHtml({
    title: 'Path Test Traceability',
    heading: 'Hoe is ieder scenario getest?',
    intro: 'Volg elke functionele case van leesbaar gebruikersgedrag naar de automatische Playwright-test en het resultaat in de rapportage.',
    contentHtml: `${renderTraceabilityIntro()}${mappingRender.html}`,
    generatedAt,
    tocHtml: renderDocToc(mappingRender.toc),
    stats: [
      { label: 'Functionele cases', value: featureOverview.scenarioCount, note: 'Overal herkenbaar aan hetzelfde case-ID.' },
      { label: 'Features', value: featureOverview.featureCount, note: 'Leesbare groepen van gebruikersgedrag.' },
      { label: 'Testuitvoeringen', value: allureSummary.total, note: 'Inclusief twee devices voor vier mobile cases.' },
      { label: 'Geslaagd', value: allureSummary.passed, note: 'Laatste Allure-statistiek in dezelfde bundle.' },
    ],
    quickLinks: [
      { href: 'living-doc.html', eyebrow: 'Gedrag', title: 'Open Living Documentation', description: 'Begin bij een leesbaar feature-scenario.' },
      { href: 'TEST-BDD-MAPPING.md', eyebrow: 'Technische bron', title: 'Open mappingbestand', description: 'Bekijk de volledige mapping zoals in Git beheerd.' },
      ...sharedQuickLinks,
    ],
  });

  await writeFile(join(outDir, 'living-doc.html'), livingDocHtml, 'utf8');
  await writeFile(join(outDir, 'test-bdd-mapping.html'), mappingHtml, 'utf8');

  const indexHtml = wrapIndexHtml({
    generatedAt,
    stats: [
      { label: 'Feature files', value: featureOverview.featureCount, note: 'BDD-bronbestanden in de bundle.' },
      { label: 'Scenario\'s', value: featureOverview.scenarioCount, note: 'Herleidbare scenario\'s uit de features.' },
      { label: 'Tests geslaagd', value: allureSummary.passed, note: `${allureSummary.failed + allureSummary.broken} issues in de laatste run.` },
      { label: 'Totale tests', value: allureSummary.total, note: 'Laatste Allure-statistiek.' },
    ],
    features: featureOverview.features,
  });

  await writeFile(join(outDir, 'index.html'), indexHtml, 'utf8');

  console.log(`Live documentatiebundel klaar in: ${resolve(outDir)}`);
  console.log('Publiceer de map live-doc-site op een statische host of als CI-artifact.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
