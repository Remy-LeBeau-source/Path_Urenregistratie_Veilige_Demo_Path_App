<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../mail/dispatch.php';

$options = ops_options($argv);
try {
    $config = ops_load_config($options);
    $errors = mail_validate_relay_config($config);
    if ($errors !== []) {
        ops_print(['ok' => false, 'mode' => 'preflight', 'errors' => $errors], 1);
    }
    if (($options['send'] ?? false) !== true) {
        ops_print([
            'ok' => true,
            'mode' => 'preflight',
            'mail_enabled' => !mail_is_dry_run($config),
            'network_used' => false,
            'message' => 'Pass --send only after explicit production approval.',
        ]);
    }
    if (!mail_is_smtp_relay_enabled($config)) {
        ops_print(['ok' => false, 'mode' => 'send', 'network_used' => false, 'error' => 'mail-disabled'], 2);
    }

    $pdo = ops_pdo($config);
    $companyIds = $pdo->query('SELECT id FROM companies ORDER BY id')->fetchAll(PDO::FETCH_COLUMN);
    $result = ['sent' => 0, 'failed' => 0, 'skipped' => 0];
    foreach ($companyIds as $companyId) {
        $batch = mail_dispatch_queued($pdo, (int)$companyId, $config, (int)($options['limit'] ?? 50));
        foreach ($result as $key => $value) {
            $result[$key] += $batch[$key];
        }
    }
    ops_print(['ok' => $result['failed'] === 0, 'mode' => 'send', 'result' => $result], $result['failed'] === 0 ? 0 : 3);
} catch (Throwable $error) {
    ops_print(['ok' => false, 'network_used' => false, 'error' => $error->getMessage()], 1);
}
