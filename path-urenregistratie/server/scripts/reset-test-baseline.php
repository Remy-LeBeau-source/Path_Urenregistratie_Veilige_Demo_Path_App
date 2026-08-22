<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../lib/test-reset.php';

$options = ops_options($argv);
$expectedConfigPath = '/data/sites/web/pathconsultancynl/private/path-uren-test/config.local.php';

try {
    if (($options['execute'] ?? false) !== true) {
        ops_print([
            'ok' => true,
            'mode' => 'usage',
            'writes_performed' => false,
            'validation_performed' => false,
            'config_path' => $expectedConfigPath,
            'confirmation' => 'RESET_SHARED_TEST_BASELINE',
            'message' => 'Informational only: use --execute with the exact confirmation during the guarded TEST deployment to validate and reset.',
        ]);
    }

    if (($options['confirm'] ?? '') !== 'RESET_SHARED_TEST_BASELINE') {
        throw new RuntimeException('Execution requires --confirm=RESET_SHARED_TEST_BASELINE.');
    }
    $configPath = ops_config_path($options);
    if ($configPath !== $expectedConfigPath || !is_file($configPath)) {
        throw new RuntimeException('Only the canonical private TEST config may reset the shared baseline.');
    }

    $config = ops_load_config($options);
    if (!test_reset_is_available($config, 'uren-test.pathconsultancy.nl')) {
        throw new RuntimeException('The exact TEST host, database connection, private root and demo-migration contract are required.');
    }

    $pdo = ops_pdo($config);
    $reset = test_reset_shared_baseline($pdo, $config, 'deployment-baseline@uren-test.pathconsultancy.nl');

    ops_print([
        'ok' => true,
        'mode' => 'execute',
        'writes_performed' => true,
        'verified_demo_accounts' => $reset['verified_demo_accounts'],
        'reset' => $reset,
    ]);
} catch (Throwable $error) {
    ops_print([
        'ok' => false,
        'writes_performed' => $error instanceof TestResetPostCommitException,
        'error' => $error->getMessage(),
    ], 1);
}
