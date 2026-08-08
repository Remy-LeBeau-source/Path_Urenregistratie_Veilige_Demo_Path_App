<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
$localConfigPath = __DIR__ . '/config.local.php';
if (!file_exists($localConfigPath)) {
    echo json_encode(['error' => 'missing config.local.php']);
    exit;
}
$config = include $localConfigPath;
$db = null;
if (isset($config['database']) && is_array($config['database'])) {
    $db = $config['database'];
} elseif (isset($config['host']) && (isset($config['database']) || isset($config['name']))) {
    $db = [
        'host' => $config['host'],
        'port' => isset($config['port']) ? (int)$config['port'] : 3306,
        'name' => $config['database'] ?? ($config['name'] ?? ''),
        'user' => $config['username'] ?? ($config['user'] ?? ''),
        'password' => $config['password'] ?? '',
        'charset' => $config['charset'] ?? 'utf8mb4',
    ];
}
if (!$db) { echo json_encode(['error' => 'no database config']); exit; }
$dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'] ?? 3306, $db['name'], $db['charset'] ?? 'utf8mb4');
$pdo = new PDO($dsn, $db['user'] ?? '', $db['password'] ?? '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$table = isset($_GET['table']) ? preg_replace('/[^a-z0-9_]/i', '', $_GET['table']) : 'companies';
 $stmt = $pdo->prepare("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl ORDER BY ORDINAL_POSITION");
 $stmt->execute([':db' => $db['name'], ':tbl' => $table]);
$cols = $stmt->fetchAll();
echo json_encode($cols, JSON_PRETTY_PRINT);
