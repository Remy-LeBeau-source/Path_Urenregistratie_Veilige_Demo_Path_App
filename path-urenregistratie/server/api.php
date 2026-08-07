<?php

declare(strict_types=1);

// Minimal API for storing/loading app state to MySQL
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$localConfigPath = __DIR__ . '/config.local.php';
$examplePath = __DIR__ . '/config.example.php';

// Require a local config with real credentials. Do NOT fall back to the example for live connections.
if (file_exists($localConfigPath)) {
    $config = include $localConfigPath;
} else {
    http_response_code(500);
    echo json_encode([
        'error' => 'missing-config-local',
        'message' => 'Missing server/config.local.php. Copy server/config.example.php to server/config.local.php and fill in real credentials. Do not commit secrets.'
    ]);
    exit;
}

// Accept either a full structured config ['database' => [...]] or a minimal flat config
$db = null;
if (isset($config['database']) && is_array($config['database'])) {
    $db = $config['database'];
} elseif (isset($config['host']) && (isset($config['database']) || isset($config['name']))) {
    // map minimal keys to expected structure
    $db = [
        'host' => $config['host'],
        'port' => isset($config['port']) ? (int)$config['port'] : 3306,
        'name' => $config['database'] ?? ($config['name'] ?? ''),
        'user' => $config['username'] ?? ($config['user'] ?? ''),
        'password' => $config['password'] ?? '',
        'charset' => $config['charset'] ?? 'utf8mb4',
    ];
}

if (!$db || !isset($db['host']) || !isset($db['name'])) {
    http_response_code(500);
    echo json_encode(['error' => 'no-database-config', 'message' => 'Database configuration is missing or incomplete in server/config.local.php']);
    exit;
}

try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $db['host'], $db['port'], $db['name'], $db['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $db['user'], $db['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'db-connection', 'message' => $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? null;
if ($action === 'state') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $pdo->exec('CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, state LONGTEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)');
        $stmt = $pdo->query('SELECT state FROM app_state WHERE id = 1 LIMIT 1');
        $row = $stmt->fetch();
        if ($row && $row['state']) {
            $stateJson = $row['state'];
            $decoded = json_decode($stateJson, true);
            echo json_encode(['state' => $decoded]);
            exit;
        }
        http_response_code(404);
        echo json_encode(['error' => 'no-state']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (!is_array($data) || !array_key_exists('state', $data)) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid-payload']);
            exit;
        }
        $stateJson = json_encode($data['state'], JSON_UNESCAPED_UNICODE);
        $pdo->exec('CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, state LONGTEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)');
        $stmt = $pdo->prepare('INSERT INTO app_state (id, state) VALUES (1, :state) ON DUPLICATE KEY UPDATE state = :state, updated_at = CURRENT_TIMESTAMP');
        $stmt->execute([':state' => $stateJson]);
        echo json_encode(['ok' => true]);
        exit;
    }
}

http_response_code(400);
echo json_encode(['error' => 'unknown-action']);
