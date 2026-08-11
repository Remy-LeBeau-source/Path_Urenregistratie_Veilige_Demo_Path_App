<?php
// Tijdelijk hulpscript: toont recente wachtwoord-reset tokens voor dry-run debugging.
// Verwijder dit bestand voor productiegebruik.
$config = require __DIR__ . '/config.local.php';
try {
    $pdo = new PDO(
        'mysql:host=' . ($config['host'] ?? '127.0.0.1') . ';dbname=' . $config['database'] . ';charset=utf8mb4',
        $config['username'],
        $config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $stmt = $pdo->query(
        'SELECT u.email, prt.token_hash, prt.expires_at, prt.used_at, prt.created_at
         FROM password_reset_tokens prt
         JOIN users u ON u.id = prt.user_id
         ORDER BY prt.created_at DESC
         LIMIT 5'
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        echo "Geen tokens gevonden.\n";
    } else {
        foreach ($rows as $row) {
            echo "E-mail:    " . $row['email'] . "\n";
            echo "Token:     " . $row['token'] . "\n";
            echo "Aangemaakt:" . $row['created_at'] . "\n";
            echo "Geldig tot:" . $row['expires_at'] . "\n";
            echo "Gebruikt:  " . ($row['used_at'] ?? 'nee') . "\n\n";
        }
    }
} catch (Exception $e) {
    echo "Fout: " . $e->getMessage() . "\n";
}
