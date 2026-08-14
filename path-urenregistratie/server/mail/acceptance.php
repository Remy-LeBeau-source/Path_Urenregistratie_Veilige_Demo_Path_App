<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/queue.php';
require_once __DIR__ . '/dispatch.php';
require_once __DIR__ . '/../auth/password-reset-service.php';

function mail_acceptance_available_for_environment(array $config): bool
{
    foreach (['PATH_APP_ENVIRONMENT', 'PLAYWRIGHT_ENVIRONMENT', 'APP_ENV', 'PLAYWRIGHT_STAGE'] as $key) {
        $override = getenv($key);
        if ($override !== false && trim((string)$override) !== '') {
            return strtolower(trim((string)$override)) !== 'production';
        }
    }
    $environment = strtolower(trim((string)($config['environment'] ?? ($config['app']['environment'] ?? 'production'))));
    return $environment !== 'production';
}

/** @return array<string,mixed> */
function mail_acceptance_settings(array $config): array
{
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    return isset($mail['acceptance_test']) && is_array($mail['acceptance_test'])
        ? $mail['acceptance_test']
        : [];
}

function mail_acceptance_repeatable_security_flow(array $config): bool
{
    $origin = rtrim((string)($config['app_origin'] ?? ($config['app']['app_origin'] ?? '')), '/');
    return mail_environment($config) === 'test'
        && $origin === 'https://uren-test.pathconsultancy.nl'
        && (mail_acceptance_settings($config)['enabled'] ?? false) === true;
}

/** @return array<string,array<string,mixed>> */
function mail_acceptance_scenario_definitions(array $config): array
{
    $settings = mail_acceptance_settings($config);
    $businessRecipient = strtolower(trim((string)($settings['business_recipient'] ?? '')));
    $resetRecipient = strtolower(trim((string)($settings['password_reset_recipient'] ?? '')));
    $invitationRecipient = strtolower(trim((string)($settings['invitation_recipient'] ?? '')));

    return [
        'broker_bundle' => [
            'label' => 'Broker: factuur + klanturenstaat',
            'recipient' => $businessRecipient,
            'channel' => 'broker',
            'attachment_policy' => 'invoice_and_customer_timesheet',
            'attachment_count' => 2,
            'kind' => 'business',
        ],
        'accountant_invoice' => [
            'label' => 'Boekhouder: factuur',
            'recipient' => $businessRecipient,
            'channel' => 'accountant',
            'attachment_policy' => 'invoice',
            'attachment_count' => 1,
            'kind' => 'business',
        ],
        'payroll_hours' => [
            'label' => 'Salarisadministratie: alleen ureninformatie',
            'recipient' => $businessRecipient,
            'channel' => 'payroll',
            'attachment_policy' => 'none',
            'attachment_count' => 0,
            'kind' => 'business',
        ],
        'password_reset' => [
            'label' => 'Wachtwoord vergeten: eenmalige link',
            'recipient' => $resetRecipient,
            'channel' => 'password_reset',
            'attachment_policy' => 'none',
            'attachment_count' => 0,
            'kind' => 'password_reset',
        ],
        'account_invitation' => [
            'label' => 'Eerste uitnodiging: wachtwoord aanmaken',
            'recipient' => $invitationRecipient,
            'channel' => 'password_reset',
            'attachment_policy' => 'none',
            'attachment_count' => 0,
            'kind' => 'invitation',
        ],
    ];
}

