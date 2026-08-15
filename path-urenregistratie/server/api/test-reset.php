<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../security/validation.php';
require_once __DIR__ . '/../lib/test-reset.php';

header('Content-Type: application/json; charset=utf-8');
auth_apply_cors_headers(auth_try_load_raw_config(), 'POST, OPTIONS', 'Content-Type, X-CSRF-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    auth_send_json(['ok' => false, 'error' => 'not-found'], 404);
}

$config = auth_load_raw_config();
if (!test_reset_is_available($config, (string)($_SERVER['HTTP_HOST'] ?? ''))) {
    auth_send_json(['ok' => false, 'error' => 'not-found'], 404);
}

auth_start_session_secure($config);
$pdo = auth_pdo($config);
$currentUser = auth_current_user($pdo);
auth_require_role(['administrator'], $currentUser);
security_require_csrf_token();
$payload = security_read_json_body();
if (!hash_equals('RESET_SHARED_TEST_BASELINE', (string)($payload['confirm'] ?? ''))) {
    auth_send_json([
        'ok' => false,
        'error' => 'explicit-confirmation-required',
        'message' => 'Bevestig expliciet dat de gedeelde TEST-baseline mag worden hersteld.',
    ], 409);
}

try {
    $summary = test_reset_shared_baseline($pdo, $config, (string)$currentUser['email']);
    auth_send_json(['ok' => true, 'reset' => $summary]);
} catch (Throwable $error) {
    error_log('Shared TEST reset failed: ' . $error->getMessage());
    auth_send_json([
        'ok' => false,
        'error' => 'test-reset-failed',
        'message' => 'De gedeelde TEST-gegevens konden niet veilig worden hersteld.',
    ], 500);
}
