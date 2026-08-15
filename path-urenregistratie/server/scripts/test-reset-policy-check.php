<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../lib/test-reset.php';

$test = [
    'environment' => 'test',
    'app_origin' => 'https://uren-test.pathconsultancy.nl',
    'allow_demo_migrations' => true,
    'database' => ['name' => 'path_urenregistratie_test'],
];
$production = [
    'environment' => 'production',
    'app_origin' => 'https://uren.pathconsultancy.nl',
    'allow_demo_migrations' => false,
];
$source = file_get_contents(__DIR__ . '/../lib/test-reset.php') ?: '';
$checks = [
    'exact_test_host_allowed' => test_reset_is_available($test, 'uren-test.pathconsultancy.nl'),
    'production_blocked' => !test_reset_is_available($production, 'uren.pathconsultancy.nl'),
    'spoofed_test_host_on_production_blocked' => !test_reset_is_available($production, 'uren-test.pathconsultancy.nl'),
    'wrong_host_on_test_blocked' => !test_reset_is_available($test, 'uren.pathconsultancy.nl'),
    'non_test_local_database_blocked' => !test_reset_is_available(array_merge($test, ['database' => ['name' => 'path_urenregistratie']]), '127.0.0.1'),
    'missing_demo_permission_blocked' => !test_reset_is_available(array_merge($test, ['allow_demo_migrations' => false]), 'uren-test.pathconsultancy.nl'),
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
];
$ok = !in_array(false, $checks, true);
echo json_encode(['ok' => $ok, 'writes_performed' => false, 'checks' => $checks], JSON_PRETTY_PRINT) . PHP_EOL;
exit($ok ? 0 : 1);
