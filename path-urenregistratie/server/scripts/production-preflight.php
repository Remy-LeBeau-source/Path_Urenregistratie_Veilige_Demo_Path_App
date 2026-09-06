<?php

declare(strict_types=1);

/**
 * Production configuration preflight.
 *
 * Default mode is static and non-mutating. Pass --live to validate the
 * configured database and production-account hygiene without changing data.
 */

require_once __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../mail/config.php';

$options = ops_options($argv);

try {
    $config = ops_load_config($options);
    $security = isset($config['security']) && is_array($config['security']) ? $config['security'] : [];
    $storage = isset($config['storage']) && is_array($config['storage']) ? $config['storage'] : [];
    $logging = isset($config['logging']) && is_array($config['logging']) ? $config['logging'] : [];
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    $origin = rtrim((string)($config['app_origin'] ?? ($config['app']['app_origin'] ?? '')), '/');
    $privateRoot = ops_private_root($config);
    $backupDir = trim((string)($storage['backup_dir'] ?? '')) ?: $privateRoot . '/backups';
    $logFile = trim((string)($logging['error_log'] ?? '')) ?: $privateRoot . '/logs/php-error.log';
    $expectedOrigin = 'https://uren.pathconsultancy.nl';

    $requiredFiles = [
        dirname(__DIR__) . '/migrations/011_mail_bundle_attachment_policy.sql',
        dirname(__DIR__) . '/migrations/012_invoice_company_identity.sql',
        dirname(__DIR__) . '/migrations/013_password_reset_delivery.sql',
        dirname(__DIR__) . '/migrations/014_mail_acceptance_test.sql',
        __DIR__ . '/mail-dispatch.php',
        __DIR__ . '/database-backup.php',
        __DIR__ . '/database-restore.php',
        __DIR__ . '/rotate-logs.php',
        __DIR__ . '/configure-production.php',
        __DIR__ . '/configure-production-mail-pilot.php',
        __DIR__ . '/provision-company.php',
        __DIR__ . '/provision-account.php',
        dirname(__DIR__) . '/auth/change-password.php',
        dirname(__DIR__, 2) . '/.htaccess',
    ];
    $checks = [
        'environment_production' => ($config['environment'] ?? ($config['app']['environment'] ?? '')) === 'production',
        'production_origin_exact' => $origin === $expectedOrigin,
        'demo_migrations_disabled' => ($config['allow_demo_migrations'] ?? true) === false,
        'https_required' => ($security['require_https'] ?? false) === true,
        'cors_origin_exact' => ($security['cors_allowed_origins'] ?? []) === [$expectedOrigin],
        'csp_configured' => trim((string)($security['content_security_policy'] ?? '')) !== '',
        'hsts_prepared_but_disabled' => ($security['hsts_enabled'] ?? true) === false
            && (int)($security['hsts_max_age'] ?? 0) >= 31536000,
        'private_storage_outside_webroot' => ops_is_outside_webroot($privateRoot),
        'backups_outside_webroot' => ops_is_outside_webroot($backupDir),
        'logs_outside_webroot' => ops_is_outside_webroot($logFile),
        'server_logging_enabled' => ($logging['enabled'] ?? false) === true,
        'display_errors_disabled' => ($logging['display_errors'] ?? true) === false,
        'log_retention_configured' => (int)($logging['retention_days'] ?? 0) >= 1
            && (int)($logging['rotate_max_bytes'] ?? 0) >= 1024 * 1024,
        'smtp_relay_contract_valid' => mail_validate_relay_config($config) === [],
        'smtp_delivery_policy_safe' => mail_validate_relay_config($config) === []
            && (
                (mail_is_dry_run($config) && mail_production_mode($config) === 'disabled')
                || mail_real_delivery_allowed_for_environment($config)
            ),
        'required_operational_files_present' => count(array_filter($requiredFiles, 'is_file')) === count($requiredFiles),
    ];

    $live = ($options['live'] ?? false) === true;
    $liveReport = null;
    if ($live) {
        $db = ops_database_config($config);
        foreach ([$db['host'], $db['name'], $db['user'], $db['password']] as $value) {
            if ($value === '' || str_starts_with(strtolower($value), 'replace_')) {
                throw new RuntimeException('Live preflight requires real database configuration.');
            }
        }
        $pdo = ops_pdo($config);
        $invalidUsers = (int)$pdo->query(
            "SELECT COUNT(*) FROM users WHERE active = 1 AND (email LIKE '%.invalid' OR email = '')"
        )->fetchColumn();
        $company = $pdo->query(
            'SELECT trade_name, legal_name, invoice_name_display FROM companies ORDER BY id ASC LIMIT 1'
        )->fetch();
        $accountCounts = $pdo->query(
            'SELECT
                SUM(CASE WHEN role = "administrator" AND active = 1 THEN 1 ELSE 0 END) AS administrators,
                SUM(CASE WHEN role = "employee" AND active = 1 THEN 1 ELSE 0 END) AS employees
             FROM users WHERE company_id = 1'
        )->fetch();
        $employeeBaseline = $pdo->query(
            'SELECT e.full_name, e.employment_start_date, u.email,
                    a.start_date AS assignment_start_date,
                    a.customer_timesheet_broker_email,
                    a.customer_timesheet_expected,
                    a.customer_timesheet_broker_enabled,
                    a.customer_timesheet_use_broker_email,
                    a.invoice_without_customer_timesheet_allowed,
                    client.legal_name AS client_name,
                    client.invoice_email AS client_email,
                    broker.legal_name AS broker_name,
                    broker.invoice_email AS broker_email
             FROM employees e
             JOIN users u ON u.id = e.user_id
             JOIN assignments a ON a.employee_id = e.id AND a.active = 1
             JOIN counterparties client ON client.id = a.client_id
             LEFT JOIN counterparties broker ON broker.id = a.broker_id
             WHERE e.company_id = 1 AND e.active = 1
             ORDER BY e.full_name'
        )->fetchAll();
        $expectedEmployeeNames = [
            'Brian Hek',
            'Marc de Roon',
            'PROD Pilot Medewerker',
            'Shawn-Douglas Nahar',
            'Stasjo van Bakel',
        ];
        $actualEmployeeNames = array_map(static fn(array $row): string => (string)$row['full_name'], $employeeBaseline);
        $allEmployeesStartInSeptember = count($employeeBaseline) === 5;
        foreach ($employeeBaseline as $employeeRow) {
            $allEmployeesStartInSeptember = $allEmployeesStartInSeptember
                && (string)$employeeRow['employment_start_date'] === '2026-09-01';
        }
        $pilotRows = array_values(array_filter(
            $employeeBaseline,
            static fn(array $row): bool => (string)$row['full_name'] === 'PROD Pilot Medewerker'
        ));
        $pilot = $pilotRows[0] ?? null;
        $pilotIdentityExact = is_array($pilot)
            && strtolower((string)$pilot['email']) === 'joycesteenhoven@gmail.com'
            && (string)$pilot['client_name'] === 'PROD Pilot Klant B.V.'
            && strtolower((string)$pilot['client_email']) === 'gambitizanagi@gmail.com'
            && (string)$pilot['broker_name'] === 'PROD Pilot Broker B.V.'
            && strtolower((string)$pilot['broker_email']) === 'gambitizanagi@gmail.com'
            && strtolower((string)$pilot['customer_timesheet_broker_email']) === 'gambitizanagi@gmail.com'
            && (string)$pilot['assignment_start_date'] === '2026-09-01'
            && (int)$pilot['customer_timesheet_expected'] === 1
            && (int)$pilot['customer_timesheet_broker_enabled'] === 1
            && (int)$pilot['customer_timesheet_use_broker_email'] === 1;
        $pilotRecipientRows = $pdo->query(
            'SELECT mr.recipient_key, mr.email, amr.enabled, amr.include_invoice_pdf
             FROM mail_recipients mr
             JOIN assignment_mail_routes amr ON amr.mail_recipient_id = mr.id
             JOIN assignments a ON a.id = amr.assignment_id
             JOIN employees e ON e.id = a.employee_id
             WHERE mr.company_id = 1
               AND e.full_name = "PROD Pilot Medewerker"
               AND mr.recipient_key IN ("pilot_bookkeeper", "pilot_payroll")
             ORDER BY mr.recipient_key'
        )->fetchAll();
        $pilotRecipientContract = [];
        foreach ($pilotRecipientRows as $row) {
            $pilotRecipientContract[(string)$row['recipient_key']] = [
                'email' => strtolower((string)$row['email']),
                'enabled' => (int)$row['enabled'],
                'include_invoice_pdf' => (int)$row['include_invoice_pdf'],
            ];
        }
        $pilotRoutesExact = $pilotRecipientContract === [
            'pilot_bookkeeper' => [
                'email' => 'gambitizanagi+prod-boekhouder@gmail.com',
                'enabled' => 1,
                'include_invoice_pdf' => 1,
            ],
            'pilot_payroll' => [
                'email' => 'gambitizanagi+prod-salaris@gmail.com',
                'enabled' => 1,
                'include_invoice_pdf' => 0,
            ],
        ];
        $operationalCounts = [];
        foreach ([
            'periods', 'timesheets', 'time_entries', 'timesheet_corrections', 'customer_timesheets',
            'invoices', 'announcements', 'announcement_recipients', 'email_deliveries', 'notifications',
        ] as $table) {
            $operationalCounts[$table] = (int)$pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
        }
        $checks['live_database_connection'] = true;
        $checks['private_storage_exists'] = is_dir($privateRoot);
        $checks['private_storage_writable'] = is_writable($privateRoot);
        $checks['private_storage_buckets_ready'] = count(array_filter(
            ['/invoices', '/customer-timesheets', '/backups', '/logs'],
            static fn(string $suffix): bool => is_dir($privateRoot . $suffix) && is_writable($privateRoot . $suffix)
        )) === 4;
        $checks['active_accounts_have_real_email'] = $invalidUsers === 0;
        $checks['invoicing_company_exact'] = is_array($company)
            && ($company['trade_name'] ?? '') === 'Path Consultancy'
            && ($company['legal_name'] ?? '') === 'QSI Consultancy B.V.'
            && ($company['invoice_name_display'] ?? '') === 'trade_and_legal';
        $initialBaseline = ($options['initial-baseline'] ?? false) === true;
        if ($initialBaseline) {
            $checks['production_baseline_has_two_admins_and_five_employees'] = (int)($accountCounts['administrators'] ?? -1) === 2
                && (int)($accountCounts['employees'] ?? -1) === 5;
            $checks['production_baseline_employee_set_exact'] = $actualEmployeeNames === $expectedEmployeeNames;
            $checks['production_baseline_starts_in_september'] = $allEmployeesStartInSeptember;
            $checks['production_pilot_identity_and_broker_exact'] = $pilotIdentityExact;
            $checks['production_pilot_recipient_routes_exact'] = $pilotRoutesExact;
            $checks['production_operational_tables_empty'] = !in_array(true, array_map(
                static fn(int $count): bool => $count !== 0,
                $operationalCounts
            ), true);
        }
        $liveReport = [
            'database' => $db['name'],
            'initial_baseline_requested' => $initialBaseline,
            'invalid_active_account_count' => $invalidUsers,
            'invoicing_company' => $company,
            'account_counts' => $accountCounts,
            'employee_baseline' => $employeeBaseline,
            'pilot_recipient_routes' => $pilotRecipientContract,
            'operational_counts' => $operationalCounts,
        ];
    }

    $ok = !in_array(false, $checks, true);
    ops_print([
        'ok' => $ok,
        'mode' => $live ? 'live_read_only' : 'static',
        'writes_performed' => false,
        'checks' => $checks,
        'mail_relay_errors' => mail_validate_relay_config($config),
        'live' => $liveReport,
    ], $ok ? 0 : 1);
} catch (Throwable $error) {
    ops_print(['ok' => false, 'writes_performed' => false, 'error' => $error->getMessage()], 1);
}
