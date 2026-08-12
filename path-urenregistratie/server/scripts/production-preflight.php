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
        __DIR__ . '/mail-dispatch.php',
        __DIR__ . '/database-backup.php',
        __DIR__ . '/database-restore.php',
        __DIR__ . '/rotate-logs.php',
        __DIR__ . '/configure-production.php',
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
        'smtp_real_delivery_disabled' => mail_is_dry_run($config) && ($mail['enabled'] ?? null) === false,
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
        $liveReport = [
            'database' => $db['name'],
            'invalid_active_account_count' => $invalidUsers,
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