/** @return array{enabled:bool,ready:bool,issues:list<string>,scenarios:list<array<string,mixed>>} */
function mail_acceptance_status(PDO $pdo, int $companyId, array $config): array
{
    $settings = mail_acceptance_settings($config);
    $enabled = ($settings['enabled'] ?? false) === true;
    $issues = [];
    if (!$enabled) {
        $issues[] = 'De acceptatieconsole staat uit in de serverconfiguratie.';
    }
    if (!mail_real_delivery_allowed_for_environment($config)) {
        $issues[] = 'Echte SMTP-verzending is niet vrijgegeven voor deze omgeving.';
    }
    foreach (mail_validate_relay_config($config) as $relayIssue) {
        $issues[] = 'SMTP: ' . $relayIssue;
    }

    $allowlist = mail_allowed_recipients($config);
    $rows = [];
    foreach (mail_acceptance_scenario_definitions($config) as $key => $scenario) {
        $scenarioIssues = [];
        $recipient = (string)$scenario['recipient'];
        if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $scenarioIssues[] = 'Ontvanger ontbreekt of is ongeldig.';
        } elseif (!in_array($recipient, $allowlist, true)) {
            $scenarioIssues[] = 'Ontvanger staat niet op de acceptatie-allowlist.';
        }

        if (in_array($scenario['kind'], ['password_reset', 'invitation'], true) && $recipient !== '') {
            if (!auth_password_reset_delivery_available($config)) {
                $scenarioIssues[] = 'Beveiligde HTTPS-linkverzending is niet beschikbaar.';
            }
            $userStmt = $pdo->prepare(
                'SELECT id, active FROM users WHERE company_id = :company_id AND LOWER(email) = :email LIMIT 1'
            );
            $userStmt->execute([':company_id' => $companyId, ':email' => $recipient]);
            $user = $userStmt->fetch();
            if (!$user) {
                $scenarioIssues[] = 'Voor dit adres bestaat nog geen account in deze organisatie.';
            } elseif (!(bool)$user['active']) {
                $scenarioIssues[] = 'Het gekoppelde account is inactief.';
            }
        }

        $rowReady = $enabled && $issues === [] && $scenarioIssues === [];
        $rows[] = array_merge($scenario, [
            'key' => $key,
            'ready' => $rowReady,
            'issues' => $scenarioIssues,
        ]);
    }

    return [
        'enabled' => $enabled,
        'ready' => $enabled && $issues === [] && count(array_filter($rows, static fn(array $row): bool => !$row['ready'])) === 0,
        'issues' => array_values(array_unique($issues)),
        'scenarios' => $rows,
    ];
}

/** @return array<string,string> */
function mail_acceptance_business_vars(): array
{
    return [
        'medewerker' => 'Stasjo van Bakel',
        'periode' => 'juli 2026',
        'uren' => '144,00',
        'factuurnummer' => 'PATH-2026-007',
        'subtotaal' => '11.520,00',
        'btw' => '2.419,20',
        'bedrag' => '13.939,20',
        'bedrijf' => 'Path Consultancy — handelsnaam van QSI Consultancy B.V.',
    ];
}

function mail_acceptance_insert_business_delivery(
    PDO $pdo,
    int $actorUserId,
    array $scenario
): int {
    $channel = (string)$scenario['channel'];
    $template = MAIL_CHANNEL_TEMPLATES[$channel] ?? null;
    if (!is_array($template)) {
        throw new RuntimeException('Onbekend zakelijk acceptatiescenario.');
    }
    $vars = mail_acceptance_business_vars();
    mail_assert_vars((string)$template['subject'], $vars, $channel . ' subject');
    mail_assert_vars((string)$template['body'], $vars, $channel . ' body');
    $subject = '[ACCEPTATIETEST] ' . mail_render((string)$template['subject'], $vars);
    $body = "ACCEPTATIETEST — NIET BOEKEN OF VERWERKEN\n"
        . "Dit bericht controleert uitsluitend het mailtransport van Uren & Facturatie.\n\n"
        . mail_render((string)$template['body'], $vars);

    $stmt = $pdo->prepare(
        'INSERT INTO email_deliveries
         (user_id, channel, recipient_email, cc_email, subject_snapshot, body_snapshot,
          attachment_policy, dry_run, acceptance_test, status)
         VALUES (:user_id, :channel, :recipient, NULL, :subject, :body, :policy, 0, 1, "queued")'
    );
    $stmt->execute([
        ':user_id' => $actorUserId,
        ':channel' => $channel,
        ':recipient' => (string)$scenario['recipient'],
        ':subject' => $subject,
        ':body' => $body,
        ':policy' => (string)$scenario['attachment_policy'],
    ]);
    return (int)$pdo->lastInsertId();
}

