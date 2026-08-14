<?php

declare(strict_types=1);

/**
 * Public TEST configuration preflight.
 *
 * Default mode is static and non-mutating. Pass --live for read-only checks
 * against the dedicated TEST database and private storage.
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
    $acceptance = isset($mail['acceptance_test']) && is_array($mail['acceptance_test']) ? $mail['acceptance_test'] : [];
    $origin = rtrim((string)($config['app_origin'] ?? ($config['app']['app_origin'] ?? '')), '/');
    $privateRoot = ops_private_root($config);
    $backupDir = trim((string)($storage['backup_dir'] ?? '')) ?: $privateRoot . '/backups';
    $logFile = trim((string)($logging['error_log'] ?? '')) ?: $privateRoot . '/logs/php-error.log';
    $expectedOrigin = 'https://uren-test.pathconsultancy.nl';
    $expectedPrivateRoot = '/data/sites/web/pathconsultancynl/private/path-uren-test';
    $allowedRecipients = is_array($mail['allowed_recipients'] ?? null) ? $mail['allowed_recipients'] : [];

    $requiredFiles = [
        dirname(__DIR__) . '/migrations/014_mail_acceptance_test.sql',
        __DIR__ . '/mail-dispatch.php',
        __DIR__ . '/database-backup.php',
        __DIR__ . '/database-restore.php',
        __DIR__ . '/rotate-logs.php',
        __DIR__ . '/configure-test.php',
        dirname(__DIR__) . '/auth/change-password.php',
        dirname(__DIR__, 2) . '/.htaccess',
    ];

    $checks = [
        'environment_test' => ($config['environment'] ?? ($config['app']['environment'] ?? '')) === 'test',
        'test_origin_exact' => $origin === $expectedOrigin,
        'demo_migrations_enabled' => ($config['allow_demo_migrations'] ?? false) === true,
        'dedicated_session_cookie' => ($security['session_cookie_name'] ?? '') === 'path_test_session',
        'https_required' => ($security['require_https'] ?? false) === true,
        'cors_origin_exact' => ($security['cors_allowed_origins'] ?? []) === [$expectedOrigin],
        'csp_configured' => trim((string)($security['content_security_policy'] ?? '')) !== '',
        'private_storage_outside_webroot' => ops_is_outside_webroot($privateRoot),
        'backups_outside_webroot' => ops_is_outside_webroot($backupDir),
        'logs_outside_webroot' => ops_is_outside_webroot($logFile),
        'server_logging_enabled' => ($logging['enabled'] ?? false) === true,
        'display_errors_disabled' => ($logging['display_errors'] ?? true) === false,
        'smtp_relay_contract_valid' => mail_validate_relay_config($config) === [],
        'mail_closed_by_default' => ($mail['enabled'] ?? null) === false
            && ($mail['test_delivery_enabled'] ?? null) === false
            && ($acceptance['enabled'] ?? null) === false
            && $allowedRecipients === [],
        'required_operational_files_present' => count(array_filter($requiredFiles, 'is_file')) === count($requiredFiles),
    ];

    $live = ($options['live'] ?? false) === true;
    $liveReport = null;
    if ($live) {
        $db = ops_database_config($config);
        foreach ([$db['host'], $db['name'], $db['user'], $db['password']] as $value) {
            if ($value === '' || str_starts_with(strtolower($value), 'replace_')) {
                throw new RuntimeException('Live TEST preflight requires real database configuration.');
            }
        }
        $checks['test_database_host_exact'] = $db['host'] === 'pathco-urentest.db.transip.me';
        $checks['test_database_name_exact'] = $db['name'] === 'pathco_Urentest';
        $checks['test_database_user_exact'] = $db['user'] === 'pathco_UrenTestUser';
        $checks['test_private_root_exact'] = $privateRoot === $expectedPrivateRoot;

        $pdo = ops_pdo($config);
        $seedUsers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE email LIKE '%.invalid'")->fetchColumn();
        $company = $pdo->query(
            'SELECT trade_name, legal_name, invoice_name_display FROM companies ORDER BY id ASC LIMIT 1'
        )->fetch();
        $checks['live_database_connection'] = true;
        $checks['demo_accounts_present'] = $seedUsers >= 2;
        $checks['private_storage_exists'] = is_dir($privateRoot);
        $checks['private_storage_writable'] = is_writable($privateRoot);
        $checks['private_storage_buckets_ready'] = count(array_filter(
            ['/invoices', '/customer-timesheets', '/backups', '/logs'],
            static fn(string $suffix): bool => is_dir($privateRoot . $suffix) && is_writable($privateRoot . $suffix)
        )) === 4;
        $checks['test_company_seeded'] = is_array($company)
            && ($company['trade_name'] ?? '') === 'Path Consultancy'
            && ($company['legal_name'] ?? '') === 'QSI Consultancy B.V.';
        $liveReport = [
            'database' => $db['name'],
            'demo_account_count' => $seedUsers,
            'invoicing_company' => $company,
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
