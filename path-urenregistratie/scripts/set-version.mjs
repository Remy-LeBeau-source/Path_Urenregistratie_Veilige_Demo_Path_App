#!/usr/bin/env node

// Het versienummer staat op tien plekken in vijf bestanden: package.json,
// package-lock.json, de cache-busters en zichtbare badges in index.html, twee
// assertions in de smoke test en een assertion in de inlogspec. Dat werd elke
// release met de hand gelijkgezet, en een vergeten plek merk je pas als de
// pipeline omvalt -- of erger, als TEST een ander nummer toont dan het bestand
// dat de test controleert.
//
//   node scripts/set-version.mjs 1.0.0   -- zet overal hetzelfde nummer
//   node scripts/set-version.mjs --check -- controleert of alles gelijk staat
//
// Bij --check wordt niets geschreven; de exitcode is 1 zodra ergens een ander
// nummer staat dan in package.json.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const wortel = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEMVER = /^\d+\.\d+\.\d+$/;

// maxRegel begrenst de vervanging tot de kop van package-lock.json. Daaronder
// staan de versies van alle afhankelijkheden; een pakket dat toevallig hetzelfde
// nummer draagt mag nooit worden meegewijzigd.
const BESTANDEN = [
  { pad: "package.json", maxRegel: 20 },
  { pad: "package-lock.json", maxRegel: 15 },
  { pad: "index.html" },
  { pad: "scripts/smoke-test.mjs" },
  { pad: "tests/playwright/auth.spec.ts" },
];

function huidigeVersie() {
  const pkg = JSON.parse(readFileSync(join(wortel, "package.json"), "utf8"));
  const versie = String(pkg.version || "");
  if (!SEMVER.test(versie)) {
    throw new Error(`package.json bevat geen geldig versienummer: "${versie}"`);
  }
  return versie;
}

function ontsnap(tekst) {
  return tekst.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Telt en vervangt alleen binnen de toegestane regels, zodat het bereik van een
// bestand met een begrenzing niet stilzwijgend groter wordt.
function verwerk(inhoud, oud, nieuw, maxRegel) {
  const patroon = new RegExp(ontsnap(oud), "g");
  let treffers = 0;
  const regels = inhoud.split(/\r?\n/).map((regel, index) => {
    if (maxRegel && index + 1 > maxRegel) return regel;
    return regel.replace(patroon, () => {
      treffers += 1;
      return nieuw;
    });
  });
  const scheiding = inhoud.includes("\r\n") ? "\r\n" : "\n";
  return { treffers, inhoud: regels.join(scheiding) };
}

const argument = process.argv[2];
const controleren = argument === "--check";
if (!argument) {
  console.error("Gebruik: node scripts/set-version.mjs <versie> | --check");
  process.exit(1);
}
if (!controleren && !SEMVER.test(argument)) {
  console.error(`"${argument}" is geen geldig versienummer (verwacht: 1.2.3).`);
  process.exit(1);
}

const oud = huidigeVersie();
const nieuw = controleren ? oud : argument;

if (!controleren && nieuw === oud) {
  console.error(`De versie staat al op ${oud}; er is niets te doen.`);
  process.exit(1);
}

const rapport = [];
let fouten = 0;

for (const bestand of BESTANDEN) {
  const volledig = join(wortel, bestand.pad);
  const inhoud = readFileSync(volledig, "utf8");
  const gevonden = verwerk(inhoud, oud, nieuw, bestand.maxRegel);

  if (gevonden.treffers === 0) {
    console.error(`FOUT: ${bestand.pad} bevat versie ${oud} niet.`);
    fouten += 1;
    continue;
  }
  rapport.push({ pad: bestand.pad, treffers: gevonden.treffers });
  if (!controleren) writeFileSync(volledig, gevonden.inhoud);
}

// Na het schrijven mag het oude nummer nergens meer staan. Zonder deze ronde
// zou een plek buiten de bekende bestanden ongemerkt achterblijven.
if (!controleren && fouten === 0) {
  for (const bestand of BESTANDEN) {
    const inhoud = readFileSync(join(wortel, bestand.pad), "utf8");
    const achtergebleven = verwerk(inhoud, oud, nieuw, bestand.maxRegel).treffers;
    if (achtergebleven > 0) {
      console.error(`FOUT: ${bestand.pad} bevat nog ${achtergebleven}x versie ${oud}.`);
      fouten += 1;
    }
  }
}

if (fouten > 0) process.exit(1);

const totaal = rapport.reduce((som, regel) => som + regel.treffers, 0);
for (const regel of rapport) {
  console.log(`  ${regel.pad}: ${regel.treffers}x`);
}
console.log(controleren
  ? `Versiecontrole: overal ${oud} (${totaal} plekken).`
  : `Versie gezet van ${oud} naar ${nieuw} op ${totaal} plekken.`);
