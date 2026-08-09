<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';

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
auth_require_role(['administrator', 'employee'], $currentUser);

$companyId = (int)$currentUser['company_id'];
$userId    = (int)$currentUser['id'];
$method    = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

// ---------------------------------------------------------------------------
// GET – list notifications for the current user (unread first)
// ---------------------------------------------------------------------------
if ($method === 'GET') {
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
    $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === '1';

    $sql = "
        SELECT n.id,
               n.period_id,
               n.announcement_id,
               n.notification_type,
               n.title,
               n.message,
               n.target_route,
               n.read_at,
               n.created_at,
               CONCAT(p.year, '-', LPAD(p.month, 2, '0')) AS period_key
        FROM notifications n
        LEFT JOIN periods p ON p.id = n.period_id
        WHERE n.company_id = :company_id AND n.user_id = :user_id
    ";
    if ($unreadOnly) {
        $sql .= ' AND n.read_at IS NULL';
    }
    $sql .= ' ORDER BY n.read_at IS NULL DESC, n.created_at DESC LIMIT ' . $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':company_id' => $companyId, ':user_id' => $userId]);

    $items = array_map(static function (array $r): array {
        return [
            'id'                => (int)$r['id'],
            'period_id'         => $r['period_id'] !== null ? (int)$r['period_id'] : null,
            'period_key'        => $r['period_key'] !== null ? (string)$r['period_key'] : null,
            'announcement_id'   => $r['announcement_id'] !== null ? (int)$r['announcement_id'] : null,
            'notification_type' => (string)$r['notification_type'],
            'title'             => (string)$r['title'],
            'message'           => (string)$r['message'],
            'target_route'      => $r['target_route'] ?? null,
            'read'              => $r['read_at'] !== null,
            'read_at'           => $r['read_at'] ?? null,
            'created_at'        => (string)$r['created_at'],
        ];
    }, $stmt->fetchAll());

    $unreadCount = count(array_filter($items, static fn($i) => !$i['read']));

    auth_send_json([
        'ok'           => true,
        'count'        => count($items),
        'unread_count' => $unreadOnly ? count($items) : $unreadCount,
        'items'        => $items,
    ]);
}

// ---------------------------------------------------------------------------
// POST – action=mark_read|mark_all_read
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

if ($action === 'mark_read') {
    $idRaw = $payload['notification_id'] ?? null;
    if (!is_numeric($idRaw) || (int)$idRaw <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-notification-id'], 400);
    }
    $notifId = (int)$idRaw;

    $upd = $pdo->prepare(
        'UPDATE notifications SET read_at = CURRENT_TIMESTAMP
         WHERE id = :id AND user_id = :uid AND company_id = :cid AND read_at IS NULL'
    );
    $upd->execute([':id' => $notifId, ':uid' => $userId, ':cid' => $companyId]);

    auth_send_json(['ok' => true, 'action' => 'mark_read', 'updated' => $upd->rowCount()]);
}

if ($action === 'mark_all_read') {
    $upd = $pdo->prepare(
        'UPDATE notifications SET read_at = CURRENT_TIMESTAMP
         WHERE user_id = :uid AND company_id = :cid AND read_at IS NULL'
    );
    $upd->execute([':uid' => $userId, ':cid' => $companyId]);

    auth_send_json(['ok' => true, 'action' => 'mark_all_read', 'updated' => $upd->rowCount()]);
}

if ($action === 'mark_announcement_read') {
    $announcementRaw = $payload['announcement_id'] ?? null;
    if (!is_numeric($announcementRaw) || (int)$announcementRaw <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-announcement-id'], 400);
    }
    $announcementId = (int)$announcementRaw;

    $upd = $pdo->prepare(
        'UPDATE notifications SET read_at = CURRENT_TIMESTAMP
         WHERE user_id = :uid AND company_id = :cid AND announcement_id = :announcement_id AND read_at IS NULL'
    );
    $upd->execute([
        ':uid' => $userId,
        ':cid' => $companyId,
        ':announcement_id' => $announcementId,
    ]);

    auth_send_json(['ok' => true, 'action' => 'mark_announcement_read', 'updated' => $upd->rowCount()]);
}

auth_send_json(['ok' => false, 'error' => 'unknown-action',
    'message' => 'action must be one of: mark_read, mark_all_read, mark_announcement_read'], 400);
