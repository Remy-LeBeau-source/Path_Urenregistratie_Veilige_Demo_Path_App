<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';

$options = ops_options($argv);
try {
    $config = ops_load_config($options);
    $db = ops_database_config($config);
    $backupDir = trim((string)($config['storage']['backup_dir'] ?? '')) ?: ops_private_root($config) . '/backups';
    $executable = trim((string)($options['mysqldump'] ?? 'mysqldump'));
    if (!ops_is_outside_webroot($backupDir)) {
        throw new RuntimeException('Backup directory must be outside the public webroot.');
    }
    if (($options['execute'] ?? false) !== true) {
        ops_print([
            'ok' => true,
            'mode' => 'check',
            'database_configured' => $db['host'] !== '' && $db['name'] !== '' && $db['user'] !== '',
            'backup_outside_webroot' => true,
            'writes_performed' => false,
            'message' => 'Use --execute to create a new read-only database export.',
        ]);
    }

    if (!is_dir($backupDir) && !mkdir($backupDir, 0750, true) && !is_dir($backupDir)) {
        throw new RuntimeException('Could not create backup directory.');
    }
    $target = $backupDir . '/path-db-' . gmdate('Ymd-His') . '.sql';
    $command = [
        $executable, '--single-transaction', '--routines', '--triggers', '--events', '--no-tablespaces',
        '--default-character-set=' . $db['charset'], '--host=' . $db['host'], '--port=' . (string)$db['port'],
        '--user=' . $db['user'], '--result-file=' . $target, $db['name'],
    ];
    $result = ops_run_process($command, ['MYSQL_PWD' => $db['password']]);
    if ($result['exit_code'] !== 0 || !is_file($target) || filesize($target) === 0) {
        if (is_file($target)) {
            @unlink($target);
        }
        throw new RuntimeException('Database backup failed.');
    }
    $checksum = hash_file('sha256', $target);
    file_put_contents($target . '.sha256', $checksum . '  ' . basename($target) . PHP_EOL, LOCK_EX);
    @chmod($target, 0640);
    @chmod($target . '.sha256', 0640);
    ops_print(['ok' => true, 'mode' => 'execute', 'file' => $target, 'bytes' => filesize($target), 'sha256' => $checksum]);
} catch (Throwable $error) {
    ops_print(['ok' => false, 'error' => $error->getMessage()], 1);
}
