<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';

/**
 * Eenmalige, gecontroleerde normalisatie van de PROD-database naar de
 * afgesproken go-live basis, zodat de initial-baseline preflight
 * (server/scripts/production-preflight.php --live --initial-baseline) slaagt.
 *
 * Achtergrond: de eerste run van migrate-test-masterdata-to-production.php nam
 * employment_start_date letterlijk over uit de TEST-seed (1 jan / 1 jul 2026).
 * Daarnaast heeft de draaiende app lege `periods`-hulzen en enkele
 * account-opzetmails (`email_deliveries`) aangemaakt. De baseline-gate eist
 * echter: alle medewerkers starten in de go-live-maand en de operationele
 * tabellen zijn leeg.
 *
 * Wat dit script WEL doet (company_id = 1):
 *   - employees.employment_start_date  -> PROD_GOLIVE_START_DATE
 *   - assignments.start_date           -> PROD_GOLIVE_START_DATE
 *   - leegt de 10 operationele tabellen die de gate telt
 *
 * Wat dit script NIET doet: stamdata (namen, e-mails, relaties, mailroutes,
 * facturatiebedrijf, functietitels, contracttype) blijft ongemoeid. Die zijn
 * door de migratie al correct en worden door de gate goedgekeurd.
 *
 * Veiligheid:
 *   - draait alleen tegen environment=production met exact het PROD-origin;
 *   - weigert als er ECHTE operationele data staat (timesheets, time_entries,
 *     timesheet_corrections, customer_timesheets, invoices, announcements != 0);
 *   - eist exact 2 verwachte actieve beheerders en exact de 5 verwachte
 *     actieve medewerkers;
 *   - alles in EEN transactie met een post-check; bij twijfel volgt rollback.
 *
 * Uitvoeren (op de PROD-server, vanuit de app-root):
 *   php server/scripts/normalize-production-golive-baseline.php
 *       -> informatief, schrijft niets
 *   php server/scripts/normalize-production-golive-baseline.php --execute \
 *       --confirm=NORMALIZE_PRODUCTION_GOLIVE_BASELINE
 *       -> voert de normalisatie uit
 *
 * Idempotent: een tweede run zet dezelfde datums en laat de dan al lege
 * tabellen leeg. "We blijven doorgaan tot er staat wat we willen" == opnieuw
 * draaien tot de preflight `"ok": true` geeft.
 */

// Pas deze datum aan als de go-live verschuift. Zelfde waarde als
// PROD_EMPLOYMENT_START_DATE in migrate-test-masterdata-to-production.php.
const PROD_GOLIVE_START_DATE = '2026-09-01';

const EXPECTED_ADMIN_EMAILS = [
    'giovanno.maatsen@pathconsultancy.nl',
    'info@pathconsultancy.nl',
];

const EXPECTED_EMPLOYEE_NAMES = [
    'Brian Hek',
    'Marc de Roon',
    'PROD Pilot Medewerker',
    'Shawn-Douglas Nahar',
    'Stasjo van Bakel',
];

// Non-zero blokkeert de normalisatie: hier zou echte ingevoerde data staan.
const MUST_BE_EMPTY_BEFORE = [
    'timesheets', 'time_entries', 'timesheet_corrections',
    'customer_timesheets', 'invoices', 'announcements',
];

// Wordt door dit script geleegd. Volgorde = kind vóór ouder.
const OPERATIONAL_TABLES_CLEARED = [
    'notifications',
    'announcement_recipients',
    'email_deliveries',
    'announcements',
    'invoices',
    'timesheet_corrections',
    'time_entries',
    'customer_timesheets',
    'timesheets',
    'periods',
];

$options = ops_options($argv);
$execute = ($options['execute'] ?? false) === true;

