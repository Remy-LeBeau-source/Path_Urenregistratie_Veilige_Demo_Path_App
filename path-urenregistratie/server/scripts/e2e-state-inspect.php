<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("CLI only.\n");
}

/** @return array<string,string> */
function e2e_inspect_options(array $argv): array
{
    $options = [];
    foreach (array_slice($argv, 1) as $argument) {
        if (!str_starts_with($argument, '--')) {
            continue;
        }
        [$name, $value] = array_pad(explode('=', substr($argument, 2), 2), 2, '');
        $options[$name] = $value;
    }
    return $options;
}

function e2e_inspect_identifier(string $value): string
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $value)) {
        throw new RuntimeException('Ongeldige database-identificatie in de E2E-inspectie.');
    }
    return '`' . $value . '`';
}

/** @return list<int> */
function e2e_inspect_ids(PDO $pdo, string $sql, array $params = []): array
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    return array_values(array_map('intval', $statement->fetchAll(PDO::FETCH_COLUMN)));
}

function e2e_inspect_count(PDO $pdo, string $table, string $column, array $ids): int
{
    if ($ids === []) {
        return 0;
    }
    $placeholders = implode(', ', array_fill(0, count($ids), '?'));
    $statement = $pdo->prepare(
        'SELECT COUNT(*) FROM ' . e2e_inspect_identifier($table)
        . ' WHERE ' . e2e_inspect_identifier($column) . ' IN (' . $placeholders . ')'
    );
    $statement->execute($ids);
    return (int)$statement->fetchColumn();
}

/** @return array<string,int> */
function e2e_inspect_scenario_counts(PDO $pdo, string $marker): array
{
    if ($marker === '') {
        return [];
    }
    $like = '%' . $marker . '%';
    $userIds = e2e_inspect_ids(
        $pdo,
        'SELECT id FROM users WHERE email LIKE ? OR display_name LIKE ?',
        [$like, $like]
    );
    $employeeIds = e2e_inspect_ids(
        $pdo,
        'SELECT id FROM employees WHERE user_id IN ('
        . ($userIds === [] ? 'NULL' : implode(', ', array_fill(0, count($userIds), '?')))
        . ') OR full_name LIKE ?',
        [...$userIds, $like]
    );
    $assignmentIds = e2e_inspect_ids(
        $pdo,
        'SELECT id FROM assignments WHERE employee_id IN ('
        . ($employeeIds === [] ? 'NULL' : implode(', ', array_fill(0, count($employeeIds), '?')))
        . ') OR assignment_name LIKE ? OR project_code LIKE ? OR contract_label LIKE ?',
        [...$employeeIds, $like, $like, $like]
    );
    $timesheetIds = e2e_inspect_ids(
        $pdo,
        'SELECT id FROM timesheets WHERE employee_id IN ('
        . ($employeeIds === [] ? 'NULL' : implode(', ', array_fill(0, count($employeeIds), '?')))
        . ') OR employee_note LIKE ? OR review_note LIKE ?',
        [...$employeeIds, $like, $like]
    );
    $invoiceIds = e2e_inspect_ids(
        $pdo,
        'SELECT id FROM invoices WHERE timesheet_id IN ('
        . ($timesheetIds === [] ? 'NULL' : implode(', ', array_fill(0, count($timesheetIds), '?')))
        . ') OR invoice_number LIKE ? OR pdf_storage_key LIKE ?',
        [...$timesheetIds, $like, $like]
    );

    $routeCount = e2e_inspect_count($pdo, 'assignment_mail_routes', 'assignment_id', $assignmentIds);
    $deliveryByInvoice = e2e_inspect_count($pdo, 'email_deliveries', 'invoice_id', $invoiceIds);
    $deliveryByUser = e2e_inspect_count($pdo, 'email_deliveries', 'user_id', $userIds);

    return [
        'users' => count($userIds),
        'employees' => count($employeeIds),
        'assignments' => count($assignmentIds),
        'assignment_mail_routes' => $routeCount,
        'timesheets' => count($timesheetIds),
        'time_entries' => e2e_inspect_count($pdo, 'time_entries', 'timesheet_id', $timesheetIds),
        'timesheet_corrections' => e2e_inspect_count($pdo, 'timesheet_corrections', 'timesheet_id', $timesheetIds),
        'customer_timesheets' => e2e_inspect_count($pdo, 'customer_timesheets', 'employee_id', $employeeIds),
        'invoices' => count($invoiceIds),
        'email_deliveries' => max($deliveryByInvoice, $deliveryByUser),
        'password_reset_tokens' => e2e_inspect_count($pdo, 'password_reset_tokens', 'user_id', $userIds),
    ];
}

