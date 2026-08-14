<?php

declare(strict_types=1);

function test_reset_is_available(array $config, string $host): bool
{
    $normalizedHost = strtolower(trim(preg_replace('/:\d+$/', '', $host) ?? ''));
    return $normalizedHost === 'uren-test.pathconsultancy.nl'
        && auth_environment_from_config($config) === 'test'
        && auth_app_origin_from_config($config) === 'https://uren-test.pathconsultancy.nl'
        && ($config['allow_demo_migrations'] ?? false) === true;
}

function test_reset_sql(PDO $pdo, string $path): void
{
    $sql = file_get_contents($path);
    if ($sql === false) {
        throw new RuntimeException('TEST-basisscript ontbreekt: ' . basename($path));
    }
    $sql = preg_replace('/^\s*USE\s+[^;]+;\s*/ims', '', $sql) ?? $sql;
    $sql = preg_replace('/\bTRUNCATE\s+TABLE\s+(`?[a-zA-Z0-9_]+`?)\s*;/i', 'DELETE FROM $1;', $sql) ?? $sql;
    $sql = preg_replace('/\b(?:START\s+TRANSACTION|COMMIT)\s*;/i', '', $sql) ?? $sql;

    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        $pdo->exec($statement);
    }
}

function test_reset_acceptance_accounts(PDO $pdo, int $companyId): void
{
    $accounts = [
        ['email' => 'giovanno.maatsen@pathconsultancy.nl', 'name' => 'Giovanno Maatsen'],
        ['email' => 'kenrich.lieveld@pathconsultancy.nl', 'name' => 'Kenrich Lieveld'],
    ];
    $insert = $pdo->prepare(
        'INSERT INTO users
         (company_id, email, display_name, role, active, password_hash, force_password_change)
         VALUES (:company_id, :email, :name, "administrator", 1, :password_hash, 1)'
    );
    foreach ($accounts as $account) {
        $insert->execute([
            ':company_id' => $companyId,
            ':email' => $account['email'],
            ':name' => $account['name'],
            ':password_hash' => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
        ]);
    }
}

/** @return array{users:int,employees:int,open_actions:int} */
function test_reset_shared_baseline(PDO $pdo, string $actorEmail): array
{
    $root = dirname(__DIR__, 2);
    $scripts = [
        $root . '/database/seed-demo-data.sql',
        $root . '/server/migrations/004_demo_employee_auth_seed.sql',
        $root . '/server/migrations/005_demo_auth_hashes_for_existing_seed_users.sql',
        $root . '/server/migrations/008_demo_seed_baseline_alignment.sql',
        $root . '/server/migrations/009_demo_seed_august_correction_alignment.sql',
    ];

    $pdo->beginTransaction();
    try {
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        foreach (['password_reset_tokens', 'auth_login_audit'] as $table) {
            $pdo->exec('DELETE FROM ' . $table);
        }
        foreach ($scripts as $script) {
            test_reset_sql($pdo, $script);
        }
        $companyId = (int)$pdo->query('SELECT id FROM companies ORDER BY id ASC LIMIT 1')->fetchColumn();
        if ($companyId !== 1) {
            throw new RuntimeException('De vaste TEST-organisatie kon niet worden hersteld.');
        }
        test_reset_acceptance_accounts($pdo, $companyId);
        $audit = $pdo->prepare(
            'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
             VALUES (:company_id, NULL, "test.baseline_reset", "database", "pathco_Urentest", :data)'
        );
        $audit->execute([
            ':company_id' => $companyId,
            // The initiating account may itself be removed by the reset. Keep its
            // address as audit evidence without retaining a stale foreign key.
            ':data' => json_encode([
                'source' => 'shared-test-reset',
                'initiated_by' => strtolower(trim($actorEmail)),
            ], JSON_UNESCAPED_SLASHES),
        ]);
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        try {
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
        } catch (Throwable) {
            // The original reset error remains authoritative.
        }
        throw $error;
    }

    return [
        'users' => (int)$pdo->query('SELECT COUNT(*) FROM users WHERE active = 1')->fetchColumn(),
        'employees' => (int)$pdo->query('SELECT COUNT(*) FROM employees WHERE active = 1')->fetchColumn(),
        'open_actions' => 12,
    ];
}
