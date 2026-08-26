<?php

declare(strict_types=1);

/**
 * Read-only inspection of what a queued mail actually says, for tests.
 *
 * This prints full message bodies, so it is deliberately fenced in three ways:
 * CLI only, never against a database whose name does not end in `_test`, and it
 * writes nothing. Tests need it because the email-queue API intentionally does
 * not expose body_snapshot -- full message content stays out of the admin UI.
 */

require __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../auth/session.php';

$config = auth_load_raw_config();
$db = auth_db_from_config($config);
$database = (string)($db['name'] ?? '');
if (!str_ends_with($database, '_test')) {
    fwrite(STDERR, "Refusing to inspect mail bodies outside an isolated _test database (got: {$database}).\n");
    exit(1);
}

$invoiceId = (int)($argv[1] ?? 0);
if ($invoiceId <= 0) {
    fwrite(STDERR, "Usage: php server/scripts/mail-delivery-inspect.php <invoice_id>\n");
    exit(1);
}

$pdo = auth_pdo($config);
$stmt = $pdo->prepare(
    'SELECT channel, recipient_email, subject_snapshot, body_snapshot, attachment_policy
     FROM email_deliveries
     WHERE invoice_id = :invoice_id
     ORDER BY id'
);
$stmt->execute([':invoice_id' => $invoiceId]);

// Het bijlagebeleid zegt of er iets mee zou moeten. Dat is niet hetzelfde als een
// bestand dat er werkelijk is. Een test die alleen het beleid controleert, mist een
// lege of ontbrekende PDF -- en dat merkt de ontvanger als eerste.
require_once __DIR__ . '/../mail/dispatch.php';

$factuurStmt = $pdo->prepare('SELECT pdf_storage_key, invoice_number FROM invoices WHERE id = :id LIMIT 1');
$factuurStmt->execute([':id' => $invoiceId]);
$factuur = $factuurStmt->fetch();
$sleutel = (string)($factuur['pdf_storage_key'] ?? '');
$bestandspad = $sleutel !== '' ? mail_storage_path($config, 'invoices', $sleutel) : null;

$bijlage = ['bestaat' => false, 'bytes' => 0, 'is_pdf' => false, 'sleutel' => $sleutel, 'pad' => (string)$bestandspad];
if ($bestandspad !== null && is_file($bestandspad)) {
    $bijlage['bestaat'] = true;
    $bijlage['bytes'] = (int)filesize($bestandspad);
    $bijlage['is_pdf'] = strncmp((string)file_get_contents($bestandspad, false, null, 0, 5), '%PDF-', 5) === 0;
}

echo json_encode([
    'ok' => true,
    'deliveries' => $stmt->fetchAll(),
    'invoice_number' => (string)($factuur['invoice_number'] ?? ''),
    'attachment' => $bijlage,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
