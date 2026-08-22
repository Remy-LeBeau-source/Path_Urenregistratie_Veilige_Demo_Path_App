<?php

declare(strict_types=1);

require_once __DIR__ . '/../mail/config.php';
// Needed so a queued reset/invitation is actually dispatched in the guarded
// TEST sandbox instead of waiting for a cron that does not run there.
require_once __DIR__ . '/../mail/dispatch.php';

const AUTH_PASSWORD_RESET_TTL_HOURS = 2;
const AUTH_PASSWORD_RESET_MAX_REQUESTS = 3;
const AUTH_PASSWORD_RESET_WINDOW_MINUTES = 15;

function auth_password_reset_delivery_available(array $config): bool
{
    return preg_match('#^https://#i', auth_app_origin_from_config($config)) === 1
        && mail_real_delivery_allowed_for_environment($config)
        && mail_validate_relay_config($config) === [];
}

function auth_password_reset_public_response(array $config, ?string $demoToken = null, ?string $expiresAt = null): array
{
    $realDelivery = auth_password_reset_delivery_available($config);
    $response = [
        'ok' => true,
        'dry_run' => !$realDelivery,
        // In production this value describes the configured service, not whether
        // the supplied address exists. That prevents account enumeration.
        'delivery_available' => auth_password_reset_delivery_available($config),
    ];
    if (!$realDelivery && $demoToken !== null) {
        $response['token'] = $demoToken;
        $response['expires_at'] = $expiresAt;
    }
    return $response;
}

function auth_password_reset_url(array $config, string $rawToken): string
{
    $origin = auth_app_origin_from_config($config);
    if (!preg_match('#^https://#i', $origin)) {
        throw new RuntimeException('Password reset links require an HTTPS app origin.');
    }
    // A fragment is never sent in the HTTP request and therefore stays out of
    // access logs. The client removes it from browser history before use.
    return $origin . '/index.html#reset-password=' . rawurlencode($rawToken);
}

function auth_password_reset_queue_recipient(array $config, string $accountEmail, string $purpose): string
{
    if ($purpose === 'invitation' && mail_environment($config) === 'test') {
        $fixedRecipient = mail_test_invitation_recipient($config);
        if ($fixedRecipient === null) {
            throw new RuntimeException('De vaste TEST-ontvanger voor uitnodigingen is niet veilig ingesteld.');
        }
        return $fixedRecipient;
    }
    return trim($accountEmail);
}

function auth_enqueue_password_reset(
    PDO $pdo,
    array $user,
    array $config,
    string $rawToken,
    string $purpose = 'password_reset'
): int
{
    $userId = (int)$user['id'];
    $accountEmail = trim((string)$user['email']);
    if ($userId <= 0 || !filter_var($accountEmail, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Invalid password-reset recipient.');
    }
    $recipient = auth_password_reset_queue_recipient($config, $accountEmail, $purpose);
    $effective = mail_effective_delivery($config, [
        'channel' => 'password_reset',
        'recipient_email' => $recipient,
        'cc_email' => null,
        'subject_snapshot' => '',
        'body_snapshot' => '',
        'acceptance_test' => false,
    ]);
    $recipientErrors = mail_validate_delivery_recipients($config, $effective['recipient'], $effective['cc']);
    if ($recipientErrors !== []) {
        throw new RuntimeException('Password-reset recipient is not allowed in this environment.');
    }
    $displayName = trim((string)($user['display_name'] ?? '')) ?: 'gebruiker';
    $link = auth_password_reset_url($config, $rawToken);
    $isTestInvitationRedirect = $purpose === 'invitation'
        && strtolower($recipient) !== strtolower($accountEmail);
    $subject = ($isTestInvitationRedirect ? '[TEST uitnodiging voor ' . $accountEmail . '] ' : '')
        . 'Stel je wachtwoord in voor Uren & Facturatie';
    $body = "Beste {$displayName},\n\n"
        . ($isTestInvitationRedirect
            ? "TESTUITNODIGING — oorspronkelijke account: {$accountEmail}\n\n"
            : '')
        . "Gebruik de onderstaande persoonlijke link om je wachtwoord in te stellen. "
        . "De link is twee uur geldig en kan één keer worden gebruikt.\n\n"
        . $link . "\n\n"
        . "Heb je dit niet aangevraagd? Negeer deze e-mail en neem bij twijfel contact op met Backoffice.\n\n"
        . "Met vriendelijke groet,\nPath Consultancy";

    $stmt = $pdo->prepare(
        'INSERT INTO email_deliveries
         (user_id, channel, recipient_email, cc_email, subject_snapshot, body_snapshot,
          attachment_policy, dry_run, status)
         VALUES (:user_id, "password_reset", :recipient, NULL, :subject, :body, "none", 0, "queued")'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':recipient' => $recipient,
        ':subject' => $subject,
        ':body' => $body,
    ]);
    return (int)$pdo->lastInsertId();
}

/** @return array{token:string,expires_at:string,delivery_id:?int}|null */
function auth_create_password_reset(
    PDO $pdo,
    array $user,
    array $config,
    string $purpose = 'password_reset'
): ?array
{
    $userId = (int)$user['id'];
    $realDelivery = auth_password_reset_delivery_available($config);
    if ($realDelivery) {
        $throttle = $pdo->prepare(
            'SELECT COUNT(*) FROM password_reset_tokens
             WHERE user_id = :uid AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)'
        );
        $throttle->execute([':uid' => $userId]);
        if ((int)$throttle->fetchColumn() >= AUTH_PASSWORD_RESET_MAX_REQUESTS) {
            return null;
        }
    }

    $rawToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $rawToken);
    $expiresAt = (new DateTimeImmutable('+' . AUTH_PASSWORD_RESET_TTL_HOURS . ' hours', new DateTimeZone('UTC')))
        ->format('Y-m-d H:i:s');
    $deliveryId = null;

    $ownsTransaction = !$pdo->inTransaction();
    if ($ownsTransaction) {
        $pdo->beginTransaction();
    }
    try {
        $pdo->prepare('UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = :uid AND used_at IS NULL')
            ->execute([':uid' => $userId]);
        $pdo->prepare(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (:uid, :hash, :exp)'
        )->execute([':uid' => $userId, ':hash' => $tokenHash, ':exp' => $expiresAt]);

        if ($realDelivery) {
            $deliveryId = auth_enqueue_password_reset($pdo, $user, $config, $rawToken, $purpose);
        }
        if ($ownsTransaction) {
            $pdo->commit();
        }
    } catch (Throwable $error) {
        if ($ownsTransaction && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }

    // Every other queueing path (invoices, customer timesheets, the mail
    // console) dispatches right away in the guarded TEST sandbox; this one did
    // not, so reset and invitation mails sat in the queue forever on TEST and
    // never reached the sink. Dispatch after the commit so SMTP is never opened
    // inside the transaction. Production stays queue-only: the guard inside
    // mail_dispatch_created() only allows this in guarded TEST.
    if ($deliveryId !== null && $deliveryId > 0 && function_exists('mail_dispatch_created')) {
        try {
            mail_dispatch_created($pdo, [['id' => $deliveryId]], $config);
        } catch (Throwable $dispatchError) {
            // A failed send must never invalidate an already-issued token; the
            // delivery stays queued with its recorded error for a retry.
            error_log('Password-reset mail could not be dispatched: ' . $dispatchError->getMessage());
        }
    }

    return ['token' => $rawToken, 'expires_at' => $expiresAt, 'delivery_id' => $deliveryId];
}
