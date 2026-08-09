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
$isAdmin   = (string)$currentUser['role'] === 'administrator';
$method    = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

// ---------------------------------------------------------------------------
// GET – list announcements for the current user's role/scope
// ---------------------------------------------------------------------------
if ($method === 'GET') {
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));

    if ($isAdmin) {
        // Admin sees all announcements for their company
        $sql = "
            SELECT a.id, a.kind, a.status, a.title, a.message, a.audience_label,
                   a.email_requested, a.correction_of_id, a.superseded_by_id,
                   a.withdrawal_of_id, a.withdrawal_reason, a.withdrawn_at,
                   a.created_at, a.updated_at,
                   u.display_name AS created_by_name
            FROM announcements a
            LEFT JOIN users u ON u.id = a.created_by
            WHERE a.company_id = :company_id
            ORDER BY a.updated_at DESC, a.id DESC
            LIMIT :lim
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':company_id', $companyId, PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        // Fetch recipient user_ids per announcement
        $announcementIds = array_column($rows, 'id');
        $recipientMap = [];
        if ($announcementIds) {
            $placeholders = implode(',', array_fill(0, count($announcementIds), '?'));
            $rStmt = $pdo->prepare("SELECT announcement_id, user_id FROM announcement_recipients WHERE announcement_id IN ($placeholders)");
            $rStmt->execute($announcementIds);
            foreach ($rStmt->fetchAll() as $r) {
                $recipientMap[(int)$r['announcement_id']][] = (int)$r['user_id'];
            }
        }

        $items = array_map(static function (array $r) use ($recipientMap): array {
            $id = (int)$r['id'];
            return [
                'id'               => $id,
                'kind'             => (string)$r['kind'],
                'status'           => (string)$r['status'],
                'title'            => (string)$r['title'],
                'message'          => (string)$r['message'],
                'audience_label'   => (string)$r['audience_label'],
                'email_requested'  => (bool)$r['email_requested'],
                'correction_of_id' => $r['correction_of_id'] !== null ? (int)$r['correction_of_id'] : null,
                'superseded_by_id' => $r['superseded_by_id'] !== null ? (int)$r['superseded_by_id'] : null,
                'withdrawal_of_id' => $r['withdrawal_of_id'] !== null ? (int)$r['withdrawal_of_id'] : null,
                'withdrawal_reason'=> $r['withdrawal_reason'] ?? null,
                'withdrawn_at'     => $r['withdrawn_at'] ?? null,
                'created_by'       => (string)($r['created_by_name'] ?? 'Beheerder'),
                'created_at'       => (string)$r['created_at'],
                'updated_at'       => (string)($r['updated_at'] ?? $r['created_at']),
                'recipient_user_ids' => $recipientMap[$id] ?? [],
            ];
        }, $rows);
    } else {
        // Employee sees only sent/non-hidden announcements addressed to them
        $sql = "
            SELECT a.id, a.kind, a.status, a.title, a.message,
                   a.withdrawal_of_id, a.withdrawal_reason,
                   a.created_at, a.updated_at,
                   u.display_name AS created_by_name,
                   ar.read_at
            FROM announcements a
            INNER JOIN announcement_recipients ar ON ar.announcement_id = a.id AND ar.user_id = :user_id
            LEFT JOIN users u ON u.id = a.created_by
            WHERE a.company_id = :company_id
              AND a.status IN ('sent', 'withdrawn')
            ORDER BY a.created_at DESC
            LIMIT :lim
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':company_id', $companyId, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $items = array_map(static function (array $r): array {
            return [
                'id'               => (int)$r['id'],
                'kind'             => (string)$r['kind'],
                'status'           => (string)$r['status'],
                'title'            => (string)$r['title'],
                'message'          => (string)$r['message'],
                'withdrawal_of_id' => $r['withdrawal_of_id'] !== null ? (int)$r['withdrawal_of_id'] : null,
                'withdrawal_reason'=> $r['withdrawal_reason'] ?? null,
                'created_by'       => (string)($r['created_by_name'] ?? 'Beheerder'),
                'created_at'       => (string)$r['created_at'],
                'updated_at'       => (string)($r['updated_at'] ?? $r['created_at']),
                'read'             => $r['read_at'] !== null,
                'read_at'          => $r['read_at'] ?? null,
            ];
        }, $rows);
    }

    auth_send_json(['ok' => true, 'count' => count($items), 'items' => $items]);
}

