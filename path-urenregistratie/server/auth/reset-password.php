<?php

declare(strict_types=1);

require __DIR__ . '/session.php';
require __DIR__ . '/../security/csrf.php';
require __DIR__ . '/../security/validation.php';

auth_require_method('POST');

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);

$input = security_read_json_body();
security_require_csrf_token();

$rawToken    = security_require_string_field($input, 'token', 'token is required', 256);
$newPassword = security_require_string_field($input, 'new_password', 'new_password is required', 1024);

if (strlen($newPassword) < 8) {
    auth_send_json(['ok' => false, 'error' => 'password-too-short',
        'message' => 'Password must be at least 8 characters.'], 400);
}

$tokenHash = hash('sha256', $rawToken);

$stmt = $pdo->prepare(
    'SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.company_id, u.email, u.active
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = :hash
     LIMIT 1'
);
$stmt->execute([':hash' => $tokenHash]);
$row = $stmt->fetch();

if (!$row) {
    auth_send_json(['ok' => false, 'error' => 'invalid-token', 'message' => 'Invalid or expired reset token.'], 400);
}
if ($row['used_at'] !== null) {
    auth_send_json(['ok' => false, 'error' => 'token-already-used', 'message' => 'This reset token has already been used.'], 409);
}
if (new DateTimeImmutable('now', new DateTimeZone('UTC')) > new DateTimeImmutable((string)$row['expires_at'], new DateTimeZone('UTC'))) {
    auth_send_json(['ok' => false, 'error' => 'token-expired', 'message' => 'Reset token has expired. Request a new one.'], 409);
}
if ((int)$row['active'] !== 1) {
    auth_send_json(['ok' => false, 'error' => 'account-inactive', 'message' => 'Account is not active.'], 403);
}

$newHash = password_hash($newPassword, PASSWORD_DEFAULT);

$pdo->beginTransaction();
try {
    $pdo->prepare('UPDATE users SET password_hash = :hash, force_password_change = 0 WHERE id = :id')
        ->execute([':hash' => $newHash, ':id' => (int)$row['user_id']]);

    $pdo->prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = :id')
        ->execute([':id' => (int)$row['id']]);

    auth_log_event($pdo, (int)$row['company_id'], (int)$row['user_id'], (string)$row['email'],
        'login', 'success', 'password-reset-completed');

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    auth_send_json(['ok' => false, 'error' => 'reset-failed', 'message' => 'Could not update password.'], 500);
}

auth_send_json(['ok' => true, 'message' => 'Password updated successfully.']);
