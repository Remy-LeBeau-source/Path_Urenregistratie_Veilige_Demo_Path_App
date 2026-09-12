<?php

declare(strict_types=1);

/**
 * Recente serverfouten inzien vanuit de app zelf (Instellingen > Systeem),
 * in plaats van uitsluitend via SSH in het logbestand op de server.
 *
 * Leest uitsluitend de staart van het al bestaande foutenlogbestand
 * (server/auth/session.php, auth_configure_runtime_logging()) en de eventueel
 * al geroteerde bestanden ernaast (server/scripts/rotate-logs.php roteert bij
 * 10MB en bewaart 30 dagen -- dat bestaande beleid verandert hier niets aan,
 * dit scherm toont alleen wat er al op schijf staat). Geen eigen bewaartermijn,
 * geen datumfilter: er staat toch nooit meer dan de bestaande 30 dagen.
 */

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';

header('Content-Type: application/json; charset=utf-8');
auth_apply_cors_headers(auth_try_load_raw_config(), 'GET, OPTIONS', 'Content-Type, X-CSRF-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') {
    auth_send_json(['ok' => false, 'error' => 'method-not-allowed'], 405);
}

$config      = auth_load_raw_config();
auth_start_session_secure($config);
$pdo         = auth_pdo($config);
$currentUser = auth_current_user($pdo);
auth_require_role(['administrator'], $currentUser);

/**
 * Zelfde padresolutie als auth_configure_runtime_logging() (server/auth/
 * session.php) -- dat bepaalt waar de lopende applicatie daadwerkelijk naar
 * schrijft, dus dit scherm moet exact daar lezen, niet een eigen aanname
 * over de locatie maken.
 */
function server_log_resolve_primary_path(array $config): string
{
    $logging = isset($config['logging']) && is_array($config['logging']) ? $config['logging'] : [];
    $path = trim((string)($logging['error_log'] ?? ''));
    if ($path === '') {
        $path = dirname(__DIR__, 2) . '/../path-private/logs/php-error.log';
    }
    return $path;
}

/**
 * De actuele logbestandnaam plus alle geroteerde bestanden ernaast
 * (rotate-logs.php hernoemt naar "<bestand>.<Ymd-His>" bij rotatie), meest
 * recent eerst -- zodat "verder terug" vanzelf in de geschiedenis doorloopt
 * zonder dat dit scherm zelf iets over rotatie hoeft te weten.
 *
 * @return list<string>
 */
function server_log_candidate_files(string $primaryPath): array
{
    $files = [];
    if (is_file($primaryPath)) {
        $files[] = $primaryPath;
    }
    $rotated = glob($primaryPath . '.*') ?: [];
    usort($rotated, static fn(string $a, string $b): int => filemtime($b) <=> filemtime($a));
    return [...$files, ...$rotated];
}

// Harde bovengrens ongeacht wat er wordt opgevraagd: dit is een noodscherm
// voor "er ging net iets mis", geen logaggregator. Bij twijfel naar meer
// historie kijken blijft SSH het juiste gereedschap.
const SERVER_LOG_MAX_LINES_SCANNED = 5000;

$limit = min(500, max(1, (int)($_GET['limit'] ?? 200)));
$offset = max(0, (int)($_GET['offset'] ?? 0));

$primaryPath = server_log_resolve_primary_path($config);
$candidates = server_log_candidate_files($primaryPath);

$allLines = [];
foreach ($candidates as $file) {
    if (count($allLines) >= SERVER_LOG_MAX_LINES_SCANNED) {
        break;
    }
    $contents = @file_get_contents($file);
    if ($contents === false || $contents === '') {
        continue;
    }
    $lines = preg_split('/\R/', rtrim($contents, "\r\n"));
    if (!is_array($lines)) {
        continue;
    }
    // Binnen één bestand staat de nieuwste regel onderaan (append-only log).
    $allLines = [...$allLines, ...array_reverse($lines)];
}

$total = count($allLines);
$page = array_slice($allLines, $offset, $limit);

auth_send_json([
    'ok' => true,
    'log_file' => basename($primaryPath),
    'total_scanned' => $total,
    'offset' => $offset,
    'limit' => $limit,
    'count' => count($page),
    'has_more' => ($offset + count($page)) < $total,
    'lines' => $page,
]);
