// Wachter op de intakewachtrij: kijkt periodiek of er een nieuwe wens is
// ingediend op de kwaliteitsstraat en trapt de keten dan zelf af.
//
// Waarom dit bestaat: tot nu toe landde een ingediende wens wel in de wachtrij,
// maar gebeurde er daarna niets tot iemand handmatig `npm run intake` draaide.
// Voor de PO voelde dat als "ik heb ingediend en het blijft stil". Deze wachter
// dicht precies dat gat: hij ziet de wens binnenkomen en maakt er meteen het
// GitHub-issue van, zodat het spoor bestaat en het werk zichtbaar klaarstaat.
//
// Wat hij BEWUST NIET doet: code schrijven, GIO-WENSEN.md bijwerken, committen
// of pushen. Dat blijft werk van de agent met de beoordeling erbij. Een wachter
// die ongezien in een repository schrijft is precies het soort automatisering
// dat je later niet meer kunt navertellen.
//
// Gebruik:
//   node scripts/pipeline-intake-watch.mjs                 (TEST, elke 60s)
//   node scripts/pipeline-intake-watch.mjs --eenmalig      (één ronde, dan stoppen)
//   node scripts/pipeline-intake-watch.mjs --droog         (niets aanmaken, alleen tonen)
//   node scripts/pipeline-intake-watch.mjs --interval=30   (andere pauze in seconden)
//   node scripts/pipeline-intake-watch.mjs --lokaal        (tegen de lokale server)

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const projectMap = join(hier, '..');
const STAND = join(projectMap, '.pipeline-intake-watch.json');

const argumenten = process.argv.slice(2);
const eenmalig = argumenten.includes('--eenmalig');
const droog = argumenten.includes('--droog');
const lokaal = argumenten.includes('--lokaal');
const intervalArg = argumenten.find((a) => a.startsWith('--interval='));
// Ondergrens van 15 seconden: de wachtrij is een klein bestand op een gedeelde
// server, en vaker vragen levert geen snellere reactie op, alleen meer belasting.
const interval = Math.max(15, Number(intervalArg?.split('=')[1] || 60)) * 1000;
const basis = lokaal ? 'http://127.0.0.1:8010' : 'https://uren-test.pathconsultancy.nl';
const url = `${basis}/pilot/path-kwaliteitsstraat-intake.php`;

function nu() {
  return new Date().toLocaleTimeString('nl-NL', { timeZone: 'Europe/Amsterdam' });
}

// Bewust zonder shell. Met `shell: true` knipt de Windows-shell elk argument met
// een spatie in stukken: een titel als "PATH-202 In Berichten een filter" kwam bij
// gh binnen als tien losse argumenten en het aanmaken faalde met "please quote all
// values that have spaces". Zonder shell geeft Node de argumenten ongewijzigd door,
// maar dan moet de naam op Windows wel de .exe dragen -- daar doet Node geen
// PATHEXT-aanvulling.
const GH = process.platform === 'win32' ? 'gh.exe' : 'gh';

function gh(argumenten) {
  return spawnSync(GH, argumenten, { cwd: projectMap, encoding: 'utf8', shell: false });
}

function leesStand() {
  if (!existsSync(STAND)) return { afgehandeld: [] };
  try {
    const json = JSON.parse(readFileSync(STAND, 'utf8'));
    return { afgehandeld: Array.isArray(json.afgehandeld) ? json.afgehandeld : [] };
  } catch {
    // Een onleesbare stand mag de wachter nooit stilzetten: dan liever opnieuw
    // beginnen dan blijven hangen. Dubbele issues worden alsnog voorkomen door
    // de controle op bestaande issues hieronder.
    return { afgehandeld: [] };
  }
}

function schrijfStand(stand) {
  mkdirSync(dirname(STAND), { recursive: true });
  writeFileSync(STAND, `${JSON.stringify(stand, null, 2)}\n`);
}

