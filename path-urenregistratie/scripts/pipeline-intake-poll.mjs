// Haalt de intakewachtrij van de demo-pagina op en laat zien welke wensen nog
// open staan. Dit vervangt `gh issue list --label pipeline-intake` als eerste
// stap: Gio dient in op de Confluence-pagina en hoeft zelf geen issue meer aan
// te maken. Het issue maakt de agent later zelf aan met `gh issue create`, zodat
// het spoor in GitHub blijft bestaan zonder dat er een sleutel in een publieke
// pagina staat.
//
// Gebruik:
//   npm run intake              (TEST)
//   npm run intake -- --lokaal  (de lokale server op 127.0.0.1:8010)
//   npm run intake -- --json    (onbewerkt, voor een ander script)
//
// Een wens die al in GIO-WENSEN.md staat wordt als opgepakt gemeld, zodat je in
// een oogopslag ziet wat er nog echt te doen is.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const projectMap = join(hier, '..');

const argumenten = process.argv.slice(2);
const alsJson = argumenten.includes('--json');
const lokaal = argumenten.includes('--lokaal');
const basis = lokaal ? 'http://127.0.0.1:8010' : 'https://uren-test.pathconsultancy.nl';
const url = `${basis}/pilot/path-pipeline-intake.php`;

let wensen = [];
try {
  const antwoord = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!antwoord.ok) {
    console.error(`De wachtrij op ${basis} antwoordde met code ${antwoord.status}.`);
    process.exit(1);
  }
  const json = await antwoord.json();
  wensen = Array.isArray(json.wishes) ? json.wishes : [];
} catch (fout) {
  console.error(`De wachtrij op ${basis} was niet bereikbaar: ${fout.message}`);
  process.exit(1);
}

if (alsJson) {
  console.log(JSON.stringify(wensen, null, 2));
  process.exit(0);
}

const wensenBestand = readFileSync(join(projectMap, 'GIO-WENSEN.md'), 'utf8');
const open = [];
const opgepakt = [];
for (const wens of wensen) {
  (wensenBestand.includes(wens.key) ? opgepakt : open).push(wens);
}

if (!wensen.length) {
  console.log(`Geen wensen in de wachtrij op ${basis}.`);
  process.exit(0);
}

console.log(`Intakewachtrij op ${basis} -- ${open.length} open, ${opgepakt.length} al opgepakt.\n`);

for (const wens of open) {
  const wanneer = wens.submitted_at ? new Date(wens.submitted_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }) : 'onbekend';
  console.log(`${wens.key}  [${wens.type}]  ${wens.title}`);
  console.log(`  ingediend   : ${wanneer} (Nederlandse tijd)`);
  console.log(`  stakeholder : ${wens.stakeholder}`);
  console.log(`  waarde      : ${wens.goal}`);
  console.log(`  criterium   : ${wens.criterion}`);
  console.log('');
}

if (opgepakt.length) {
  console.log(`Al in GIO-WENSEN.md: ${opgepakt.map((w) => w.key).join(', ')}`);
}

if (open.length) {
  console.log('Volgende stap: PIPELINE-INTAKE.md stap 2, te beginnen met een regel in GIO-WENSEN.md.');
}
