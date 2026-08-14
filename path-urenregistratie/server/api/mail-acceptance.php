<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../mail/acceptance.php';

header('Content-Type: application/json; charset=utf-8');
auth_apply_cors_headers(auth_try_load_raw_config(), 'GET, POST, OPTIONS', 'Content-Type, X-CSRF-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);
$currentUser = auth_current_user($pdo);
auth_require_role(['administrator'], $currentUser);

$companyId = (int)$currentUser['company_id'];
$actorUserId = (int)$currentUser['id'];
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    auth_send_json(array_merge(['ok' => true], mail_acceptance_status($pdo, $companyId, $config)));
}

if ($method !== 'POST') {
    auth_send_json(['ok' => false, 'error' => 'method-not-allowed'], 405);
}

security_require_csrf_token();
$payload = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($payload)) {
    auth_send_json(['ok' => false, 'error' => 'invalid-json'], 400);
}
if (!hash_equals('SEND_ONE_ACCEPTANCE_MAIL', (string)($payload['confirm'] ?? ''))) {
    auth_send_json([
        'ok' => false,
        'error' => 'explicit-confirmation-required',
        'message' => 'Bevestig expliciet dat precies één acceptatiemail mag worden verzonden.',
    ], 409);
}

$scenario = trim((string)($payload['scenario'] ?? ''));
try {
    $result = mail_acceptance_send($pdo, $companyId, $actorUserId, $config, $scenario);
} catch (InvalidArgumentException $error) {
    auth_send_json(['ok' => false, 'error' => 'unknown-scenario', 'message' => 'Onbekend acceptatiescenario.'], 400);
} catch (RuntimeException $error) {
    $message = $error->getMessage();
    $status = str_contains($message, 'rate-limit') ? 429 : 409;
    auth_send_json(['ok' => false, 'error' => 'acceptance-send-blocked', 'message' => $message], $status);
} catch (Throwable $error) {
    auth_send_json([
        'ok' => false,
        'error' => 'acceptance-send-failed',
        'message' => 'De acceptatiemail is niet verzonden. Controleer de serverlog en e-mailhistorie.',
    ], 500);
}

if (($result['outcome'] ?? '') !== 'sent') {
    auth_send_json([
        'ok' => false,
        'error' => 'smtp-not-accepted',
        'message' => 'Google SMTP Relay heeft de acceptatiemail niet als verzonden bevestigd.',
        'result' => $result,
    ], 502);
}

auth_send_json(['ok' => true, 'result' => $result]);
