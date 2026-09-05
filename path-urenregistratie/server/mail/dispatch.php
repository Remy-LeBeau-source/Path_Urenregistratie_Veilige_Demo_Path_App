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

/**
 * De echte gegevens van de laatst verzonden factuur van de vaste organisatie.
 *
 * De acceptatietest liet hier vaste verzonnen waarden zien (PATH-2026-007,
 * 144 uur, mei/juni-bedragen). Dat verwarde: het factuurnummer moet de echte
 * per-opdracht-nummering volgen en pas meeschuiven als er een nieuwe maand- of
 * jaarfactuur bij komt. Dit leest die laatste echte factuur uit.
 *
 * @return array{invoice_number:string,employee_name:string,year:int,month:int,billable_hours:float,subtotal:float,vat_amount:float,total:float}
 */
function mail_acceptance_business_snapshot(?PDO $pdo): array
{
    $row = false;
    if ($pdo instanceof PDO) {
        try {
            $stmt = $pdo->query(
                'SELECT i.invoice_number, i.subtotal, i.vat_amount, i.total, i.pdf_storage_key,
                        p.year, p.month, t.billable_hours, e.full_name AS employee_name
                 FROM invoices i
                 JOIN timesheets t ON t.id = i.timesheet_id
                 JOIN periods p ON p.id = t.period_id
                 JOIN employees e ON e.id = t.employee_id
                 WHERE i.company_id = (SELECT MIN(id) FROM companies) AND i.status = "sent"
                 ORDER BY p.year DESC, p.month DESC, i.id DESC
                 LIMIT 1'
            );
            $row = $stmt !== false ? $stmt->fetch() : false;
        } catch (Throwable $e) {
            $row = false;
        }
    }
    if (!is_array($row)) {
        // Verse database zonder verzonden factuur: neutrale, herkenbaar niet-echte
        // waarden -- nog steeds geen verzonnen persoonsnaam of factuurnummer.
        return [
            'invoice_number' => 'ACCEPTATIETEST-GEEN-VERZONDEN-FACTUUR',
            'employee_name' => 'Acceptatietest medewerker',
            'year' => (int)date('Y'), 'month' => (int)date('n'),
            'billable_hours' => 0.0, 'subtotal' => 0.0, 'vat_amount' => 0.0, 'total' => 0.0,
            'pdf_storage_key' => '',
        ];
    }
    return [
        'invoice_number' => (string)$row['invoice_number'],
        'employee_name' => (string)$row['employee_name'],
        'year' => (int)$row['year'],
        'month' => (int)$row['month'],
        'billable_hours' => (float)$row['billable_hours'],
        'subtotal' => (float)$row['subtotal'],
        'vat_amount' => (float)$row['vat_amount'],
        'total' => (float)$row['total'],
        'pdf_storage_key' => (string)($row['pdf_storage_key'] ?? ''),
    ];
}

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
function mail_acceptance_test_attachment_names(?PDO $pdo, string $policy): array
{
    $snap = mail_acceptance_business_snapshot($pdo);
    $veiligNummer = preg_replace('/[^A-Za-z0-9_-]/', '_', $snap['invoice_number']) ?: 'factuur';
    $veiligeMedewerker = preg_replace('/[^A-Za-z0-9_-]/', '_', $snap['employee_name']) ?: 'medewerker';
    $factuur = "ACCEPTATIETEST-NIET-BOEKEN-Factuur-{$veiligNummer}.pdf";
    $klanturenstaat = sprintf('ACCEPTATIETEST-NIET-BOEKEN-Klanturenstaat-%s-%04d-%02d.pdf',
        $veiligeMedewerker, $snap['year'], $snap['month']);
    return match ($policy) {
        'none' => [],
        'invoice' => [$factuur],
        'customer_timesheet' => [$klanturenstaat],
        'invoice_and_customer_timesheet' => [$factuur, $klanturenstaat],
        default => throw new RuntimeException('Unsupported attachment policy.'),
    };
}

/**
 * De echte, opgeslagen PDF van de laatst verzonden factuur -- exact wat een
 * ontvanger normaal krijgt (de branded jsPDF-factuur). Null als er geen
 * verzonden factuur is of het bestand niet op schijf staat.
 *
 * @return array{filename:string,mime:string,data:string}|null
 */
function mail_acceptance_real_invoice_attachment(?PDO $pdo, array $config): ?array
{
    if (!($pdo instanceof PDO) || $config === []) {
        return null;
    }
    $snap = mail_acceptance_business_snapshot($pdo);
    $key = (string)($snap['pdf_storage_key'] ?? '');
    if ($key === '') {
        return null;
    }
    $path = mail_storage_path($config, 'invoices', $key);
    if ($path === null) {
        return null;
    }
    $bytes = @file_get_contents($path);
    if ($bytes === false || $bytes === '' || !simple_pdf_looks_valid($bytes)) {
        return null;
    }
    // Alleen een echte factuur-PDF spiegelen: de branded jsPDF-conceptfactuur uit
    // de browser, of een fors branded serverdocument. Het lege placeholder-PDF dat
    // test-reset.php aan de geseede baseline-facturen hangt ("PATH CONSULTANCY .
    // TESTDOCUMENT") is geen factuur -- dan valt de acceptatiemail terug op het
    // gegenereerde NIET-BOEKEN-document met nummer, naam, uren en bedragen.
    $isJsPdf = (bool)preg_match('/\/Producer\s*\(jsPDF/', $bytes);
    $isTestResetPlaceholder = str_contains($bytes, 'TESTDOCUMENT');
    if ($isTestResetPlaceholder || (!$isJsPdf && strlen($bytes) < 20000)) {
        return null;
    }
    $veiligNummer = preg_replace('/[^A-Za-z0-9_-]/', '_', $snap['invoice_number']) ?: 'factuur';
    return [
        'filename' => "ACCEPTATIETEST-NIET-BOEKEN-Factuur-{$veiligNummer}.pdf",
        'mime' => 'application/pdf',
        'data' => base64_encode($bytes),
    ];
}

