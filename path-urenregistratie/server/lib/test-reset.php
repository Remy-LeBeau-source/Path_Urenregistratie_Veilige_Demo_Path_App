<?php

declare(strict_types=1);

require_once __DIR__ . '/simple_pdf.php';
// Voor de echte factuur-PDF in test_reset_seed_documents(). Alleen de
// opbouw, geen verzoekgedrag: zie de toelichting in dat bestand.
require_once __DIR__ . '/invoice-pdf.php';

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
        'td_bv@teqdirectors.nl',
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
        // Derde beheerder-account, uitsluitend op TEST: ontvangt dezelfde
        // admin-brede meldingen als Giovanno/Kenrich, maar raakt bewust niet
        // het aparte mail-veiligheidsmechanisme aan dat hun adressen ELDERS
        // ook gebruiken (test_sink_recipient e.d. -- zie mail-acceptance-
        // policy-check.php). Toegevoegd op verzoek van de gebruiker (2026-09-12).
        ['id' => 1003, 'email' => 'td_bv@teqdirectors.nl', 'name' => 'TD B.V.'],
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

    // Vaste seed-id's (database/seed-demo-data.sql), niet e-mailadres: sinds
    // test_reset_apply_named_tester_emails() bestaat, staat op de rijen van
    // Marc/Stasjo/Brian/Shawn (id 3/4/5/6) hun echte @pathconsultancy.nl-adres
    // in plaats van het @example.invalid-seedadres -- op id zoeken werkt
    // ongeacht welk adres er op dat moment op de rij staat. Zie ook de
    // toelichting bij test_reset_capture_named_tester_credentials() hierboven.
    $expectedById = [
        1 => ['email' => 'gio@example.invalid', 'role' => 'administrator', 'password' => '888888888888'],
        2 => ['email' => 'joyce@example.invalid', 'role' => 'administrator', 'password' => '888888888888'],
        3 => ['email' => 'marc@example.invalid', 'role' => 'employee', 'password' => 'LocalDemoEmployee2026'],
        4 => ['email' => 'stasjo@example.invalid', 'role' => 'employee', 'password' => 'LocalDemoEmployee2026'],
        5 => ['email' => 'brian@example.invalid', 'role' => 'employee', 'password' => 'LocalDemoEmployee2026'],
        6 => ['email' => 'shawn@example.invalid', 'role' => 'employee', 'password' => 'LocalDemoEmployee2026'],
    ];

    // Een genoemde tester mag intussen ook zijn eigen echte wachtwoord hebben
    // gezet via een echte resetmail (test_reset_restore_named_tester_credentials()
    // herstelt precies dat na deze reset) -- dat is bedoeld gedrag, geen
    // drift. Voor die id's verifieert deze functie daarom alleen het
    // (configuratie-gedreven) echte adres, de rol en of het account actief
    // is, niet meer het vaste demo-wachtwoord of de vaste force_password_change.
    $namedTesterEmailById = [];
    foreach (test_reset_named_tester_employee_email_mapping($config) as $entry) {
        $namedTesterEmailById[$entry['id']] = $entry['email'];
    }

    $placeholders = implode(', ', array_fill(0, count($expectedById), '?'));
    $statement = $pdo->prepare(
        'SELECT id, company_id, email, role, active, password_hash, force_password_change
         FROM users WHERE id IN (' . $placeholders . ')'
    );
    $statement->execute(array_keys($expectedById));

    $rows = [];
    foreach ($statement->fetchAll() as $row) {
        $rows[(int)$row['id']] = $row;
    }
    if (count($rows) !== count($expectedById)) {
        throw new RuntimeException('The remote TEST demo account set is incomplete.');
    }

    foreach ($expectedById as $id => $account) {
        $row = $rows[$id] ?? null;
        $isNamedTester = array_key_exists($id, $namedTesterEmailById);
        $expectedEmail = $isNamedTester ? $namedTesterEmailById[$id] : $account['email'];
        $valid = is_array($row)
            && (int)$row['company_id'] === 1
            && strtolower(trim((string)$row['email'])) === $expectedEmail
            && (string)$row['role'] === $account['role']
            && (int)$row['active'] === 1
            && ($isNamedTester || (
                (int)$row['force_password_change'] === 0
                && password_verify($account['password'], (string)$row['password_hash'])
            ));
        if (!$valid) {
            throw new RuntimeException('A remote TEST demo account does not match the canonical login baseline.');
        }
    }

    return count($expectedById);
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

