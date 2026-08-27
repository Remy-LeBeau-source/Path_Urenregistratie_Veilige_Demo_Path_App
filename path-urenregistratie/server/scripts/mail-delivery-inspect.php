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

/**
 * Pull the visible text out of a PDF produced by server/lib/simple_pdf.php.
 *
 * That writer keeps every content stream uncompressed and lays each line down as
 * a single `(escaped text) Tj`, so the text is recoverable without a PDF parser:
 * find the string operands, reverse the `\( \) \\` escaping, and turn the
 * Windows-1252 bytes back into UTF-8. Tests use this to assert what a recipient
 * actually reads on the invoice -- the byte check alone let an empty or
 * wrong-content PDF through.
 */
function inspect_pdf_text(string $bytes): string
{
    if (!str_starts_with($bytes, '%PDF-')) {
        return '';
    }
    if (!preg_match_all('/\(((?:\\\\.|[^\\\\()])*)\)\s*Tj/s', $bytes, $matches)) {
        return '';
    }
    $lines = [];
    foreach ($matches[1] as $raw) {
        $decoded = str_replace(['\\\\', '\\(', '\\)'], ['\\', '(', ')'], $raw);
        if (function_exists('mb_convert_encoding')) {
            $utf8 = @mb_convert_encoding($decoded, 'UTF-8', 'Windows-1252');
            if (is_string($utf8) && $utf8 !== '') {
                $decoded = $utf8;
            }
        }
        $lines[] = $decoded;
    }
    return implode("\n", $lines);
}

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
    'SELECT channel, recipient_email, cc_email, subject_snapshot, body_snapshot, attachment_policy, dry_run
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

$bijlage = ['bestaat' => false, 'bytes' => 0, 'is_pdf' => false, 'sleutel' => $sleutel, 'pad' => (string)$bestandspad, 'pdf_text' => ''];
if ($bestandspad !== null && is_file($bestandspad)) {
    $inhoud = (string)file_get_contents($bestandspad);
    $bijlage['bestaat'] = true;
    $bijlage['bytes'] = strlen($inhoud);
    $bijlage['is_pdf'] = strncmp($inhoud, '%PDF-', 5) === 0;
    // De ontvanger leest tekst, geen magic bytes. Een geldige maar lege of
    // verkeerd gevulde factuur-PDF kwam er eerder ongemerkt doorheen.
    $bijlage['pdf_text'] = inspect_pdf_text($inhoud);
}

echo json_encode([
    'ok' => true,
    'deliveries' => $stmt->fetchAll(),
    'invoice_number' => (string)($factuur['invoice_number'] ?? ''),
    'attachment' => $bijlage,
    'pdf_text' => $bijlage['pdf_text'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
