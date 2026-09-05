<?php

declare(strict_types=1);

/**
 * Read-only preview of what auth_invitation_message() / auth_password_reset_message()
 * actually build, for tests.
 *
 * Locally (and on most CI runs) app_origin is http://127.0.0.1:8000, so
 * auth_password_reset_delivery_available() is always false and
 * auth_enqueue_password_reset() never runs -- no email_deliveries row for this
 * channel ever exists to inspect. That is a real, pre-existing environment gap
 * for testing this channel's content, not something to work around by hitting
 * the real queue. Instead this calls the message-building functions directly
 * with a synthetic HTTPS config, entirely bypassing the delivery-availability
 * gate -- it renders, it does not send or persist anything.
 *
 * Same safety fence as its siblings: CLI only, never against a database whose
 * name does not end in `_test`, and it writes nothing.
 */

require __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../mail/config.php';
require_once __DIR__ . '/../mail/templates.php';
require_once __DIR__ . '/../auth/password-reset-service.php';

$config = auth_load_raw_config();
$db = auth_db_from_config($config);
$database = (string)($db['name'] ?? '');
if (!str_ends_with($database, '_test')) {
    fwrite(STDERR, "Refusing to render mail previews outside an isolated _test database (got: {$database}).\n");
    exit(1);
}

$userId = (int)($argv[1] ?? 0);
$purpose = (string)($argv[2] ?? 'invitation');
if ($userId <= 0 || !in_array($purpose, ['invitation', 'password_reset'], true)) {
    fwrite(STDERR, "Usage: php server/scripts/render-password-reset-mail-preview.php <user_id> [invitation|password_reset]\n");
    exit(1);
}

$pdo = auth_pdo($config);
$stmt = $pdo->prepare('SELECT id, email, display_name FROM users WHERE id = :id LIMIT 1');
$stmt->execute([':id' => $userId]);
$user = $stmt->fetch();
if (!$user) {
    fwrite(STDERR, "No such user: {$userId}.\n");
    exit(1);
}

// Synthetic HTTPS origin -- only used to render, never to actually send. Real
// dispatch always uses the deployed environment's own configured origin.
$previewConfig = $config;
$previewConfig['app_origin'] = 'https://uren-test.pathconsultancy.nl';
$fakeLink = 'https://uren-test.pathconsultancy.nl/index.html#reset-password=' . bin2hex(random_bytes(32));
$displayName = trim((string)($user['display_name'] ?? '')) ?: 'gebruiker';

[$subject, $plain, $html] = $purpose === 'invitation'
    ? auth_invitation_message($pdo, $userId, $displayName, $fakeLink, $previewConfig)
    : auth_password_reset_message($pdo, $userId, $displayName, $fakeLink, $previewConfig);

echo json_encode([
    'ok' => true,
    'link' => $fakeLink,
    'subject' => $subject,
    'plain' => $plain,
    'html' => $html,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
