<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/smtp.php';

/** @return array{status:string,attempt_count:int} */
function mail_failed_delivery_retry_state(array $delivery, int $attempt): array
{
    $acceptanceTest = (bool)($delivery['acceptance_test'] ?? false);
    return [
        // An acceptance button represents exactly one deliberate SMTP attempt.
        // It must never remain queued and be sent unexpectedly by a later cron.
        'status' => ($acceptanceTest || $attempt >= MAIL_MAX_ATTEMPTS) ? 'failed' : 'queued',
        'attempt_count' => $acceptanceTest ? MAIL_MAX_ATTEMPTS : $attempt,
    ];
}
require_once __DIR__ . '/../lib/simple_pdf.php';

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

/** @return list<string> */
function mail_acceptance_test_attachment_names(string $policy): array
{
    return match ($policy) {
        'none' => [],
        'invoice' => ['ACCEPTATIETEST-NIET-BOEKEN-Factuur-PATH-2026-007.pdf'],
        'customer_timesheet' => ['ACCEPTATIETEST-NIET-BOEKEN-Klanturenstaat-Stasjo-2026-07.pdf'],
        'invoice_and_customer_timesheet' => [
            'ACCEPTATIETEST-NIET-BOEKEN-Factuur-PATH-2026-007.pdf',
            'ACCEPTATIETEST-NIET-BOEKEN-Klanturenstaat-Stasjo-2026-07.pdf',
        ],
        default => throw new RuntimeException('Unsupported attachment policy.'),
    };
}

/** @return list<array{filename:string,mime:string,data:string}> */
function mail_acceptance_test_attachments(string $policy): array
{
    $expected = mail_expected_attachment_count($policy);
    if ($expected === 0) {
        return [];
    }
    $pdf = simple_pdf_text_document([
        ['text' => 'ACCEPTATIETEST - NIET BOEKEN OF VERWERKEN', 'size' => 16],
        '',
        'Path Consultancy - Uren & Facturatie',
        'Medewerker: Stasjo van Bakel',
        'Periode: juli 2026',
        'Goedgekeurde uren: 144,00',
        'Factuurnummer: PATH-2026-007',
        '',
        'Dit document bevat uitsluitend vaste acceptatietestgegevens.',
    ]);
    if (!simple_pdf_looks_valid($pdf)) {
        throw new RuntimeException('Acceptance test PDF could not be generated.');
    }
    $attachments = array_map(
        static fn(string $filename): array => [
            'filename' => $filename,
            'mime' => 'application/pdf',
            'data' => base64_encode($pdf),
        ],
        mail_acceptance_test_attachment_names($policy)
    );
    if (count($attachments) !== $expected) {
        throw new RuntimeException('Acceptance test mail bundle is incomplete; dispatch blocked.');
    }
    return $attachments;
}

