<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../security/csrf.php';
require_once __DIR__ . '/../security/validation.php';
require_once __DIR__ . '/../mail/queue.php';
require_once __DIR__ . '/../mail/config.php';
require_once __DIR__ . '/../mail/dispatch.php';
require_once __DIR__ . '/../lib/simple_pdf.php';

header('Content-Type: application/json; charset=utf-8');
auth_apply_cors_headers(auth_try_load_raw_config(), 'GET, POST, OPTIONS', 'Content-Type, X-CSRF-Token');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = auth_load_raw_config();
auth_start_session_secure($config);
$pdo = auth_pdo($config);
$currentUser = auth_current_user($pdo);
auth_require_role(['administrator', 'employee'], $currentUser);

function invoices_month_name(int $month): string
{
    $names = [
        1 => 'januari',
        2 => 'februari',
        3 => 'maart',
        4 => 'april',
        5 => 'mei',
        6 => 'juni',
        7 => 'juli',
        8 => 'augustus',
        9 => 'september',
        10 => 'oktober',
        11 => 'november',
        12 => 'december',
    ];

    return $names[$month] ?? sprintf('%02d', $month);
}

function invoices_apply_template(string $template, int $year, int $month): string
{
    $resolved = str_replace(
        ['{jaar}', '{maand}', '{month}', '{year}'],
        [(string)$year, invoices_month_name($month), sprintf('%02d', $month), (string)$year],
        $template
    );

    $resolved = trim($resolved);
    if ($resolved === '') {
        return sprintf('INV-%d-%s', $year, invoices_month_name($month));
    }

    return $resolved;
}

function invoices_parse_period(?string $period): array
{
    $raw = trim((string)$period);
    if ($raw === '') {
        return [
            'has_filter' => false,
            'period' => null,
            'year' => null,
            'month' => null,
        ];
    }

    if (!preg_match('/^(\d{4})-(\d{2})$/', $raw, $matches)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-period',
            'message' => 'period must match YYYY-MM, e.g. 2026-07',
        ], 400);
    }

    $year = (int)$matches[1];
    $month = (int)$matches[2];
    if ($month < 1 || $month > 12) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-period',
            'message' => 'period month must be between 01 and 12',
        ], 400);
    }

    return [
        'has_filter' => true,
        'period' => $raw,
        'year' => $year,
        'month' => $month,
    ];
}

function invoices_employee_context(PDO $pdo, array $currentUser): array
{
    $stmt = $pdo->prepare(
        'SELECT id, company_id, user_id, full_name, active
         FROM employees
         WHERE company_id = :company_id AND user_id = :user_id
         LIMIT 1'
    );
    $stmt->execute([
        ':company_id' => (int)$currentUser['company_id'],
        ':user_id' => (int)$currentUser['id'],
    ]);
    $employee = $stmt->fetch();

    if (!$employee) {
        auth_send_json([
            'ok' => false,
            'error' => 'employee-profile-missing',
            'message' => 'Employee account is not linked to an employee record.',
        ], 403);
    }

    return [
        'id' => (int)$employee['id'],
        'company_id' => (int)$employee['company_id'],
        'full_name' => (string)$employee['full_name'],
    ];
}

function invoices_allocate_number(PDO $pdo, int $companyId, string $template, int $year, int $month): string
{
    $base = invoices_apply_template($template, $year, $month);
    $stmt = $pdo->prepare(
        'SELECT invoice_number
         FROM invoices
         WHERE company_id = :company_id AND invoice_number LIKE :prefix
         FOR UPDATE'
    );
    $stmt->execute([
        ':company_id' => $companyId,
        ':prefix' => $base . '%',
    ]);

    $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (!$existing) {
        return $base;
    }

    $maxSuffix = 1;
    $pattern = '/^' . preg_quote($base, '/') . '(?:-(\d+))?$/';

    foreach ($existing as $value) {
        $number = (string)$value;
        if (!preg_match($pattern, $number, $matches)) {
            continue;
        }

        if (!isset($matches[1]) || $matches[1] === '') {
            $maxSuffix = max($maxSuffix, 1);
            continue;
        }

        $candidateSuffix = (int)$matches[1];
        if ($candidateSuffix > $maxSuffix) {
            $maxSuffix = $candidateSuffix;
        }
    }

    return $base . '-' . (string)($maxSuffix + 1);
}

