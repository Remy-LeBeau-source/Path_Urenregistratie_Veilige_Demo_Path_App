<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../lib/test-reset.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("CLI only.\n");
}

$execute = in_array('--execute', $argv, true);
$confirmed = in_array('--confirm=SEED_TEST_SEPTEMBER_ACCEPTANCE', $argv, true);

try {
    $config = auth_load_raw_config();
    if (!test_reset_remote_contract_is_exact($config)) {
        throw new RuntimeException('Septemberacceptatiecases mogen uitsluitend op de exacte gedeelde TEST-omgeving worden klaargezet.');
    }
    if ($execute && !$confirmed) {
        throw new RuntimeException('Uitvoeren vereist --confirm=SEED_TEST_SEPTEMBER_ACCEPTANCE.');
    }

    $pdo = auth_pdo($config);
    $periodCount = (int)$pdo->query(
        'SELECT COUNT(*) FROM periods WHERE company_id = 1 AND year = 2026 AND month = 9'
    )->fetchColumn();
    $timesheetCount = (int)$pdo->query(
        'SELECT COUNT(*)
         FROM timesheets t JOIN periods p ON p.id = t.period_id
         WHERE p.company_id = 1 AND p.year = 2026 AND p.month = 9'
    )->fetchColumn();
    $invoiceCount = (int)$pdo->query(
        'SELECT COUNT(*)
         FROM invoices i
         JOIN timesheets t ON t.id = i.timesheet_id
         JOIN periods p ON p.id = t.period_id
         WHERE p.company_id = 1 AND p.year = 2026 AND p.month = 9'
    )->fetchColumn();

    if (!$execute) {
        echo json_encode([
            'ok' => true,
            'mode' => 'check',
            'writes_performed' => false,
            'period_rows' => $periodCount,
            'timesheet_rows' => $timesheetCount,
            'invoice_rows' => $invoiceCount,
            'ready_for_seed' => $timesheetCount === 0 && $invoiceCount === 0,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), PHP_EOL;
        exit;
    }

    if ($timesheetCount !== 0 || $invoiceCount !== 0) {
        throw new RuntimeException('September bevat al uren of facturen. Herstel eerst de gedeelde TEST-basis; bestaande testdata wordt nooit stil overschreven.');
    }

    $pdo->beginTransaction();
    try {
        if ($periodCount === 0) {
            $pdo->exec('INSERT INTO periods (company_id, year, month, status) VALUES (1, 2026, 9, "open")');
        }
        $periodId = (int)$pdo->query(
            'SELECT id FROM periods WHERE company_id = 1 AND year = 2026 AND month = 9 LIMIT 1 FOR UPDATE'
        )->fetchColumn();
        $adminId = (int)$pdo->query(
            'SELECT id FROM users WHERE company_id = 1 AND email = "gio@example.invalid" AND role = "administrator" LIMIT 1'
        )->fetchColumn();
        if ($periodId <= 0 || $adminId <= 0) {
            throw new RuntimeException('De canonieke TEST-periode of beheerder ontbreekt.');
        }

        $definitions = [
            'Marc de Roon' => ['status' => 'draft', 'hours' => 8.0, 'customer' => 'missing', 'note' => null],
            'Brian Hek' => ['status' => 'submitted', 'hours' => 16.0, 'customer' => 'skipped', 'note' => 'Extern bevestigd: Uren in klantportaal goedgekeurd'],
            'Stasjo van Bakel' => ['status' => 'approved', 'hours' => 20.0, 'customer' => 'skipped', 'note' => 'Extern bevestigd: Uren per e-mail goedgekeurd'],
            'Shawn-Douglas Nahar' => ['status' => 'approved', 'hours' => 20.0, 'customer' => 'skipped', 'note' => 'De klanturenstaat is al rechtstreeks naar Path Backoffice gemaild.'],
        ];
        $employeeLookup = $pdo->prepare(
            'SELECT e.id AS employee_id, e.user_id, a.id AS assignment_id, a.broker_id, a.hourly_rate, a.vat_percentage
             FROM employees e
             JOIN assignments a ON a.employee_id = e.id AND a.company_id = e.company_id AND a.active = 1
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
                ':employee_note' => 'TEST ACCEPTATIE 0.9.159 — ' . $name,
                ':submitted_at' => $submitted ? '2026-09-02 09:00:00' : null,
                ':approved_at' => $approved ? '2026-09-02 09:30:00' : null,
                ':approved_by' => $approved ? $adminId : null,
            ]);
            $timesheetId = (int)$pdo->lastInsertId();
            $entryInsert->execute([
                ':timesheet_id' => $timesheetId,
                ':work_date' => '2026-09-01',
                ':hours' => min(8.0, $definition['hours']),
                ':description' => 'TEST ACCEPTATIE september — dag 1',
            ]);
            if ($definition['hours'] > 8.0) {
                $entryInsert->execute([
                    ':timesheet_id' => $timesheetId,
                    ':work_date' => '2026-09-02',
                    ':hours' => $definition['hours'] - 8.0,
                    ':description' => 'TEST ACCEPTATIE september — dag 2',
                ]);
            }

            $external = str_starts_with((string)$definition['note'], 'Extern bevestigd:');
            $direct = $name === 'Shawn-Douglas Nahar';
            $customerInsert->execute([
                ':period_id' => $periodId,
                ':employee_id' => (int)$employee['employee_id'],
                ':assignment_id' => (int)$employee['assignment_id'],
                ':status' => $definition['customer'],
                ':uploaded_at' => $direct ? '2026-09-02 09:10:00' : null,
                ':uploaded_by' => $direct ? (int)$employee['user_id'] : null,
                ':reviewed_at' => $external ? '2026-09-02 09:20:00' : null,
                ':reviewed_by' => $external ? $adminId : null,
                ':review_note' => $definition['note'],
            ]);
            $created[$name] = [
                'timesheet_id' => $timesheetId,
                'employee_id' => (int)$employee['employee_id'],
                'assignment_id' => (int)$employee['assignment_id'],
                'broker_id' => (int)$employee['broker_id'],
                'hourly_rate' => (float)$employee['hourly_rate'],
                'vat_percentage' => (float)$employee['vat_percentage'],
                'hours_status' => $definition['status'],
                'customer_timesheet_status' => $definition['customer'],
            ];
        }

        $shawn = $created['Shawn-Douglas Nahar'];
        $subtotal = round($shawn['hourly_rate'] * 20.0, 2);
        $vatAmount = round($subtotal * ($shawn['vat_percentage'] / 100), 2);
        $invoiceInsert = $pdo->prepare(
            'INSERT INTO invoices
             (company_id, timesheet_id, invoice_number, invoice_date, due_date, recipient_id,
              subtotal, vat_percentage, vat_amount, total, status, pdf_storage_key, locked_at, created_by)
             VALUES
             (1, :timesheet_id, "Bel-Shawn-2026-september", "2026-09-02", "2026-10-02", :recipient_id,
              :subtotal, :vat_percentage, :vat_amount, :total, "concept", NULL, NULL, :created_by)'
        );
        $invoiceInsert->execute([
            ':timesheet_id' => $shawn['timesheet_id'],
            ':recipient_id' => $shawn['broker_id'],
            ':subtotal' => $subtotal,
            ':vat_percentage' => $shawn['vat_percentage'],
            ':vat_amount' => $vatAmount,
            ':total' => $subtotal + $vatAmount,
            ':created_by' => $adminId,
        ]);
        $created['Shawn-Douglas Nahar']['invoice_id'] = (int)$pdo->lastInsertId();
        $created['Stasjo van Bakel']['invoice_id'] = null;

        $pdo->commit();
        echo json_encode([
            'ok' => true,
            'mode' => 'execute',
            'writes_performed' => true,
            'period' => '2026-09',
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
