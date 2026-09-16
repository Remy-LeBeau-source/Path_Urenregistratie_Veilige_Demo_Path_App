#!/usr/bin/env node
// Bouwt pilot/path-kwaliteitsstraat-data.json uit de echte projectstand: de laatste
// opleveringen en open wensen uit GIO-WENSEN.md, met per case het Gherkin uit
// het feature-bestand en de techniek/assertions uit LIVING-DOC.md.
// `--check` faalt als het bestand achterloopt (zelfde patroon als de ERD).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'pilot', 'path-kwaliteitsstraat-data.json');
const CASE_ID = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-[HN]-\d{3}\b/g;
const MAX_DELIVERED = 10;
const MAX_OPEN = 5;
// Basisregel van Gio (16 sep): verbeteringen die wij zelf zien staan in GIO-WENSEN.md
// onder "Nice to have" en het wensformulier toont ze als keuzelijst.
const MAX_NICE_TO_HAVE = 8;

// Feature-bestanden en MD's wisselen tussen LF en CRLF: altijd normaliseren,
// anders laat een trailing \r de Scenario-regex stilletjes mislukken.
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim().replace(/\*\*/g, ''));

function tableRows(markdown, heading) {
  const start = markdown.indexOf(`\n## ${heading}`);
  if (start < 0) return [];
  const section = markdown.slice(start).split('\n## ').slice(0, 2).join('\n## ');
  return section.split('\n').filter((l) => l.startsWith('|') && !/^\|\s*-+/.test(l) && !/^\|\s*Datum/.test(l)).map(cells);
}

function featureIndex() {
  const dir = path.join(root, 'tests', 'playwright', 'features');
  const index = new Map();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.feature'))) {
    const lines = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n').split('\n');
    const tags = lines.filter((l) => l.trim().startsWith('@')).map((l) => l.trim());
    const mobile = tags.some((t) => /@mobile/.test(t)) && !tags.some((t) => /@desktop/.test(t));
    for (let i = 0; i < lines.length; i += 1) {
      const m = lines[i].match(/^\s*Scenario(?: Outline)?:\s*\[([A-Z0-9-]+)\]\s*(.+)$/);
      if (!m) continue;
      const steps = [];
      let technique = '';
      let assertions = 0;
      for (let j = i + 1; j < lines.length; j += 1) {
        const l = lines[j];
        if (/^\s*(Scenario|@|Feature:)/.test(l)) break;
        const t = l.trim();
        if (!t) continue;
        const tech = t.match(/^#\s*Testtechniek:\s*(.+)$/);
        const asr = t.match(/^#\s*Aantoonbare Playwright-assertions in deze case:\s*(\d+)/);
        if (tech) technique = tech[1].trim();
        else if (asr) assertions = Number(asr[1]);
        else if (!t.startsWith('#')) steps.push(t);
      }
      index.set(m[1], {
        id: m[1], title: m[2].trim(), feature: `tests/playwright/features/${file}`,
        technique, assertions, platform: mobile ? 'mobile' : 'desktop-chromium',
        gherkin: [`Scenario: ${m[2].trim()}`, ...steps.map((s) => `  ${s}`)].join('\n')
      });
    }
  }
  return index;
}

function build() {
  const wishes = read('GIO-WENSEN.md');
  const features = featureIndex();
  const pkg = JSON.parse(read('package.json'));
  const delivered = tableRows(wishes, 'Klaar').slice(0, MAX_DELIVERED).map(([date, wish, version]) => {
    const ids = [...new Set(wish.match(CASE_ID) || [])].filter((id) => features.has(id));
    return {
      date, version, wish,
      cases: ids.map((id) => features.get(id))
    };
  });
  const open = tableRows(wishes, 'Open en bezig').slice(0, MAX_OPEN).map(([date, wish, who, status]) => ({ date, wish, who, status }));
  const niceToHave = tableRows(wishes, 'Nice to have').slice(0, MAX_NICE_TO_HAVE).map(([date, improvement, why]) => ({ date, improvement, why }));
  // generatedAt vertelt de pagina hoe vers de stand is; een PO heeft daar meer aan dan
  // aan een kaal versienummer bovenin (het nummer zelf staat in de voettekst).
  return { appVersion: pkg.version, generatedAt: new Date().toISOString(), source: 'GIO-WENSEN.md + tests/playwright/features + LIVING-DOC.md', delivered, open, niceToHave };
}

// De tijd verandert bij elke bouw; de controle vergelijkt daarom zonder dat veld,
// anders is de poort altijd rood en zou elke run het bestand opnieuw schrijven.
const zonderTijd = (tekst) => tekst.replace(/\n  "generatedAt": "[^"]*",?/, '');

const data = build();
const json = `${JSON.stringify(data, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (zonderTijd(current) !== zonderTijd(json)) {
    console.error('pilot/path-kwaliteitsstraat-data.json loopt achter op GIO-WENSEN.md of de feature-bestanden. Draai: npm run pipeline:data');
    process.exit(1);
  }
  console.log('pipeline-demo-data: actueel');
} else if (fs.existsSync(OUT) && zonderTijd(fs.readFileSync(OUT, 'utf8')) === zonderTijd(json)) {
  // Inhoudelijk niets veranderd: niet herschrijven, anders geeft elke docs:sync een
  // diff op alleen het tijdstip en wordt dat ruis in commits.
  console.log('pipeline-demo-data: actueel, niet herschreven');
} else {
  fs.writeFileSync(OUT, json);
  console.log(`pipeline-demo-data: ${data.delivered.length} opleveringen, ${data.open.length} open, ${data.delivered.reduce((n, d) => n + d.cases.length, 0)} cases -> pilot/path-kwaliteitsstraat-data.json`);
}
