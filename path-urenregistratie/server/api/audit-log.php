<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';

header('Content-Type: application/json; charset=utf-8');
auth_apply_cors_headers(auth_try_load_raw_config(), 'GET, OPTIONS', 'Content-Type, X-CSRF-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') {
    auth_send_json(['ok' => false, 'error' => 'method-not-allowed'], 405);
}

$config      = auth_load_raw_config();
auth_start_session_secure($config);
$pdo         = auth_pdo($config);
$currentUser = auth_current_user($pdo);
auth_require_role(['administrator'], $currentUser);

$companyId = (int)$currentUser['company_id'];
$limit     = min(200, max(1, (int)($_GET['limit'] ?? 100)));

// Optional filters.
$entityType = isset($_GET['entity_type']) ? trim((string)$_GET['entity_type']) : null;
$entityId   = isset($_GET['entity_id'])   ? trim((string)$_GET['entity_id'])   : null;
$eventType  = isset($_GET['event_type'])  ? trim((string)$_GET['event_type'])  : null;

$sql = '
    SELECT
        al.id, al.actor_user_id, al.event_type, al.entity_type, al.entity_id,
        al.event_data, al.ip_hash, al.created_at,
        u.display_name AS actor_name, u.email AS actor_email
    FROM audit_log al
    LEFT JOIN users u ON u.id = al.actor_user_id
    WHERE al.company_id = :company_id
';
$params = [':company_id' => $companyId];

if ($entityType !== null && $entityType !== '') {
    $sql .= ' AND al.entity_type = :entity_type';
    $params[':entity_type'] = $entityType;
}
if ($entityId !== null && $entityId !== '') {
    $sql .= ' AND al.entity_id = :entity_id';
    $params[':entity_id'] = $entityId;
}
if ($eventType !== null && $eventType !== '') {
    $sql .= ' AND al.event_type = :event_type';
    $params[':event_type'] = $eventType;
}

$sql .= ' ORDER BY al.created_at DESC LIMIT ' . $limit;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

$items = array_map(static function (array $r): array {
    $data = null;
    if ($r['event_data'] !== null) {
        $decoded = json_decode((string)$r['event_data'], true);
        $data = is_array($decoded) ? $decoded : null;
    }
    return [
        'id'           => (int)$r['id'],
        'event_type'   => (string)$r['event_type'],
        'entity_type'  => (string)$r['entity_type'],
        'entity_id'    => (string)$r['entity_id'],
        'actor_id'     => $r['actor_user_id'] !== null ? (int)$r['actor_user_id'] : null,
        'actor_name'   => $r['actor_name'] !== null ? (string)$r['actor_name'] : null,
        'actor_email'  => $r['actor_email'] !== null ? (string)$r['actor_email'] : null,
        'event_data'   => $data,
        'created_at'   => (string)$r['created_at'],
    ];
}, $stmt->fetchAll());

auth_send_json(['ok' => true, 'count' => count($items), 'items' => $items]);
