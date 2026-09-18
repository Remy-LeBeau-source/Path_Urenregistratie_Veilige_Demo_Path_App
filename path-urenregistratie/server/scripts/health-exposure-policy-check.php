<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';

// 18 sep: server/health.php gaf op TEST zonder inloggen de PHP-versie, de
// databasehostnaam en de databasenaam aan iedereen (gemeld door de
// herontwerp-sessie). Sindsdien krijgt alleen een loopback-verzoek
// (REMOTE_ADDR 127.0.0.1/::1) die twee gevoelige velden mee; elk ander
// verzoek behoudt wel de volledige checks-structuur (elke 'ok'-vlag blijft
// staan), want scripts/deploy-test-remote.sh vraagt health.php juist via het
// PUBLIEKE testdomein op en leest is_array($payload['checks']) -- die
// structuur mag dus nooit verdwijnen, alleen de twee gevoelige velden erin.
//
// Dit kan niet via een gewone HTTP-testaanroep bewezen worden: elke
// Playwright-request tegen de lokale PHP-server komt zelf altijd van
// 127.0.0.1, dus het niet-loopback-pad is met een echt verzoek niet te
// bereiken. Dit script simuleert REMOTE_ADDR rechtstreeks (twee losse
// PHP-processen, want health.php roept zelf exit() aan) om beide paden
// daadwerkelijk uit te voeren in plaats van alleen te beredeneren.

$source = file_get_contents(__DIR__ . '/../health.php') ?: '';

$fouten = 0;
$controle = function (bool $conditie, string $melding) use (&$fouten): void {
    if (!$conditie) {
        fwrite(STDERR, "FOUT: {$melding}\n");
        $fouten++;
    }
};

// Statische controle vooraf: de beslissing mag nooit een header lezen (met
// één header te vervalsen), alleen de echte TCP-oorsprong. Zoekt naar de
// PHP-arraytoegang zelf, niet naar de term in commentaar -- anders zou de
// toelichting hierboven, die juist uitlegt waarom dat niet gebeurt, zichzelf
// als fout aanmerken.
$controle(
    !str_contains($source, "\$_SERVER['HTTP_X_FORWARDED_FOR']") && !str_contains($source, '$_SERVER["HTTP_X_FORWARDED_FOR"]'),
    'health.php mag $_SERVER[\'HTTP_X_FORWARDED_FOR\'] niet lezen voor de loopback-beslissing (met één header te vervalsen).'
);

function health_exposure_run(string $remoteAddr): array
{
    $script = tempnam(sys_get_temp_dir(), 'health-exposure-');
    file_put_contents($script, sprintf(
        '<?php chdir(%s); $_SERVER["REMOTE_ADDR"] = %s; include "health.php";',
        var_export(dirname(__DIR__), true),
        var_export($remoteAddr, true)
    ));
    $result = shell_exec('php ' . escapeshellarg($script));
    unlink($script);
    $payload = json_decode((string)$result, true);
    if (!is_array($payload)) {
        throw new RuntimeException("health.php gaf geen geldige JSON terug voor REMOTE_ADDR={$remoteAddr}: " . substr((string)$result, 0, 200));
    }
    return $payload;
}

foreach (['127.0.0.1', '::1'] as $loopback) {
    $payload = health_exposure_run($loopback);
    $controle(isset($payload['php_version']), "Een loopback-verzoek ({$loopback}) hoort php_version te zien.");
    $controle(
        isset($payload['checks']['database_connection']['host']) && isset($payload['checks']['database_connection']['database']),
        "Een loopback-verzoek ({$loopback}) hoort de databasehostnaam en -naam te zien."
    );
}

foreach (['203.0.113.5', '198.51.100.7'] as $extern) {
    $payload = health_exposure_run($extern);
    $controle(!isset($payload['php_version']), "Een niet-loopback-verzoek ({$extern}) mag php_version niet zien.");
    $controle(
        !isset($payload['checks']['database_connection']['host']) && !isset($payload['checks']['database_connection']['database']),
        "Een niet-loopback-verzoek ({$extern}) mag de databasehostnaam en -naam niet zien."
    );
    // De structuur zelf blijft staan: scripts/deploy-test-remote.sh leest dit
    // via het publieke testdomein (dus niet-loopback) en loopt elke 'ok' na.
    $controle(
        isset($payload['checks']) && is_array($payload['checks']) && count($payload['checks']) > 5,
        "Een niet-loopback-verzoek ({$extern}) hoort de volledige checks-structuur te behouden, alleen zonder de gevoelige velden."
    );
    $controle(
        isset($payload['checks']['database_connection']['ok']) && $payload['checks']['database_connection']['ok'] === true,
        "Een niet-loopback-verzoek ({$extern}) hoort de ok-vlag van database_connection nog gewoon te zien."
    );
}

if ($fouten > 0) {
    exit(1);
}

echo "health-exposure-policy-check: loopback ziet php_version en DB-details, elders alleen de checks-structuur zonder die twee velden.\n";
