<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';

// 19 sep: vervolg op Gio's opdracht "veel security testen over de gehele
// applicatie". Elk schrijvend endpoint in server/api hoort security_require_csrf_token()
// aan te roepen voordat het een wijziging doet -- SEC-N-001/002 (tests/playwright/
// security.spec.ts) bewijzen dat voor login/logout, maar niets bewaakte dat een
// NIEUW endpoint die aanroep niet zou vergeten. Dit script loopt elk bestand in
// server/api langs: staat het niet op de beredeneerde uitzonderingslijst
// hieronder, dan moet het security_require_csrf_token() aanroepen. Elke
// uitzondering wordt zelf ook gecontroleerd (geen schrijvende SQL in dat
// bestand), zodat de lijst niet stilzwijgend fout kan worden -- liever een
// beredeneerde lijst dan een slimme gok, zelfde aanpak als de danger-tekst-
// kleurenlijst in contrast-licht-donker.mjs.
$apiDir = __DIR__ . '/../api';

// Twee soorten uitzonderingen. "alleen-lezen": geen schrijvende SQL in het
// bestand zelf. "gedeelde-schrijfbibliotheek": bevat wel schrijvende SQL, maar
// wordt zelf nooit rechtstreeks aangeroepen (geen eigen REQUEST_METHOD/CORS-
// afhandeling) -- elke aanroeper die het require't moet zelf al csrf afdwingen.
$geenCsrfNodig = [
    'bootstrap.php' => ['type' => 'alleen-lezen', 'reden' => 'Alleen-lezen (common.php dwingt GET af), geen wijziging.'],
    'common.php' => ['type' => 'alleen-lezen', 'reden' => 'Gedeelde bibliotheek, alleen ge-require\'d door bootstrap.php en dashboard.php; zelf geen route met een body.'],
    'dashboard.php' => ['type' => 'alleen-lezen', 'reden' => 'Alleen-lezen (common.php dwingt GET af), geen wijziging.'],
    'audit-log.php' => ['type' => 'alleen-lezen', 'reden' => 'Alleen-lezen, wijst GET-anders af.'],
    'server-log.php' => ['type' => 'alleen-lezen', 'reden' => 'Alleen-lezen (foutenlog inzien), wijst GET-anders af.'],
    'mail-recipients.php' => [
        'type' => 'gedeelde-schrijfbibliotheek',
        'reden' => 'Gedeelde bibliotheek, alleen ge-require\'d door staff.php en settings.php; die endpoints dwingen zelf al csrf af vóór ze de functie aanroepen.',
        'aanroepers' => ['staff.php', 'settings.php'],
    ],
];

$fouten = 0;
$controle = function (bool $conditie, string $melding) use (&$fouten): void {
    if (!$conditie) {
        fwrite(STDERR, "FOUT: {$melding}\n");
        $fouten++;
    }
};

// Een kale str_contains() op de brontekst ziet ook een aanroep die in een
// commentaarregel staat (bijvoorbeeld //security_require_csrf_token();) als
// een echte aanroep -- dezelfde fout als eerder bij de X-Forwarded-For-
// controle in health-exposure-policy-check.php. token_get_all() tokeniseert
// echt PHP en negeert T_COMMENT/T_DOC_COMMENT, dus dit ziet alleen een
// aanroep die de interpreter ook echt zou uitvoeren.
function csrf_check_real_function_calls(string $bron): array
{
    $gevonden = [];
    $tokens = token_get_all($bron);
    foreach ($tokens as $i => $token) {
        if (!is_array($token) || $token[0] !== T_STRING) {
            continue;
        }
        // Volgende betekenisvolle token moet een "(" zijn, anders is het geen aanroep.
        for ($j = $i + 1; $j < count($tokens); $j++) {
            $volgende = $tokens[$j];
            if (is_array($volgende) && in_array($volgende[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }
            if ($volgende === '(') {
                $gevonden[$token[1]] = true;
            }
            break;
        }
    }
    return array_keys($gevonden);
}

$bestanden = glob($apiDir . '/*.php') ?: [];
$controle($bestanden !== [], 'server/api/*.php leverde geen enkel bestand op -- klopt het pad nog?');

$broncodePerBestand = [];
$aanroepenPerBestand = [];
foreach ($bestanden as $pad) {
    $naam = basename($pad);
    $bron = file_get_contents($pad) ?: '';
    $broncodePerBestand[$naam] = $bron;
    $aanroepenPerBestand[$naam] = csrf_check_real_function_calls($bron);
}

$geziene = [];
foreach ($broncodePerBestand as $naam => $bron) {
    $geziene[$naam] = true;
    $heeftSchrijvendeSql = (bool)preg_match('/\b(INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|REPLACE\s+INTO)\b/i', $bron);
    $roeptCsrfAan = in_array('security_require_csrf_token', $aanroepenPerBestand[$naam], true);
    $heeftEigenRoute = (bool)preg_match('/REQUEST_METHOD/', $bron);

    if (isset($geenCsrfNodig[$naam])) {
        $uitzondering = $geenCsrfNodig[$naam];
        if ($uitzondering['type'] === 'alleen-lezen') {
            $controle(
                !$heeftSchrijvendeSql,
                "{$naam} staat als \"alleen-lezen\" op de csrf-uitzonderingslijst (\"{$uitzondering['reden']}\") maar bevat schrijvende SQL -- de reden klopt niet meer, verwijder van de lijst en voeg security_require_csrf_token() toe."
            );
        } else {
            $controle(
                !$heeftEigenRoute,
                "{$naam} staat als \"gedeelde-schrijfbibliotheek\" op de csrf-uitzonderingslijst maar handelt zelf REQUEST_METHOD af -- dat is dan een eigen route en moet zelf security_require_csrf_token() aanroepen."
            );
            foreach ($uitzondering['aanroepers'] ?? [] as $aanroeper) {
                $controle(
                    isset($broncodePerBestand[$aanroeper]),
                    "{$naam} noemt {$aanroeper} als aanroeper, maar dat bestand bestaat niet (meer) in server/api."
                );
                if (isset($aanroepenPerBestand[$aanroeper])) {
                    $controle(
                        in_array('security_require_csrf_token', $aanroepenPerBestand[$aanroeper], true),
                        "{$naam} vertrouwt op {$aanroeper} voor csrf-afdwinging, maar {$aanroeper} roept security_require_csrf_token() niet (meer) aan."
                    );
                }
            }
        }
        continue;
    }

    $controle(
        $roeptCsrfAan,
        "{$naam} staat niet op de csrf-uitzonderingslijst en roept security_require_csrf_token() niet aan -- een nieuw of gewijzigd endpoint mist mogelijk csrf-bescherming."
    );
}

foreach (array_keys($geenCsrfNodig) as $naam) {
    $controle(isset($geziene[$naam]), "Uitzondering \"{$naam}\" staat op de lijst maar bestaat niet (meer) in server/api -- lijst opschonen.");
}

if ($fouten > 0) {
    exit(1);
}

echo 'csrf-endpoint-coverage-check: ' . (count($bestanden) - count($geenCsrfNodig)) . " endpoint(s) roepen security_require_csrf_token() aan, " . count($geenCsrfNodig) . " beredeneerde uitzondering(en) blijven alleen-lezen.\n";
