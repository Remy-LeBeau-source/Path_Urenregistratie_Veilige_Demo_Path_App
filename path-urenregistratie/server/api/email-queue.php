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

    $limit  = min(100, max(1, (int)($_GET['limit'] ?? 10)));
    $offset = min(100000, max(0, (int)($_GET['offset'] ?? 0)));
    $query  = mb_substr(trim((string)($_GET['q'] ?? '')), 0, 120);

    $sql = '
        SELECT
            ed.id, ed.user_id, ed.invoice_id, ed.channel, ed.recipient_email, ed.cc_email,
            ed.subject_snapshot, ed.attachment_policy, ed.status,
            ed.attempt_count, ed.dry_run, ed.acceptance_test, ed.last_error, ed.sent_at, ed.created_at,
            i.invoice_number, e.full_name AS employee_name,
            CASE WHEN ed.status IN ("queued", "processing")
                       AND ed.created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
                 THEN 1 ELSE 0 END AS is_stalled
        FROM email_deliveries ed
        LEFT JOIN invoices i ON i.id = ed.invoice_id
        LEFT JOIN users u ON u.id = ed.user_id
        LEFT JOIN timesheets t ON t.id = i.timesheet_id
        LEFT JOIN employees e ON e.id = t.employee_id
        WHERE COALESCE(i.company_id, u.company_id) = :company_id
    ';
    $params = [':company_id' => $companyId];

    if ($statusFilter !== null) {
        $sql .= ' AND ed.status = :status';
        $params[':status'] = $statusFilter;
    }

    if ($query !== '') {
        // Native PDO prepares mogen dezelfde benoemde placeholder niet opnieuw
        // gebruiken. Geef ieder zoekveld daarom een eigen parameter; anders
        // faalt precies de zoekactie met SQLSTATE[HY093].
        $sql .= ' AND (ed.subject_snapshot LIKE :query_subject
                       OR ed.recipient_email LIKE :query_recipient
                       OR i.invoice_number LIKE :query_invoice
                       OR e.full_name LIKE :query_employee)';
        $needle = '%' . $query . '%';
        $params[':query_subject'] = $needle;
        $params[':query_recipient'] = $needle;
        $params[':query_invoice'] = $needle;
        $params[':query_employee'] = $needle;
    }

    $countSql = 'SELECT COUNT(*) FROM (' . $sql . ') AS filtered_deliveries';
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $sql .= ' ORDER BY
                CASE ed.status WHEN "failed" THEN 0 WHEN "processing" THEN 1 WHEN "queued" THEN 2 ELSE 3 END,
                COALESCE(ed.sent_at, ed.created_at) DESC
              LIMIT ' . $limit . ' OFFSET ' . $offset;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $items = array_map(static function (array $r): array {
        return [
            'id'               => (int)$r['id'],
            'user_id'          => $r['user_id'] !== null ? (int)$r['user_id'] : null,
            'invoice_id'       => $r['invoice_id'] !== null ? (int)$r['invoice_id'] : null,
            'invoice_number'   => $r['invoice_number'] !== null ? (string)$r['invoice_number'] : null,
            'employee_name'    => $r['employee_name'] !== null ? (string)$r['employee_name'] : null,
            'channel'          => (string)$r['channel'],
            'recipient_email'  => (string)$r['recipient_email'],
            'cc_email'         => $r['cc_email'] !== null ? (string)$r['cc_email'] : null,
            // Bewust geen body_snapshot: in deze lijst staan ook de mails voor
            // wachtwoordherstel, en die bevatten de eenmalige link. Een beheerder
            // zou daarmee het account van iedere collega kunnen overnemen. Wie de
            // inhoud moet nakijken gebruikt server/scripts/mail-delivery-inspect.php.
            'subject_snapshot' => (string)$r['subject_snapshot'],
            'attachment_policy'=> (string)$r['attachment_policy'],
            'status'           => (string)$r['status'],
            'attempt_count'    => (int)$r['attempt_count'],
            'dry_run'          => (bool)$r['dry_run'],
            'acceptance_test'  => (bool)$r['acceptance_test'],
            'last_error'       => $r['last_error'] !== null ? (string)$r['last_error'] : null,
            'is_stalled'       => (bool)$r['is_stalled'],
            'can_retry'        => (string)$r['status'] === 'failed'
                && (string)$r['channel'] !== 'password_reset'
                && (int)$r['attempt_count'] < MAIL_MAX_ATTEMPTS,
            'requires_manual_reissue' => (string)$r['status'] === 'failed'
                && (string)$r['channel'] !== 'password_reset'
                && (int)$r['attempt_count'] >= MAIL_MAX_ATTEMPTS,
            'sent_at'          => $r['sent_at'] !== null ? (string)$r['sent_at'] : null,
            'created_at'       => (string)$r['created_at'],
        ];
    }, $stmt->fetchAll());

    $testSink = mail_test_sink_recipient($config);
    $deliveryAllowed = mail_real_delivery_allowed_for_environment($config);
    $toggleAvailable = mail_test_delivery_toggle_available($config);
    $testPaused = mail_test_delivery_is_paused($config);
    auth_send_json([
        'ok' => true,
        'dry_run' => $dryRun,
        'environment' => mail_environment($config),
        'test_redirect_active' => $testSink !== null,
        'test_sink_recipient' => $testSink,
        'delivery_allowed' => $deliveryAllowed,
        'test_delivery_paused' => $testPaused,
        'test_toggle_available' => $toggleAvailable,
        'mail_mode' => $toggleAvailable
            ? ($testPaused ? 'test_paused' : 'test_active')
            : ($deliveryAllowed && mail_environment($config) === 'production' ? 'production_active' : 'disabled'),
        'count' => count($items),
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset,
        'query' => $query,
        'status_filter' => $statusFilter,
        'has_more' => ($offset + count($items)) < $total,
        'items' => $items,
    ]);
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