// ---------------------------------------------------------------------------
// POST – admin-only write actions
// ---------------------------------------------------------------------------
if ($method !== 'POST') {
    auth_send_json(['ok' => false, 'error' => 'method-not-allowed'], 405);
}

if (!$isAdmin) {
    auth_send_json(['ok' => false, 'error' => 'forbidden', 'message' => 'Only administrators can write announcements.'], 403);
}

security_require_csrf_token();

$payload = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($payload)) {
    auth_send_json(['ok' => false, 'error' => 'invalid-json'], 400);
}

$action = trim((string)($payload['action'] ?? ''));

// ---------------------------------------------------------------------------
// action=send or action=save_draft — create or update a draft
// ---------------------------------------------------------------------------
if ($action === 'send' || $action === 'save_draft') {
    $title         = trim((string)($payload['title'] ?? ''));
    $message       = trim((string)($payload['message'] ?? ''));
    $recipientIds  = array_filter(array_map('intval', (array)($payload['recipient_user_ids'] ?? [])));
    $audienceLabel = trim((string)($payload['audience_label'] ?? ''));
    $emailReq      = (bool)($payload['email_requested'] ?? false);
    $correctionOfId = isset($payload['correction_of_id']) && is_numeric($payload['correction_of_id'])
        ? (int)$payload['correction_of_id'] : null;
    $withdrawalOfId = isset($payload['withdrawal_of_id']) && is_numeric($payload['withdrawal_of_id'])
        ? (int)$payload['withdrawal_of_id'] : null;
    $kind = $withdrawalOfId ? 'withdrawal' : ($correctionOfId ? 'correction' : 'standard');
    $status = $action === 'send' ? 'sent' : 'draft';

    if ($action === 'send') {
        if ($title === '') {
            auth_send_json(['ok' => false, 'error' => 'missing-title', 'message' => 'Title is required.'], 400);
        }
        if ($message === '') {
            auth_send_json(['ok' => false, 'error' => 'missing-message', 'message' => 'Message is required.'], 400);
        }
        if (empty($recipientIds) && $correctionOfId === null && $withdrawalOfId === null) {
            auth_send_json(['ok' => false, 'error' => 'missing-recipients', 'message' => 'At least one recipient is required.'], 400);
        }
    } else {
        if ($title === '' && $message === '') {
            auth_send_json(['ok' => false, 'error' => 'empty-draft', 'message' => 'Provide at least a title or message for a draft.'], 400);
        }
    }

    if (strlen($title) > 160) {
        auth_send_json(['ok' => false, 'error' => 'title-too-long'], 400);
    }
    if (strlen($message) > 1500) {
        auth_send_json(['ok' => false, 'error' => 'message-too-long'], 400);
    }

    // Resolve recipients from correction source when correction_of_id is set
    if ($correctionOfId !== null && empty($recipientIds)) {
        $srcStmt = $pdo->prepare('SELECT user_id FROM announcement_recipients WHERE announcement_id = :aid');
        $srcStmt->execute([':aid' => $correctionOfId]);
        $recipientIds = array_column($srcStmt->fetchAll(), 'user_id');
        if (!$audienceLabel) {
            $audienceLabel = 'Zelfde ontvangers als bericht #' . $correctionOfId;
        }
    }

    // If correction/withdrawal, resolve recipients from source
    if ($withdrawalOfId !== null && empty($recipientIds)) {
        $srcStmt = $pdo->prepare('SELECT user_id FROM announcement_recipients WHERE announcement_id = :aid');
        $srcStmt->execute([':aid' => $withdrawalOfId]);
        $recipientIds = array_column($srcStmt->fetchAll(), 'user_id');
        if (!$audienceLabel) {
            $audienceLabel = 'Zelfde ontvangers als bericht #' . $withdrawalOfId;
        }
    }

    // Validate recipient_user_ids belong to this company
    if (!empty($recipientIds)) {
        $placeholders = implode(',', array_fill(0, count($recipientIds), '?'));
        $chkStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id IN ($placeholders) AND company_id = ?");
        $chkStmt->execute([...$recipientIds, $companyId]);
        if ((int)$chkStmt->fetchColumn() !== count($recipientIds)) {
            auth_send_json(['ok' => false, 'error' => 'invalid-recipients'], 400);
        }
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare("
            INSERT INTO announcements (company_id, created_by, kind, status, title, message, audience_label, email_requested, correction_of_id, withdrawal_of_id)
            VALUES (:company_id, :created_by, :kind, :status, :title, :message, :audience_label, :email_requested, :correction_of_id, :withdrawal_of_id)
        ")->execute([
            ':company_id'      => $companyId,
            ':created_by'      => $userId,
            ':kind'            => $kind,
            ':status'          => $status,
            ':title'           => $title,
            ':message'         => $message,
            ':audience_label'  => $audienceLabel ?: ($recipientIds ? count($recipientIds) . ' medewerker(s)' : ''),
            ':email_requested' => $emailReq ? 1 : 0,
            ':correction_of_id'=> $correctionOfId,
            ':withdrawal_of_id'=> $withdrawalOfId,
        ]);
        $announcementId = (int)$pdo->lastInsertId();

        // Insert recipients
        if (!empty($recipientIds)) {
            $insRecipient = $pdo->prepare('INSERT IGNORE INTO announcement_recipients (announcement_id, user_id, email_requested) VALUES (:aid, :uid, :er)');
            foreach ($recipientIds as $recipientUserId) {
                $insRecipient->execute([':aid' => $announcementId, ':uid' => (int)$recipientUserId, ':er' => $emailReq ? 1 : 0]);
            }
        }

        // If sending and correction_of_id, mark original as superseded
        if ($status === 'sent' && $correctionOfId !== null) {
            $pdo->prepare('UPDATE announcements SET superseded_by_id = :new_id WHERE id = :old_id AND company_id = :cid')
                ->execute([':new_id' => $announcementId, ':old_id' => $correctionOfId, ':cid' => $companyId]);
        }

        // If sending and withdrawal_of_id, mark original as withdrawn
        if ($status === 'sent' && $withdrawalOfId !== null) {
            $reason = trim((string)($payload['withdrawal_reason'] ?? ''));
            $pdo->prepare("UPDATE announcements SET status = 'withdrawn', withdrawal_reason = :reason, withdrawn_by = :uid, withdrawn_at = CURRENT_TIMESTAMP WHERE id = :old_id AND company_id = :cid")
                ->execute([':reason' => $reason, ':uid' => $userId, ':old_id' => $withdrawalOfId, ':cid' => $companyId]);
        }

        // Insert notifications for each recipient when sending
        if ($status === 'sent' && !empty($recipientIds)) {
            $insNotif = $pdo->prepare("
                INSERT INTO notifications (company_id, user_id, announcement_id, notification_type, title, message, target_route)
                VALUES (:cid, :uid, :aid, 'announcement', :title, :message, 'employee-announcements')
            ");
            foreach ($recipientIds as $recipientUserId) {
                $insNotif->execute([
                    ':cid'     => $companyId,
                    ':uid'     => (int)$recipientUserId,
                    ':aid'     => $announcementId,
                    ':title'   => $title,
                    ':message' => mb_substr($message, 0, 400),
                ]);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        auth_send_json(['ok' => false, 'error' => 'db-error', 'message' => 'Could not save announcement.'], 500);
    }

    auth_send_json(['ok' => true, 'action' => $action, 'id' => $announcementId]);
}

// ---------------------------------------------------------------------------
// action=withdraw — withdraw a sent announcement
// ---------------------------------------------------------------------------
if ($action === 'withdraw') {
    $announcementId = isset($payload['announcement_id']) && is_numeric($payload['announcement_id'])
        ? (int)$payload['announcement_id'] : 0;
    $reason = trim((string)($payload['withdrawal_reason'] ?? ''));

    if ($announcementId <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-announcement-id'], 400);
    }
    if ($reason === '') {
        auth_send_json(['ok' => false, 'error' => 'missing-withdrawal-reason', 'message' => 'Withdrawal reason is required.'], 400);
    }

    $stmt = $pdo->prepare("SELECT id, status FROM announcements WHERE id = :id AND company_id = :cid");
    $stmt->execute([':id' => $announcementId, ':cid' => $companyId]);
    $announcement = $stmt->fetch();

    if (!$announcement) {
        auth_send_json(['ok' => false, 'error' => 'not-found'], 404);
    }
    if ((string)$announcement['status'] !== 'sent') {
        auth_send_json(['ok' => false, 'error' => 'invalid-status', 'message' => 'Only sent announcements can be withdrawn.'], 409);
    }

    $pdo->prepare("UPDATE announcements SET status = 'withdrawn', withdrawal_reason = :reason, withdrawn_by = :uid, withdrawn_at = CURRENT_TIMESTAMP WHERE id = :id AND company_id = :cid")
        ->execute([':reason' => $reason, ':uid' => $userId, ':id' => $announcementId, ':cid' => $companyId]);

    // Mark existing recipient notifications as read/withdrawn
    $pdo->prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE announcement_id = :aid AND company_id = :cid AND read_at IS NULL")
        ->execute([':aid' => $announcementId, ':cid' => $companyId]);

    auth_send_json(['ok' => true, 'action' => 'withdraw', 'updated' => 1]);
}

// ---------------------------------------------------------------------------
// action=hide — hide withdrawn announcement from employee view
// ---------------------------------------------------------------------------
if ($action === 'hide') {
    $announcementId = isset($payload['announcement_id']) && is_numeric($payload['announcement_id'])
        ? (int)$payload['announcement_id'] : 0;

    if ($announcementId <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-announcement-id'], 400);
    }

    $stmt = $pdo->prepare("SELECT id, status FROM announcements WHERE id = :id AND company_id = :cid");
    $stmt->execute([':id' => $announcementId, ':cid' => $companyId]);
    $announcement = $stmt->fetch();

    if (!$announcement) {
        auth_send_json(['ok' => false, 'error' => 'not-found'], 404);
    }
    if ((string)$announcement['status'] !== 'withdrawn') {
        auth_send_json(['ok' => false, 'error' => 'invalid-status', 'message' => 'Only withdrawn announcements can be hidden.'], 409);
    }

    // Mark all notifications for this announcement read so they disappear from employee bell
    $pdo->prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE announcement_id = :aid AND company_id = :cid AND read_at IS NULL")
        ->execute([':aid' => $announcementId, ':cid' => $companyId]);

    auth_send_json(['ok' => true, 'action' => 'hide', 'updated' => 1]);
}

// ---------------------------------------------------------------------------
// action=delete_draft — delete an unsent draft
// ---------------------------------------------------------------------------
if ($action === 'delete_draft') {
    $announcementId = isset($payload['announcement_id']) && is_numeric($payload['announcement_id'])
        ? (int)$payload['announcement_id'] : 0;

    if ($announcementId <= 0) {
        auth_send_json(['ok' => false, 'error' => 'missing-announcement-id'], 400);
    }

    $stmt = $pdo->prepare("SELECT id, status FROM announcements WHERE id = :id AND company_id = :cid");
    $stmt->execute([':id' => $announcementId, ':cid' => $companyId]);
    $announcement = $stmt->fetch();

    if (!$announcement) {
        auth_send_json(['ok' => false, 'error' => 'not-found'], 404);
    }
    if ((string)$announcement['status'] !== 'draft') {
        auth_send_json(['ok' => false, 'error' => 'invalid-status', 'message' => 'Only drafts can be deleted.'], 409);
    }

    $pdo->prepare("DELETE FROM announcements WHERE id = :id AND company_id = :cid")
        ->execute([':id' => $announcementId, ':cid' => $companyId]);

    auth_send_json(['ok' => true, 'action' => 'delete_draft', 'deleted' => 1]);
}

auth_send_json(['ok' => false, 'error' => 'unknown-action',
    'message' => 'action must be one of: send, save_draft, withdraw, hide, delete_draft'], 400);