/**
 * Sinds 11 sep kunnen genoemde testers (Marc/Stasjo/Brian/Shawn) hun eigen
 * echte wachtwoord zetten via een echte resetmail (zie
 * mail_test_named_tester_timesheet_channels() en de reset-uitzondering in
 * server/mail/config.php). De gedeelde baseline-reset TRUNCATE't de hele
 * users-tabel en zaait 'm opnieuw (database/seed-demo-data.sql), dus zonder
 * bescherming verdwijnt dat eigen wachtwoord bij elke reset -- de bestaande
 * test_reset_capture_baseline_credentials() vangt dit al voor hun oude
 * @example.invalid-adres, maar niet meer zodra test_reset_apply_named_tester_emails()
 * hun adres naar het echte adres heeft omgezet: de volgende reset zoekt dan
 * nog steeds op het oude adres en vindt de rij niet. Deze functie vangt
 * hetzelfde op, maar op het vaste seed-id (3/4/5/6) i.p.v. e-mailadres --
 * een id verandert nooit, dus dit blijft werken ongeacht welk adres er op
 * dat moment op de rij staat.
 *
 * @return array<int,array{password_hash:string,force_password_change:int}>
 */
function test_reset_capture_named_tester_credentials(PDO $pdo, array $employeeUserIds): array
{
    if ($employeeUserIds === []) {
        return [];
    }
    $placeholders = implode(', ', array_fill(0, count($employeeUserIds), '?'));
    $statement = $pdo->prepare(
        'SELECT id, password_hash, force_password_change
         FROM users
         WHERE id IN (' . $placeholders . ')
           AND password_hash IS NOT NULL
           AND password_hash <> ""
         FOR UPDATE'
    );
    $statement->execute($employeeUserIds);

    $credentials = [];
    foreach ($statement->fetchAll() as $row) {
        $credentials[(int)$row['id']] = [
            'password_hash' => (string)$row['password_hash'],
            'force_password_change' => (int)$row['force_password_change'],
        ];
    }
    return $credentials;
}

/** @param array<int,array{password_hash:string,force_password_change:int}> $credentials */
function test_reset_restore_named_tester_credentials(PDO $pdo, array $credentials): void
{
    $update = $pdo->prepare(
        'UPDATE users
         SET password_hash = :password_hash,
             force_password_change = :force_password_change
         WHERE id = :id'
    );
    foreach ($credentials as $userId => $credential) {
        $update->execute([
            ':password_hash' => $credential['password_hash'],
            ':force_password_change' => $credential['force_password_change'],
            ':id' => $userId,
        ]);
    }
}

/**
 * De toewijzing user-id -> echt e-mailadres voor genoemde testers, uit
 * $config (server/mail/acceptance_test.named_tester_employee_emails, gezet
 * door server/scripts/configure-test-mail-sandbox.php). Eigen functie zodat
 * zowel het herstellen van hun wachtwoord als het terugzetten van hun adres
 * (hieronder) dezelfde, enige bron gebruiken -- twee losse plekken die
 * onafhankelijk de config zouden parsen konden uiteen gaan lopen.
 *
 * @return list<array{id:int,email:string}>
 */