try {
    $config = ops_load_config($options);

    $environment = strtolower(trim((string)($config['environment'] ?? '')));
    $origin = rtrim((string)($config['app_origin'] ?? ($config['app']['app_origin'] ?? '')), '/');
    if ($environment !== 'production' || $origin !== 'https://uren.pathconsultancy.nl') {
        throw new RuntimeException('Alleen uitvoerbaar tegen de echte productieomgeving.');
    }

    if (!$execute) {
        ops_print([
            'ok' => true,
            'mode' => 'usage',
            'writes_performed' => false,
            'target_start_date' => PROD_GOLIVE_START_DATE,
            'would_update' => ['employees.employment_start_date', 'assignments.start_date'],
            'would_clear' => OPERATIONAL_TABLES_CLEARED,
            'refuses_if_non_empty' => MUST_BE_EMPTY_BEFORE,
            'message' => 'Informational only. Herhaal met --execute --confirm=NORMALIZE_PRODUCTION_GOLIVE_BASELINE.',
        ]);
    }

    if (($options['confirm'] ?? '') !== 'NORMALIZE_PRODUCTION_GOLIVE_BASELINE') {
        throw new RuntimeException('Uitvoeren vereist --confirm=NORMALIZE_PRODUCTION_GOLIVE_BASELINE.');
    }

    $pdo = ops_pdo($config);

    // --- Preconditie: exact de verwachte accounts -------------------------
    $adminEmails = $pdo->query(
        "SELECT LOWER(email) FROM users WHERE company_id = 1 AND role = 'administrator' AND active = 1 ORDER BY email"
    )->fetchAll(PDO::FETCH_COLUMN);
    $expectedAdmins = EXPECTED_ADMIN_EMAILS;
    sort($expectedAdmins);
    $seenAdmins = $adminEmails;
    sort($seenAdmins);
    if ($seenAdmins !== $expectedAdmins) {
        throw new RuntimeException('PROD heeft niet exact de twee verwachte actieve beheerders; normalisatie geblokkeerd.');
    }

    $employeeNames = $pdo->query(
        'SELECT full_name FROM employees WHERE company_id = 1 AND active = 1 ORDER BY full_name'
    )->fetchAll(PDO::FETCH_COLUMN);
    $expectedEmployees = EXPECTED_EMPLOYEE_NAMES;
    sort($expectedEmployees);
    $seenEmployees = $employeeNames;
    sort($seenEmployees);
    if ($seenEmployees !== $expectedEmployees) {
        throw new RuntimeException('PROD heeft niet exact de vijf verwachte actieve medewerkers; normalisatie geblokkeerd.');
    }

    // --- Preconditie: geen echte operationele data ----------------------
    $before = [];
    foreach (array_unique(array_merge(MUST_BE_EMPTY_BEFORE, OPERATIONAL_TABLES_CLEARED)) as $table) {
        $before[$table] = (int)$pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
    }
    foreach (MUST_BE_EMPTY_BEFORE as $table) {
        if ($before[$table] !== 0) {
            throw new RuntimeException(
                'PROD bevat echte operationele data (' . $table . ' = ' . $before[$table]
                . '). Stop en overleg; dit script wist die niet automatisch.'
            );
        }
    }

    $startBefore = $pdo->query(
        "SELECT e.full_name, e.employment_start_date, a.start_date AS assignment_start
         FROM employees e
         LEFT JOIN assignments a ON a.employee_id = e.id AND a.active = 1
         WHERE e.company_id = 1 AND e.active = 1
         ORDER BY e.full_name"
    )->fetchAll();

    // --- Uitvoeren -----------------------------------------------------
    $pdo->beginTransaction();

    $updateEmployees = $pdo->prepare(
        'UPDATE employees SET employment_start_date = :d WHERE company_id = 1'
    );
    $updateEmployees->execute([':d' => PROD_GOLIVE_START_DATE]);
    $employeesTouched = $updateEmployees->rowCount();

    $updateAssignments = $pdo->prepare(
        'UPDATE assignments SET start_date = :d WHERE company_id = 1'
    );
    $updateAssignments->execute([':d' => PROD_GOLIVE_START_DATE]);
    $assignmentsTouched = $updateAssignments->rowCount();

    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    $cleared = [];
    foreach (OPERATIONAL_TABLES_CLEARED as $table) {
        $cleared[$table] = $pdo->exec('DELETE FROM ' . $table);
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

    // --- Post-check binnen de transactie -----------------------------
    $startAfter = $pdo->query(
        "SELECT e.full_name, e.employment_start_date, a.start_date AS assignment_start
         FROM employees e
         LEFT JOIN assignments a ON a.employee_id = e.id AND a.active = 1
         WHERE e.company_id = 1 AND e.active = 1
         ORDER BY e.full_name"
    )->fetchAll();
    foreach ($startAfter as $row) {
        if ((string)$row['employment_start_date'] !== PROD_GOLIVE_START_DATE) {
            throw new RuntimeException('Post-check: employment_start_date niet gelijk voor ' . $row['full_name'] . '.');
        }
        if ($row['assignment_start'] !== null && (string)$row['assignment_start'] !== PROD_GOLIVE_START_DATE) {
            throw new RuntimeException('Post-check: assignment start_date niet gelijk voor ' . $row['full_name'] . '.');
        }
    }
    $after = [];
    foreach (OPERATIONAL_TABLES_CLEARED as $table) {
        $after[$table] = (int)$pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
        if ($after[$table] !== 0) {
            throw new RuntimeException('Post-check: ' . $table . ' niet leeg (' . $after[$table] . ').');
        }
    }

    $pdo->commit();

    ops_print([
        'ok' => true,
        'mode' => 'execute',
        'writes_performed' => true,
        'target_start_date' => PROD_GOLIVE_START_DATE,
        'employees_updated' => $employeesTouched,
        'assignments_updated' => $assignmentsTouched,
        'rows_deleted' => $cleared,
        'counts_before' => $before,
        'counts_after' => $after,
        'start_dates_before' => $startBefore,
        'start_dates_after' => $startAfter,
        'next_step' => 'php server/scripts/production-preflight.php --live --initial-baseline  (verwacht ok:true)',
    ]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ops_print([
        'ok' => false,
        'writes_performed' => false,
        'error' => $error->getMessage(),
    ], 1);
}
