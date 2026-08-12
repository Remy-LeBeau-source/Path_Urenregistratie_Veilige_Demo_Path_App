<?php

declare(strict_types=1);

require __DIR__ . '/session.php';
require __DIR__ . '/../security/csrf.php';
require __DIR__ . '/../security/validation.php';

auth_require_method('POST');

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);
$currentUser = auth_current_user($pdo);
security_require_csrf_token();

$input = security_read_json_body();
$currentPassword = security_require_string_field($input, 'current_password', 'current_password is required', 1024);
$newPassword = security_require_string_field($input, 'new_password', 'new_password is required', 1024);

if (strlen($newPassword) < 12) {
    auth_send_json([
        'ok' => false,
        'error' => 'password-too-short',
        'message' => 'Password must be at least 12 characters.',
    ], 400);
}
if (hash_equals($currentPassword, $newPassword)) {
    auth_send_json([
        'ok' => false,
        'error' => 'password-unchanged',
        'message' => 'New password must differ from the current password.',
    ], 400);
}

$stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id AND company_id = :company_id AND active = 1 LIMIT 1');
$stmt->execute([':id' => (int)$currentUser['id'], ':company_id' => (int)$currentUser['company_id']]);
$hash = $stmt->fetchColumn();
if (!is_string($hash) || $hash === '' || !password_verify($currentPassword, $hash)) {
    auth_send_json(['ok' => false, 'error' => 'invalid-current-password'], 401);
}

$newHash = password_hash($newPassword, PASSWORD_DEFAULT);
$pdo->beginTransaction();
try {
    $pdo->prepare('UPDATE users SET password_hash = :hash, force_password_change = 0 WHERE id = :id')
        ->execute([':hash' => $newHash, ':id' => (int)$currentUser['id']]);
    auth_log_event(
        $pdo,
        (int)$currentUser['company_id'],
        (int)$currentUser['id'],
        (string)$currentUser['email'],
        'login',
        'success',
        'password-changed'
    );
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    auth_send_json(['ok' => false, 'error' => 'password-change-failed'], 500);
}

session_regenerate_id(true);
auth_send_json(['ok' => true, 'message' => 'Password updated successfully.']);
