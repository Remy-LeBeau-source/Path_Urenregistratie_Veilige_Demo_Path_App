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
$email = security_require_email_field($input, 'email');
$password = security_require_string_field($input, 'password', 'Email and password are required.', 1024);

$stmt = $pdo->prepare(
    'SELECT id, company_id, email, display_name, role, active, password_hash FROM users WHERE email = :email LIMIT 1'
);
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if (!$user || (int)$user['active'] !== 1 || empty($user['password_hash']) || !password_verify($password, (string)$user['password_hash'])) {
    auth_log_event($pdo, isset($user['company_id']) ? (int)$user['company_id'] : null, isset($user['id']) ? (int)$user['id'] : null, $email, 'login', 'failed', 'invalid-credentials');
    auth_send_json([
        'ok' => false,
        'error' => 'invalid-credentials',
        'message' => 'Invalid email or password.',
    ], 401);
}

$role = (string)$user['role'];
if ($role !== 'administrator' && $role !== 'employee') {
    auth_log_event($pdo, (int)$user['company_id'], (int)$user['id'], (string)$user['email'], 'login', 'failed', 'role-not-allowed');
    auth_send_json([
        'ok' => false,
        'error' => 'role-not-allowed',
        'message' => 'Only administrator and employee roles are allowed in this auth phase.',
    ], 403);
}

if (password_needs_rehash((string)$user['password_hash'], PASSWORD_DEFAULT)) {
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id');
    $updateStmt->execute([
        ':password_hash' => $newHash,
        ':id' => (int)$user['id'],
    ]);
}

$touchStmt = $pdo->prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id');
$touchStmt->execute([':id' => (int)$user['id']]);

session_regenerate_id(true);
$_SESSION['auth'] = [
    'user_id' => (int)$user['id'],
    'company_id' => (int)$user['company_id'],
    'email' => (string)$user['email'],
    'display_name' => (string)$user['display_name'],
    'role' => $role,
    'logged_in_at' => gmdate('c'),
];

auth_log_event($pdo, (int)$user['company_id'], (int)$user['id'], (string)$user['email'], 'login', 'success');

auth_send_json([
    'ok' => true,
    'csrf_token' => security_csrf_token(),
    'user' => [
        'id' => (int)$user['id'],
        'company_id' => (int)$user['company_id'],
        'email' => (string)$user['email'],
        'display_name' => (string)$user['display_name'],
        'role' => $role,
    ],
]);
