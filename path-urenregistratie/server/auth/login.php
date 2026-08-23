<?php

declare(strict_types=1);

require __DIR__ . '/session.php';
require __DIR__ . '/../security/csrf.php';
require __DIR__ . '/../security/validation.php';

auth_require_method('POST');

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);

function auth_maybe_log_failed_login_alert(PDO $pdo, ?int $companyId, string $email): void
{
    if ($companyId === null || $companyId <= 0 || $email === '') {
        return;
    }

    try {
        $countStmt = $pdo->prepare(
            "SELECT COUNT(*) FROM auth_login_audit
             WHERE email = :email AND status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)"
        );
        $countStmt->execute([':email' => $email]);
        $failedCount = (int)$countStmt->fetchColumn();
        if ($failedCount < 3) {
            return;
        }

        $recentStmt = $pdo->prepare(
            "SELECT COUNT(*) FROM audit_log
             WHERE company_id = :company_id
               AND event_type = 'auth.failed_login_threshold'
               AND entity_type = 'security'
               AND entity_id = :entity_id
               AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)"
        );
        $recentStmt->execute([
            ':company_id' => $companyId,
            ':entity_id' => $email,
        ]);
        if ((int)$recentStmt->fetchColumn() > 0) {
            return;
        }

        $insertStmt = $pdo->prepare(
            'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
             VALUES (:company_id, NULL, :event_type, :entity_type, :entity_id, :event_data)'
        );
        $insertStmt->execute([
            ':company_id' => $companyId,
            ':event_type' => 'auth.failed_login_threshold',
            ':entity_type' => 'security',
            ':entity_id' => $email,
            ':event_data' => json_encode([
                'email' => $email,
                'failed_count' => $failedCount,
                'window_minutes' => 15,
            ], JSON_UNESCAPED_UNICODE),
        ]);
    } catch (Throwable $e) {
        // Alert logging must never block login.
    }
}

$input = security_read_json_body();
security_require_csrf_token();
$email = security_require_email_field($input, 'email');
$password = security_require_string_field($input, 'password', 'Email and password are required.', 1024);

// Rate-limit: max 5 failed attempts per email in 15 minutes.
try {
    $rlStmt = $pdo->prepare(
        "SELECT COUNT(*) AS failed_count,
                COALESCE(
                    GREATEST(1, TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(MIN(created_at), INTERVAL 15 MINUTE))),
                    900
                ) AS retry_after_seconds
         FROM auth_login_audit
         WHERE email = :email AND status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)"
    );
    $rlStmt->execute([':email' => $email]);
    $rateLimit = $rlStmt->fetch() ?: [];
    if ((int)($rateLimit['failed_count'] ?? 0) >= 5) {
        $retryAfterSeconds = max(1, min(900, (int)($rateLimit['retry_after_seconds'] ?? 900)));
        header('Retry-After: ' . $retryAfterSeconds);
        auth_send_json([
            'ok' => false,
            'error' => 'too-many-attempts',
            'message' => 'Te veel mislukte inlogpogingen. Probeer het over 15 minuten opnieuw.',
            'retry_after_seconds' => $retryAfterSeconds,
        ], 429);
    }
} catch (Throwable $rlErr) {
    // Rate limit check must never block login on DB error.
}

$stmt = $pdo->prepare(
    'SELECT id, company_id, email, display_name, role, active, password_hash, force_password_change FROM users WHERE email = :email LIMIT 1'
);
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if (!$user || (int)$user['active'] !== 1 || empty($user['password_hash']) || !password_verify($password, (string)$user['password_hash'])) {
    auth_log_event($pdo, isset($user['company_id']) ? (int)$user['company_id'] : null, isset($user['id']) ? (int)$user['id'] : null, $email, 'login', 'failed', 'invalid-credentials');
    auth_maybe_log_failed_login_alert($pdo, isset($user['company_id']) ? (int)$user['company_id'] : null, $email);
    auth_send_json([
        'ok' => false,
        'error' => 'invalid-credentials',
        'message' => 'E-mailadres of wachtwoord is onjuist.',
    ], 401);
}

$role = (string)$user['role'];
if ($role !== 'administrator' && $role !== 'employee') {
    auth_log_event($pdo, (int)$user['company_id'], (int)$user['id'], (string)$user['email'], 'login', 'failed', 'role-not-allowed');
    auth_send_json([
        'ok' => false,
        'error' => 'role-not-allowed',
        'message' => 'Alleen de rollen beheerder en medewerker kunnen inloggen.',
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
        'force_password_change' => (bool)($user['force_password_change'] ?? false),
    ],
]);
