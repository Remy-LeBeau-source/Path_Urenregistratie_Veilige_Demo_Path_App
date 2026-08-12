<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/smtp.php';

function mail_private_storage_root(array $config): string
{
    $configured = trim((string)($config['storage']['private_root'] ?? ''));
    if ($configured !== '') {
        return rtrim($configured, '/\\');
    }
    return dirname(__DIR__, 2) . '/../path-private';
}

function mail_storage_path(array $config, string $bucket, string $storageKey): ?string
{
    $key = str_replace('\\', '/', trim($storageKey));
    if ($key === '' || str_starts_with($key, '/') || preg_match('/^[A-Za-z]:/', $key)) {
        return null;
    }
    $segments = explode('/', $key);
    if (in_array('..', $segments, true) || in_array('.', $segments, true)) {
        return null;
    }

    $root = mail_private_storage_root($config) . DIRECTORY_SEPARATOR . $bucket;
    $candidate = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $key);
    if (!is_file($candidate) || !is_readable($candidate)) {
        return null;
    }

    $realRoot = realpath($root);
    $realCandidate = realpath($candidate);
    if ($realRoot === false || $realCandidate === false) {
        return null;
    }
    $prefix = rtrim($realRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    return str_starts_with($realCandidate, $prefix) ? $realCandidate : null;
}

function mail_expected_attachment_count(string $policy): int
{
    return match ($policy) {
        'none' => 0,
        'invoice', 'customer_timesheet' => 1,
        'invoice_and_customer_timesheet' => 2,
        default => throw new RuntimeException('Unsupported attachment policy.'),
    };
}

