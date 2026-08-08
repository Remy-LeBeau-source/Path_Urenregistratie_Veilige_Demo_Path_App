<?php

declare(strict_types=1);

require __DIR__ . '/session.php';
require __DIR__ . '/../security/csrf.php';

auth_require_method('POST');

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);

security_require_csrf_token();

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
