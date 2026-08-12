<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../security/validation.php';
require_once __DIR__ . '/../mail/queue.php';

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

$companyId    = (int)$currentUser['company_id'];
$actorUserId  = (int)$currentUser['id'];
$method       = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$dryRun       = mail_is_dry_run($config);

// ---------------------------------------------------------------------------
// GET → action=list
// ---------------------------------------------------------------------------
if ($method === 'GET') {
    $statusFilter    = isset($_GET['status']) ? trim((string)$_GET['status']) : null;
    $allowedStatuses = ['queued', 'processing', 'sent', 'failed'];
    if ($statusFilter !== null && !in_array($statusFilter, $allowedStatuses, true)) {
        auth_send_json(['ok' => false, 'error' => 'invalid-status',
            'message' => 'status must be one of: queued, processing, sent, failed'], 400);
    }

    $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));

    $sql = '
        SELECT
            ed.id, ed.invoice_id, ed.channel, ed.recipient_email, ed.cc_email,
            ed.subject_snapshot, ed.attachment_policy, ed.status,
            ed.attempt_count, ed.dry_run, ed.last_error, ed.sent_at, ed.created_at,
            i.invoice_number
        FROM email_deliveries ed
        LEFT JOIN invoices i ON i.id = ed.invoice_id
        WHERE i.company_id = :company_id
    ';
    $params = [':company_id' => $companyId];

    if ($statusFilter !== null) {
        $sql .= ' AND ed.status = :status';
        $params[':status'] = $statusFilter;
    }

    $sql .= ' ORDER BY ed.created_at DESC LIMIT ' . $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $items = array_map(static function (array $r): array {
        return [
            'id'               => (int)$r['id'],
            'invoice_id'       => $r['invoice_id'] !== null ? (int)$r['invoice_id'] : null,
            'invoice_number'   => $r['invoice_number'] !== null ? (string)$r['invoice_number'] : null,
            'channel'          => (string)$r['channel'],
            'recipient_email'  => (string)$r['recipient_email'],
            'cc_email'         => $r['cc_email'] !== null ? (string)$r['cc_email'] : null,
            'subject_snapshot' => (string)$r['subject_snapshot'],
            'attachment_policy'=> (string)$r['attachment_policy'],
            'status'           => (string)$r['status'],
            'attempt_count'    => (int)$r['attempt_count'],
            'dry_run'          => (bool)$r['dry_run'],
            'last_error'       => $r['last_error'] !== null ? (string)$r['last_error'] : null,
            'sent_at'          => $r['sent_at'] !== null ? (string)$r['sent_at'] : null,
            'created_at'       => (string)$r['created_at'],
        ];
    }, $stmt->fetchAll());

    auth_send_json(['ok' => true, 'dry_run' => $dryRun, 'count' => count($items), 'items' => $items]);
}

// ---------------------------------------------------------------------------
// POST → action=enqueue|retry
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

// ---- action: enqueue -------------------------------------------------------
if ($action === 'enqueue') {
    $invoiceIdRaw = $payload['invoice_id'] ?? null;
    if (!is_numeric($invoiceIdRaw) || (int)$invoiceIdRaw <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-invoice-id',
            'message' => 'invoice_id must be a positive integer'], 400);
    }
    $invoiceId = (int)$invoiceIdRaw;

    try {
        $created = mail_enqueue_for_invoice($pdo, $invoiceId, $companyId, $actorUserId, $dryRun);
    } catch (\RuntimeException $e) {
        $code = $e->getMessage();
        if ($code === 'invoice-not-found') {
            auth_send_json(['ok' => false, 'error' => 'invoice-not-found'], 404);
        }
        if ($code === 'invoice-not-locked') {
            auth_send_json(['ok' => false, 'error' => 'invoice-not-locked',
                'message' => 'Invoice must be finalized before queueing mail'], 409);
        }
        auth_send_json(['ok' => false, 'error' => 'enqueue-failed', 'message' => $code], 500);
    }

    auth_send_json([
        'ok'      => true,
        'action'  => 'enqueue',
        'dry_run' => $dryRun,
        'created' => $created,
        'count'   => count($created),
    ]);
}

// ---- action: retry ---------------------------------------------------------
if ($action === 'retry') {
    $deliveryIdRaw = $payload['delivery_id'] ?? null;
    if (!is_numeric($deliveryIdRaw) || (int)$deliveryIdRaw <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-delivery-id',
            'message' => 'delivery_id must be a positive integer'], 400);
    }
    $deliveryId = (int)$deliveryIdRaw;

    try {
        $result = mail_retry_delivery($pdo, $deliveryId, $companyId, $actorUserId);
    } catch (\RuntimeException $e) {
        $code = $e->getMessage();
        $map  = [
            'delivery-not-found'   => [404, 'Delivery not found.'],
            'forbidden'            => [403, 'Delivery belongs to another company.'],
            'not-failed'           => [409, 'Only failed deliveries can be retried.'],
            'max-attempts-reached' => [409, 'Maximum retry attempts reached for this delivery.'],
        ];
        [$status, $msg] = $map[$code] ?? [500, $code];
        auth_send_json(['ok' => false, 'error' => $code, 'message' => $msg], $status);
    }

    auth_send_json(['ok' => true, 'action' => 'retry', 'delivery' => $result]);
}

auth_send_json(['ok' => false, 'error' => 'unknown-action',
    'message' => 'action must be one of: enqueue, retry'], 400);

