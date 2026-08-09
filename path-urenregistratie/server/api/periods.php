<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../security/validation.php';

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
// GET – list periods with timesheet summary counts
// ---------------------------------------------------------------------------
if ($method === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT
            p.id, p.year, p.month, p.status, p.closed_at, p.created_at,
            u.display_name AS closed_by_name,
            COUNT(t.id) AS timesheet_count,
            SUM(CASE WHEN t.status = "approved"  THEN 1 ELSE 0 END) AS approved_count,
            SUM(CASE WHEN t.status = "invoiced"  THEN 1 ELSE 0 END) AS invoiced_count,
            SUM(CASE WHEN t.status IN ("draft","submitted","correction") THEN 1 ELSE 0 END) AS open_count
         FROM periods p
         LEFT JOIN users u ON u.id = p.closed_by
         LEFT JOIN timesheets t ON t.period_id = p.id
         WHERE p.company_id = :company_id
         GROUP BY p.id
         ORDER BY p.year DESC, p.month DESC
         LIMIT 60'
    );
    $stmt->execute([':company_id' => $companyId]);

    $periods = array_map(static function (array $r): array {
        return [
            'id'              => (int)$r['id'],
            'year'            => (int)$r['year'],
            'month'           => (int)$r['month'],
            'period_key'      => sprintf('%d-%02d', (int)$r['year'], (int)$r['month']),
            'status'          => (string)$r['status'],
            'closed_at'       => $r['closed_at'] ?? null,
            'closed_by_name'  => $r['closed_by_name'] ?? null,
            'timesheet_count' => (int)$r['timesheet_count'],
            'approved_count'  => (int)$r['approved_count'],
            'invoiced_count'  => (int)$r['invoiced_count'],
            'open_count'      => (int)$r['open_count'],
            'created_at'      => (string)$r['created_at'],
        ];
    }, $stmt->fetchAll());

    auth_send_json(['ok' => true, 'count' => count($periods), 'periods' => $periods]);
}

// ---------------------------------------------------------------------------
// POST – action=close|reopen
// ---------------------------------------------------------------------------
if ($method !== 'POST') {
    auth_send_json(['ok' => false, 'error' => 'method-not-allowed'], 405);
}

security_require_csrf_token();

$payload = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($payload)) {
    auth_send_json(['ok' => false, 'error' => 'invalid-json'], 400);
}

$action    = trim((string)($payload['action'] ?? ''));
$periodKey = trim((string)($payload['period_key'] ?? ''));

if (!preg_match('/^(\d{4})-(\d{2})$/', $periodKey, $m)) {
    auth_send_json(['ok' => false, 'error' => 'invalid-period',
        'message' => 'period_key must be YYYY-MM'], 400);
}
$year  = (int)$m[1];
$month = (int)$m[2];

// Load or auto-create the period for this company.
$stmt = $pdo->prepare(
    'SELECT id, status FROM periods WHERE company_id = :cid AND year = :year AND month = :month LIMIT 1'
);
$stmt->execute([':cid' => $companyId, ':year' => $year, ':month' => $month]);
$period = $stmt->fetch();

if (!$period) {
    // Auto-create the period so the admin can manage it.
    $ins = $pdo->prepare(
        'INSERT INTO periods (company_id, year, month, status) VALUES (:cid, :year, :month, "open")'
    );
    $ins->execute([':cid' => $companyId, ':year' => $year, ':month' => $month]);
    $period = ['id' => (int)$pdo->lastInsertId(), 'status' => 'open'];
}

$periodId = (int)$period['id'];

if ($action === 'close') {
    if ((string)$period['status'] === 'closed') {
        auth_send_json(['ok' => false, 'error' => 'already-closed',
            'message' => 'Period is already closed.'], 409);
    }

    // Warn if there are still open timesheets (allow but flag it).
    $openStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM timesheets t WHERE t.period_id = :pid AND t.status IN ("draft","submitted","correction")'
    );
    $openStmt->execute([':pid' => $periodId]);
    $openCount = (int)$openStmt->fetchColumn();

    $pdo->prepare(
        'UPDATE periods SET status = "closed", closed_at = CURRENT_TIMESTAMP, closed_by = :by WHERE id = :id'
    )->execute([':by' => $actorId, ':id' => $periodId]);

    $pdo->prepare(
        'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
         VALUES (:cid, :actor, :evt, :etype, :eid, :data)'
    )->execute([
        ':cid'   => $companyId, ':actor' => $actorId,
        ':evt'   => 'period.closed', ':etype' => 'period',
        ':eid'   => (string)$periodId,
        ':data'  => json_encode(['period_key' => $periodKey, 'open_timesheets_at_close' => $openCount]),
    ]);

    auth_send_json([
        'ok'           => true,
        'action'       => 'close',
        'period_key'   => $periodKey,
        'open_timesheets_at_close' => $openCount,
    ]);
}

if ($action === 'reopen') {
    if ((string)$period['status'] !== 'closed') {
        auth_send_json(['ok' => false, 'error' => 'not-closed',
            'message' => 'Only closed periods can be reopened.'], 409);
    }

    $pdo->prepare(
        'UPDATE periods SET status = "open", closed_at = NULL, closed_by = NULL WHERE id = :id'
    )->execute([':id' => $periodId]);

    $pdo->prepare(
        'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
         VALUES (:cid, :actor, :evt, :etype, :eid, :data)'
    )->execute([
        ':cid'   => $companyId, ':actor' => $actorId,
        ':evt'   => 'period.reopened', ':etype' => 'period',
        ':eid'   => (string)$periodId,
        ':data'  => json_encode(['period_key' => $periodKey]),
    ]);

    auth_send_json(['ok' => true, 'action' => 'reopen', 'period_key' => $periodKey]);
}

auth_send_json(['ok' => false, 'error' => 'unknown-action',
    'message' => 'action must be one of: close, reopen'], 400);
