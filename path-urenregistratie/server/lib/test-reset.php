<?php

declare(strict_types=1);

require_once __DIR__ . '/simple_pdf.php';

function test_reset_is_available(array $config, string $host): bool
{
    $normalizedHost = strtolower(trim(preg_replace('/:\d+$/', '', $host) ?? ''));
    $environmentIsTest = auth_environment_from_config($config) === 'test';
    $demoMigrationsAllowed = array_key_exists('allow_demo_migrations', $config)
        ? $config['allow_demo_migrations'] === true
        : in_array(strtolower(trim((string)getenv('PATH_APP_ALLOW_DEMO_MIGRATIONS'))), ['1', 'true', 'yes', 'on'], true);
    $remoteTest = $normalizedHost === 'uren-test.pathconsultancy.nl'
        && auth_app_origin_from_config($config) === 'https://uren-test.pathconsultancy.nl';
    $configuredDatabase = is_array($config['database'] ?? null)
        ? trim((string)($config['database']['name'] ?? ''))
        : '';
    $databaseName = $configuredDatabase !== ''
        ? $configuredDatabase
        : trim((string)getenv('PATH_APP_DB_NAME'));
    $isolatedLocalTest = in_array($normalizedHost, ['127.0.0.1', 'localhost'], true)
        && str_ends_with(strtolower($databaseName), '_test');

    return $environmentIsTest && $demoMigrationsAllowed && ($remoteTest || $isolatedLocalTest);
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

/**
 * Preserve only the credentials of accounts that the shared TEST baseline
 * recreates. Business data is reset, but a CI-generated or locally configured
 * password must keep working after the reset invalidates the active session.
 *
 * @return array<string,array{password_hash:string,force_password_change:int}>
 */
function test_reset_capture_baseline_credentials(PDO $pdo): array
{
    $emails = [
        'gio@example.invalid',
        'joyce@example.invalid',
        'marc@example.invalid',
        'stasjo@example.invalid',
        'brian@example.invalid',
        'shawn@example.invalid',
        'giovanno.maatsen@pathconsultancy.nl',
        'kenrich.lieveld@pathconsultancy.nl',
    ];
    $placeholders = implode(', ', array_fill(0, count($emails), '?'));
    $statement = $pdo->prepare(
        'SELECT email, password_hash, force_password_change
         FROM users
         WHERE email IN (' . $placeholders . ')
           AND password_hash IS NOT NULL
           AND password_hash <> ""'
    );
    $statement->execute($emails);

    $credentials = [];
    foreach ($statement->fetchAll() as $row) {
        $email = strtolower(trim((string)$row['email']));
        if ($email === '') {
            continue;
        }
        $credentials[$email] = [
            'password_hash' => (string)$row['password_hash'],
            'force_password_change' => (int)$row['force_password_change'],
        ];
    }
    return $credentials;
}

/** @param array<string,array{password_hash:string,force_password_change:int}> $credentials */
function test_reset_restore_baseline_credentials(PDO $pdo, array $credentials): void
{
    $update = $pdo->prepare(
        'UPDATE users
         SET password_hash = :password_hash,
             force_password_change = :force_password_change
         WHERE email = :email'
    );
    foreach ($credentials as $email => $credential) {
        $update->execute([
            ':password_hash' => $credential['password_hash'],
            ':force_password_change' => $credential['force_password_change'],
            ':email' => $email,
        ]);
    }
}

function test_reset_document_path(string $root, string $bucket, string $storageKey): string
{
    $key = trim(str_replace('\\', '/', $storageKey), '/');
    if ($key === '' || str_contains($key, '..') || str_contains($key, "\0")) {
        throw new RuntimeException('Ongeldige TEST-opslagsleutel voor ' . $bucket . '.');
    }
    return rtrim($root, '/\\') . DIRECTORY_SEPARATOR . $bucket . DIRECTORY_SEPARATOR
        . str_replace('/', DIRECTORY_SEPARATOR, $key);
}

/** @return array{invoices:int,customer_timesheets:int} */
function test_reset_seed_documents(PDO $pdo, array $config): array
{
    if (auth_environment_from_config($config) !== 'test') {
        throw new RuntimeException('TEST-documenten mogen uitsluitend in TEST worden opgebouwd.');
    }
    $privateRoot = auth_private_root_from_config($config);
    if ($privateRoot === '') {
        throw new RuntimeException('De private TEST-opslag is niet ingesteld.');
    }
    $counts = ['invoices' => 0, 'customer_timesheets' => 0];
    $sources = [
        'invoices' => ['count_key' => 'invoices', 'rows' => $pdo->query(
            'SELECT pdf_storage_key AS storage_key, invoice_number AS label
             FROM invoices WHERE pdf_storage_key IS NOT NULL AND pdf_storage_key <> ""'
        )->fetchAll()],
        'customer-timesheets' => ['count_key' => 'customer_timesheets', 'rows' => $pdo->query(
            'SELECT storage_key, COALESCE(original_file_name, "Klanturenstaat") AS label
             FROM customer_timesheets WHERE storage_key IS NOT NULL AND storage_key <> ""'
        )->fetchAll()],
    ];
    foreach ($sources as $bucket => $source) {
        foreach ($source['rows'] as $row) {
            $path = test_reset_document_path($privateRoot, $bucket, (string)$row['storage_key']);
            $directory = dirname($path);
            if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
                throw new RuntimeException('De private TEST-documentmap kon niet worden gemaakt.');
            }
            $pdf = simple_pdf_text_document([
                ['text' => 'PATH CONSULTANCY · TESTDOCUMENT', 'size' => 15],
                'Uitsluitend voor acceptatie- en regressietesten.',
                'Document: ' . (string)$row['label'],
                'Omgeving: uren-test.pathconsultancy.nl',
            ]);
            if (!simple_pdf_looks_valid($pdf) || file_put_contents($path, $pdf) === false) {
                throw new RuntimeException('Een TEST-PDF kon niet veilig worden opgebouwd.');
            }
            $counts[$source['count_key']]++;
        }
    }
    return $counts;
}

/** @return array{users:int,employees:int,open_actions:int,documents:array{invoices:int,customer_timesheets:int}} */
function test_reset_shared_baseline(PDO $pdo, array $config, string $actorEmail): array
{
    $root = dirname(__DIR__, 2);
    $scripts = [
        $root . '/database/seed-demo-data.sql',
        $root . '/server/migrations/004_demo_employee_auth_seed.sql',
        $root . '/server/migrations/005_demo_auth_hashes_for_existing_seed_users.sql',
        $root . '/server/migrations/008_demo_seed_baseline_alignment.sql',
        $root . '/server/migrations/009_demo_seed_august_correction_alignment.sql',
        $root . '/server/migrations/016_demo_task_baseline_alignment.sql',
    ];

    $credentials = test_reset_capture_baseline_credentials($pdo);
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
        test_reset_restore_baseline_credentials($pdo, $credentials);
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

    $documents = test_reset_seed_documents($pdo, $config);
    return [
        'users' => (int)$pdo->query('SELECT COUNT(*) FROM users WHERE active = 1')->fetchColumn(),
        'employees' => (int)$pdo->query('SELECT COUNT(*) FROM employees WHERE active = 1')->fetchColumn(),
        'open_actions' => 12,
        'documents' => $documents,
    ];
}