function invoices_round_money(float $value): float
{
    return round($value, 2);
}

function invoices_pdf_storage_root(array $config): string
{
    $privateRoot = auth_private_root_from_config($config);
    return rtrim($privateRoot, '/\\') . DIRECTORY_SEPARATOR . 'invoices';
}

function invoices_pdf_relative_path(int $companyId, int $invoiceId): string
{
    $token = bin2hex(random_bytes(8));
    return (string)$companyId . '/' . (string)$invoiceId . '_' . $token . '.pdf';
}

function invoices_pdf_absolute_from_key(array $config, string $storageKey): string
{
    $root = rtrim(invoices_pdf_storage_root($config), '/\\');
    return $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, ltrim($storageKey, '/\\'));
}

/**
 * Generate a server-side invoice PDF and persist it, filling pdf_storage_key.
 * Never throws: PDF generation failure must not break the invoice lock flow.
 */
function invoices_generate_and_store_pdf(PDO $pdo, array $config, int $invoiceId, int $companyId): bool
{
    try {
        $stmt = $pdo->prepare(
            'SELECT i.invoice_number, i.invoice_date, i.due_date, i.subtotal, i.vat_percentage, i.vat_amount, i.total,
                    e.full_name AS employee_name, t.billable_hours,
                    CONCAT(p.year, "-", LPAD(p.month, 2, "0")) AS period_key,
                    c.trade_name, c.legal_name, c.invoice_name_display,
                    c.address_line, c.postal_code, c.city, c.invoice_phone, c.invoice_email,
                    c.chamber_of_commerce_number, c.vat_number, c.iban, c.payment_term_days,
                    a.invoice_project_name, a.agreement_number, a.creditor_number, a.contractor_number, a.hourly_rate,
                    r.trade_name AS recipient_trade_name, r.legal_name AS recipient_legal_name,
                    r.invoice_address_line AS recipient_address_line,
                    r.invoice_postal_code AS recipient_postal_code, r.invoice_city AS recipient_city
             FROM invoices i
             JOIN timesheets t ON t.id = i.timesheet_id
             JOIN employees e ON e.id = t.employee_id
             JOIN periods p ON p.id = t.period_id
             JOIN companies c ON c.id = i.company_id
             JOIN assignments a ON a.id = t.assignment_id
             LEFT JOIN counterparties r ON r.id = i.recipient_id AND r.company_id = i.company_id
             WHERE i.id = :id AND i.company_id = :company_id
             LIMIT 1'
        );
        $stmt->execute([':id' => $invoiceId, ':company_id' => $companyId]);
        $row = $stmt->fetch();
        if (!$row) {
            return false;
        }

        $vatPercentageLabel = rtrim(rtrim(number_format((float)$row['vat_percentage'], 2, ',', '.'), '0'), ',');
        $hoursLabel = rtrim(rtrim(number_format((float)$row['billable_hours'], 2, ',', '.'), '0'), ',');
        $addressLine = trim(
            trim((string)$row['address_line']) . ' '
            . trim((string)$row['postal_code']) . ' '
            . trim((string)$row['city'])
        );

        $tradeName = trim((string)$row['trade_name']);
        $legalName = trim((string)$row['legal_name']);
        $combinedIdentity = (string)$row['invoice_name_display'] !== 'legal_only'
            && $tradeName !== ''
            && $legalName !== ''
            && strcasecmp($tradeName, $legalName) !== 0;
        $companyHeading = $combinedIdentity ? $tradeName : ($legalName !== '' ? $legalName : $tradeName);

        $recipientName = trim((string)($row['recipient_trade_name'] ?? '')) !== ''
            ? trim((string)$row['recipient_trade_name'])
            : trim((string)($row['recipient_legal_name'] ?? ''));
        $recipientAddress = trim(
            trim((string)($row['recipient_address_line'] ?? '')) . ' '
            . trim((string)($row['recipient_postal_code'] ?? '')) . ' '
            . trim((string)($row['recipient_city'] ?? ''))
        );
        $projectName = trim((string)($row['invoice_project_name'] ?? ''));
        $references = array_filter([
            'Overeenkomstnummer' => trim((string)($row['agreement_number'] ?? '')),
            'Crediteurennummer' => trim((string)($row['creditor_number'] ?? '')),
            'Nummer opdrachtuitvoerder' => trim((string)($row['contractor_number'] ?? '')),
        ]);
        $monthLabel = invoices_month_name((int)substr((string)$row['period_key'], 5, 2));
        $rateLabel = number_format((float)$row['hourly_rate'], 2, ',', '.');
        $paymentTermDays = (int)($row['payment_term_days'] ?? 30);

        $lines = [
            ['text' => 'FACTUUR ' . (string)$row['invoice_number'], 'size' => 14],
            'Factuurdatum ' . (string)$row['invoice_date'] . ' | Betreft ' . $monthLabel,
            ' ',
            ['text' => 'Facturerende onderneming', 'size' => 9],
            ['text' => $companyHeading, 'size' => 12],
            ...($combinedIdentity ? [['text' => 'Handelsnaam van ' . $legalName, 'size' => 9]] : []),
            ['text' => $addressLine, 'size' => 9],
            'KvK: ' . trim((string)$row['chamber_of_commerce_number']) . ' | Btw: ' . trim((string)$row['vat_number']),
            'IBAN: ' . trim((string)$row['iban']),
            trim((string)$row['invoice_phone']) . ' | ' . trim((string)$row['invoice_email']),
            ' ',
            ['text' => 'Factuur aan', 'size' => 9],
            ['text' => ($recipientName !== '' ? $recipientName : 'Nog te bevestigen'), 'size' => 12],
            ($recipientAddress !== '' ? $recipientAddress : 'Factuuradres: nog definitief bevestigen'),
            ...($projectName !== '' ? ['Project: ' . $projectName] : []),
            'Omschrijving: Maand ' . $monthLabel,
            ...(!empty($references) ? [' '] : []),
            ...array_map(
                fn($label, $value) => $label . ': ' . $value,
                array_keys($references),
                array_values($references)
            ),
            ' ',
            'Beste,',
            'Hierbij doe ik u de factuur toekomen betreft de volgende werkzaamheden.',
            ' ',
            ['text' => 'Omschrijving / Uren / Tarief / Totaal', 'size' => 9],
            'Maand ' . $monthLabel . '   ' . $hoursLabel . ' uur   EUR ' . $rateLabel . '/uur   EUR ' . number_format((float)$row['subtotal'], 2, ',', '.'),
            ' ',
            'Totaal exclusief: EUR ' . number_format((float)$row['subtotal'], 2, ',', '.'),
            'Btw (' . $vatPercentageLabel . '%): EUR ' . number_format((float)$row['vat_amount'], 2, ',', '.'),
            ['text' => 'Totaal inclusief: EUR ' . number_format((float)$row['total'], 2, ',', '.'), 'size' => 12],
            ' ',
            ['text' => 'Betalingsinformatie', 'size' => 9],
            'U wordt vriendelijk verzocht uw betaling binnen ' . $paymentTermDays . ' dagen van de factuurdatum over te',
            'maken op rekening: ' . trim((string)$row['iban']) . ' onder vermelding van factuurnummer: ' . (string)$row['invoice_number'],
            ' ',
            'Met vriendelijke groet,',
            ['text' => $companyHeading, 'size' => 10],
        ];

        $logoPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'path-logo.png';
        try {
            $pdfBytes = simple_pdf_branded_text_document($lines, $logoPath);
        } catch (RuntimeException $gdError) {
            // GD unavailable on this server – use plain-text fallback with consistent layout
            // to ensure mail attachment looks identical to app preview
            $pdfBytes = simple_pdf_text_document_with_branding_fallback($lines);
        }
        if (!simple_pdf_looks_valid($pdfBytes)) {
            return false;
        }

        $relative = invoices_pdf_relative_path($companyId, $invoiceId);
        $absolute = invoices_pdf_absolute_from_key($config, $relative);
        $dir = dirname($absolute);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            return false;
        }

        if (file_put_contents($absolute, $pdfBytes) === false) {
            return false;
        }

        $update = $pdo->prepare('UPDATE invoices SET pdf_storage_key = :key WHERE id = :id');
        $update->execute([':key' => $relative, ':id' => $invoiceId]);
        return true;
    } catch (Throwable $e) {
        error_log('invoices_generate_and_store_pdf failed: ' . $e->getMessage());
        return false;
    }
}

