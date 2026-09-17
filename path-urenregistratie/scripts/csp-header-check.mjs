// Dekkingsronde: SEC-H-007 controleerde alleen dat config.example.php de
// sleutel 'content_security_policy' noemt (een text-match die net zo goed zou
// slagen met een LEGE waarde), en SEC-H-008 meet de vaste headers op een echt
// HTTP-antwoord maar laat Content-Security-Policy expres weg -- de lokale
// testserver draait met server/config.local.php, en dat bestand heeft
// bewust geen 'security'-blok (zie server/auth/session.php:
// auth_apply_security_headers()), dus de header wordt daar nooit verstuurd.
// Een echte HTTP-controle zou dus altijd stilzwijgend "geslaagd" zijn, ook als
// de CSP-waarde in de voorbeeldconfig's zelf leeg of kapot was.
//
// Waarom een broncontrole in plaats van config.local.php tijdelijk aanvullen:
// dat bestand is gedeeld met alle lokale testruns en shards (zie
// manifest-naming-check.mjs voor hetzelfde argument bij de omgevingsnaam).
// Deze controle bewaakt in plaats daarvan de twee dingen die samen bepalen of
// een echte omgeving de header krijgt: dat session.php de header onvoorwaardelijk
// verstuurt zodra er een niet-lege waarde is, en dat de voorbeeldconfig's een
// echte, sluitende policy meegeven -- niet alleen de sleutelnaam.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const hier = dirname(fileURLToPath(import.meta.url));
const root = join(hier, '..');

const sessionBron = readFileSync(join(root, 'server', 'auth', 'session.php'), 'utf8');
if (!/\$csp\s*=\s*trim\(\(string\)\(\$security\['content_security_policy'\]\s*\?\?\s*''\)\);\s*\n\s*if \(\$csp !== ''\) \{\s*\n\s*header\('Content-Security-Policy: ' \. \$csp\);/.test(sessionBron)) {
  console.error('csp-header-check: session.php verstuurt de Content-Security-Policy-header niet meer onvoorwaardelijk zodra er een waarde is (of de code is herschreven -- controleer dit script mee).');
  process.exit(1);
}

// Directives die een CSP zonder deze regel weinig voorstelt: een policy die
// alleen 'default-src' zet maar scripts, styles of frames niet beperkt, is in
// de praktijk vrijwel geen bescherming.
const verplichteDirectives = ['default-src', 'script-src', 'style-src', 'frame-ancestors', 'object-src'];
const voorbeelden = ['config.example.php', 'config.test.example.php'];

for (const bestand of voorbeelden) {
  const bron = readFileSync(join(root, 'server', bestand), 'utf8');
  const match = bron.match(/'content_security_policy'\s*=>\s*"([^"]*)"/);
  if (!match || match[1].trim() === '') {
    console.error(`csp-header-check: ${bestand} mist een echte content_security_policy-waarde (lege of ontbrekende string).`);
    process.exit(1);
  }
  const policy = match[1];
  const ontbrekend = verplichteDirectives.filter((directive) => !policy.includes(directive));
  if (ontbrekend.length) {
    console.error(`csp-header-check: ${bestand} mist directive(s) in content_security_policy: ${ontbrekend.join(', ')}.`);
    process.exit(1);
  }
  if (/unsafe-eval/.test(policy)) {
    console.error(`csp-header-check: ${bestand} staat 'unsafe-eval' toe in de CSP -- dat hoort een bewuste, expliciete uitzondering te zijn, niet de standaard.`);
    process.exit(1);
  }
}

console.log(`csp-header-check: session.php verstuurt de CSP-header onvoorwaardelijk, en beide voorbeeldconfig's hebben een echte policy met ${verplichteDirectives.length} verplichte directives.`);