/** @return list<array{filename:string,mime:string,data:string}> */
function mail_acceptance_test_attachments(?PDO $pdo, string $policy, array $config = []): array
{
    $expected = mail_expected_attachment_count($policy);
    if ($expected === 0) {
        return [];
    }
    $snap = mail_acceptance_business_snapshot($pdo);
    $maanden = [1 => 'januari', 'februari', 'maart', 'april', 'mei', 'juni',
        'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    $periode = ($maanden[$snap['month']] ?? (string)$snap['month']) . ' ' . $snap['year'];
    $regels = [
        ['text' => 'ACCEPTATIETEST - NIET BOEKEN OF VERWERKEN', 'size' => 14],
        ['text' => 'FACTUUR ' . $snap['invoice_number'], 'size' => 14],
        'Betreft ' . $periode,
        ' ',
        'Path Consultancy - handelsnaam van QSI Consultancy B.V.',
        'Medewerker: ' . $snap['employee_name'],
        'Gewerkte uren: ' . number_format($snap['billable_hours'], 2, ',', '.'),
        ' ',
        'Totaal exclusief: EUR ' . number_format($snap['subtotal'], 2, ',', '.'),
        'Btw: EUR ' . number_format($snap['vat_amount'], 2, ',', '.'),
        ['text' => 'Totaal inclusief: EUR ' . number_format($snap['total'], 2, ',', '.'), 'size' => 12],
        ' ',
        'Dit document herhaalt de laatste echte verzonden factuur en dient uitsluitend',
        'om het mailtransport te controleren. Niet boeken of verwerken.',
    ];
    // Dezelfde branded server-generator als de echte factuur: Path-logo en kopbalk,
    // geen platte tekst-PDF meer. Zonder GD valt het terug op de branded layout
    // zonder logo-afbeelding.
    $logoPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'path-logo.png';
    try {
        $pdf = simple_pdf_branded_text_document($regels, $logoPath);
    } catch (Throwable $gdError) {
        $pdf = simple_pdf_text_document_with_branding_fallback($regels);
    }
    if (!simple_pdf_looks_valid($pdf)) {
        throw new RuntimeException('Acceptance test PDF could not be generated.');
    }
    // Als er een echte verzonden factuur is, stuurt de acceptatietest die echte
    // PDF mee (de branded jsPDF-factuur) -- alleen met een ACCEPTATIETEST-naam.
    // Zo ziet elke medewerker er identiek uit en test dit het echte
    // bijlagepad. Zonder echte factuur valt het terug op het gegenereerde
    // NIET-BOEKEN-document.
    $realInvoice = mail_acceptance_real_invoice_attachment($pdo, $config);
    $attachments = array_map(
        static function (string $filename) use ($pdf, $realInvoice): array {
            if ($realInvoice !== null && str_contains($filename, 'Factuur')) {
                return ['filename' => $filename, 'mime' => 'application/pdf', 'data' => $realInvoice['data']];
            }
            return ['filename' => $filename, 'mime' => 'application/pdf', 'data' => base64_encode($pdf)];
        },
        mail_acceptance_test_attachment_names($pdo, $policy)
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
        return mail_acceptance_test_attachments($pdo, $policy, $config);
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
            $attachments,
            $effective['html'] !== '' ? $effective['html'] : null
        );
        $smtpAccepted = true;

        $pdo->prepare(
            'UPDATE email_deliveries
             SET status = "sent", sent_at = NOW(), last_error = NULL,
                 body_snapshot = CASE WHEN channel = "password_reset"
                    THEN "[beveiligingslink verwijderd na verzending]" ELSE body_snapshot END,
                 html_snapshot = CASE WHEN channel = "password_reset"
                    THEN "[beveiligingslink verwijderd na verzending]" ELSE html_snapshot END
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
                 , html_snapshot = CASE WHEN channel = "password_reset" AND :scrub_secret_html = 1
                    THEN "[beveiligingslink verwijderd na mislukte aflevering]" ELSE html_snapshot END
             WHERE id = :id AND dry_run = 0'
        )->execute([
            ':status' => $status,
            ':scrub_secret' => $status === 'failed' ? 1 : 0,
            ':scrub_secret_html' => $status === 'failed' ? 1 : 0,
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
             ed.body_snapshot = "[verlopen beveiligingslink verwijderd]",
             ed.html_snapshot = "[verlopen beveiligingslink verwijderd]"
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