/** @return list<array{filename:string,mime:string,data:string}> */
function mail_resolve_attachments(PDO $pdo, array $delivery, array $config): array
{
    $policy = (string)($delivery['attachment_policy'] ?? 'none');
    $expected = mail_expected_attachment_count($policy);
    if ($expected === 0) {
        return [];
    }

    if ((bool)($delivery['acceptance_test'] ?? false)) {
        return mail_acceptance_test_attachments($policy);
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
            'SELECT ct.storage_key, ct.mime_type, e.full_name, p.year, p.month
             FROM invoices i
             JOIN timesheets t ON t.id = i.timesheet_id
             JOIN customer_timesheets ct ON ct.employee_id = t.employee_id AND ct.period_id = t.period_id
             JOIN employees e ON e.id = t.employee_id
             JOIN periods p ON p.id = t.period_id
             WHERE i.id = :id AND ct.status IN ("approved", "sent", "sent_to_broker")
             ORDER BY ct.updated_at DESC, ct.id DESC
             LIMIT 1'
        );
        $stmt->execute([':id' => $invoiceId]);
        $timesheet = $stmt->fetch();
        if ($timesheet && strtolower((string)($timesheet['mime_type'] ?? '')) !== 'application/pdf') {
            throw new RuntimeException('Required approved customer timesheet is not normalized as PDF; re-upload is required.');
        }
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
    if (!mail_real_delivery_allowed_for_environment($config)) {
        throw new RuntimeException('Real SMTP dispatch is not allowed for this environment.');
    }
    if ((bool)($delivery['dry_run'] ?? true)) {
        throw new RuntimeException('Dry-run deliveries can never be dispatched.');
    }
    $errors = mail_validate_relay_config($config);
    if ($errors !== []) {
        throw new RuntimeException('Invalid SMTP relay configuration: ' . implode('; ', $errors));
    }
    $effective = mail_effective_delivery($config, $delivery);
    $recipientErrors = mail_validate_delivery_recipients($config, $effective['recipient'], $effective['cc']);
    if ($recipientErrors !== []) {
        throw new RuntimeException('SMTP recipient policy rejected delivery: ' . implode('; ', $recipientErrors));
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
            $effective['recipient'],
            $effective['cc'],
            $effective['subject'],
            $effective['body'],
            (string)$relay['from_email'],
            (string)($relay['from_name'] ?? 'Path Consultancy'),
            $attachments
        );
        $smtpAccepted = true;

        $pdo->prepare(
            'UPDATE email_deliveries
             SET status = "sent", sent_at = NOW(), last_error = NULL,
                 body_snapshot = CASE WHEN channel = "password_reset"
                    THEN "[beveiligingslink verwijderd na verzending]" ELSE body_snapshot END
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
        $retryState = mail_failed_delivery_retry_state($delivery, $attempt);
        $status = $retryState['status'];
        $pdo->prepare(
            'UPDATE email_deliveries
             SET status = :status, attempt_count = :attempts, last_error = :error
                 , body_snapshot = CASE WHEN channel = "password_reset" AND :scrub_secret = 1
                    THEN "[beveiligingslink verwijderd na mislukte aflevering]" ELSE body_snapshot END
             WHERE id = :id AND dry_run = 0'
        )->execute([
            ':status' => $status,
            ':scrub_secret' => $status === 'failed' ? 1 : 0,
            ':attempts' => $retryState['attempt_count'],
            ':error' => substr($error->getMessage(), 0, 500),
            ':id' => $deliveryId,
        ]);
        return 'failed';
    }
}

/** @return array{sent:int,failed:int,skipped:int} */
function mail_dispatch_queued(PDO $pdo, int $companyId, array $config, int $limit = 50): array
{
    if (!mail_real_delivery_allowed_for_environment($config)) {
        return ['sent' => 0, 'failed' => 0, 'skipped' => 0];
    }

    $limit = max(1, min(100, $limit));
    // Never send an expired password-reset link. Scrub the secret as soon as
    // its two-hour validity window has passed.
    $stale = $pdo->prepare(
        'UPDATE email_deliveries ed
         JOIN users u ON u.id = ed.user_id
         SET ed.status = "failed", ed.last_error = "password-reset-link-expired",
             ed.body_snapshot = "[verlopen beveiligingslink verwijderd]"
         WHERE ed.channel = "password_reset" AND ed.status = "queued" AND ed.dry_run = 0
           AND u.company_id = :company_id
           AND ed.created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)'
    );
    $stale->execute([':company_id' => $companyId]);
    $stmt = $pdo->prepare(
        'SELECT ed.*
         FROM email_deliveries ed
         LEFT JOIN invoices i ON i.id = ed.invoice_id
         LEFT JOIN users u ON u.id = ed.user_id
         WHERE ed.status = "queued" AND ed.dry_run = 0
           AND COALESCE(i.company_id, u.company_id) = :company_id
           AND ed.attempt_count < :max_attempts
         ORDER BY ed.created_at ASC
         LIMIT ' . $limit
    );
    $stmt->execute([':company_id' => $companyId, ':max_attempts' => MAIL_MAX_ATTEMPTS]);

    $sent = 0;
    $failed = 0;
    $skipped = 0;
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

/** @param list<array<string,mixed>> $created */
function mail_dispatch_created(PDO $pdo, array $created, array $config): array
{
    $result = ['sent' => 0, 'failed' => 0, 'skipped' => 0];
    if (!mail_dispatch_after_user_action($config)) {
        return $result;
    }

    $select = $pdo->prepare('SELECT * FROM email_deliveries WHERE id = :id AND status = "queued" LIMIT 1');
    foreach ($created as $item) {
        $deliveryId = (int)($item['id'] ?? 0);
        if ($deliveryId <= 0) {
            $result['skipped']++;
            continue;
        }
        $select->execute([':id' => $deliveryId]);
        $delivery = $select->fetch();
        if (!$delivery) {
            $result['skipped']++;
            continue;
        }
        $outcome = mail_dispatch_delivery($pdo, $delivery, $config);
        $result[array_key_exists($outcome, $result) ? $outcome : 'failed']++;
    }
    return $result;
}
