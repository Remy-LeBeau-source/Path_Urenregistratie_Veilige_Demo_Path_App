<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../lib/test-reset.php';

$test = [
    'environment' => 'test',
    'app_origin' => 'https://uren-test.pathconsultancy.nl',
    'allow_demo_migrations' => true,
    'database' => [
        'host' => 'pathco-urentest.db.transip.me',
        'port' => 3306,
        'name' => 'pathco_Urentest',
        'user' => 'pathco_UrenTestUser',
    ],
    'storage' => ['private_root' => '/data/sites/web/pathconsultancynl/private/path-uren-test'],
];
$localTest = [
    'environment' => 'test',
    'app_origin' => 'http://127.0.0.1:8000',
    'allow_demo_migrations' => true,
    'database' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'path_urenregistratie_test',
        'user' => 'root',
    ],
    'storage' => ['private_root' => __DIR__ . '/../../path-test-private'],
];
$production = [
    'environment' => 'production',
    'app_origin' => 'https://uren.pathconsultancy.nl',
    'allow_demo_migrations' => false,
];
$source = file_get_contents(__DIR__ . '/../lib/test-reset.php') ?: '';
$cliSource = file_get_contents(__DIR__ . '/reset-test-baseline.php') ?: '';
$publicCredentialEmails = test_reset_baseline_credential_emails(
    test_reset_should_preserve_demo_credentials($test)
);
$localCredentialEmails = test_reset_baseline_credential_emails(
    test_reset_should_preserve_demo_credentials($localTest)
);
$checks = [
    'exact_test_host_allowed' => test_reset_is_available($test, 'uren-test.pathconsultancy.nl'),
    'production_blocked' => !test_reset_is_available($production, 'uren.pathconsultancy.nl'),
    'raw_production_environment_cannot_be_overridden' => !test_reset_remote_contract_is_exact(array_replace_recursive($test, ['environment' => 'production'])),
    'spoofed_test_host_on_production_blocked' => !test_reset_is_available($production, 'uren-test.pathconsultancy.nl'),
    'wrong_host_on_test_blocked' => !test_reset_is_available($test, 'uren.pathconsultancy.nl'),
    'wrong_origin_on_test_blocked' => !test_reset_is_available(array_replace_recursive($test, ['app_origin' => 'https://uren.pathconsultancy.nl']), 'uren-test.pathconsultancy.nl'),
    'mispointed_test_database_host_blocked' => !test_reset_is_available(array_replace_recursive($test, ['database' => ['host' => '127.0.0.1']]), 'uren-test.pathconsultancy.nl'),
    'mispointed_test_database_port_blocked' => !test_reset_is_available(array_replace_recursive($test, ['database' => ['port' => 3307]]), 'uren-test.pathconsultancy.nl'),
    'mispointed_test_database_blocked' => !test_reset_is_available(array_replace_recursive($test, ['database' => ['name' => 'pathco_Urenuru']]), 'uren-test.pathconsultancy.nl'),
    'mispointed_test_database_user_blocked' => !test_reset_is_available(array_replace_recursive($test, ['database' => ['user' => 'pathco_UrenUser']]), 'uren-test.pathconsultancy.nl'),
    'mispointed_test_private_root_blocked' => !test_reset_is_available(array_merge($test, ['storage' => ['private_root' => '/data/sites/web/pathconsultancynl/private/path-uren-prod']]), 'uren-test.pathconsultancy.nl'),
    'isolated_local_test_database_allowed' => test_reset_is_available($localTest, '127.0.0.1'),
    'non_test_local_database_blocked' => !test_reset_is_available(array_replace_recursive($localTest, ['database' => ['name' => 'path_urenregistratie']]), '127.0.0.1'),
    'missing_demo_permission_blocked' => !test_reset_is_available(array_merge($test, ['allow_demo_migrations' => false]), 'uren-test.pathconsultancy.nl'),
    'public_test_preserves_only_acceptance_credentials' => $publicCredentialEmails === [
        'giovanno.maatsen@pathconsultancy.nl',
        'kenrich.lieveld@pathconsultancy.nl',
    ],
    'local_test_preserves_runtime_demo_credentials' => count($localCredentialEmails) === 8
        && in_array('gio@example.invalid', $localCredentialEmails, true)
        && in_array('stasjo@example.invalid', $localCredentialEmails, true),
    'both_acceptance_credentials_required_before_remote_reset' => str_contains($source, '$capturedCredentialEmails !== $requiredCredentialEmails')
        && str_contains($source, 'Both TEST acceptance account credentials must exist'),
    'baseline_contains_demo_seed' => str_contains($source, 'seed-demo-data.sql'),
    'acceptance_accounts_restored' => str_contains($source, 'giovanno.maatsen@pathconsultancy.nl')
        && str_contains($source, 'kenrich.lieveld@pathconsultancy.nl'),
    'twelve_action_baseline_contract' => str_contains($source, "'open_actions' => 12"),
    'private_seed_documents_restored' => str_contains($source, 'test_reset_seed_documents')
        && str_contains($source, "require_once __DIR__ . '/simple_pdf.php'")
        && str_contains($source, 'auth_private_root_from_config'),
    'reset_audit_avoids_stale_actor_fk' => str_contains($source, 'actor_user_id, event_type')
        && str_contains($source, 'VALUES (:company_id, NULL')
        && str_contains($source, "'initiated_by'"),
    'foreign_keys_restored' => str_contains($source, "SET FOREIGN_KEY_CHECKS = 1"),
    'remote_demo_credentials_verified' => str_contains($source, 'test_reset_verify_remote_demo_credentials')
        && str_contains($source, 'password_verify($account[\'password\']')
        && strpos($source, '$verifiedDemoAccounts = test_reset_verify_remote_demo_credentials')
            < strpos($source, '$pdo->commit()'),
    'post_commit_failure_reported_as_write' => str_contains($source, 'TestResetPostCommitException')
        && str_contains($cliSource, '$error instanceof TestResetPostCommitException'),
    'cli_usage_mode_is_explicitly_informational' => str_contains($cliSource, "'mode' => 'usage'")
        && str_contains($cliSource, "'validation_performed' => false"),
    'deployment_cli_guarded' => str_contains($cliSource, $test['storage']['private_root'] . '/config.local.php')
        && str_contains($cliSource, 'RESET_SHARED_TEST_BASELINE')
        && str_contains($cliSource, "test_reset_is_available(\$config, 'uren-test.pathconsultancy.nl')")
        && str_contains($cliSource, "\$reset['verified_demo_accounts']"),
];
$ok = !in_array(false, $checks, true);
echo json_encode(['ok' => $ok, 'writes_performed' => false, 'checks' => $checks], JSON_PRETTY_PRINT) . PHP_EOL;
exit($ok ? 0 : 1);
