<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';

$options = ops_options($argv);
try {
    $config = ops_load_config($options);
    $logging = isset($config['logging']) && is_array($config['logging']) ? $config['logging'] : [];
    $logFile = trim((string)($logging['error_log'] ?? '')) ?: ops_private_root($config) . '/logs/php-error.log';
    $retentionDays = max(1, (int)($logging['retention_days'] ?? 30));
    $maxBytes = max(1024 * 1024, (int)($logging['rotate_max_bytes'] ?? 10 * 1024 * 1024));
    if (!ops_is_outside_webroot($logFile)) {
        throw new RuntimeException('Log file must be outside the public webroot.');
    }
    $needsRotation = is_file($logFile) && filesize($logFile) >= $maxBytes;
    if (($options['execute'] ?? false) !== true) {
        ops_print([
            'ok' => true, 'mode' => 'check', 'log_outside_webroot' => true,
            'log_exists' => is_file($logFile), 'rotation_needed' => $needsRotation,
            'retention_days' => $retentionDays, 'writes_performed' => false,
        ]);
    }
    $rotated = null;
    if ($needsRotation) {
        $rotated = $logFile . '.' . gmdate('Ymd-His');
        if (!rename($logFile, $rotated)) {
            throw new RuntimeException('Could not rotate log file.');
        }
    }
    $deleted = 0;
    foreach (glob($logFile . '.*') ?: [] as $candidate) {
        if (is_file($candidate) && filemtime($candidate) < time() - ($retentionDays * 86400)) {
            if (@unlink($candidate)) {
                $deleted++;
            }
        }
    }
    ops_print(['ok' => true, 'mode' => 'execute', 'rotated' => $rotated, 'expired_deleted' => $deleted]);
} catch (Throwable $error) {
    ops_print(['ok' => false, 'error' => $error->getMessage()], 1);
}