async function haalWachtrij() {
  const antwoord = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!antwoord.ok) throw new Error(`wachtrij antwoordde met code ${antwoord.status}`);
  const json = await antwoord.json();
  return Array.isArray(json.wishes) ? json.wishes : [];
}

// Twee onafhankelijke controles of een wens al loopt: staat hij in GIO-WENSEN.md
// (dan is hij door een agent opgepakt), of bestaat er al een issue met dezelfde
// sleutel (dan heeft een eerdere ronde hem al aangemaakt). De eigen standlijst
// is alleen een snelkoppeling; de waarheid staat in het bestand en in GitHub.
function staatInWensenlijst(sleutel) {
  try {
    return readFileSync(join(projectMap, 'GIO-WENSEN.md'), 'utf8').includes(sleutel);
  } catch {
    return false;
  }
}

function bestaandIssue(sleutel) {
  const resultaat = gh(['issue', 'list', '--search', sleutel, '--state', 'all', '--json', 'number,title']);
  if (resultaat.status !== 0) return null;
  try {
    const gevonden = JSON.parse(resultaat.stdout || '[]');
    return gevonden.find((i) => String(i.title).includes(sleutel)) || null;
  } catch {
    return null;
  }
}

function maakIssue(wens) {
  const titel = `${wens.key} ${wens.title}`;
  const tekst = [
    `**Stakeholder:** ${wens.stakeholder}`,
    `**Type:** ${wens.type}`,
    `**Gewenste waarde:** ${wens.goal}`,
    `**Acceptatiecriterium:** ${wens.criterion}`,
    '',
    `Ingediend via de kwaliteitsstraat op ${basis}, ${wens.submitted_at || 'onbekend tijdstip'}.`,
    'Automatisch aangemaakt door scripts/pipeline-intake-watch.mjs. Volgende stap: PIPELINE-INTAKE.md stap 2.',
  ].join('\n');

  if (droog) {
    console.log(`  [droog] zou issue aanmaken: ${titel}`);
    return 'droog';
  }

  const resultaat = gh(['issue', 'create', '--label', 'pipeline-intake', '--title', titel, '--body', tekst]);
  if (resultaat.status !== 0) {
    console.error(`  issue aanmaken mislukt: ${(resultaat.stderr || '').trim()}`);
    return null;
  }
  return (resultaat.stdout || '').trim();
}

async function ronde(stand) {
  let wensen;
  try {
    wensen = await haalWachtrij();
  } catch (fout) {
    console.error(`${nu()}  wachtrij niet bereikbaar: ${fout.message}`);
    return stand;
  }

  const nieuw = wensen.filter((w) => !stand.afgehandeld.includes(w.key) && !staatInWensenlijst(w.key));
  if (!nieuw.length) {
    console.log(`${nu()}  niets nieuws (${wensen.length} in de wachtrij)`);
    return stand;
  }

  for (const wens of nieuw) {
    console.log(`${nu()}  nieuwe wens: ${wens.key} -- ${wens.title}`);
    const bestaand = bestaandIssue(wens.key);
    if (bestaand) {
      console.log(`  bestaat al als issue #${bestaand.number}, overgeslagen`);
    } else {
      const uitkomst = maakIssue(wens);
      if (!uitkomst) continue;
      if (uitkomst !== 'droog') console.log(`  issue aangemaakt: ${uitkomst}`);
    }
    if (!droog) {
      stand.afgehandeld.push(wens.key);
      schrijfStand(stand);
    }
    console.log('  klaar om op te pakken: PIPELINE-INTAKE.md stap 2 (regel in GIO-WENSEN.md, dan bouwen).');
  }
  return stand;
}

let stand = leesStand();
console.log(`Wachter op ${url}${droog ? ' (droog: er wordt niets aangemaakt)' : ''}`);
stand = await ronde(stand);

if (!eenmalig) {
  console.log(`Elke ${interval / 1000} seconden opnieuw. Stoppen met Ctrl+C.`);
  setInterval(async () => {
    stand = await ronde(stand);
  }, interval);
}