// ---- action: set-test-delivery --------------------------------------------
if ($action === 'set-test-delivery') {
    if (!hash_equals('SET_TEST_MAIL_STATE', (string)($payload['confirm'] ?? ''))) {
        auth_send_json(['ok' => false, 'error' => 'explicit-confirmation-required'], 409);
    }
    if (!array_key_exists('enabled', $payload) || !is_bool($payload['enabled'])) {
        auth_send_json(['ok' => false, 'error' => 'invalid-enabled'], 400);
    }
    try {
        mail_set_test_delivery_paused($config, !$payload['enabled']);
    } catch (RuntimeException $error) {
        auth_send_json(['ok' => false, 'error' => 'test-mail-toggle-blocked', 'message' => $error->getMessage()], 409);
    }
    auth_send_json([
        'ok' => true,
        'action' => 'set-test-delivery',
        'enabled' => (bool)$payload['enabled'],
        'mail_mode' => $payload['enabled'] ? 'test_active' : 'test_paused',
    ]);
}

// ---- action: enqueue -------------------------------------------------------
if ($action === 'enqueue') {
    $invoiceIdRaw = $payload['invoice_id'] ?? null;
    if (!is_numeric($invoiceIdRaw) || (int)$invoiceIdRaw <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-invoice-id',
            'message' => 'Er is geen geldige factuur meegestuurd.'], 400);
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
                'message' => 'Maak de factuur eerst definitief voordat je de mail klaarzet.'], 409);
        }
        auth_send_json(['ok' => false, 'error' => 'enqueue-failed', 'message' => $code], 500);
    }

    require_once __DIR__ . '/../mail/dispatch.php';
    $dispatchResult = mail_dispatch_created($pdo, $created, $config);

    auth_send_json([
        'ok'      => true,
        'action'  => 'enqueue',
        'dry_run' => $dryRun,
        'created' => $created,
        'count'   => count($created),
        'dispatch_result' => $dispatchResult,
    ]);
}

// ---- action: retry ---------------------------------------------------------
if ($action === 'retry') {
    $deliveryIdRaw = $payload['delivery_id'] ?? null;
    if (!is_numeric($deliveryIdRaw) || (int)$deliveryIdRaw <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-delivery-id',
            'message' => 'Er is geen geldige verzending meegestuurd.'], 400);
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
            'reset-reissue-required' => [409, 'Request a new password link instead of retrying an expired security message.'],
        ];
        [$status, $msg] = $map[$code] ?? [500, $code];
        auth_send_json(['ok' => false, 'error' => $code, 'message' => $msg], $status);
    }

    auth_send_json(['ok' => true, 'action' => 'retry', 'delivery' => $result]);
}

// ---- action: reissue -----------------------------------------------------
if ($action === 'reissue') {
    if (!hash_equals('REISSUE_FAILED_DELIVERY', (string)($payload['confirm'] ?? ''))) {
        auth_send_json(['ok' => false, 'error' => 'explicit-confirmation-required'], 409);
    }
    $deliveryIdRaw = $payload['delivery_id'] ?? null;
    if (!is_numeric($deliveryIdRaw) || (int)$deliveryIdRaw <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-delivery-id'], 400);
    }
    try {
        $result = mail_reissue_failed_delivery(
            $pdo,
            (int)$deliveryIdRaw,
            $companyId,
            $actorUserId,
            (string)($payload['reason'] ?? '')
        );
    } catch (\RuntimeException $e) {
        $code = $e->getMessage();
        $map = [
            'delivery-not-found' => [404, 'Delivery not found.'],
            'forbidden' => [403, 'Delivery belongs to another company.'],
            'not-failed' => [409, 'Only failed deliveries can be reissued.'],
            'retry-still-available' => [409, 'Use the normal retry before a manual reissue.'],
            'reset-reissue-required' => [409, 'Request a new password link instead.'],
            'invalid-reissue-reason' => [400, 'Geef een reden van 10 tot 300 tekens op.'],
            'delivery-state-changed' => [409, 'Delivery state changed; refresh and try again.'],
        ];
        [$status, $message] = $map[$code] ?? [500, $code];
        auth_send_json(['ok' => false, 'error' => $code, 'message' => $message], $status);
    }
    auth_send_json(['ok' => true, 'action' => 'reissue', 'delivery' => $result]);
}

auth_send_json(['ok' => false, 'error' => 'unknown-action',
    'message' => 'action must be one of: enqueue, retry, reissue, set-test-delivery'], 400);