function test_reset_named_tester_employee_email_mapping(array $config): array
{
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    $acceptance = isset($mail['acceptance_test']) && is_array($mail['acceptance_test'])
        ? $mail['acceptance_test']
        : [];
    $raw = isset($acceptance['named_tester_employee_emails']) && is_array($acceptance['named_tester_employee_emails'])
        ? $acceptance['named_tester_employee_emails']
        : [];

    $mapping = [];
    foreach ($raw as $entry) {
        if (!is_array($entry)) {
            continue;
        }
        $userId = (int)($entry['id'] ?? 0);
        $email = strtolower(trim((string)($entry['email'] ?? '')));
        if ($userId <= 0 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            continue;
        }
        $mapping[] = ['id' => $userId, 'email' => $email];
    }
    return $mapping;
}

/**
 * Zet de echte e-mailadressen van genoemde testers terug op hun vaste
 * seed-gebruikersrij, na elke gedeelde baseline-reset (die de hele
 * users-tabel truncate en opnieuw zaait met de @example.invalid-adressen uit
 * database/seed-demo-data.sql -- die seed zelf blijft bewust ongemoeid,
 * tientallen andere testen leunen op die adressen). Zonder deze herstap zou
 * elke reset (elke Playwright-run, elke handmatige "Baseline herstellen")
 * het echte adres van Marc/Stasjo/Brian/Shawn stilletjes terugzetten naar
 * het onbestaande demo-adres, en daarmee hun mailrouting breken.
 *
 * @return list<int> de user-id's die zijn overgezet, voor logging/tests
 */
