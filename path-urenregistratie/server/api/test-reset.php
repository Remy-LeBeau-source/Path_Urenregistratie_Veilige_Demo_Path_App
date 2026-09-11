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
// Shared TEST reset is safe for any authenticated role: it never touches PROD
// and test_reset_is_available() already restricts this endpoint to the TEST host.
auth_require_role(['administrator', 'employee'], $currentUser);
security_require_csrf_token();
$payload = security_read_json_body();
$action = (string)($payload['action'] ?? 'reset_shared_baseline');

// Tweede, smallere actie op hetzelfde TEST-only gate: een niet-vergrendelde
// conceptfactuur neerzetten voor één urenstaat. De echte app kent geen pad
// dat deze toestand oplevert (zie test_seed_unlocked_invoice_concept()), dus
// TEST-E2E-27 kan hem anders alleen beredeneren, niet bewijzen.
if ($action === 'seed_unlocked_invoice_concept') {
    if (!hash_equals('SEED_TEST_UNLOCKED_INVOICE', (string)($payload['confirm'] ?? ''))) {
        auth_send_json([
            'ok' => false,
            'error' => 'explicit-confirmation-required',
            'message' => 'Bevestig expliciet dat een niet-vergrendelde TEST-conceptfactuur mag worden neergezet.',
        ], 409);
    }
    $timesheetId = (int)($payload['timesheet_id'] ?? 0);
    if ($timesheetId <= 0) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-timesheet-id',
            'message' => 'timesheet_id is verplicht en moet positief zijn.',
        ], 400);
    }
    try {
        $seeded = test_seed_unlocked_invoice_concept($pdo, $timesheetId);
        auth_send_json(['ok' => true, 'seeded' => $seeded]);
    } catch (Throwable $error) {
        error_log('TEST seed (unlocked invoice concept) failed: ' . $error->getMessage());
        auth_send_json([
            'ok' => false,
            'error' => 'test-seed-failed',
            'message' => 'De TEST-conceptfactuur kon niet worden neergezet: ' . $error->getMessage(),
        ], 500);
    }
}

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
