<?php

declare(strict_types=1);

// Hulpfuncties voor de intakewachtrij van de demo-pagina. Dit bestand doet zelf
// niets: het definieert alleen. Zo kan een test de resolutie van omgeving en
// opslagpad opvragen zonder een verzoek af te vuren:
//
//   php -r "require 'pilot/path-pipeline-intake-lib.php'; echo intake_omgeving_en_pad()[1];"
//
// De afhandeling van het verzoek staat in path-pipeline-intake.php ernaast.

require_once __DIR__ . '/../server/lib/health_policy.php';

const INTAKE_MAX_WENSEN = 50;
const INTAKE_MAX_BODY_BYTES = 4096;
const INTAKE_MAX_PER_IP = 5;
const INTAKE_IP_VENSTER_SECONDEN = 900;
const INTAKE_MAX_TOTAAL = 30;
const INTAKE_TOTAAL_VENSTER_SECONDEN = 3600;
const INTAKE_EERSTE_NUMMER = 200;

/**
 * Omgeving en opslagpad van de wachtrij.
 *
 * De omgeving komt uit server/config.local.php, met PATH_APP_ENVIRONMENT als
 * voorrang -- dezelfde volgorde die server/health.php aanhoudt, zodat er maar
 * een manier is om dit te bepalen. path_health_environment() geeft 'production'
 * terug als er niets staat, dus de veilige uitkomst is ook de standaarduitkomst.
 *
 * @return array{0: string, 1: string}
 */
function intake_omgeving_en_pad(): array
{
    $configPad = __DIR__ . '/../server/config.local.php';
    $config = is_file($configPad) ? include $configPad : [];
    if (!is_array($config)) {
        $config = [];
    }

    $uitOmgevingsvariabele = getenv('PATH_APP_ENVIRONMENT');
    $omgeving = $uitOmgevingsvariabele !== false && trim((string)$uitOmgevingsvariabele) !== ''
        ? strtolower(trim((string)$uitOmgevingsvariabele))
        : path_health_environment($config);

    // Op TEST staat private_root buiten de webroot; daar hoort de wachtrij ook,
    // want hij is dan alleen via dit endpoint te lezen en niet als los bestand op
    // te vragen. Lokaal (omgeving 'development') bestaat private_root niet, dan
    // valt hij terug op de tijdelijke map van het systeem.
    $privateRoot = $config['storage']['private_root'] ?? '';
    $map = is_string($privateRoot) && $privateRoot !== '' && is_dir($privateRoot)
        ? $privateRoot
        : sys_get_temp_dir();

    return [$omgeving, rtrim($map, "/\\") . '/path-pipeline-intake.json'];
}

function intake_lege_wachtrij(): array
{
    return ['version' => 1, 'sequence' => INTAKE_EERSTE_NUMMER, 'wishes' => []];
}

function intake_lees(string $pad): array
{
    if (!is_file($pad)) {
        return intake_lege_wachtrij();
    }
    $ruw = file_get_contents($pad);
    if ($ruw === false || trim($ruw) === '') {
        return intake_lege_wachtrij();
    }

    return intake_uit_json($ruw);
}

function intake_uit_json(string $ruw): array
{
    $data = json_decode($ruw, true);
    if (!is_array($data) || !isset($data['wishes']) || !is_array($data['wishes'])) {
        return intake_lege_wachtrij();
    }
    $data['sequence'] = isset($data['sequence']) ? (int)$data['sequence'] : INTAKE_EERSTE_NUMMER;

    return $data;
}

/** Haalt weg wat alleen voor de snelheidslimiet bestaat en nooit naar buiten hoort. */
function intake_publieke_wensen(array $wachtrij): array
{
    $wensen = [];
    foreach ($wachtrij['wishes'] as $wens) {
        if (!is_array($wens)) {
            continue;
        }
        unset($wens['ip_hash']);
        $wensen[] = $wens;
    }

    return $wensen;
}

/** Een regel tekst: geen stuurtekens, geen eindeloze lengte, geen HTML-interpretatie. */
function intake_tekst(mixed $waarde, int $maxTekens): string
{
    $tekst = is_string($waarde) ? $waarde : '';
    $tekst = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $tekst) ?? '';
    $tekst = trim($tekst);
    if (function_exists('mb_substr')) {
        return mb_substr($tekst, 0, $maxTekens, 'UTF-8');
    }

    return substr($tekst, 0, $maxTekens);
}

/**
 * Nooit het IP-adres zelf bewaren: de wachtrij is leesbaar en een IP-adres is een
 * persoonsgegeven. Een korte hash is genoeg om mee te tellen.
 */
function intake_ip_sleutel(string $ip): string
{
    return substr(hash('sha256', 'path-pipeline-intake|' . $ip), 0, 16);
}

/** @return string|null foutmelding, of null als het mag */
function intake_limiet_overschreden(array $wachtrij, string $ipSleutel, int $nu): ?string
{
    $vanDitIp = 0;
    $totaal = 0;
    foreach ($wachtrij['wishes'] as $wens) {
        if (!is_array($wens)) {
            continue;
        }
        $tijd = isset($wens['submitted_ts']) ? (int)$wens['submitted_ts'] : 0;
        if ($nu - $tijd < INTAKE_TOTAAL_VENSTER_SECONDEN) {
            $totaal++;
        }
        if (($wens['ip_hash'] ?? '') === $ipSleutel && $nu - $tijd < INTAKE_IP_VENSTER_SECONDEN) {
            $vanDitIp++;
        }
    }
    if ($vanDitIp >= INTAKE_MAX_PER_IP) {
        return 'Er zijn net al ' . INTAKE_MAX_PER_IP . ' wensen vanaf deze plek ingediend. Probeer het over een kwartier opnieuw.';
    }
    if ($totaal >= INTAKE_MAX_TOTAAL) {
        return 'De demo-wachtrij zit vol voor dit uur. Probeer het later opnieuw.';
    }

    return null;
}