/** @return array<string,mixed> */
function mail_acceptance_send(
    PDO $pdo,
    int $companyId,
    int $actorUserId,
    array $config,
    string $scenarioKey
): array {
    $status = mail_acceptance_status($pdo, $companyId, $config);
    $scenario = null;
    foreach ($status['scenarios'] as $candidate) {
        if (($candidate['key'] ?? '') === $scenarioKey) {
            $scenario = $candidate;
            break;
        }
    }
    if ($scenario === null) {
        throw new InvalidArgumentException('unknown-acceptance-scenario');
    }
    if (($scenario['ready'] ?? false) !== true) {
        throw new RuntimeException('acceptance-scenario-not-ready: ' . implode(' ', array_merge($status['issues'], $scenario['issues'])));
    }

    $deliveryId = 0;
    if ($scenario['kind'] === 'business') {
        $deliveryId = mail_acceptance_insert_business_delivery($pdo, $actorUserId, $scenario);
    } else {
        $userStmt = $pdo->prepare(
            'SELECT id, email, display_name, active FROM users
             WHERE company_id = :company_id AND LOWER(email) = :email LIMIT 1'
        );
        $userStmt->execute([
            ':company_id' => $companyId,
            ':email' => (string)$scenario['recipient'],
        ]);
        $user = $userStmt->fetch();
        if (!$user || !(bool)$user['active']) {
            throw new RuntimeException('acceptance-security-account-unavailable');
        }
        if ($scenario['kind'] === 'invitation') {
            $pdo->prepare('UPDATE users SET force_password_change = 1 WHERE id = :id AND company_id = :company_id')
                ->execute([':id' => (int)$user['id'], ':company_id' => $companyId]);
        }
        // These two dedicated accounts exist only for the guarded TEST console.
        // Clearing their earlier TEST tokens keeps both buttons repeatable without
        // weakening the normal 3-per-15-minutes password-reset throttle.
        if (mail_acceptance_repeatable_security_flow($config)) {
            $pdo->prepare('DELETE FROM password_reset_tokens WHERE user_id = :id')
                ->execute([':id' => (int)$user['id']]);
        }
        $reset = auth_create_password_reset($pdo, $user, $config);
        if ($reset === null || (int)($reset['delivery_id'] ?? 0) <= 0) {
            throw new RuntimeException('acceptance-security-rate-limit');
        }
        $deliveryId = (int)$reset['delivery_id'];
        $securitySubject = $scenario['kind'] === 'invitation'
            ? '[ACCEPTATIETEST] Uitnodiging voor Uren & Facturatie'
            : '[ACCEPTATIETEST] Wachtwoordherstel voor Uren & Facturatie';
        $pdo->prepare(
            'UPDATE email_deliveries
             SET acceptance_test = 1, subject_snapshot = :subject
             WHERE id = :id AND user_id = :user_id'
        )->execute([
            ':subject' => $securitySubject,
            ':id' => $deliveryId,
            ':user_id' => (int)$user['id'],
        ]);
    }

    $deliveryStmt = $pdo->prepare('SELECT * FROM email_deliveries WHERE id = :id LIMIT 1');
    $deliveryStmt->execute([':id' => $deliveryId]);
    $delivery = $deliveryStmt->fetch();
    if (!$delivery) {
        throw new RuntimeException('acceptance-delivery-not-found');
    }
    $outcome = mail_dispatch_delivery($pdo, $delivery, $config);
    mail_audit($pdo, $companyId, $actorUserId, 'mail.acceptance_test_dispatched', $deliveryId, [
        'scenario' => $scenarioKey,
        'recipient' => $scenario['recipient'],
        'outcome' => $outcome,
    ]);

    return [
        'delivery_id' => $deliveryId,
        'scenario' => $scenarioKey,
        'recipient' => $scenario['recipient'],
        'attachment_count' => $scenario['attachment_count'],
        'outcome' => $outcome,
    ];
}