function test_reset_apply_named_tester_emails(PDO $pdo, array $config): array
{
    $applied = [];
    $update = $pdo->prepare('UPDATE users SET email = :email WHERE id = :id');
    foreach (test_reset_named_tester_employee_email_mapping($config) as $entry) {
        $update->execute([':email' => $entry['email'], ':id' => $entry['id']]);
        $applied[] = $entry['id'];
    }
    return $applied;
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

/**
 * Zet een NIET-vergrendelde conceptfactuur neer voor een urenstaat, zodat
 * TEST-E2E-27 (heropen-beslistabel) bewijsbaar is i.p.v. alleen beredeneerd.
 *
 * De echte app kent geen pad dat dit oplevert: de enige INSERT INTO invoices
 * (server/api/invoices.php, actie 'lock') zet locked_at altijd meteen mee.
 * Een conceptfactuur zonder locked_at komt in de praktijk dus alleen voor via
 * oude demodata -- exact het scenario dat request_correction (timesheets.php)
 * sindsdien bewust NIET meer blokkeert (zie de toelichting daar, 11 sep).
 * Deze functie bootst diezelfde toestand na, TEST-only, voor een gerichte
 * regressietest op die versoepeling.
 *
 * @return array{invoice_id:int,invoice_number:string}
 */
function test_seed_unlocked_invoice_concept(PDO $pdo, int $timesheetId): array
{
    $stmt = $pdo->prepare(
        'SELECT
            t.id AS timesheet_id,
            t.billable_hours,
            p.company_id,
            p.year,
            p.month,
            a.hourly_rate,
            a.vat_percentage,
            a.client_id,
            a.broker_id,
            c.payment_term_days
         FROM timesheets t
         JOIN periods p ON p.id = t.period_id
         JOIN assignments a ON a.id = t.assignment_id
         JOIN companies c ON c.id = p.company_id
         WHERE t.id = :timesheet_id
         LIMIT 1'
    );
    $stmt->execute([':timesheet_id' => $timesheetId]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('De urenstaat voor deze TEST-seed is niet gevonden.');
    }

    $existing = $pdo->prepare('SELECT id FROM invoices WHERE timesheet_id = :timesheet_id LIMIT 1');
    $existing->execute([':timesheet_id' => $timesheetId]);
    if ($existing->fetch()) {
        throw new RuntimeException('Er bestaat al een factuurrij voor deze urenstaat.');
    }

    $recipientId = (int)($row['client_id'] ?? 0);
    if ($recipientId <= 0) {
        $recipientId = (int)($row['broker_id'] ?? 0);
    }
    if ($recipientId <= 0) {
        throw new RuntimeException('Voor deze plaatsing kon geen factuurontvanger worden bepaald.');
    }

    $subtotal = round((float)$row['billable_hours'] * (float)$row['hourly_rate'], 2);
    $vatAmount = round($subtotal * ((float)$row['vat_percentage'] / 100), 2);
    $total = round($subtotal + $vatAmount, 2);
    $invoiceDate = (new DateTimeImmutable('now'))->format('Y-m-d');
    $paymentTermDays = max(1, (int)$row['payment_term_days']);
    $dueDate = (new DateTimeImmutable($invoiceDate))->modify('+' . $paymentTermDays . ' days')->format('Y-m-d');
    // Duidelijk gemarkeerd als TEST-seed, nooit een sjabloon van een echt
    // bedrijf -- dit nummer hoort nooit op een echte factuur te verschijnen.
    $invoiceNumber = 'TEST-CONCEPT-' . $timesheetId . '-' . bin2hex(random_bytes(3));

    $insert = $pdo->prepare(
        'INSERT INTO invoices
         (company_id, timesheet_id, invoice_number, invoice_date, due_date, recipient_id,
          subtotal, vat_percentage, vat_amount, total, status, locked_at, created_by)
         VALUES
         (:company_id, :timesheet_id, :invoice_number, :invoice_date, :due_date, :recipient_id,
          :subtotal, :vat_percentage, :vat_amount, :total, "concept", NULL, :created_by)'
    );
    $insert->execute([
        ':company_id' => (int)$row['company_id'],
        ':timesheet_id' => $timesheetId,
        ':invoice_number' => $invoiceNumber,
        ':invoice_date' => $invoiceDate,
        ':due_date' => $dueDate,
        ':recipient_id' => $recipientId,
        ':subtotal' => $subtotal,
        ':vat_percentage' => (float)$row['vat_percentage'],
        ':vat_amount' => $vatAmount,
        ':total' => $total,
        // created_by verwijst naar een echte gebruiker via de FK; de vaste
        // TEST-beheerder (id 1) bestaat altijd in de gedeelde baseline.
        ':created_by' => 1,
    ]);

    return ['invoice_id' => (int)$pdo->lastInsertId(), 'invoice_number' => $invoiceNumber];
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
    // Beide soorten kregen hier hetzelfde document van vier regels ("PATH
    // CONSULTANCY . TESTDOCUMENT"). Bij Openen/Downloaden in het
    // documentarchief zag je dus voor de factuur én de urenstaat dezelfde
    // lege pagina; gemeld met een screenshot. De factuur kán echt zijn -- de
    // applicatie bouwt die zelf -- en de urenstaat mag een voorbeeld blijven,
    // want die levert de klant aan en Path maakt hem niet, maar dan wel een
    // voorbeeld dat eruitziet als een urenstaat.
    $invoiceRows = $pdo->query(
        'SELECT id, company_id, pdf_storage_key AS storage_key, invoice_number AS label
         FROM invoices WHERE pdf_storage_key IS NOT NULL AND pdf_storage_key <> ""'
    )->fetchAll();
    foreach ($invoiceRows as $row) {
        // De echte factuurbytes op de sleutel die de rij al heeft. Bewust
        // niet via invoices_store_pdf_bytes(): die zet een nieuwe sleutel met
        // een random token, en dan schuift pdf_storage_key bij elke reset
        // terwijl server/scripts/e2e-state-inspect.php juist die kolom leest
        // voor de isolatievingerafdruk. Lukt het bouwen niet (geen GD, een
        // factuurrij zonder joinbare gegevens), dan valt het terug op het
        // oude placeholderdocument: een reset mag hier niet op klappen.
        $pdf = invoices_build_pdf_bytes($pdo, (int)$row['id'], (int)$row['company_id']);
        if ($pdf === null || !simple_pdf_looks_valid($pdf)) {
            $pdf = test_reset_placeholder_document((string)$row['label']);
        }
        test_reset_write_document($privateRoot, 'invoices', (string)$row['storage_key'], $pdf);
        $counts['invoices']++;
    }

    $timesheetRows = $pdo->query(
        'SELECT ct.storage_key,
                COALESCE(ct.original_file_name, "Klanturenstaat") AS label,
                e.full_name AS employee_name,
                a.invoice_project_name,
                CONCAT(p.year, "-", LPAD(p.month, 2, "0")) AS period_key,
                t.billable_hours, t.leave_hours, t.sickness_hours, t.contractual_hours
           FROM customer_timesheets ct
           JOIN employees e ON e.id = ct.employee_id
           JOIN periods p ON p.id = ct.period_id
           JOIN assignments a ON a.id = ct.assignment_id
           LEFT JOIN timesheets t ON t.employee_id = ct.employee_id AND t.period_id = ct.period_id
          WHERE ct.storage_key IS NOT NULL AND ct.storage_key <> ""'
    )->fetchAll();
    foreach ($timesheetRows as $row) {
        test_reset_write_document(
            $privateRoot,
            'customer-timesheets',
            (string)$row['storage_key'],
            test_reset_example_customer_timesheet($row)
        );
        $counts['customer_timesheets']++;
    }

    return $counts;
}

/** Het oorspronkelijke, kale testdocument. Nog in gebruik als terugval. */
function test_reset_placeholder_document(string $label): string
{
    return simple_pdf_text_document([
        ['text' => 'PATH CONSULTANCY · TESTDOCUMENT', 'size' => 15],
        'Uitsluitend voor acceptatie- en regressietesten.',
        'Document: ' . $label,
        'Omgeving: uren-test.pathconsultancy.nl',
    ]);
}

/**
 * Voorbeeldurenstaat in Path-opmaak, met de echte naam, klant, maand en uren
 * van de rij waar het document bij hoort.
 *
 * Het woord TESTDOCUMENT staat bewust in de voettekst en mag daar niet
 * verdwijnen: server/mail/dispatch.php gebruikt die marker om te voorkomen
 * dat een voorbeelddocument ooit als echte factuur wordt meegemaild, en
 * scripts/smoke-test.mjs legt dat vast.
 *
 * @param array<string,mixed> $row
 */
function test_reset_example_customer_timesheet(array $row): string
{
    $uren = static fn($waarde): string => number_format((float)($waarde ?? 0), 2, ',', '.');
    $declarabel = (float)($row['billable_hours'] ?? 0);
    $verlof = (float)($row['leave_hours'] ?? 0);
    $ziekte = (float)($row['sickness_hours'] ?? 0);
    $periode = (string)($row['period_key'] ?? '');
    $maandLabel = preg_match('/^(\d{4})-(\d{2})$/', $periode, $delen) === 1
        ? test_reset_month_name((int)$delen[2]) . ' ' . $delen[1]
        : $periode;
    $klant = trim((string)($row['invoice_project_name'] ?? ''));

    $lines = [
        ['text' => 'URENSTAAT', 'size' => 16],
        ['text' => 'Path Consultancy IT · ' . $maandLabel, 'size' => 10],
        ' ',
        ['text' => 'Medewerker', 'size' => 9],
        ['text' => (string)($row['employee_name'] ?? 'Onbekend'), 'size' => 12],
        ...($klant !== '' ? [['text' => 'Opdracht: ' . $klant, 'size' => 9]] : []),
        ' ',
        ['text' => 'Omschrijving / Uren', 'size' => 9],
        'Declarabele uren        ' . $uren($declarabel),
        'Verlof                  ' . $uren($verlof),
        'Ziekte                  ' . $uren($ziekte),
        ' ',
        ['text' => 'Totaal verantwoord      ' . $uren($declarabel + $verlof + $ziekte), 'size' => 12],
        ...($row['contractual_hours'] !== null
            ? ['Contracturen deze maand ' . $uren($row['contractual_hours'])]
            : []),
        ' ',
        'Akkoord opdrachtgever: ..............................',
        'Datum: ..............................',
        ' ',
        ['text' => 'TESTDOCUMENT — voorbeeldurenstaat voor acceptatie- en regressietesten.', 'size' => 8],
        ['text' => 'Omgeving: uren-test.pathconsultancy.nl', 'size' => 8],
    ];

    $logoPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'path-logo.png';
    try {
        return simple_pdf_branded_text_document($lines, $logoPath);
    } catch (RuntimeException $zonderGd) {
        return simple_pdf_text_document_with_branding_fallback($lines);
    }
}

function test_reset_month_name(int $month): string
{
    $namen = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maart', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Augustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'December',
    ];
    return $namen[$month] ?? (string)$month;
}

