/*
 * Bewaakt dat een gebruiker geen Engelse melding op het scherm krijgt.
 *
 * De API antwoordt met een code (`error`) en een tekst (`message`). De code is
 * de vaste afspraak tussen app en server -- daar controleren de testen op. De
 * tekst is schermtekst: de app zet die rechtstreeks in een toast of statusregel.
 *
 * Een deel van de endpoints antwoordde in het Engels, waardoor een medewerker
 * zinnen als "Each day entry hours value must be between 0 and 24." te zien
 * kreeg op een verder Nederlands scherm. Dat is in 0.9.121 rechtgezet. Deze
 * controle houdt het zo: komt er een nieuwe Engelse melding bij, dan faalt de
 * gate in plaats van dat het Engels stilletjes op het scherm belandt.
 *
 * Buiten beeld blijven server/scripts/* en server/health.php: dat is tekst voor
 * de beheerder op de opdrachtregel, geen schermtekst, en de testen controleren
 * daar juist op de Engelse formulering.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WORTEL = process.cwd();
const MAPPEN = ['server/api', 'server/auth', 'server/security'];

function phpBestanden(map) {
  const uit = [];
  let inhoud = [];
  try {
    inhoud = readdirSync(map);
  } catch {
    return uit;
  }
  for (const naam of inhoud) {
    const vol = path.join(map, naam);
    let gegevens;
    try {
      gegevens = statSync(vol);
    } catch {
      continue;
    }
    if (gegevens.isDirectory()) uit.push(...phpBestanden(vol));
    else if (naam.endsWith('.php')) uit.push(vol);
  }
  return uit;
}

// Een melding met een Nederlands woord erin is Nederlands; dat weegt zwaarder
// dan een Engelse treffer, omdat leenwoorden als "invalid", "PDF" en "token"
// ook in Nederlandse zinnen voorkomen.
const NEDERLANDS = /\b(de|het|een|niet|geen|kan|kunt|worden|wordt|moet|deze|dit|jouw|voor|met|bij|naar|van|om|dat|die|er|nog|al|alleen|opnieuw|zijn|is|en|of|te|op|aan|uit|meer|dan|reeds|gevonden|verzonden|opgeslagen|mislukt|vereist|toegestaan|ingesteld|controleer|probeer|neem|vul|kies|geef)\b/i;
const ENGELS = /\b(the|must|cannot|could|does|was|were|are|been|only|already|required|allowed|at least|before|after|this|your|payload|endpoint|integer|positive|between|store|change|changed|reload|try again|exists|linked|scope|account|invoice|timesheet|announcement|administrator|administrators|draft|period|state|action|one of)\b/i;

const gevonden = [];
for (const map of MAPPEN) {
  for (const bestand of phpBestanden(path.join(WORTEL, map))) {
    const regels = readFileSync(bestand, 'utf8').split('\n');
    regels.forEach((regel, i) => {
      const treffer = /'message'\s*=>\s*'([^']*)'/.exec(regel);
      if (!treffer) return;
      const bericht = treffer[1];
      if (NEDERLANDS.test(bericht)) return;
      if (!ENGELS.test(bericht)) return;
      gevonden.push(path.relative(WORTEL, bestand).replace(/\\/g, '/') + ':' + (i + 1) + '  ' + bericht);
    });
  }
}

if (gevonden.length > 0) {
  console.error('Engelse schermmeldingen in de API (' + gevonden.length + '):\n');
  gevonden.forEach((regel) => console.error('  ' + regel));
  console.error('\nDeze tekst komt rechtstreeks in een toast of statusregel terecht.');
  console.error('Schrijf de melding in het Nederlands. Leunt de app op de tekst om');
  console.error('een beslissing te nemen, gebruik daar dan de foutcode voor.');
  process.exit(1);
}

console.log('Servermeldingen: geen Engelse schermtekst in ' + MAPPEN.join(', ') + '.');
