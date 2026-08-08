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
  let sectionDepth = 0;
  let skippedFirstH1 = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
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

    if (trimmed === '') {
      closeList();
      continue;
    }

    if (trimmed.startsWith('# ')) {
      closeList();
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
    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
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
      .content-panel { padding: 1.3rem; }
      .doc-section {
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
      code { font-family: Consolas, "Courier New", monospace; font-size: 0.94em; }
      .section { margin-top: 1rem; padding: 1.2rem; }
      .stamp { margin-top: 1rem; }
      @media (max-width: 900px) {
        .hero-grid,
        .doc-layout { grid-template-columns: 1fr; }
        .toc-panel { position: static; }
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

function wrapIndexHtml({ generatedAt, stats, featureFiles }) {
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
            <p>Deze portal combineert living documentation, BDD-traceerbaarheid en de laatste Playwright- en Allure-rapporten in één deelbare pagina.</p>
            <div class="stat-grid">
${renderStatCards(stats, 'dark')}
            </div>
          </div>
          <aside class="hero-panel">
            <div class="panel-title">Bundle snapshot</div>
            <p>Gebruik deze landingspagina als centrale ingang voor regressiereviews, demo-uitleg en testbesprekingen met het team.</p>
            <p class="stamp"><span class="stamp-label">Gegenereerd op</span><br>${generatedAt}</p>
          </aside>
        </div>
      </section>

      <section class="section">
        <h2>Open direct</h2>
        <p class="section-copy">De belangrijkste onderdelen staan hieronder als duidelijke kaarten in plaats van alleen platte links.</p>
        <div class="doc-grid">
          <a class="doc-card" href="living-doc.html"><span class="card-eyebrow">Documentatie</span><strong>Living Doc</strong><small>Functionele productuitleg met nette layout en inhoudsnavigatie.</small></a>
          <a class="doc-card" href="test-bdd-mapping.html"><span class="card-eyebrow">Traceerbaarheid</span><strong>BDD Mapping</strong><small>Route van feature file naar step definitions en specs.</small></a>
          <a class="doc-card" href="playwright-report/index.html"><span class="card-eyebrow">Testresultaat</span><strong>Playwright HTML Report</strong><small>UI-runresultaten, retries, screenshots en traces.</small></a>
          <a class="doc-card" href="allure-report/index.html"><span class="card-eyebrow">Rapportage</span><strong>Allure Report</strong><small>Samenvatting, attachments en testdetail in een rijkere report-UI.</small></a>
          <a class="doc-card" href="LIVING-DOC.md"><span class="card-eyebrow">Bron</span><strong>Living Doc Markdown</strong><small>Ruwe markdown zoals in Git beheerd.</small></a>
          <a class="doc-card" href="TEST-BDD-MAPPING.md"><span class="card-eyebrow">Bron</span><strong>BDD Mapping Markdown</strong><small>Bronbestand voor de technische mapping.</small></a>
        </div>
      </section>

      <section class="section">
        <h2>Feature scenario's</h2>
        <ul class="resource-list">
          ${featureFiles.map(file => `<li><a href="features/${file}">${escapeHtml(file)}</a></li>`).join('')}
        </ul>
      </section>
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

async function readFeatureOverview() {
  const featuresDir = join(root, 'tests', 'playwright', 'features');
  const files = (await readdir(featuresDir)).filter(file => file.endsWith('.feature')).sort();
  let scenarioCount = 0;

  for (const file of files) {
    const raw = await readFile(join(featuresDir, file), 'utf8');
    scenarioCount += raw.split(/\r?\n/).filter(line => /^\s*Scenario:/i.test(line)).length;
  }

  return {
    files,
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
  const featureOverview = await readFeatureOverview();

  const sharedQuickLinks = [
    { href: 'index.html', eyebrow: 'Portal', title: 'Terug naar overzicht', description: 'Open de centrale docs-landingspagina.' },
    { href: 'playwright-report/index.html', eyebrow: 'Report', title: 'Playwright HTML Report', description: 'Open UI-resultaten, screenshots, traces en retries.' },
    { href: 'allure-report/index.html', eyebrow: 'Report', title: 'Allure Report', description: 'Bekijk de rijkere rapportage en attachments.' },
  ];

  const livingDocHtml = wrapDocumentHtml({
    title: 'Path Living Doc',
    heading: 'Path Living Doc',
    intro: 'Leesbare productdocumentatie bovenop de uitvoerbare Playwright-suite, met directe routes naar scenario\'s en rapportages.',
    contentHtml: livingDocRender.html,
    generatedAt,
    tocHtml: renderDocToc(livingDocRender.toc),
    stats: [
      { label: 'Secties', value: livingDocStats.sections.length, note: 'Domeinen en hoofdstukken in dit document.' },
      { label: 'Features', value: featureOverview.featureCount, note: 'Feature files in de bundle.' },
      { label: 'Scenario\'s', value: featureOverview.scenarioCount, note: 'Herleidbaar via de featurebestanden.' },
      { label: 'Tests geslaagd', value: `${allureSummary.passed}/${allureSummary.total || allureSummary.passed}`, note: 'Uit de laatste Allure-samenvatting.' },
    ],
    quickLinks: [
      { href: 'LIVING-DOC.md', eyebrow: 'Bron', title: 'Markdown bron', description: 'Open de ruwe living doc zoals in Git beheerd.' },
      { href: 'features/auth.feature', eyebrow: 'BDD', title: 'Feature scenario\'s', description: 'Lees de scenario-bronbestanden direct.' },
      ...sharedQuickLinks,
    ],
  });

  const mappingHtml = wrapDocumentHtml({
    title: 'Path BDD Mapping',
    heading: 'Path BDD Mapping',
    intro: 'Directe mapping tussen feature files, step definitions en native Playwright specs zodat regressies navolgbaar blijven.',
    contentHtml: mappingRender.html,
    generatedAt,
    tocHtml: renderDocToc(mappingRender.toc),
    stats: [
      { label: 'Mappings', value: mappingStats.listItems, note: 'Feature -> steps -> spec routes.' },
      { label: 'Secties', value: mappingStats.sections.length, note: 'Uitlegblokken in deze mapping.' },
      { label: 'Codeblokken', value: mappingStats.codeBlocks, note: 'Technische snippets en voorbeelden.' },
      { label: 'Tests totaal', value: allureSummary.total, note: 'Laatste Allure-statistiek in dezelfde bundle.' },
    ],
    quickLinks: [
      { href: 'TEST-BDD-MAPPING.md', eyebrow: 'Bron', title: 'Markdown bron', description: 'Open de ruwe mapping zoals in Git beheerd.' },
      { href: 'features', eyebrow: 'BDD', title: 'Feature map', description: 'Blader door alle featurebestanden in deze bundle.' },
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
    featureFiles: featureOverview.files,
  });

  await writeFile(join(outDir, 'index.html'), indexHtml, 'utf8');

  console.log(`Live documentatiebundel klaar in: ${resolve(outDir)}`);
  console.log('Publiceer de map live-doc-site op een statische host of als CI-artifact.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