function test_reset_write_document(string $privateRoot, string $bucket, string $storageKey, string $pdf): void
{
    $path = test_reset_document_path($privateRoot, $bucket, $storageKey);
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
        throw new RuntimeException('De private TEST-documentmap kon niet worden gemaakt.');
    }
    if (!simple_pdf_looks_valid($pdf) || file_put_contents($path, $pdf) === false) {
        throw new RuntimeException('Een TEST-PDF kon niet veilig worden opgebouwd.');
    }
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
        // 038 past het werkpatroon (contracturen + dagverdeling) van Stasjo/Shawn
        // aan bovenop de kale seed. Zonder deze regel hier zette elke gedeelde
        // reset (dus ook elke Playwright-testrun) dat weer terug naar de oude
        // seedwaarden, ontdekt via ADM-WR-H-022/EQ-H-020 die faalden -- niet
        // door de migratie zelf, maar omdat de reset 'm meteen weer ongedaan
        // maakte. Zelfde reden als 008/009/016/018 hierboven al in deze lijst
        // staan: baseline-uitlijning die na de kale seed moet blijven gelden.
        $root . '/server/migrations/038_demo_employee_day_hours_pattern.sql',
    ];

    $verifiedDemoAccounts = 0;
    $pdo->beginTransaction();
    try {
        $preserveDemoCredentials = test_reset_should_preserve_demo_credentials($config);
        $credentials = test_reset_capture_baseline_credentials($pdo, $preserveDemoCredentials);
        // Op id, niet e-mailadres: zodra test_reset_apply_named_tester_emails()
        // hierna een tester op zijn echte adres heeft gezet, zou de bovenstaande
        // e-mail-gebaseerde vangst 'm bij de volgende reset niet meer vinden --
        // zie test_reset_capture_named_tester_credentials() voor de toelichting.
        $namedTesterEmployeeIds = array_column(test_reset_named_tester_employee_email_mapping($config), 'id');
        $namedTesterCredentials = test_reset_capture_named_tester_credentials($pdo, $namedTesterEmployeeIds);
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
        // mail_channel_templates holds per-company overrides of the built-in mail
        // texts. The demo seed never creates a row here, so the baseline is empty;
        // a UI test that customises a channel and then fails before its own
        // teardown leaves a row behind, and the e2eIsolation fingerprint check
        // drifts on this table. Clearing it is the isolation intent -- an override
        // is opt-in and rebuilt only when a test explicitly saves one.
        foreach (['password_reset_tokens', 'auth_login_audit', 'mail_channel_templates'] as $table) {
            $pdo->exec('DELETE FROM ' . $table);
        }
        // app_state is a transient browser-state blob that server/api.php creates
        // on demand; the demo seed never touches it. Without clearing it here, any
        // UI-driven test that changes role/period leaves the row mutated and the
        // e2eIsolation fingerprint check drifts on app_state. Clearing it is the
        // isolation intent -- the row is rebuilt on the next ?action=state write.
        // Guarded by an existence check because CREATE TABLE would implicitly
        // commit this reset transaction, and the table is absent until first use.
        $appStateExists = (int)$pdo->query(
            "SELECT COUNT(*) FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_state'"
        )->fetchColumn() > 0;
        if ($appStateExists) {
            $pdo->exec('DELETE FROM app_state');
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
        test_reset_restore_named_tester_credentials($pdo, $namedTesterCredentials);
        test_reset_apply_named_tester_emails($pdo, $config);
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
