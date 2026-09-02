<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../lib/test-reset.php';

/**
 * Zet een volledige "open taken"-set klaar voor de ACTUELE werkmaand op de
 * gedeelde TEST-omgeving. Bedoeld om elke week of maand opnieuw te draaien:
 * het richt zich altijd op de kalendermaand van nu (of --month=JJJJ-MM),
 * weigert een maand die al uren of facturen bevat, en maakt nooit
 * e-maildeliveries aan.
 *
 * De vier actieve TEST-medewerkers dekken samen elke open-taaksoort:
 *
 *   Marc de Roon        draft      klanturenstaat ontbreekt      -> open uren (medewerker)
 *   Brian Hek           submitted  klanturenstaat ontvangen      -> open goedkeuring + klanturenstaat controleren
 *   Stasjo van Bakel    approved   klanturenstaat goedgekeurd,   -> open brokerroute controleren + open factuur
 *                                  nog geen factuurrij              (controle maakt de serverfactuur aan)
 *   Shawn-Douglas Nahar approved   rechtstreeks gemaild,         -> open verzending controleren
 *                                  factuurrij aanwezig
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("CLI only.\n");
}

$execute = in_array('--execute', $argv, true);
$confirmed = in_array('--confirm=SEED_TEST_WORKING_MONTH', $argv, true);

$monthArg = '';
foreach ($argv as $argument) {
    if (str_starts_with((string)$argument, '--month=')) {
        $monthArg = substr((string)$argument, 8);
    }
}

$monthNamesNl = [
    1 => 'januari', 2 => 'februari', 3 => 'maart', 4 => 'april',
    5 => 'mei', 6 => 'juni', 7 => 'juli', 8 => 'augustus',
    9 => 'september', 10 => 'oktober', 11 => 'november', 12 => 'december',
];

try {
    $config = auth_load_raw_config();
    if (!test_reset_remote_contract_is_exact($config)) {
        throw new RuntimeException('Deze set mag uitsluitend op de exacte gedeelde TEST-omgeving worden klaargezet.');
    }
    if ($execute && !$confirmed) {
        throw new RuntimeException('Uitvoeren vereist --confirm=SEED_TEST_WORKING_MONTH.');
    }

    $now = new DateTimeImmutable('now');
    $year = (int)$now->format('Y');
    $month = (int)$now->format('n');
    if ($monthArg !== '') {
        if (!preg_match('/^(\d{4})-(\d{2})$/', $monthArg, $parts)) {
            throw new RuntimeException('--month verwacht het formaat JJJJ-MM.');
        }
        $year = (int)$parts[1];
        $month = (int)$parts[2];
        if ($month < 1 || $month > 12) {
            throw new RuntimeException('--month bevat een ongeldige maand.');
        }
    }
    $monthNameNl = $monthNamesNl[$month];
    $periodKey = sprintf('%04d-%02d', $year, $month);

    $firstDay = new DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));
    $workday1 = $firstDay;
    while ((int)$workday1->format('N') >= 6) {
        $workday1 = $workday1->modify('+1 day');
    }
    $workday2 = $workday1->modify('+1 day');
    while ((int)$workday2->format('N') >= 6) {
        $workday2 = $workday2->modify('+1 day');
    }
    $submittedAt = $workday2->format('Y-m-d') . ' 09:00:00';
    $approvedAt = $workday2->format('Y-m-d') . ' 09:30:00';
    $uploadedAt = $workday2->format('Y-m-d') . ' 09:10:00';
    $reviewedAt = $workday2->format('Y-m-d') . ' 09:20:00';
    $invoiceDate = sprintf('%04d-%02d-02', $year, $month);
    $dueDate = (new DateTimeImmutable($invoiceDate))->modify('+30 days')->format('Y-m-d');

    $pdo = auth_pdo($config);

    $periodCountStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM periods WHERE company_id = 1 AND year = :year AND month = :month'
    );
    $periodCountStmt->execute([':year' => $year, ':month' => $month]);
    $periodCount = (int)$periodCountStmt->fetchColumn();

    $timesheetCountStmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM timesheets t JOIN periods p ON p.id = t.period_id
         WHERE p.company_id = 1 AND p.year = :year AND p.month = :month'
    );
    $timesheetCountStmt->execute([':year' => $year, ':month' => $month]);
    $timesheetCount = (int)$timesheetCountStmt->fetchColumn();

    $invoiceCountStmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM invoices i
         JOIN timesheets t ON t.id = i.timesheet_id
         JOIN periods p ON p.id = t.period_id
         WHERE p.company_id = 1 AND p.year = :year AND p.month = :month'
    );
    $invoiceCountStmt->execute([':year' => $year, ':month' => $month]);
    $invoiceCount = (int)$invoiceCountStmt->fetchColumn();

    if (!$execute) {
        echo json_encode([
            'ok' => true,
            'mode' => 'check',
            'writes_performed' => false,
            'target_month' => $periodKey,
            'period_rows' => $periodCount,
            'timesheet_rows' => $timesheetCount,
            'invoice_rows' => $invoiceCount,
            'ready_for_seed' => $timesheetCount === 0 && $invoiceCount === 0,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), PHP_EOL;
        exit;
    }

    if ($timesheetCount !== 0 || $invoiceCount !== 0) {
        throw new RuntimeException(
            $periodKey . ' bevat al uren of facturen. Herstel eerst de gedeelde TEST-basis; bestaande testdata wordt nooit stil overschreven.'
        );
    }

    $pdo->beginTransaction();
    try {
        if ($periodCount === 0) {
            $pdo->prepare('INSERT INTO periods (company_id, year, month, status) VALUES (1, :year, :month, "open")')
                ->execute([':year' => $year, ':month' => $month]);
        }
        $periodStmt = $pdo->prepare(
            'SELECT id FROM periods WHERE company_id = 1 AND year = :year AND month = :month LIMIT 1 FOR UPDATE'
        );
        $periodStmt->execute([':year' => $year, ':month' => $month]);
        $periodId = (int)$periodStmt->fetchColumn();

        $adminId = (int)$pdo->query(
            'SELECT id FROM users WHERE company_id = 1 AND email = "gio@example.invalid" AND role = "administrator" LIMIT 1'
        )->fetchColumn();
        if ($adminId <= 0) {
            $adminId = (int)$pdo->query(
                'SELECT id FROM users WHERE company_id = 1 AND role = "administrator" AND active = 1 ORDER BY id LIMIT 1'
            )->fetchColumn();
        }
        if ($periodId <= 0 || $adminId <= 0) {
            throw new RuntimeException('De canonieke TEST-periode of beheerder ontbreekt.');
        }

        // status: draft | submitted | approved
        // customer: missing | received | approved | skipped
        // invoice: true (factuurrij aanmaken) | false
        $definitions = [
            'Marc de Roon' => [
                'status' => 'draft', 'hours' => 8.0, 'customer' => 'missing', 'invoice' => false,
                'note' => null,
            ],
            'Brian Hek' => [
                'status' => 'submitted', 'hours' => 16.0, 'customer' => 'received', 'invoice' => false,
                'note' => null,
            ],
            'Stasjo van Bakel' => [
                'status' => 'approved', 'hours' => 20.0, 'customer' => 'approved', 'invoice' => false,
                'note' => 'Klanturenstaat gecontroleerd en goedgekeurd door Backoffice.',
            ],
            'Shawn-Douglas Nahar' => [
                'status' => 'approved', 'hours' => 20.0, 'customer' => 'skipped', 'invoice' => true,
                'note' => 'De klanturenstaat is al rechtstreeks naar Path Backoffice gemaild.',
            ],
        ];

        $employeeLookup = $pdo->prepare(
            'SELECT e.id AS employee_id, e.user_id, a.id AS assignment_id, a.broker_id,
                    a.hourly_rate, a.vat_percentage, a.invoice_number_template, cp.legal_name AS client_name
             FROM employees e
             JOIN assignments a ON a.employee_id = e.id AND a.company_id = e.company_id AND a.active = 1
             LEFT JOIN counterparties cp ON cp.id = a.client_id AND cp.company_id = e.company_id
             WHERE e.company_id = 1 AND e.full_name = :name AND e.active = 1
             ORDER BY a.id LIMIT 1'
        );
        $timesheetInsert = $pdo->prepare(
            'INSERT INTO timesheets
             (period_id, employee_id, assignment_id, contractual_hours, billable_hours, leave_hours,
              sickness_hours, status, employee_note, submitted_at, approved_at, approved_by, version)
             VALUES
             (:period_id, :employee_id, :assignment_id, 160, :hours, 0, 0, :status, :employee_note,
              :submitted_at, :approved_at, :approved_by, 1)'
        );
        $entryInsert = $pdo->prepare(
            'INSERT INTO time_entries (timesheet_id, work_date, entry_type, hours, description)
             VALUES (:timesheet_id, :work_date, "billable", :hours, :description)'
        );
        $customerInsert = $pdo->prepare(
            'INSERT INTO customer_timesheets
             (period_id, employee_id, assignment_id, status, mime_type, uploaded_at, uploaded_by,
              reviewed_at, reviewed_by, review_note)
             VALUES
             (:period_id, :employee_id, :assignment_id, :status, "application/pdf", :uploaded_at,
              :uploaded_by, :reviewed_at, :reviewed_by, :review_note)'
        );

        $created = [];
        foreach ($definitions as $name => $definition) {
            $employeeLookup->execute([':name' => $name]);
            $employee = $employeeLookup->fetch();
            if (!$employee) {
                throw new RuntimeException('Actieve TEST-medewerker of opdracht ontbreekt: ' . $name);
            }

            $submitted = in_array($definition['status'], ['submitted', 'approved'], true);
            $approved = $definition['status'] === 'approved';
            $timesheetInsert->execute([
                ':period_id' => $periodId,
                ':employee_id' => (int)$employee['employee_id'],
                ':assignment_id' => (int)$employee['assignment_id'],
                ':hours' => $definition['hours'],
                ':status' => $definition['status'],
                ':employee_note' => 'TEST WERKMAAND ' . $periodKey . ' — ' . $name,
                ':submitted_at' => $submitted ? $submittedAt : null,
                ':approved_at' => $approved ? $approvedAt : null,
                ':approved_by' => $approved ? $adminId : null,
            ]);
            $timesheetId = (int)$pdo->lastInsertId();

            $entryInsert->execute([
                ':timesheet_id' => $timesheetId,
                ':work_date' => $workday1->format('Y-m-d'),
                ':hours' => min(8.0, $definition['hours']),
                ':description' => 'TEST werkmaand ' . $monthNameNl . ' — dag 1',
            ]);
            if ($definition['hours'] > 8.0) {
                $entryInsert->execute([
                    ':timesheet_id' => $timesheetId,
                    ':work_date' => $workday2->format('Y-m-d'),
                    ':hours' => $definition['hours'] - 8.0,
                    ':description' => 'TEST werkmaand ' . $monthNameNl . ' — dag 2',
                ]);
            }

            $customerStatus = $definition['customer'];
            $hasUpload = in_array($customerStatus, ['received', 'approved'], true);
            $hasReview = in_array($customerStatus, ['approved', 'skipped'], true);
            $customerInsert->execute([
                ':period_id' => $periodId,
                ':employee_id' => (int)$employee['employee_id'],
                ':assignment_id' => (int)$employee['assignment_id'],
                ':status' => $customerStatus,
                ':uploaded_at' => $hasUpload ? $uploadedAt : null,
                ':uploaded_by' => $hasUpload ? (int)$employee['user_id'] : null,
                ':reviewed_at' => $hasReview ? $reviewedAt : null,
                ':reviewed_by' => $hasReview ? $adminId : null,
                ':review_note' => $definition['note'],
            ]);

            $invoiceId = null;
            if ($definition['invoice'] === true) {
                $template = trim((string)($employee['invoice_number_template'] ?? ''));
                if ($template === '') {
                    $template = 'INV-{jaar}-{maand}';
                }
                $clientToken = preg_replace('/[^A-Za-z0-9]+/', '', (string)($employee['client_name'] ?? '')) ?: 'Klant';
                $invoiceNumber = str_replace(
                    ['{jaar}', '{maand}', '{month}', '{year}', '{klant}'],
                    [(string)$year, $monthNameNl, sprintf('%02d', $month), (string)$year, $clientToken],
                    $template
                );
                $subtotal = round(((float)$employee['hourly_rate']) * (float)$definition['hours'], 2);
                $vatAmount = round($subtotal * (((float)$employee['vat_percentage']) / 100), 2);
                $invoiceInsert = $pdo->prepare(
                    'INSERT INTO invoices
                     (company_id, timesheet_id, invoice_number, invoice_date, due_date, recipient_id,
                      subtotal, vat_percentage, vat_amount, total, status, pdf_storage_key, locked_at, created_by)
                     VALUES
                     (1, :timesheet_id, :invoice_number, :invoice_date, :due_date, :recipient_id,
                      :subtotal, :vat_percentage, :vat_amount, :total, "concept", NULL, NULL, :created_by)'
                );
                $invoiceInsert->execute([
                    ':timesheet_id' => $timesheetId,
                    ':invoice_number' => $invoiceNumber,
                    ':invoice_date' => $invoiceDate,
                    ':due_date' => $dueDate,
                    ':recipient_id' => (int)$employee['broker_id'],
                    ':subtotal' => $subtotal,
                    ':vat_percentage' => (float)$employee['vat_percentage'],
                    ':vat_amount' => $vatAmount,
                    ':total' => $subtotal + $vatAmount,
                    ':created_by' => $adminId,
                ]);
                $invoiceId = (int)$pdo->lastInsertId();
            }

            $created[$name] = [
                'timesheet_id' => $timesheetId,
                'hours_status' => $definition['status'],
                'customer_timesheet_status' => $customerStatus,
                'invoice_id' => $invoiceId,
            ];
        }

        $pdo->commit();
        echo json_encode([
            'ok' => true,
            'mode' => 'execute',
            'writes_performed' => true,
            'target_month' => $periodKey,
            'cases' => $created,
            'email_deliveries_created' => 0,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), PHP_EOL;
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
