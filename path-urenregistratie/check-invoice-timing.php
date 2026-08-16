<?php
declare(strict_types=1);

$config = require __DIR__ . '/server/config.local.php';

try {
    $pdo = new PDO(
        'mysql:host=' . $config['host'] . ';dbname=' . $config['database'] . ';charset=utf8mb4',
        $config['username'],
        $config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    die("Database error: " . $e->getMessage());
}

// Commit time: 2026-08-16 21:29:29
// Check invoices locked AFTER this time
echo "Invoices locked AFTER 21:29:29 (after fix commit):\n\n";

$stmt = $pdo->query(
    'SELECT i.id, i.invoice_number, i.locked_at, i.pdf_storage_key
     FROM invoices
     WHERE i.locked_at > "2026-08-16 21:29:29"
     ORDER BY i.locked_at DESC
     LIMIT 10'
);

$count = 0;
foreach ($stmt as $row) {
    echo sprintf(
        "ID %d: %s locked at %s (pdf_key: %s)\n",
        $row['id'],
        $row['invoice_number'],
        $row['locked_at'] ?? 'NULL',
        $row['pdf_storage_key'] ?? 'NULL'
    );
    $count++;
}

echo "\nTotal NEW invoices (after fix): $count\n";

if ($count === 0) {
    echo "\n⚠️  PROBLEM: No invoices were locked AFTER the fix was deployed!\n";
    echo "All existing invoices have PDF's from BEFORE the fix.\n";
    echo "Solution: Need to regenerate PDFs for existing invoices, or lock a new test invoice.\n";
}
