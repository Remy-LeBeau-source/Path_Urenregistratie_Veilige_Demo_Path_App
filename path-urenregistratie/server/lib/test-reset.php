<?php

declare(strict_types=1);

require_once __DIR__ . '/simple_pdf.php';

const TEST_RESET_REMOTE_ORIGIN = 'https://uren-test.pathconsultancy.nl';
const TEST_RESET_REMOTE_DATABASE_HOST = 'pathco-urentest.db.transip.me';
const TEST_RESET_REMOTE_DATABASE_PORT = 3306;
const TEST_RESET_REMOTE_DATABASE = 'pathco_Urentest';
const TEST_RESET_REMOTE_DATABASE_USER = 'pathco_UrenTestUser';
const TEST_RESET_REMOTE_PRIVATE_ROOT = '/data/sites/web/pathconsultancynl/private/path-uren-test';

final class TestResetPostCommitException extends RuntimeException
{
}

function test_reset_remote_contract_is_exact(array $config): bool
{
    $database = is_array($config['database'] ?? null) ? $config['database'] : [];
    $effectiveDatabase = auth_db_from_config($config);
    $storage = is_array($config['storage'] ?? null) ? $config['storage'] : [];
    $privateRoot = rtrim(str_replace('\\', '/', trim((string)($storage['private_root'] ?? ''))), '/');
    $rawEnvironment = strtolower(trim((string)($config['environment'] ?? ($config['app']['environment'] ?? ''))));

    return $rawEnvironment === 'test'
        && auth_environment_from_config($config) === 'test'
        && ($config['allow_demo_migrations'] ?? false) === true
        && auth_app_origin_from_config($config) === TEST_RESET_REMOTE_ORIGIN
        && strtolower(trim((string)($database['host'] ?? ''))) === TEST_RESET_REMOTE_DATABASE_HOST
        && (int)($database['port'] ?? 3306) === TEST_RESET_REMOTE_DATABASE_PORT
        && trim((string)($database['name'] ?? '')) === TEST_RESET_REMOTE_DATABASE
        && trim((string)($database['user'] ?? '')) === TEST_RESET_REMOTE_DATABASE_USER
        && strtolower(trim((string)($effectiveDatabase['host'] ?? ''))) === TEST_RESET_REMOTE_DATABASE_HOST
        && (int)($effectiveDatabase['port'] ?? 3306) === TEST_RESET_REMOTE_DATABASE_PORT
        && trim((string)($effectiveDatabase['name'] ?? '')) === TEST_RESET_REMOTE_DATABASE
        && trim((string)($effectiveDatabase['user'] ?? '')) === TEST_RESET_REMOTE_DATABASE_USER
        && $privateRoot === TEST_RESET_REMOTE_PRIVATE_ROOT;
}