/** Secure, scoped invoice PDF download: session required, company-scoped, employee limited to own invoices. */
function invoices_download_pdf(PDO $pdo, array $config, array $currentUser, array $query): void
{
    $invoiceIdRaw = $query['invoice_id'] ?? null;
    if (!(is_string($invoiceIdRaw) && ctype_digit($invoiceIdRaw) && (int)$invoiceIdRaw > 0)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'invoice_id must be a positive integer.',
        ], 400);
    }

    $invoiceId = (int)$invoiceIdRaw;
    $companyId = (int)$currentUser['company_id'];
    $isEmployee = (string)$currentUser['role'] === 'employee';

    $sql = 'SELECT i.id, i.pdf_storage_key, i.invoice_number, t.employee_id
            FROM invoices i
            JOIN timesheets t ON t.id = i.timesheet_id
            WHERE i.id = :id AND i.company_id = :company_id
            LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $invoiceId, ':company_id' => $companyId]);
    $row = $stmt->fetch();

    if (!$row) {
        auth_send_json([
            'ok' => false,
            'error' => 'invoice-not-found',
            'message' => 'Invoice was not found in your company scope.',
        ], 404);
    }

    if ($isEmployee) {
        $employee = invoices_employee_context($pdo, $currentUser);
        if ((int)$row['employee_id'] !== (int)$employee['id']) {
            auth_send_json([
                'ok' => false,
                'error' => 'forbidden-action',
                'message' => 'Employees may only download their own invoices.',
            ], 403);
        }
    }

    $storageKey = trim((string)($row['pdf_storage_key'] ?? ''));
    if ($storageKey === '') {
        auth_send_json([
            'ok' => false,
            'error' => 'invoice-pdf-missing',
            'message' => 'For this invoice no PDF has been generated yet.',
        ], 404);
    }

    $absolutePath = invoices_pdf_absolute_from_key($config, $storageKey);
    if (!is_file($absolutePath)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invoice-pdf-missing',
            'message' => 'The stored PDF file was not found on the server.',
        ], 404);
    }

    $downloadName = 'Factuur-' . preg_replace('/[^A-Za-z0-9_-]/', '_', (string)$row['invoice_number']) . '.pdf';
    header('Content-Type: application/pdf');
    header('Content-Length: ' . (string)filesize($absolutePath));
    header('Content-Disposition: attachment; filename="' . $downloadName . '"');
    readfile($absolutePath);
    exit;
}

