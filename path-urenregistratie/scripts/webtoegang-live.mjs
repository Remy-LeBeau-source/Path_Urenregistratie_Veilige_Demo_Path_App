#!/usr/bin/env node

// Staan de interne bestanden op een draaiende omgeving echt dicht, en werkt de
// app daar nog?
//
//   node scripts/webtoegang-live.mjs                          (TEST)
//   node scripts/webtoegang-live.mjs https://uren.pathconsultancy.nl   (PROD)
//
// Aanvulling op scripts/webtoegang-check.mjs. Die toetst de regels in .htaccess
// tegen de repository, maar kan niet zien of de webserver ze ook toepast. Dit
// script vraagt het de server zelf, na een uitrol.
//
// Het doet alleen GET-verzoeken op bestanden die niets uitvoeren: documentatie,
// omgevingsbestanden, testcode. De beheerscripts in server/scripts staan er
// bewust NIET in -- als de afscherming daar ooit toch zou falen, zou een
// controle het script uitvoeren (een reset of herstel).

const basis = (process.argv[2] || 'https://uren-test.pathconsultancy.nl').replace(/\/+$/, '');

// Moet dicht zijn: 403 of 404 zijn allebei goed, zolang de inhoud niet meekomt.
const dicht = [
  '/GIO-WENSEN.md',
  '/LIVING-DOC.md',
  '/CODEX_HANDOFF.md',
  '/TEST-ROLES.md',
  '/environments/test.env',
  '/environments/prod.env',
  '/package.json',
  '/database/schema.sql',
  '/tests/playwright/auth.spec.ts',
  '/scripts/set-version.mjs',
  '/node_modules/dotenv/package.json',
];

// Moet open zijn: wat de app en de kwaliteitsstraat laden.
const open = [
  '/',
  '/index.html',
  '/assets/app.js',
  '/assets/styles.css',
  '/sw.js',
  '/server/health.php',
  '/pilot/path-kwaliteitsstraat.html',
  '/pilot/path-kwaliteitsstraat.js',
  '/pilot/path-kwaliteitsstraat-data.json',
  '/database/ERD-nieuw.svg',
];

async function status(pad) {
  try {
    const antwoord = await fetch(basis + pad, { redirect: 'manual' });
    return antwoord.status;
  } catch (fout) {
    return `geen verbinding (${fout.message})`;
  }
}

let fouten = 0;
console.log(`Omgeving: ${basis}`);
for (const pad of dicht) {
  const s = await status(pad);
  const goed = s === 403 || s === 404;
  if (!goed) fouten++;
  console.log(`  ${goed ? 'dicht' : 'OPEN '}  ${s}  ${pad}`);
}
for (const pad of open) {
  const s = await status(pad);
  const goed = s === 200;
  if (!goed) fouten++;
  console.log(`  ${goed ? 'open ' : 'KAPOT'}  ${s}  ${pad}`);
}

if (fouten > 0) {
  console.error(`webtoegang-live: ${fouten} afwijking(en) op ${basis}.`);
  process.exit(1);
}
console.log(`webtoegang-live: alles klopt op ${basis} (${dicht.length} dicht, ${open.length} open).`);
