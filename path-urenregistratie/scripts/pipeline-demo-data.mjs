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
// Opdracht Gio (17 sep): de kwaliteitsstraat moet onze échte administratie zijn,
// geen etalage met de laatste tien. Daarom staat de volledige projecthistorie in
// het bestand en beslist de pagina zelf wat hij per keer toont (zoeken, filteren,
// "toon meer"). De oude caps stonden hier op 10/5/8 en maakten het bord
// aantoonbaar onvolledig: 81 opleveringen werden er 10.
// Het Gherkin-blok is het zwaarste veld; dat blijft alleen bij de nieuwste
// opleveringen staan, zodat het bestand niet onnodig groeit voor historie die
// niemand meer uitklapt. GHERKIN_VOLLEDIG_TOT telt vanaf de nieuwste.
const GHERKIN_VOLLEDIG_TOT = 25;

// Feature-bestanden en MD's wisselen tussen LF en CRLF: altijd normaliseren,
// anders laat een trailing \r de Scenario-regex stilletjes mislukken.
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

// ---------------------------------------------------------------------------
// Geen persoonsgegevens in de openbare projectstand
// ---------------------------------------------------------------------------
// De kwaliteitsstraat is openbaar leesbaar, op voorwaarde dat er geen persoons-
// gegevens in staan. GIO-WENSEN.md is dat niet: daar staan namen van collega's
// in, soms met hun werkpatroon ("werkt ma t/m do 8 uur, vrijdag 4"). Tot 18 sep
// kwam dat letterlijk in dit openbare bestand terecht.
//
// Wie een persoon is, wordt niet hier bijgehouden maar uit het zaaibestand van
// de database gelezen: een nieuwe collega die daar bijkomt, wordt dan vanzelf
// ook afgeschermd, in plaats van pas nadat iemand eraan denkt deze lijst bij te
// werken. De beheerder met id 1 is de product owner en heet op de pagina "PO",
// net als in de rest van de kwaliteitsstraat.
function personenUitZaaibestand() {
  const regel = /\(\s*(\d+)\s*,\s*\d+\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'(administrator|employee)'/g;
  const personen = [];
  for (const m of read('database/seed-demo-data.sql').matchAll(regel)) {
    const [, id, , naam, rol] = m;
    const label = id === '1' ? 'PO' : rol === 'administrator' ? 'een beheerder' : 'een medewerker';
    // Volledige naam eerst, dan losse delen van de voornaam: "Shawn-Douglas
    // Nahar" komt in de tekst ook voor als "Shawn".
    const voornaam = naam.split(' ')[0];
    const delen = [...new Set([naam, voornaam, ...voornaam.split('-')])].filter((d) => d.length > 2);
    personen.push({ delen, label });
  }
  if (personen.length === 0) {
    throw new Error('Geen personen gevonden in database/seed-demo-data.sql; zonder die lijst kan de projectstand niet veilig openbaar.');
  }
  return personen;
}

const PERSONEN = personenUitZaaibestand();
const ontsnap = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function zonderPersoonsgegevens(tekst) {
  let uit = tekst;
  // Langste namen eerst, zodat "Marc de Roon" in zijn geheel wordt vervangen en
  // niet eerst "Marc" los, met "de Roon" als restje erachter.
  const vervangingen = PERSONEN.flatMap((p) => p.delen.map((deel) => ({ deel, label: p.label })))
    .sort((a, b) => b.deel.length - a.deel.length);
  for (const { deel, label } of vervangingen) {
    uit = uit.replace(new RegExp(`(?<![\\p{L}])${ontsnap(deel)}(?![\\p{L}])`, 'gu'), label);
  }
  // Mailadressen, ook de testaccounts: die zijn te herleiden tot een persoon.
  uit = uit.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, 'een testaccount');
  // Een opsomming van namen wordt anders "een medewerker/een medewerker/een
  // medewerker"; dat leest als een fout en zegt niets extra's.
  uit = uit.replace(/een (medewerker|beheerder)(?:\s*(?:\/|,|\ben\b)\s*een (?:medewerker|beheerder))+/g, 'enkele collega\'s');
  // Aan het begin van een zin met een hoofdletter.
  return uit.replace(/(^|[.!?]\s+|\*\*|["(]\s*)een /g, (_, voor) => `${voor}Een `);
}

function zonderPersoonsgegevensDiep(waarde) {
  if (typeof waarde === 'string') return zonderPersoonsgegevens(waarde);
  if (Array.isArray(waarde)) return waarde.map(zonderPersoonsgegevensDiep);
  if (waarde && typeof waarde === 'object') {
    return Object.fromEntries(Object.entries(waarde).map(([k, v]) => [k, zonderPersoonsgegevensDiep(v)]));
  }
  return waarde;
}
// Een pipe in de tekst staat in de bron als \| (Markdown-ontsnapping). Die hoort
// geen nieuwe kolom te beginnen: op 18 sep brak "`| head`" twee regels, waarna de
// rest van de zin als versienummer op het bord verscheen.
const cells = (line) => line.replace(/\\\|/g, '\u0000').split('|').slice(1, -1)
  .map((c) => c.replace(/\u0000/g, '|').trim().replace(/\*\*/g, ''));

// De versiekolom bevat soms meer dan een nummer ("main 2.0.106", "2.0.77-2.0.90").
// Voor het bord en het Releases-tabblad telt het eerste versienummer; staat er
// geen in, dan blijft de tekst zelf staan (bijvoorbeeld "werkwijze").
const versieUit = (cel) => (String(cel).match(/\d+\.\d+\.\d+/) || [cel])[0];

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
  const delivered = tableRows(wishes, 'Klaar').map(([date, wish, version], index) => {
    const ids = [...new Set(wish.match(CASE_ID) || [])].filter((id) => features.has(id));
    const volledig = index < GHERKIN_VOLLEDIG_TOT;
    return {
      date, version: versieUit(version), wish,
      cases: ids.map((id) => {
        const c = features.get(id);
        return volledig ? c : { ...c, gherkin: '' };
      })
    };
  });
  const open = tableRows(wishes, 'Open en bezig').map(([date, wish, who, status]) => ({ date, wish, who, status }));
  const niceToHave = tableRows(wishes, 'Nice to have').map(([date, improvement, why]) => ({ date, improvement, why }));
  // generatedAt vertelt de pagina hoe vers de stand is; een PO heeft daar meer aan dan
  // aan een kaal versienummer bovenin (het nummer zelf staat in de voettekst).
  return { appVersion: pkg.version, generatedAt: new Date().toISOString(), source: 'GIO-WENSEN.md + tests/playwright/features + LIVING-DOC.md', delivered, open, niceToHave };
}

// De tijd verandert bij elke bouw; de controle vergelijkt daarom zonder dat veld,
// anders is de poort altijd rood en zou elke run het bestand opnieuw schrijven.
const zonderTijd = (tekst) => tekst.replace(/\n  "generatedAt": "[^"]*",?/, '');

const data = zonderPersoonsgegevensDiep(build());
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
