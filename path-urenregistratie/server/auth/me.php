<?php

declare(strict_types=1);

require __DIR__ . '/session.php';
require __DIR__ . '/../security/csrf.php';

auth_require_method('GET');

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);

$current = auth_current_user($pdo);
if (!$current) {
    auth_send_json([
        'ok' => true,
        'authenticated' => false,
        'user' => null,
        'csrf_token' => security_csrf_token(),
    ]);
}

auth_require_role(['administrator', 'employee'], $current);

// Load force_password_change flag directly; not in session to always reflect DB state.
$fpStmt = $pdo->prepare('SELECT force_password_change FROM users WHERE id = :id LIMIT 1');
$fpStmt->execute([':id' => (int)$current['id']]);
$fpRow = $fpStmt->fetch();
$forcePasswordChange = $fpRow ? (bool)$fpRow['force_password_change'] : false;

auth_log_event($pdo, (int)$current['company_id'], (int)$current['id'], (string)$current['email'], 'me', 'success');

auth_send_json([
    'ok' => true,
    'authenticated' => true,
    'csrf_token' => security_csrf_token(),
    'user' => [
        'id' => (int)$current['id'],
        'company_id' => (int)$current['company_id'],
        'email' => (string)$current['email'],
        'display_name' => (string)$current['display_name'],
        'role' => (string)$current['role'],
        'force_password_change' => $forcePasswordChange,
    ],
]);
