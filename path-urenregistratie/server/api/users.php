<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../security/validation.php';
require_once __DIR__ . '/../auth/password-reset-service.php';

header('Content-Type: application/json; charset=utf-8');
auth_apply_cors_headers(auth_try_load_raw_config(), 'GET, POST, OPTIONS', 'Content-Type, X-CSRF-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config      = auth_load_raw_config();
auth_start_session_secure($config);
$pdo         = auth_pdo($config);
$currentUser = auth_current_user($pdo);
auth_require_role(['administrator'], $currentUser);

$companyId   = (int)$currentUser['company_id'];
$actorId     = (int)$currentUser['id'];
$method      = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

// ---------------------------------------------------------------------------
// GET – list all users in this company
// ---------------------------------------------------------------------------
if ($method === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT id, email, display_name, role, active, last_login_at, force_password_change, created_at
         FROM users
         WHERE company_id = :company_id
         ORDER BY role, display_name'
    );
    $stmt->execute([':company_id' => $companyId]);

    $users = array_map(static function (array $u): array {
        return [
            'id'                    => (int)$u['id'],
            'email'                 => (string)$u['email'],
            'display_name'          => (string)$u['display_name'],
            'role'                  => (string)$u['role'],
            'active'                => (bool)$u['active'],
            'force_password_change' => (bool)$u['force_password_change'],
            'last_login_at'         => $u['last_login_at'] ?? null,
            'created_at'            => (string)$u['created_at'],
        ];
    }, $stmt->fetchAll());

    auth_send_json(['ok' => true, 'count' => count($users), 'users' => $users]);
}

// ---------------------------------------------------------------------------
// POST – action=deactivate|reactivate|force_password_change
// ---------------------------------------------------------------------------
if ($method !== 'POST') {
    auth_send_json(['ok' => false, 'error' => 'method-not-allowed'], 405);
}

security_require_csrf_token();

$payload = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($payload)) {
    auth_send_json(['ok' => false, 'error' => 'invalid-json'], 400);
}

$action = trim((string)($payload['action'] ?? ''));
$targetIdRaw = $payload['user_id'] ?? null;

if (!is_numeric($targetIdRaw) || (int)$targetIdRaw <= 0) {
    auth_send_json(['ok' => false, 'error' => 'missing-user-id',
        'message' => 'user_id must be a positive integer'], 400);
}
$targetId = (int)$targetIdRaw;

if ($targetId === $actorId) {
    auth_send_json(['ok' => false, 'error' => 'cannot-modify-self',
        'message' => 'You cannot modify your own account via this endpoint.'], 409);
}

// Load target user — must be in same company.
$targetStmt = $pdo->prepare(
    'SELECT id, email, display_name, role, active, force_password_change
     FROM users WHERE id = :id AND company_id = :company_id LIMIT 1'
);
$targetStmt->execute([':id' => $targetId, ':company_id' => $companyId]);
$target = $targetStmt->fetch();

if (!$target) {
    auth_send_json(['ok' => false, 'error' => 'user-not-found'], 404);
}

if ($action === 'deactivate') {
    if (!(bool)$target['active']) {
        auth_send_json(['ok' => false, 'error' => 'already-inactive',
            'message' => 'User is already deactivated.'], 409);
    }

    $pdo->prepare('UPDATE users SET active = 0, deactivated_at = CURRENT_TIMESTAMP, deactivated_by = :by WHERE id = :id')
        ->execute([':by' => $actorId, ':id' => $targetId]);

    $pdo->prepare('INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
                   VALUES (:cid, :actor, :evt, :etype, :eid, :data)')
        ->execute([
            ':cid'   => $companyId, ':actor' => $actorId,
            ':evt'   => 'user.deactivated', ':etype' => 'user',
            ':eid'   => (string)$targetId,
            ':data'  => json_encode(['email' => $target['email'], 'role' => $target['role']]),
        ]);

    auth_send_json(['ok' => true, 'action' => 'deactivate', 'user_id' => $targetId]);
}

if ($action === 'reactivate') {
    if ((bool)$target['active']) {
        auth_send_json(['ok' => false, 'error' => 'already-active',
            'message' => 'User is already active.'], 409);
    }

    $pdo->prepare('UPDATE users SET active = 1, deactivated_at = NULL, deactivated_by = NULL WHERE id = :id')
        ->execute([':id' => $targetId]);

    $pdo->prepare('INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
                   VALUES (:cid, :actor, :evt, :etype, :eid, :data)')
        ->execute([
            ':cid'   => $companyId, ':actor' => $actorId,
            ':evt'   => 'user.reactivated', ':etype' => 'user',
            ':eid'   => (string)$targetId,
            ':data'  => json_encode(['email' => $target['email']]),
        ]);

    auth_send_json(['ok' => true, 'action' => 'reactivate', 'user_id' => $targetId]);
}

if ($action === 'force_password_change') {
    try {
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE users SET force_password_change = 1 WHERE id = :id')
            ->execute([':id' => $targetId]);
        $reset = auth_create_password_reset($pdo, $target, $config);
        if (auth_environment_from_config($config) === 'production'
            && (!$reset || (int)($reset['delivery_id'] ?? 0) <= 0)) {
            throw new RuntimeException('Password invitation could not be queued.');
        }

        $pdo->prepare('INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
                       VALUES (:cid, :actor, :evt, :etype, :eid, :data)')
            ->execute([
                ':cid'   => $companyId, ':actor' => $actorId,
                ':evt'   => 'user.force_password_change', ':etype' => 'user',
                ':eid'   => (string)$targetId,
                ':data'  => json_encode(['email' => $target['email']]),
            ]);
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        auth_send_json(['ok' => false, 'error' => 'password-invitation-failed'], 503);
    }

    auth_send_json([
        'ok' => true,
        'action' => 'force_password_change',
        'user_id' => $targetId,
        'invitation_queued' => (int)($reset['delivery_id'] ?? 0) > 0,
    ]);
}

auth_send_json(['ok' => false, 'error' => 'unknown-action',
    'message' => 'action must be one of: deactivate, reactivate, force_password_change'], 400);
