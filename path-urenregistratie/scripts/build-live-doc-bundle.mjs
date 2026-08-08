import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let inList = false;
  let inCode = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('```')) {
      closeList();
      if (!inCode) {
        html.push('<pre><code>');
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

    if (line === '') {
      closeList();
      continue;
    }

    if (line.startsWith('# ')) {
      closeList();
      html.push(`<h1>${renderInline(line.slice(2).trim())}</h1>`);
      continue;
    }

    if (line.startsWith('## ')) {
      closeList();
      html.push(`<h2>${renderInline(line.slice(3).trim())}</h2>`);
      continue;
    }

    if (line.startsWith('### ')) {
      closeList();
      html.push(`<h3>${renderInline(line.slice(4).trim())}</h3>`);
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${renderInline(line.slice(2).trim())}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInline(line)}</p>`);
  }

  closeList();
  if (inCode) {
    html.push('</code></pre>');
  }

  return html.join('\n');
}

function wrapDocumentHtml({ title, heading, intro, contentHtml, generatedAt }) {
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        --ink: #0f2a3d;
        --mint: #2ec4b6;
        --sand: #f6f8f9;
        --card: #ffffff;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(140deg, var(--sand), #eaf3f4);
        color: var(--ink);
      }
      main {
        max-width: 980px;
        margin: 0 auto;
        padding: 2rem 1rem 3rem;
      }
      .hero {
        background: var(--card);
        border-left: 6px solid var(--mint);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(15, 42, 61, 0.08);
        padding: 1.25rem 1rem;
      }
      .content {
        margin-top: 1rem;
        background: var(--card);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(15, 42, 61, 0.08);
        padding: 1.25rem 1rem;
      }
      h1 {
        margin: 0 0 0.6rem;
        font-size: 1.6rem;
      }
      h2 {
        margin-top: 1.4rem;
        font-size: 1.25rem;
      }
      p {
        line-height: 1.45;
      }
      ul {
        padding-left: 1.2rem;
      }
      pre {
        overflow: auto;
        background: #0f2a3d;
        color: #eaf3f4;
        border-radius: 8px;
        padding: 0.8rem;
      }
      code {
        font-family: Consolas, "Courier New", monospace;
      }
      a {
        color: #0d5e7a;
        text-decoration-thickness: 2px;
      }
      .stamp {
        margin-top: 1rem;
        font-size: 0.95rem;
        opacity: 0.85;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>${heading}</h1>
        <p>${intro}</p>
        <p><a href="index.html">Terug naar overzicht</a></p>
        <p class="stamp">Gegenereerd op: ${generatedAt}</p>
      </section>
      <section class="content">
${contentHtml}
      </section>
    </main>
  </body>
</html>
`;
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

  const livingDocHtml = wrapDocumentHtml({
    title: 'Path Living Doc',
    heading: 'Path Living Doc',
    intro: 'Live gegenereerde weergave van de living documentatie.',
    contentHtml: markdownToHtml(livingDocMarkdown),
    generatedAt,
  });

  const mappingHtml = wrapDocumentHtml({
    title: 'Path BDD Mapping',
    heading: 'Path BDD Mapping',
    intro: 'Live gegenereerde mapping tussen feature, steps en specs.',
    contentHtml: markdownToHtml(mappingMarkdown),
    generatedAt,
  });

  await writeFile(join(outDir, 'living-doc.html'), livingDocHtml, 'utf8');
  await writeFile(join(outDir, 'test-bdd-mapping.html'), mappingHtml, 'utf8');

  const indexHtml = `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Path Live Documentatie</title>
    <style>
      :root {
        --ink: #0f2a3d;
        --mint: #2ec4b6;
        --sand: #f6f8f9;
        --card: #ffffff;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(140deg, var(--sand), #eaf3f4);
        color: var(--ink);
      }
      main {
        max-width: 980px;
        margin: 0 auto;
        padding: 2rem 1rem 3rem;
      }
      .hero {
        background: var(--card);
        border-left: 6px solid var(--mint);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(15, 42, 61, 0.08);
        padding: 1.25rem 1rem;
      }
      h1 {
        margin: 0 0 0.5rem;
        font-size: 1.6rem;
      }
      p {
        margin: 0.4rem 0;
      }
      ul {
        margin: 1rem 0 0;
        padding-left: 1.2rem;
      }
      li {
        margin: 0.5rem 0;
      }
      a {
        color: #0d5e7a;
        text-decoration-thickness: 2px;
      }
      .stamp {
        margin-top: 1rem;
        font-size: 0.95rem;
        opacity: 0.85;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>Path Live Documentatie</h1>
        <p>Deze map combineert de living doc met de laatste testrapporten.</p>
        <ul>
          <li><a href="living-doc.html">Living Doc (dynamische pagina)</a></li>
          <li><a href="test-bdd-mapping.html">BDD Mapping (dynamische pagina)</a></li>
          <li><a href="LIVING-DOC.md">Living Doc (bron markdown)</a></li>
          <li><a href="TEST-BDD-MAPPING.md">BDD Mapping (bron markdown)</a></li>
          <li><a href="features/auth.feature">Feature scenarios</a></li>
          <li><a href="playwright-report/index.html">Playwright HTML Report</a></li>
          <li><a href="allure-report/index.html">Allure Report</a></li>
        </ul>
        <p class="stamp">Gegenereerd op: ${generatedAt}</p>
      </section>
    </main>
  </body>
</html>
`;

  await writeFile(join(outDir, 'index.html'), indexHtml, 'utf8');

  console.log(`Live documentatiebundel klaar in: ${resolve(outDir)}`);
  console.log('Publiceer de map live-doc-site op een statische host of als CI-artifact.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