function invoices_read(PDO $pdo, array $currentUser, array $periodFilter): void
{
    $isEmployee = (string)$currentUser['role'] === 'employee';
    $employee = $isEmployee ? invoices_employee_context($pdo, $currentUser) : null;
    $companyId = (int)$currentUser['company_id'];

    $sql = '
        SELECT
            i.id,
            i.timesheet_id,
            i.invoice_number,
            i.invoice_date,
            i.due_date,
            i.status,
            i.locked_at,
            i.recipient_id,
            i.subtotal,
            i.vat_percentage,
            i.vat_amount,
            i.total,
            e.full_name AS employee_name,
            t.status AS timesheet_status,
            t.billable_hours,
            a.hourly_rate,
            CONCAT(p.year, "-", LPAD(p.month, 2, "0")) AS period_key
        FROM invoices i
        JOIN timesheets t ON t.id = i.timesheet_id
        JOIN employees e ON e.id = t.employee_id
        JOIN assignments a ON a.id = t.assignment_id
        JOIN periods p ON p.id = t.period_id
        WHERE i.company_id = :company_id
    ';

    if ($isEmployee && $employee) {
        $sql .= ' AND t.employee_id = :employee_id';
    }

    if ((bool)$periodFilter['has_filter']) {
        $sql .= ' AND p.year = :year AND p.month = :month';
    }

    $sql .= ' ORDER BY p.year DESC, p.month DESC, i.invoice_number DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':company_id', $companyId, PDO::PARAM_INT);
    if ($isEmployee && $employee) {
        $stmt->bindValue(':employee_id', (int)$employee['id'], PDO::PARAM_INT);
    }
    if ((bool)$periodFilter['has_filter']) {
        $stmt->bindValue(':year', (int)$periodFilter['year'], PDO::PARAM_INT);
        $stmt->bindValue(':month', (int)$periodFilter['month'], PDO::PARAM_INT);
    }
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $items = array_map(static function (array $row): array {
        $isLocked = $row['locked_at'] !== null;
        $billableHours = (float)$row['billable_hours'];
        $hourlyRate = (float)$row['hourly_rate'];
        $vatPercentage = (float)$row['vat_percentage'];

        $calculatedSubtotal = invoices_round_money($billableHours * $hourlyRate);
        $calculatedVatAmount = invoices_round_money($calculatedSubtotal * ($vatPercentage / 100));
        $calculatedTotal = invoices_round_money($calculatedSubtotal + $calculatedVatAmount);

        $subtotal = $isLocked ? (float)$row['subtotal'] : $calculatedSubtotal;
        $vatAmount = $isLocked ? (float)$row['vat_amount'] : $calculatedVatAmount;
        $total = $isLocked ? (float)$row['total'] : $calculatedTotal;

        return [
            'id' => (int)$row['id'],
            'timesheet_id' => (int)$row['timesheet_id'],
            'invoice_number' => (string)$row['invoice_number'],
            'invoice_date' => (string)$row['invoice_date'],
            'due_date' => (string)$row['due_date'],
            'employee_name' => (string)$row['employee_name'],
            'period_key' => (string)$row['period_key'],
            'status' => (string)$row['status'],
            'timesheet_status' => (string)$row['timesheet_status'],
            'recipient_id' => (int)$row['recipient_id'],
            'hourly_rate' => $hourlyRate,
            'billable_hours' => $billableHours,
            'vat_percentage' => $vatPercentage,
            'locked' => $isLocked,
            'locked_at' => $row['locked_at'] !== null ? (string)$row['locked_at'] : null,
            'subtotal' => $subtotal,
            'vat_amount' => $vatAmount,
            'total' => $total,
        ];
    }, $rows);

    auth_send_json([
        'ok' => true,
        'period_filter' => $periodFilter['period'],
        'items' => $items,
    ]);
}

