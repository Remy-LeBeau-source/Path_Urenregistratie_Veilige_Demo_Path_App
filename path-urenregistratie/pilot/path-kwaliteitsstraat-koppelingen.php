<?php

declare(strict_types=1);

// Koppelingen: welke bron levert de tickets, documenten en testcases?
//
// Waarom dit bestaat: de kwaliteitsstraat draait nu op onze eigen administratie
// (GIO-WENSEN.md en de feature-bestanden, via pilot/path-kwaliteitsstraat-data.json).
// Een klant die zelf al Jira, Confluence of Zephyr gebruikt, wil dat niet
// dubbel bijhouden. Dit bestand is de ene plek die zegt WELKE bron geldt, zodat
// de pagina daar niets van hoeft te weten: hij vraagt het hier op en krijgt
// altijd hetzelfde antwoordformaat terug.
//
// Wat dit bestand BEWUST NIET doet: inloggegevens tonen. De pagina is openbaar
// en zonder inloggen bereikbaar; een API-token van een klant hoort daar nooit
// te komen. Het endpoint vertelt alleen WELKE koppeling aan staat en of hij
// bruikbaar is -- nooit waarmee. De echte aanroep naar een klantomgeving loopt
// straks via de server, met de gegevens uit server/config.local.php.
//
// Stand vandaag: alleen de eigen bron is operationeel. De klantkoppelingen zijn
// voorbereid (vorm, configuratie en wat we nodig hebben staat vast) maar nog niet
// aangesloten -- dat vraagt per klant echte gegevens en een afspraak.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/path-kwaliteitsstraat-intake-lib.php';

[$omgeving, ] = intake_omgeving_en_pad();

if ($omgeving === 'production') {
    http_response_code(404);
    echo json_encode(['error' => 'Deze demo-koppelingen bestaan alleen op TEST.']);
    exit;
}

/**
 * De ondersteunde bronnen, met per bron wat er van een klant nodig is voordat
 * hij aangezet kan worden. Die lijst staat hier en niet in een document, zodat
 * de pagina hem kan tonen en er geen twee versies van de waarheid ontstaan.
 *
 * @return array<string,array<string,mixed>>
 */
function koppeling_definities(): array
{
    return [
        'eigen' => [
            'label' => 'Path Kwaliteitsstraat (eigen)',
            'soort' => 'intern',
            'levert' => ['tickets', 'documenten', 'testcases'],
            'status' => 'operationeel',
            'toelichting' => 'De eigen administratie: wensen, besluiten en opleveringen uit de projectstand, met per case de techniek en het aantal assertions.',
            'benodigd' => [],
        ],
        'jira' => [
            'label' => 'Jira Cloud (klant)',
            'soort' => 'extern',
            'levert' => ['tickets'],
            'status' => 'voorbereid',
            'toelichting' => 'Haalt de backlog en de status van issues uit de Jira van de klant, zodat het bord dezelfde stand toont als hun eigen omgeving.',
            'benodigd' => [
                // Bewust zonder voorbeelddomein: elke omgevingsnaam die hier staat is
                // straks te verwarren met een echte klant, en dit antwoord is openbaar.
                'Basis-URL van hun Jira Cloud-omgeving',
                'Projectsleutel waar de wensen in horen te landen',
                'Een API-token van een serviceaccount, met het bijbehorende e-mailadres',
                'Welke rechten dat account krijgt: lezen is genoeg om te tonen, schrijven pas als wij ook issues mogen aanmaken',
            ],
        ],
        'confluence' => [
            'label' => 'Confluence Cloud (klant)',
            'soort' => 'extern',
            'levert' => ['documenten'],
            'status' => 'voorbereid',
            'toelichting' => 'Toont de kennisbankpagina\'s uit de ruimte van de klant in plaats van onze eigen vaste pagina\'s.',
            'benodigd' => [
                'Basis-URL van hun Confluence Cloud',
                'De ruimtesleutel waar de documentatie staat',
                'Een API-token van hetzelfde serviceaccount als Jira (Atlassian deelt dat)',
            ],
        ],
        'zephyr' => [
            'label' => 'Zephyr Scale (klant)',
            'soort' => 'extern',
            'levert' => ['testcases'],
            'status' => 'voorbereid',
            'toelichting' => 'Leest de testcases en hun laatste uitkomst uit Zephyr Scale, zodat Testbeheer hun eigen cyclus toont.',
            'benodigd' => [
                'Een eigen Zephyr Scale API-token (staat los van het Atlassian-token)',
                'De projectsleutel en, als ze die gebruiken, de testcyclus',
            ],
        ],
    ];
}

/**
 * Leest de ingestelde koppelingen uit server/config.local.php. Zonder instelling
 * geldt de eigen bron: een omgeving die niets heeft ingesteld hoort te werken,
 * niet leeg te blijven.
 *
 * @return array<string,mixed>
 */
function koppeling_instellingen(): array
{
    $configPad = __DIR__ . '/../server/config.local.php';
    $config = is_file($configPad) ? include $configPad : [];
    if (!is_array($config)) {
        $config = [];
    }
    $blok = $config['kwaliteitsstraat']['koppelingen'] ?? [];

    return is_array($blok) ? $blok : [];
}

$definities = koppeling_definities();
$instellingen = koppeling_instellingen();

$bronnen = [];
foreach ($definities as $sleutel => $definitie) {
    $ingesteld = is_array($instellingen[$sleutel] ?? null) ? $instellingen[$sleutel] : [];
    $aan = ($ingesteld['enabled'] ?? false) === true;
    // Een externe koppeling telt pas als bruikbaar zodra hij aan staat én er een
    // basis-URL bekend is. De waarde zelf gaat nooit mee naar buiten: alleen of
    // hij er is. Zo kan de pagina eerlijk tonen wat er klaarstaat zonder dat een
    // voorbijganger de omgeving van een klant leert kennen.
    $heeftBasis = is_string($ingesteld['base_url'] ?? null) && trim((string)$ingesteld['base_url']) !== '';
    $heeftToken = is_string($ingesteld['token'] ?? null) && trim((string)$ingesteld['token']) !== '';

    $bronnen[] = [
        'sleutel' => $sleutel,
        'label' => $definitie['label'],
        'soort' => $definitie['soort'],
        'levert' => $definitie['levert'],
        'toelichting' => $definitie['toelichting'],
        'benodigd' => $definitie['benodigd'],
        'status' => $definitie['soort'] === 'intern'
            ? 'operationeel'
            : ($aan && $heeftBasis && $heeftToken ? 'gekoppeld' : ($aan ? 'onvolledig ingesteld' : 'voorbereid')),
    ];
}

echo json_encode([
    'environment' => $omgeving,
    'actief' => 'eigen',
    'bronnen' => $bronnen,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
