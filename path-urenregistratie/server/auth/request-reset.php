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

// Always return ok=true to prevent email enumeration.
$stmt = $pdo->prepare('SELECT id, company_id, active FROM users WHERE email = :email LIMIT 1');
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if (!$user || (int)$user['active'] !== 1) {
    auth_send_json(['ok' => true, 'dry_run' => true]);
}

// Revoke any existing unused tokens for this user.
$pdo->prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = :uid AND used_at IS NULL')
    ->execute([':uid' => (int)$user['id']]);

// Generate cryptographically secure token; store only its SHA-256 hash.
$rawToken   = bin2hex(random_bytes(32));
$tokenHash  = hash('sha256', $rawToken);
$expiresAt  = (new DateTimeImmutable('+2 hours', new DateTimeZone('UTC')))->format('Y-m-d H:i:s');

$pdo->prepare(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (:uid, :hash, :exp)'
)->execute([':uid' => (int)$user['id'], ':hash' => $tokenHash, ':exp' => $expiresAt]);

// Audit without logging the token itself.
auth_log_event($pdo, (int)$user['company_id'], (int)$user['id'], $email, 'login', 'success', 'password-reset-requested');

// dry_run = true unless mail is explicitly enabled in config.
// Token is returned in response only in dry-run so tests/demo can proceed without a real mailer.
$isDryRun = !(bool)($config['mail']['enabled'] ?? false);

// In demo/dev: return token so tests can proceed without a real mailer.
// In production: remove 'token' from response and queue the email instead.
$response = ['ok' => true, 'dry_run' => $isDryRun, 'expires_at' => $expiresAt];
if ($isDryRun) {
    $response['token'] = $rawToken;
}

auth_send_json($response);
