#!/usr/bin/env node

// Staat via het web precies open wat de app nodig heeft, en de rest dicht?
//
// Aanleiding (18 sep 2026): de uitrol zet de hele repository in de webmap, en
// .htaccess schermde alleen bestanden af die met een punt beginnen. Op TEST en
// op PROD waren daardoor onder meer de wensenlijst (met namen en werkpatronen
// van medewerkers), de overdrachtsnotities, de omgevingsbestanden en de
// beheerscripts in server/scripts gewoon op te halen.
//
// Hoe dit toetst: het leest de ECHTE regels uit .htaccess -- de FilesMatch-
// patronen en de <If>-regel op het adres -- en past ze toe op elk bestand dat
// git kent, zoals Apache dat zou doen. Er is dus geen tweede lijst die uit de
// pas kan lopen met de regels zelf. Daarna twee eisen:
//   - alles wat de app laadt, moet open staan (anders breekt de app);
//   - alles wat intern is, moet dicht zijn (anders lekt het).
// Techniek (TMap/ISTQB): equivalentieklassen over bestandssoorten en mappen,
// met per klasse de verwachte uitkomst, getoetst over de volledige populatie
// in plaats van een steekproef.
//
// Wat dit NIET kan: de server zelf bevragen. Of Apache de regels ook echt
// toepast, blijkt pas na een uitrol; zie de controle met curl in GIO-WENSEN.md.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wortel = join(dirname(fileURLToPath(import.meta.url)), "..");
const htaccess = readFileSync(join(wortel, ".htaccess"), "utf8");

// Alleen regels die ook echt weigeren, en de punt-regel die er al stond.
const bestandsPatronen = [...htaccess.matchAll(/<FilesMatch "([^"]+)">\s*\r?\n\s*Require all denied/g)]
  .map((m) => new RegExp(m[1]));
const adresPatronen = [...htaccess.matchAll(/<If "%\{REQUEST_URI\} =~ m#(.+?)#">\s*\r?\n\s*Require all denied/g)]
  .map((m) => new RegExp(m[1]));

if (bestandsPatronen.length < 2 || adresPatronen.length < 1) {
  console.error(`FOUT: .htaccess bevat minder weigerregels dan verwacht (${bestandsPatronen.length} op bestandsnaam, ${adresPatronen.length} op adres).`);
  process.exit(1);
}

function isDicht(pad) {
  const naam = pad.split("/").pop();
  if (bestandsPatronen.some((p) => p.test(naam))) return true;
  // De app staat bovenaan de webmap, dus het adres is "/" + het pad in de repo.
  return adresPatronen.some((p) => p.test("/" + pad));
}

// Wat de app zelf laadt of aanroept. Nagekeken in index.html, sw.js, assets/,
// pilot/ en server/ (zie GIO-WENSEN.md, 18 sep).
function moetOpen(pad) {
  if (["index.html", "sw.js", "manifest.php", "manifest.webmanifest"].includes(pad)) return true;
  if (pad.startsWith("assets/")) return true;
  if (/^pilot\/.+\.(html|js|css|json|php|png|svg|jpg|webp)$/.test(pad)) return true;
  if (/^server\/(api|auth)\/[^/]+\.php$/.test(pad)) return true;
  if (pad === "server/health.php") return true;
  if (pad === "database/ERD-nieuw.svg") return true;
  return false;
}

// Wat nooit via het web op te halen hoort te zijn.
function moetDicht(pad) {
  if (/\.(md|env|sql|feature|ts|mjs|ps1|cmd)$/.test(pad)) return true;
  if (/^(environments|tests|scripts|node_modules|design-mockups|agents)\//.test(pad)) return true;
  if (pad.startsWith("server/scripts/")) return true;
  if (/^(package(-lock)?\.json|vite\.config\.js)$/.test(pad)) return true;
  return false;
}

const bestanden = execFileSync("git", ["ls-files"], { cwd: wortel, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const tegenstrijdig = bestanden.filter((p) => moetOpen(p) && moetDicht(p));
const tenOnrechteDicht = bestanden.filter((p) => moetOpen(p) && isDicht(p));
const tenOnrechteOpen = bestanden.filter((p) => moetDicht(p) && !isDicht(p));

let fouten = 0;
if (tegenstrijdig.length) {
  fouten += tegenstrijdig.length;
  console.error("FOUT: deze bestanden staan in beide lijsten; de controle zelf klopt niet:");
  tegenstrijdig.slice(0, 10).forEach((p) => console.error("  " + p));
}
if (tenOnrechteDicht.length) {
  fouten += tenOnrechteDicht.length;
  console.error("FOUT: de app heeft deze bestanden nodig, maar .htaccess weigert ze:");
  tenOnrechteDicht.slice(0, 20).forEach((p) => console.error("  " + p));
}
if (tenOnrechteOpen.length) {
  fouten += tenOnrechteOpen.length;
  console.error("FOUT: deze bestanden horen niet via het web bereikbaar te zijn, maar staan open:");
  tenOnrechteOpen.slice(0, 20).forEach((p) => console.error("  " + p));
  if (tenOnrechteOpen.length > 20) console.error(`  ... en nog ${tenOnrechteOpen.length - 20}`);
}
if (fouten > 0) process.exit(1);

const open = bestanden.filter((p) => moetOpen(p)).length;
const dicht = bestanden.filter((p) => moetDicht(p)).length;
console.log(`webtoegang-check: ${open} bestanden die de app nodig heeft staan open, ${dicht} interne bestanden zijn dicht (van ${bestanden.length} in de repository).`);
