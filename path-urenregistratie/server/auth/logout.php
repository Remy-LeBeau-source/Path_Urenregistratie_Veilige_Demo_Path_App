<?php

declare(strict_types=1);

require __DIR__ . '/session.php';

auth_require_method('POST');

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);

$current = auth_session_user();
if ($current) {
    auth_log_event(
        $pdo,
        isset($current['company_id']) ? (int)$current['company_id'] : null,
        isset($current['user_id']) ? (int)$current['user_id'] : null,
        (string)($current['email'] ?? ''),
        'logout',
        'success'
    );
}

auth_clear_session();

auth_send_json([
    'ok' => true,
    'message' => 'Logged out.',
]);