/** @return array{counts:array<string,int>,fingerprint:string,table_fingerprints:array<string,string>,columns:array<string,list<string>>} */
function e2e_inspect_database_snapshot(PDO $pdo, string $databaseName): array
{
    $tablesStatement = $pdo->prepare(
        'SELECT TABLE_NAME
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = "BASE TABLE"
         ORDER BY TABLE_NAME'
    );
    $tablesStatement->execute([$databaseName]);
    $tables = array_map('strval', $tablesStatement->fetchAll(PDO::FETCH_COLUMN));

    $columnStatement = $pdo->prepare(
        'SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION'
    );
    $counts = [];
    $fingerprintData = [];
    $columnsByTable = [];
    foreach ($tables as $table) {
        $quotedTable = e2e_inspect_identifier($table);
        $counts[$table] = (int)$pdo->query('SELECT COUNT(*) FROM ' . $quotedTable)->fetchColumn();
        $columnStatement->execute([$databaseName, $table]);
        $metadata = $columnStatement->fetchAll();
        $columns = [];
        $order = [];
        foreach ($metadata as $column) {
            $name = (string)$column['COLUMN_NAME'];
            if (str_ends_with($name, '_at') || ($table === 'audit_log' && $name === 'id')) {
                continue;
            }
            $columns[] = $name;
            if ((string)$column['COLUMN_KEY'] === 'PRI') {
                $order[] = $name;
            }
        }
        $columnsByTable[$table] = $columns;
        if ($columns === []) {
            $fingerprintData[$table] = [];
            continue;
        }
        $select = implode(', ', array_map('e2e_inspect_identifier', $columns));
        $orderSql = $order === []
            ? ''
            : ' ORDER BY ' . implode(', ', array_map('e2e_inspect_identifier', $order));
        $fingerprintData[$table] = $pdo->query(
            'SELECT ' . $select . ' FROM ' . $quotedTable . $orderSql
        )->fetchAll();
    }

    $encoded = json_encode($fingerprintData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded)) {
        throw new RuntimeException('De E2E-databasefingerprint kon niet worden opgebouwd.');
    }
    $tableFingerprints = [];
    foreach ($fingerprintData as $table => $rows) {
        $tableEncoded = json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($tableEncoded)) {
            throw new RuntimeException('De E2E-tabelfingerprint kon niet worden opgebouwd voor ' . $table . '.');
        }
        $tableFingerprints[$table] = hash('sha256', $tableEncoded);
    }
    return [
        'counts' => $counts,
        'fingerprint' => hash('sha256', $encoded),
        'table_fingerprints' => $tableFingerprints,
        'columns' => $columnsByTable,
    ];
}

/** @return array{total:int,matches:list<array{table:string,column:string,count:int}>} */
function e2e_inspect_marker_matches(PDO $pdo, string $databaseName, string $marker): array
{
    if ($marker === '') {
        return ['total' => 0, 'matches' => []];
    }
    $statement = $pdo->prepare(
        'SELECT TABLE_NAME, COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ?
           AND DATA_TYPE IN ("char", "varchar", "tinytext", "text", "mediumtext", "longtext", "json")
         ORDER BY TABLE_NAME, COLUMN_NAME'
    );
    $statement->execute([$databaseName]);
    $matches = [];
    $total = 0;
    foreach ($statement->fetchAll() as $column) {
        $table = (string)$column['TABLE_NAME'];
        $name = (string)$column['COLUMN_NAME'];
        $query = $pdo->prepare(
            'SELECT COUNT(*) FROM ' . e2e_inspect_identifier($table)
            . ' WHERE CAST(' . e2e_inspect_identifier($name) . ' AS CHAR) LIKE ?'
        );
        $query->execute(['%' . $marker . '%']);
        $count = (int)$query->fetchColumn();
        if ($count > 0) {
            $matches[] = ['table' => $table, 'column' => $name, 'count' => $count];
            $total += $count;
        }
    }
    return ['total' => $total, 'matches' => $matches];
}

/** @return array{total:int,relations:list<array<string,string|int>>} */
function e2e_inspect_orphans(PDO $pdo, string $databaseName): array
{
    $statement = $pdo->prepare(
        'SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION'
    );
    $statement->execute([$databaseName]);
    $relations = [];
    $total = 0;
    foreach ($statement->fetchAll() as $relation) {
        $childTable = (string)$relation['TABLE_NAME'];
        $childColumn = (string)$relation['COLUMN_NAME'];
        $parentTable = (string)$relation['REFERENCED_TABLE_NAME'];
        $parentColumn = (string)$relation['REFERENCED_COLUMN_NAME'];
        $sql = 'SELECT COUNT(*) FROM ' . e2e_inspect_identifier($childTable) . ' child'
            . ' LEFT JOIN ' . e2e_inspect_identifier($parentTable) . ' parent'
            . ' ON child.' . e2e_inspect_identifier($childColumn)
            . ' = parent.' . e2e_inspect_identifier($parentColumn)
            . ' WHERE child.' . e2e_inspect_identifier($childColumn) . ' IS NOT NULL'
            . ' AND parent.' . e2e_inspect_identifier($parentColumn) . ' IS NULL';
        $count = (int)$pdo->query($sql)->fetchColumn();
        if ($count > 0) {
            $relations[] = [
                'table' => $childTable,
                'column' => $childColumn,
                'parent_table' => $parentTable,
                'parent_column' => $parentColumn,
                'count' => $count,
            ];
            $total += $count;
        }
    }
    return ['total' => $total, 'relations' => $relations];
}

