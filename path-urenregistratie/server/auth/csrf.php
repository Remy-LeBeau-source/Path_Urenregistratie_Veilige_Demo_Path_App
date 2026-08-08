<?php

declare(strict_types=1);

require __DIR__ . '/session.php';
require __DIR__ . '/../security/csrf.php';

auth_require_method('GET');

$config = auth_load_raw_config();
auth_start_session_secure($config);

auth_send_json([
    'ok' => true,
    'csrf_token' => security_csrf_token(),
]);