function invoices_lock(PDO $pdo, array $currentUser, array $payload, array $config = []): void
{
    if ((string)$currentUser['role'] !== 'administrator') {
        auth_send_json([
            'ok' => false,
            'error' => 'forbidden-action',
            'message' => 'Only administrator can lock invoices.',
        ], 403);
    }

    $timesheetIdRaw = $payload['timesheet_id'] ?? null;
    if (!(is_int($timesheetIdRaw) && $timesheetIdRaw > 0) && !(is_string($timesheetIdRaw) && ctype_digit($timesheetIdRaw) && (int)$timesheetIdRaw > 0)) {
        auth_send_json([
            'ok' => false,
            'error' => 'invalid-payload',
            'message' => 'timesheet_id must be a positive integer.',
        ], 400);
    }

    $timesheetId = (int)$timesheetIdRaw;
    $companyId = (int)$currentUser['company_id'];

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare(
            'SELECT
                t.id AS timesheet_id,
                t.employee_id,
                t.assignment_id,
                t.status AS timesheet_status,
                t.billable_hours,
                p.id AS period_id,
                p.company_id,
                p.year,
                p.month,
                a.hourly_rate,
                a.vat_percentage,
                a.invoice_number_template,
                a.client_id,
                a.broker_id,
                c.payment_term_days,
                i.id AS invoice_id,
                i.invoice_number,
                i.status AS invoice_status,
                i.locked_at,
                i.recipient_id,
                i.subtotal,
                i.vat_amount,
                i.total,
                i.vat_percentage AS invoice_vat_percentage
             FROM timesheets t
             JOIN periods p ON p.id = t.period_id
             JOIN assignments a ON a.id = t.assignment_id
             JOIN companies c ON c.id = p.company_id
             LEFT JOIN invoices i ON i.timesheet_id = t.id
             WHERE t.id = :timesheet_id AND p.company_id = :company_id
             FOR UPDATE'
        );
        $stmt->execute([
            ':timesheet_id' => $timesheetId,
            ':company_id' => $companyId,
        ]);
        $row = $stmt->fetch();

        if (!$row) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'timesheet-not-found',
                'message' => 'Timesheet was not found in your company scope.',
            ], 404);
        }

        if ($row['invoice_id'] !== null && $row['locked_at'] !== null) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'invoice-already-locked',
                'message' => 'Invoice is already finalized and immutable.',
            ], 409);
        }

        if ($row['invoice_id'] !== null && in_array((string)$row['invoice_status'], ['sent', 'paid', 'cancelled'], true)) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'invalid-invoice-state',
                'message' => 'Invoice state does not allow re-finalization.',
            ], 409);
        }

        if ((string)$row['timesheet_status'] !== 'approved') {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'timesheet-not-approved',
                'message' => 'Only approved timesheets can be finalized into invoices.',
            ], 409);
        }

        $billableHours = (float)$row['billable_hours'];
        $hourlyRate = (float)$row['hourly_rate'];
        $vatPercentage = (float)$row['vat_percentage'];

        $subtotal = invoices_round_money($billableHours * $hourlyRate);
        $vatAmount = invoices_round_money($subtotal * ($vatPercentage / 100));
        $total = invoices_round_money($subtotal + $vatAmount);

        $invoiceDate = (new DateTimeImmutable('now'))->format('Y-m-d');
        $paymentTermDays = max(1, (int)$row['payment_term_days']);
        $dueDate = (new DateTimeImmutable($invoiceDate))->modify('+' . $paymentTermDays . ' days')->format('Y-m-d');

        $recipientId = 0;
        if ($row['invoice_id'] !== null && $row['recipient_id'] !== null) {
            $recipientId = (int)$row['recipient_id'];
        }
        if ($recipientId <= 0) {
            $recipientId = (int)($row['client_id'] ?? 0);
        }
        if ($recipientId <= 0) {
            $recipientId = (int)($row['broker_id'] ?? 0);
        }
        if ($recipientId <= 0) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'recipient-not-found',
                'message' => 'Could not determine invoice recipient for this assignment.',
            ], 409);
        }

        $invoiceNumber = trim((string)($row['invoice_number'] ?? ''));
        if ($invoiceNumber === '') {
            $template = trim((string)($row['invoice_number_template'] ?? ''));
            if ($template === '') {
                $template = 'INV-{jaar}-{maand}';
            }
            $invoiceNumber = invoices_allocate_number(
                $pdo,
                $companyId,
                $template,
                (int)$row['year'],
                (int)$row['month']
            );
        }

        if ($row['invoice_id'] === null) {
            $insert = $pdo->prepare(
                'INSERT INTO invoices
                 (company_id, timesheet_id, invoice_number, invoice_date, due_date, recipient_id,
                  subtotal, vat_percentage, vat_amount, total, status, locked_at, created_by)
                 VALUES
                 (:company_id, :timesheet_id, :invoice_number, :invoice_date, :due_date, :recipient_id,
                  :subtotal, :vat_percentage, :vat_amount, :total, :status, CURRENT_TIMESTAMP, :created_by)'
            );
            $insert->execute([
                ':company_id' => $companyId,
                ':timesheet_id' => $timesheetId,
                ':invoice_number' => $invoiceNumber,
                ':invoice_date' => $invoiceDate,
                ':due_date' => $dueDate,
                ':recipient_id' => $recipientId,
                ':subtotal' => $subtotal,
                ':vat_percentage' => $vatPercentage,
                ':vat_amount' => $vatAmount,
                ':total' => $total,
                ':status' => 'ready',
                ':created_by' => (int)$currentUser['id'],
            ]);
            $invoiceId = (int)$pdo->lastInsertId();
        } else {
            $invoiceId = (int)$row['invoice_id'];
            $update = $pdo->prepare(
                'UPDATE invoices
                 SET invoice_number = :invoice_number,
                     invoice_date = :invoice_date,
                     due_date = :due_date,
                     recipient_id = :recipient_id,
                     subtotal = :subtotal,
                     vat_percentage = :vat_percentage,
                     vat_amount = :vat_amount,
                     total = :total,
                     status = :status,
                     locked_at = CURRENT_TIMESTAMP
                 WHERE id = :id AND locked_at IS NULL'
            );
            $update->execute([
                ':invoice_number' => $invoiceNumber,
                ':invoice_date' => $invoiceDate,
                ':due_date' => $dueDate,
                ':recipient_id' => $recipientId,
                ':subtotal' => $subtotal,
                ':vat_percentage' => $vatPercentage,
                ':vat_amount' => $vatAmount,
                ':total' => $total,
                ':status' => 'ready',
                ':id' => $invoiceId,
            ]);

            if ($update->rowCount() === 0) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                auth_send_json([
                    'ok' => false,
                    'error' => 'invoice-already-locked',
                    'message' => 'Invoice is already finalized and immutable.',
                ], 409);
            }
        }

        $timesheetUpdate = $pdo->prepare(
            'UPDATE timesheets
             SET status = :status, version = version + 1
             WHERE id = :id AND status = :expected_status'
        );
        $timesheetUpdate->execute([
            ':status' => 'invoiced',
            ':id' => $timesheetId,
            ':expected_status' => 'approved',
        ]);

        if ($timesheetUpdate->rowCount() === 0) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            auth_send_json([
                'ok' => false,
                'error' => 'timesheet-state-conflict',
                'message' => 'Timesheet changed before invoice could be finalized.',
            ], 409);
        }

        $eventData = json_encode([
            'timesheet_id' => $timesheetId,
            'invoice_id' => $invoiceId,
            'invoice_number' => $invoiceNumber,
            'subtotal' => $subtotal,
            'vat_percentage' => $vatPercentage,
            'vat_amount' => $vatAmount,
            'total' => $total,
            'source' => 'webapp',
        ], JSON_UNESCAPED_UNICODE);

        $audit = $pdo->prepare(
            'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
             VALUES (:company_id, :actor_user_id, :event_type, :entity_type, :entity_id, :event_data)'
        );
        $audit->execute([
            ':company_id' => $companyId,
            ':actor_user_id' => (int)$currentUser['id'],
            ':event_type' => 'invoice.locked',
            ':entity_type' => 'invoice',
            ':entity_id' => (string)$invoiceId,
            ':event_data' => $eventData,
        ]);

        $fresh = $pdo->prepare(
            'SELECT id, timesheet_id, invoice_number, invoice_date, due_date, recipient_id,
                    subtotal, vat_percentage, vat_amount, total, status, locked_at
             FROM invoices
             WHERE id = :id
             LIMIT 1'
        );
        $fresh->execute([':id' => $invoiceId]);
        $invoice = $fresh->fetch();

        $pdo->commit();

        // Store the immutable PDF before queueing so immediate TEST dispatch can resolve attachments.
        $pdfGenerated = invoices_generate_and_store_pdf($pdo, $config, $invoiceId, $companyId);

        $queuedDeliveries = [];
        $dispatchResult = ['sent' => 0, 'failed' => 0, 'skipped' => 0];
        try {
            $mailDryRun = mail_is_dry_run($config);
            $queuedDeliveries = mail_enqueue_for_invoice($pdo, $invoiceId, $companyId, (int)$currentUser['id'], $mailDryRun);
            if ($pdfGenerated) {
                $dispatchResult = mail_dispatch_created($pdo, $queuedDeliveries, $config);
            }
        } catch (Throwable $queueError) {
            // Queue failure must never break the lock response.
            error_log('mail_enqueue_for_invoice failed: ' . $queueError->getMessage());
        }

        auth_send_json([
            'ok' => true,
            'action' => 'lock',
            'audit_event' => 'invoice.locked',
            'queued_count' => count($queuedDeliveries),
            'dispatch_result' => $dispatchResult,
            'pdf_generated' => $pdfGenerated,
            'invoice' => [
                'id' => (int)$invoice['id'],
                'timesheet_id' => (int)$invoice['timesheet_id'],
                'invoice_number' => (string)$invoice['invoice_number'],
                'invoice_date' => (string)$invoice['invoice_date'],
                'due_date' => (string)$invoice['due_date'],
                'recipient_id' => (int)$invoice['recipient_id'],
                'status' => (string)$invoice['status'],
                'locked_at' => (string)$invoice['locked_at'],
                'subtotal' => (float)$invoice['subtotal'],
                'vat_percentage' => (float)$invoice['vat_percentage'],
                'vat_amount' => (float)$invoice['vat_amount'],
                'total' => (float)$invoice['total'],
            ],
            'timesheet' => [
                'id' => $timesheetId,
                'status' => 'invoiced',
                'billable_hours' => $billableHours,
            ],
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        auth_send_json([
            'ok' => false,
            'error' => 'invoice-lock-failed',
            'message' => 'Could not finalize invoice.',
        ], 500);
    }
}

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'GET') {
    if ((string)($_GET['action'] ?? '') === 'download') {
        invoices_download_pdf($pdo, $config, $currentUser, $_GET);
    }

    $periodFilter = invoices_parse_period(isset($_GET['period']) ? (string)$_GET['period'] : null);
    invoices_read($pdo, $currentUser, $periodFilter);
}

if ($method !== 'POST') {
    auth_send_json([
        'ok' => false,
        'error' => 'method-not-allowed',
        'message' => 'Only GET and POST are allowed on this endpoint.',
    ], 405);
}

security_require_csrf_token();
$payload = security_read_json_body();
$action = security_require_enum_field($payload, 'action', ['lock'], 'Invalid invoice action.');

if ($action === 'lock') {
    invoices_lock($pdo, $currentUser, $payload, $config);
}

auth_send_json([
    'ok' => false,
    'error' => 'unsupported-action',
    'message' => 'Unsupported invoice action.',
], 400);