/** @return list<array{filename:string,mime:string,data:string}> */
function mail_resolve_attachments(PDO $pdo, array $delivery, array $config): array
{
    $policy = (string)($delivery['attachment_policy'] ?? 'none');
    $expected = mail_expected_attachment_count($policy);
    if ($expected === 0) {
        return [];
    }

    $invoiceId = (int)($delivery['invoice_id'] ?? 0);
    if ($invoiceId <= 0) {
        throw new RuntimeException('Attachment policy requires an invoice.');
    }

    $attachments = [];
    if (in_array($policy, ['invoice', 'invoice_and_customer_timesheet'], true)) {
        $stmt = $pdo->prepare('SELECT pdf_storage_key, invoice_number FROM invoices WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $invoiceId]);
        $invoice = $stmt->fetch();
        $path = $invoice ? mail_storage_path($config, 'invoices', (string)($invoice['pdf_storage_key'] ?? '')) : null;
        if ($path === null) {
            throw new RuntimeException('Required finalized invoice PDF is unavailable.');
        }
        $number = preg_replace('/[^A-Za-z0-9_-]/', '_', (string)$invoice['invoice_number']) ?: 'factuur';
        $attachments[] = [
            'filename' => 'Factuur-' . $number . '.pdf',
            'mime' => 'application/pdf',
            'data' => base64_encode((string)file_get_contents($path)),
        ];
    }

    if (in_array($policy, ['customer_timesheet', 'invoice_and_customer_timesheet'], true)) {
        $stmt = $pdo->prepare(
            'SELECT ct.storage_key, e.full_name, p.year, p.month
             FROM invoices i
             JOIN timesheets t ON t.id = i.timesheet_id
             JOIN customer_timesheets ct ON ct.employee_id = t.employee_id AND ct.period_id = t.period_id
             JOIN employees e ON e.id = t.employee_id
             JOIN periods p ON p.id = t.period_id
             WHERE i.id = :id AND ct.status = "approved"
             ORDER BY ct.updated_at DESC, ct.id DESC
             LIMIT 1'
        );
        $stmt->execute([':id' => $invoiceId]);
        $timesheet = $stmt->fetch();
        $path = $timesheet ? mail_storage_path($config, 'customer-timesheets', (string)($timesheet['storage_key'] ?? '')) : null;
        if ($path === null) {
            throw new RuntimeException('Required approved customer timesheet PDF is unavailable.');
        }
        $employee = preg_replace('/[^A-Za-z0-9_-]/', '_', (string)$timesheet['full_name']) ?: 'medewerker';
        $attachments[] = [
            'filename' => sprintf('Klanturenstaat-%s-%04d-%02d.pdf', $employee, (int)$timesheet['year'], (int)$timesheet['month']),
            'mime' => 'application/pdf',
            'data' => base64_encode((string)file_get_contents($path)),
        ];
    }

    if (count($attachments) !== $expected) {
        throw new RuntimeException('Mail bundle is incomplete; dispatch blocked.');
    }
    return $attachments;
}

/** Attempt one real, non-dry-run delivery. Returns sent, failed, or skipped. */
function mail_dispatch_delivery(PDO $pdo, array $delivery, array $config): string
{
    $deliveryId = (int)($delivery['id'] ?? 0);
    if ($deliveryId <= 0) {
        throw new RuntimeException('Invalid delivery id.');
    }
    if (!mail_is_smtp_relay_enabled($config)) {
        throw new RuntimeException('Real SMTP dispatch is disabled.');
    }
    if ((bool)($delivery['dry_run'] ?? true)) {
        throw new RuntimeException('Dry-run deliveries can never be dispatched.');
    }
    $errors = mail_validate_relay_config($config);
    if ($errors !== []) {
        throw new RuntimeException('Invalid SMTP relay configuration: ' . implode('; ', $errors));
    }

    // Claim the row before opening SMTP so parallel cron processes cannot send it twice.
    $claim = $pdo->prepare(
        'UPDATE email_deliveries
         SET status = "processing", attempt_count = attempt_count + 1
         WHERE id = :id AND status = "queued" AND dry_run = 0 AND attempt_count < :max_attempts'
    );
    $claim->execute([':id' => $deliveryId, ':max_attempts' => MAIL_MAX_ATTEMPTS]);
    if ($claim->rowCount() !== 1) {
        return 'skipped';
    }

    $relay = $config['mail']['smtp_relay'];
    $smtpAccepted = false;
    try {
        $attachments = mail_resolve_attachments($pdo, $delivery, $config);
        smtp_relay_send(
            $relay,
            (string)$delivery['recipient_email'],
            !empty($delivery['cc_email']) ? (string)$delivery['cc_email'] : null,
            (string)$delivery['subject_snapshot'],
            (string)$delivery['body_snapshot'],
            (string)$relay['from_email'],
            (string)($relay['from_name'] ?? 'Path Consultancy'),
            $attachments
        );
        $smtpAccepted = true;

        $pdo->prepare(
            'UPDATE email_deliveries
             SET status = "sent", sent_at = NOW(), last_error = NULL
             WHERE id = :id AND status = "processing" AND dry_run = 0'
        )->execute([':id' => $deliveryId]);
        return 'sent';
    } catch (Throwable $error) {
        // If SMTP accepted the message but persisting that fact failed, leave the row
        // in processing. An operator must reconcile it with Google logs; auto-retry
        // could send a duplicate invoice.
        if ($smtpAccepted) {
            return 'failed';
        }
        $attempt = (int)($delivery['attempt_count'] ?? 0) + 1;
        $status = $attempt >= MAIL_MAX_ATTEMPTS ? 'failed' : 'queued';
        $pdo->prepare(
            'UPDATE email_deliveries
             SET status = :status, attempt_count = :attempts, last_error = :error
             WHERE id = :id AND dry_run = 0'
        )->execute([
            ':status' => $status,
            ':attempts' => $attempt,
            ':error' => substr($error->getMessage(), 0, 500),
            ':id' => $deliveryId,
        ]);
        return 'failed';
    }
}

/** @return array{sent:int,failed:int,skipped:int} */
function mail_dispatch_queued(PDO $pdo, int $companyId, array $config, int $limit = 50): array
{
    if (!mail_is_smtp_relay_enabled($config)) {
        return ['sent' => 0, 'failed' => 0, 'skipped' => 0];
    }

    $limit = max(1, min(100, $limit));
    $stmt = $pdo->prepare(
        'SELECT ed.*
         FROM email_deliveries ed
         JOIN invoices i ON i.id = ed.invoice_id
         WHERE ed.status = "queued" AND ed.dry_run = 0
           AND i.company_id = :company_id
           AND ed.attempt_count < :max_attempts
         ORDER BY ed.created_at ASC
         LIMIT ' . $limit
    );
    $stmt->execute([':company_id' => $companyId, ':max_attempts' => MAIL_MAX_ATTEMPTS]);

    $sent = 0;
    $failed = 0;
    foreach ($stmt->fetchAll() as $row) {
        $outcome = mail_dispatch_delivery($pdo, $row, $config);
        if ($outcome === 'sent') {
            $sent++;
        } elseif ($outcome === 'failed') {
            $failed++;
        } else {
            $skipped++;
        }
    }
    return ['sent' => $sent, 'failed' => $failed, 'skipped' => $skipped];
}