function test_reset_is_available(array $config, string $host): bool
{
    $normalizedHost = strtolower(trim(preg_replace('/:\d+$/', '', $host) ?? ''));
    $environmentIsTest = auth_environment_from_config($config) === 'test';
    $demoMigrationsAllowed = array_key_exists('allow_demo_migrations', $config)
        ? $config['allow_demo_migrations'] === true
        : in_array(strtolower(trim((string)getenv('PATH_APP_ALLOW_DEMO_MIGRATIONS'))), ['1', 'true', 'yes', 'on'], true);
    $remoteTest = $normalizedHost === 'uren-test.pathconsultancy.nl'
        && test_reset_remote_contract_is_exact($config);
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

function test_reset_should_preserve_demo_credentials(array $config): bool
{
    return !test_reset_remote_contract_is_exact($config);
}

/** @return list<string> */
function test_reset_baseline_credential_emails(bool $preserveDemoCredentials): array
{
    $acceptanceAccounts = [
        'giovanno.maatsen@pathconsultancy.nl',
        'kenrich.lieveld@pathconsultancy.nl',
    ];
    if (!$preserveDemoCredentials) {
        return $acceptanceAccounts;
    }

    return [
        'gio@example.invalid',
        'joyce@example.invalid',
        'marc@example.invalid',
        'stasjo@example.invalid',
        'brian@example.invalid',
        'shawn@example.invalid',
        ...$acceptanceAccounts,
    ];
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
        ['id' => 1001, 'email' => 'giovanno.maatsen@pathconsultancy.nl', 'name' => 'Giovanno Maatsen'],
        ['id' => 1002, 'email' => 'kenrich.lieveld@pathconsultancy.nl', 'name' => 'Kenrich Lieveld'],
    ];
    $insert = $pdo->prepare(
        'INSERT INTO users
         (id, company_id, email, display_name, role, active, password_hash, force_password_change)
         VALUES (:id, :company_id, :email, :name, "administrator", 1, :password_hash, 1)'
    );
    foreach ($accounts as $account) {
        $insert->execute([
            // Fixed TEST-only ids keep repeated shared-baseline resets semantically
            // identical. AUTO_INCREMENT itself may advance, but no row identity drifts.
            ':id' => $account['id'],
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
function test_reset_capture_baseline_credentials(PDO $pdo, bool $preserveDemoCredentials = true): array
{
    $emails = test_reset_baseline_credential_emails($preserveDemoCredentials);
    $placeholders = implode(', ', array_fill(0, count($emails), '?'));
    $statement = $pdo->prepare(
        'SELECT email, password_hash, force_password_change
         FROM users
         WHERE email IN (' . $placeholders . ')
           AND password_hash IS NOT NULL
           AND password_hash <> ""
         FOR UPDATE'
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

function test_reset_verify_remote_demo_credentials(PDO $pdo, array $config): int
{
    if (!test_reset_remote_contract_is_exact($config)) {
        throw new RuntimeException('Canonical demo credentials may be verified only for the exact remote TEST contract.');
    }

    $expected = [
        'gio@example.invalid' => ['role' => 'administrator', 'password' => 'LocalDemoAdmin2026'],
        'joyce@example.invalid' => ['role' => 'administrator', 'password' => 'LocalDemoAdmin2026'],
        'marc@example.invalid' => ['role' => 'employee', 'password' => 'LocalDemoEmployee2026'],
        'stasjo@example.invalid' => ['role' => 'employee', 'password' => 'LocalDemoEmployee2026'],
        'brian@example.invalid' => ['role' => 'employee', 'password' => 'LocalDemoEmployee2026'],
        'shawn@example.invalid' => ['role' => 'employee', 'password' => 'LocalDemoEmployee2026'],
    ];
    $placeholders = implode(', ', array_fill(0, count($expected), '?'));
    $statement = $pdo->prepare(
        'SELECT company_id, email, role, active, password_hash, force_password_change
         FROM users WHERE email IN (' . $placeholders . ')'
    );
    $statement->execute(array_keys($expected));

    $rows = [];
    foreach ($statement->fetchAll() as $row) {
        $rows[strtolower(trim((string)$row['email']))] = $row;
    }
    if (count($rows) !== count($expected)) {
        throw new RuntimeException('The remote TEST demo account set is incomplete.');
    }

    foreach ($expected as $email => $account) {
        $row = $rows[$email] ?? null;
        $valid = is_array($row)
            && (int)$row['company_id'] === 1
            && (string)$row['role'] === $account['role']
            && (int)$row['active'] === 1
            && (int)$row['force_password_change'] === 0
            && password_verify($account['password'], (string)$row['password_hash']);
        if (!$valid) {
            throw new RuntimeException('A remote TEST demo account does not match the canonical login baseline.');
        }
    }

    return count($expected);
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

/** @return array{users:int,employees:int,open_actions:int,verified_demo_accounts:int,documents:array{invoices:int,customer_timesheets:int}} */
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
        $root . '/server/migrations/018_demo_assignment_mail_templates.sql',
    ];

    $verifiedDemoAccounts = 0;
    $pdo->beginTransaction();
    try {
        $preserveDemoCredentials = test_reset_should_preserve_demo_credentials($config);
        $credentials = test_reset_capture_baseline_credentials($pdo, $preserveDemoCredentials);
        if (!$preserveDemoCredentials) {
            $requiredCredentialEmails = test_reset_baseline_credential_emails(false);
            $capturedCredentialEmails = array_keys($credentials);
            sort($requiredCredentialEmails);
            sort($capturedCredentialEmails);
            if ($capturedCredentialEmails !== $requiredCredentialEmails) {
                throw new RuntimeException('Both TEST acceptance account credentials must exist before the shared reset.');
            }
        }
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
        if (test_reset_remote_contract_is_exact($config)) {
            // Verify the canonical logins while the reset transaction still owns
            // the changed user rows. A concurrent password write cannot race this
            // deployment proof between verification and commit.
            $verifiedDemoAccounts = test_reset_verify_remote_demo_credentials($pdo, $config);
        }
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

    try {
        $documents = test_reset_seed_documents($pdo, $config);
        return [
            'users' => (int)$pdo->query('SELECT COUNT(*) FROM users WHERE active = 1')->fetchColumn(),
            'employees' => (int)$pdo->query('SELECT COUNT(*) FROM employees WHERE active = 1')->fetchColumn(),
            'open_actions' => 12,
            'verified_demo_accounts' => $verifiedDemoAccounts,
            'documents' => $documents,
        ];
    } catch (Throwable $error) {
        throw new TestResetPostCommitException(
            'The database baseline was committed, but post-commit document work failed: ' . $error->getMessage(),
            0,
            $error
        );
    }
}