/** @return array{invalid:int,files:list<array<string,string|int|bool>>} */
function e2e_inspect_documents(PDO $pdo, string $privateRoot): array
{
    $sources = [
        'invoices' => $pdo->query(
            'SELECT id, pdf_storage_key AS storage_key FROM invoices
             WHERE pdf_storage_key IS NOT NULL AND pdf_storage_key <> ""'
        )->fetchAll(),
        'customer-timesheets' => $pdo->query(
            'SELECT id, storage_key FROM customer_timesheets
             WHERE storage_key IS NOT NULL AND storage_key <> ""'
        )->fetchAll(),
    ];
    $files = [];
    $invalid = 0;
    foreach ($sources as $bucket => $rows) {
        foreach ($rows as $row) {
            $key = trim(str_replace('\\', '/', (string)$row['storage_key']), '/');
            $safe = $key !== '' && !str_contains($key, '..') && !str_contains($key, "\0");
            $path = $safe
                ? rtrim($privateRoot, '/\\') . DIRECTORY_SEPARATOR . $bucket . DIRECTORY_SEPARATOR
                    . str_replace('/', DIRECTORY_SEPARATOR, $key)
                : '';
            $exists = $safe && is_file($path);
            $bytes = $exists ? (int)filesize($path) : 0;
            $header = $exists ? (string)file_get_contents($path, false, null, 0, 5) : '';
            $tail = '';
            if ($exists && $bytes > 0) {
                $handle = fopen($path, 'rb');
                if (is_resource($handle)) {
                    fseek($handle, max(0, $bytes - 2048));
                    $tail = (string)stream_get_contents($handle);
                    fclose($handle);
                }
            }
            $isPdf = $header === '%PDF-' && str_contains($tail, '%%EOF');
            if (!$safe || !$exists || $bytes <= 0 || !$isPdf) {
                $invalid++;
            }
            $files[] = [
                'bucket' => $bucket,
                'record_id' => (int)$row['id'],
                'storage_key' => $key,
                'safe_key' => $safe,
                'exists' => $exists,
                'bytes' => $bytes,
                'is_pdf' => $isPdf,
            ];
        }
    }
    return ['invalid' => $invalid, 'files' => $files];
}

try {
    $options = e2e_inspect_options($argv);
    $marker = trim((string)($options['marker'] ?? ''));
    $config = auth_load_raw_config();
    $database = auth_db_from_config($config);
    $databaseName = trim((string)$database['name']);
    $databaseHost = strtolower(trim((string)$database['host']));
    if (
        auth_environment_from_config($config) !== 'test'
        || !str_ends_with(strtolower($databaseName), '_test')
        || !in_array($databaseHost, ['127.0.0.1', 'localhost', '::1'], true)
    ) {
        throw new RuntimeException('E2E-inspectie weigert een niet-lokale database buiten het _test-contract.');
    }

    $privateRoot = auth_private_root_from_config($config);
    $normalizedPrivateRoot = auth_normalize_filesystem_path($privateRoot);
    $normalizedTempRoot = rtrim(auth_normalize_filesystem_path(sys_get_temp_dir()), '/') . '/';
    if (
        !str_starts_with($normalizedPrivateRoot . '/', $normalizedTempRoot)
        || !str_starts_with(basename($normalizedPrivateRoot), 'path-urenregistratie-playwright-')
    ) {
        throw new RuntimeException('E2E-inspectie weigert een private opslag buiten de unieke tijdelijke runner-map.');
    }

    $pdo = auth_pdo($config);
    $snapshot = e2e_inspect_database_snapshot($pdo, $databaseName);
    $markerMatches = e2e_inspect_marker_matches($pdo, $databaseName, $marker);
    $orphans = e2e_inspect_orphans($pdo, $databaseName);
    $documents = e2e_inspect_documents($pdo, $privateRoot);

    echo json_encode([
        'ok' => true,
        'database' => $databaseName,
        'run_id' => (string)getenv('PATH_APP_E2E_RUN_ID'),
        'fingerprint' => $snapshot['fingerprint'],
        'table_fingerprints' => $snapshot['table_fingerprints'],
        'table_counts' => $snapshot['counts'],
        'marker' => $marker,
        'marker_matches' => $markerMatches,
        'scenario_counts' => e2e_inspect_scenario_counts($pdo, $marker),
        'orphans' => $orphans,
        'documents' => $documents,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
