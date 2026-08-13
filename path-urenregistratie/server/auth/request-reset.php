<?php

declare(strict_types=1);

require __DIR__ . '/session.php';
require __DIR__ . '/../security/csrf.php';
require __DIR__ . '/../security/validation.php';
require __DIR__ . '/password-reset-service.php';

auth_require_method('POST');

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);

$input = security_read_json_body();
security_require_csrf_token();
$email = security_require_email_field($input, 'email');

// Always return ok=true to prevent email enumeration.
$stmt = $pdo->prepare('SELECT id, company_id, email, display_name, role, active FROM users WHERE email = :email LIMIT 1');
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if (!$user || (int)$user['active'] !== 1) {
    auth_send_json(auth_password_reset_public_response($config));
}

$reset = null;
try {
    // In production, do not create a token unless it can be queued atomically.
    if (auth_environment_from_config($config) !== 'production' || auth_password_reset_delivery_available($config)) {
        $reset = auth_create_password_reset($pdo, $user, $config);
    }
} catch (Throwable $error) {
    error_log('Password-reset request could not be queued: ' . $error->getMessage());
}

// Audit without logging the token itself.
auth_log_event($pdo, (int)$user['company_id'], (int)$user['id'], $email, 'login', 'success', 'password-reset-requested');

// Raw tokens are a local/test convenience only. Production always returns the
// same generic service-level response for known and unknown addresses.
auth_send_json(auth_password_reset_public_response(
    $config,
    $reset['token'] ?? null,
    $reset['expires_at'] ?? null
));
