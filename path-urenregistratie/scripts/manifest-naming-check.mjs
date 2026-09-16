// Bewaakt dat manifest.php voor elke bekende omgeving een eigen naam heeft.
//
// Waarom een tekstcontrole op de bron in plaats van een echte HTTP-aanroep:
// manifest.php leest de omgeving alleen uit server/config.local.php, niet uit
// een request-parameter of omgevingsvariabele. Een geautomatiseerde test zou
// dat bestand dus tijdelijk moeten omzetten -- precies het soort gedeelde
// toestand die twee gelijktijdige testruns (of CI-shards) elkaar laat
// verstoren. Een tekstcontrole op de bron zelf heeft dat probleem niet en vangt
// hetzelfde echte risico: dat een omgeving stilletjes de productienaam krijgt
// omdat niemand een regel toevoegde toen die omgeving in gebruik kwam
// (precies wat er speelde vóór 'acc' hier op 16 sep bij kwam).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const hier = dirname(fileURLToPath(import.meta.url));
const bron = readFileSync(join(hier, '..', 'manifest.php'), 'utf8');

// Elke omgeving die de release-pijplijn kent, hoort hier een regel te hebben.
// 'production' staat bewust niet in de lijst: dat is de standaard buiten $naming
// om, en juist dát is de valkuil -- een vergeten omgeving valt er automatisch
// op terug.
const verwachteOmgevingen = ['test', 'development', 'acc'];

const namingMatch = bron.match(/\$naming\s*=\s*\[([\s\S]*?)\n\];/);
if (!namingMatch) {
  console.error('manifest-naming-check: $naming-array niet gevonden in manifest.php.');
  process.exit(1);
}
const namingBlok = namingMatch[1];

const gevonden = new Map();
for (const omgeving of verwachteOmgevingen) {
  const regex = new RegExp(`'${omgeving}'\\s*=>\\s*\\[([\\s\\S]*?)\\]`);
  const match = namingBlok.match(regex);
  if (!match) {
    console.error(`manifest-naming-check: omgeving '${omgeving}' ontbreekt in $naming.`);
    process.exit(1);
  }
  const nameMatch = match[1].match(/'name'\s*=>\s*'([^']+)'/);
  const shortMatch = match[1].match(/'short_name'\s*=>\s*'([^']+)'/);
  if (!nameMatch || !shortMatch) {
    console.error(`manifest-naming-check: omgeving '${omgeving}' mist 'name' of 'short_name'.`);
    process.exit(1);
  }
  gevonden.set(omgeving, { name: nameMatch[1], short_name: shortMatch[1] });
}

const standaardMatch = bron.match(/\$pick\s*=\s*\$naming\[\$environment\]\s*\?\?\s*\[([\s\S]*?)\];/);
if (!standaardMatch) {
  console.error('manifest-naming-check: standaardwaarde ($pick) niet gevonden.');
  process.exit(1);
}
const standaardName = standaardMatch[1].match(/'name'\s*=>\s*'([^']+)'/)?.[1];

// Elke naam moet uniek zijn, anders zie je vanaf het beginscherm niet welke
// omgeving je hebt geïnstalleerd -- precies het probleem dat dit bestand oplost.
const alleNamen = [...gevonden.values()].map((v) => v.name).concat(standaardName);
const uniekeNamen = new Set(alleNamen);
if (uniekeNamen.size !== alleNamen.length) {
  console.error('manifest-naming-check: twee omgevingen (of de standaardwaarde) delen dezelfde naam.', alleNamen);
  process.exit(1);
}

console.log(`manifest-naming-check: ${verwachteOmgevingen.length} omgevingen elk met een eigen naam, plus een afwijkende standaardwaarde ("${standaardName}") voor productie.`);
