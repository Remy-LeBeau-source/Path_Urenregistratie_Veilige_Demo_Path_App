<?php

declare(strict_types=1);

require_once __DIR__ . '/../mail/config.php';
// Needed so a queued reset/invitation is actually dispatched in the guarded
// TEST sandbox instead of waiting for a cron that does not run there.
require_once __DIR__ . '/../mail/dispatch.php';
// De uitnodigingstekst komt uit de aanpasbare kanaalsjablonen (Instellingen).
require_once __DIR__ . '/../mail/templates.php';

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

/**
 * Bedrijfsgegevens en afzendernaam voor de mailhandtekening. Losgetrokken uit
 * auth_invitation_message() zodat zowel de uitnodiging als de kale
 * wachtwoord-reset dezelfde bron gebruiken, voor zowel de platte-tekst- als de
 * HTML-handtekening.
 *
 * @return array{bedrijf:string,app:string,supportEmail:string,website:string,slogan:string,companyId:int}
 */
function auth_signature_fields(PDO $pdo, int $userId): array
{
    $bedrijf = 'Path Consultancy';
    $app = 'Uren & Facturatie';
    $supportEmail = '';
    $website = '';
    $slogan = '';
    $companyId = 0;

    try {
        $stmt = $pdo->prepare(
            'SELECT c.id, c.trade_name, c.app_name, c.support_email, c.website, c.tagline
             FROM users u JOIN companies c ON c.id = u.company_id
             WHERE u.id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch();
        if (is_array($row)) {
            $companyId = (int)($row['id'] ?? 0);
            $bedrijf = trim((string)($row['trade_name'] ?? '')) ?: $bedrijf;
            $app = trim((string)($row['app_name'] ?? '')) ?: $app;
            $supportEmail = trim((string)($row['support_email'] ?? ''));
            $website = trim((string)($row['website'] ?? ''));
            $slogan = trim((string)($row['tagline'] ?? ''));
        }
    } catch (Throwable $e) {
        // Zonder bedrijfsgegevens blijft de meegeleverde tekst met de standaardnamen.
    }

    return [
        'bedrijf' => $bedrijf,
        'app' => $app,
        'supportEmail' => $supportEmail,
        'website' => $website,
        'slogan' => $slogan,
        'companyId' => $companyId,
    ];
}

/**
 * Platte-tekst handtekening ("Met vriendelijke groet," inclusief). Ongewijzigd
 * ten opzichte van de oude, inline versie in auth_invitation_message() -- dit
 * is puur de bestaande tekst losgetrokken in een herbruikbare functie.
 */
function auth_signature_plain(array $fields): string
{
    $regels = array_values(array_filter(
        ['Robot Path IT', 'Automatisering & accountbeheer', $fields['supportEmail'], $fields['website']],
        static fn($regel) => trim((string)$regel) !== ''
    ));
    $handtekening = "Met vriendelijke groet,\n\n" . implode("\n", $regels);
    if ($fields['slogan'] !== '') {
        $handtekening .= "\n\n" . $fields['slogan'];
    }
    return $handtekening;
}

/**
 * HTML-tegenhanger van auth_signature_plain(): logo, naam/rol, contactregels en
 * de tagline in de huisstijl van Path Consultancy. Mailclients negeren externe
 * stylesheets, dus alle opmaak staat inline; dat is ook waarom dit een losse
 * functie is en niet gedeeld met de rest van de (platte-tekst) mailmodule.
 */
function auth_signature_html(array $config, array $fields): string
{
    $logoUrl = '';
    try {
        $origin = auth_app_origin_from_config($config);
        if (preg_match('#^https://#i', $origin)) {
            $logoUrl = $origin . '/assets/path-logo.png';
        }
    } catch (Throwable $e) {
        $logoUrl = '';
    }

    $email = htmlspecialchars($fields['supportEmail'], ENT_QUOTES);
    $website = trim((string)$fields['website']);
    $websiteLabel = htmlspecialchars($website, ENT_QUOTES);
    $websiteHref = htmlspecialchars(preg_match('#^https?://#i', $website) ? $website : 'https://' . $website, ENT_QUOTES);
    $slogan = htmlspecialchars($fields['slogan'], ENT_QUOTES);

    $logoImg = $logoUrl !== ''
        ? '<img src="' . htmlspecialchars($logoUrl, ENT_QUOTES) . '" alt="Path Consultancy" width="140" style="display:block;border:0;outline:none;max-width:140px;">'
        : '';

    $rows = '';
    if ($fields['supportEmail'] !== '') {
        $rows .= '<tr><td style="padding:2px 0;font:13px/1.4 Arial,Helvetica,sans-serif;color:#65717f;">'
            . '&#128231; <a href="mailto:' . $email . '" style="color:#65717f;text-decoration:none;">' . $email . '</a></td></tr>';
    }
    if ($website !== '') {
        $rows .= '<tr><td style="padding:2px 0;font:13px/1.4 Arial,Helvetica,sans-serif;color:#65717f;">'
            . '&#127760; <a href="' . $websiteHref . '" style="color:#65717f;text-decoration:none;">' . $websiteLabel . '</a></td></tr>';
    }

    $sloganRow = $slogan !== ''
        ? '<tr><td style="padding-top:10px;font:italic 13px/1.4 Arial,Helvetica,sans-serif;color:#037f63;">' . $slogan . '</td></tr>'
        : '';

    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">'
        . '<tr><td>' . $logoImg . '</td></tr>'
        . '<tr><td style="padding-top:10px;font:bold 14px/1.3 Arial,Helvetica,sans-serif;color:#0d1b38;">Robot Path IT</td></tr>'
        . '<tr><td style="padding-bottom:6px;font:13px/1.4 Arial,Helvetica,sans-serif;color:#65717f;">Automatisering &amp; accountbeheer</td></tr>'
        . $rows
        . $sloganRow
        . '</table>';
}

/**
 * Zet platte begeleidende tekst (dus zonder handtekening) om naar veilige
 * HTML-paragrafen: een dubbele regelwit­regel wordt een nieuwe alinea, een
 * enkele wordt <br>. htmlspecialchars() eerst, zodat tekst uit een aanpasbaar
 * kanaalsjabloon nooit als opmaak kan worden geïnjecteerd.
 */
function auth_plain_body_to_html_paragraphs(string $plainBody): string
{
    $escaped = htmlspecialchars(trim($plainBody), ENT_QUOTES);
    $paragraphs = preg_split("/\n{2,}/", $escaped) ?: [$escaped];
    $html = '';
    foreach ($paragraphs as $paragraph) {
        if (trim($paragraph) === '') {
            continue;
        }
        $html .= '<p style="margin:0 0 14px;font:14px/1.5 Arial,Helvetica,sans-serif;color:#172332;">'
            . nl2br($paragraph, false) . '</p>';
    }
    return $html;
}

/**
 * Onderwerp en tekst voor de accountuitnodiging. De tekst komt uit de
 * aanpasbare kanaalsjablonen (Instellingen -> Standaardteksten); de
 * afzender-handtekening ("Robot Path IT") wordt hier toegevoegd, net zoals de
 * mailmodule dat bij de factuurmails doet.
 *
 * @return array{0:string,1:string,2:string} [subject, plain body, html body]
 */
function auth_invitation_message(PDO $pdo, int $userId, string $displayName, string $link, array $config = []): array
{
    $fields = auth_signature_fields($pdo, $userId);
    $companyId = $fields['companyId'];

    $sjabloon = MAIL_CHANNEL_TEMPLATES['account_invitation'];
    if ($companyId > 0) {
        $eigen = mail_channel_templates_for($pdo, $companyId);
        if (isset($eigen['account_invitation'])) {
            $sjabloon = $eigen['account_invitation'];
        }
    }

    $vars = [
        '{naam}' => $displayName,
        '{app}' => $fields['app'],
        '{bedrijf}' => $fields['bedrijf'],
        '{link}' => $link,
        '{geldigheid}' => AUTH_PASSWORD_RESET_TTL_HOURS === 2 ? 'twee uur' : AUTH_PASSWORD_RESET_TTL_HOURS . ' uur',
    ];
    $subject = strtr((string)$sjabloon['subject'], $vars);
    $body = strtr((string)$sjabloon['body'], $vars);

    // Vangnet: haalt iemand {link} uit de eigen tekst, dan zou de uitnodiging
    // geen manier bevatten om een wachtwoord in te stellen. Zet hem er dan onder.
    if (strpos($body, $link) === false) {
        $body = rtrim($body) . "\n\n" . $link;
    }
    $body = rtrim($body);

    $plainBody = $body . "\n\n" . auth_signature_plain($fields);

    $htmlLink = htmlspecialchars($link, ENT_QUOTES);
    $htmlBody = '<div style="max-width:520px;">'
        . auth_plain_body_to_html_paragraphs(str_replace($link, '{{LINK}}', $body))
        . auth_signature_html($config, $fields)
        . '</div>';
    // De link staat in de platte tekst ook los op zijn eigen regel; in HTML wordt
    // dat een echte, klikbare knop in plaats van een kale URL tussen de tekst.
    $htmlBody = str_replace(
        '{{LINK}}',
        '<a href="' . $htmlLink . '" style="display:inline-block;margin:4px 0 14px;padding:10px 18px;background:#169276;color:#ffffff;font:bold 14px/1 Arial,Helvetica,sans-serif;text-decoration:none;border-radius:6px;">Wachtwoord instellen</a>',
        $htmlBody
    );

    return [$subject, $plainBody, $htmlBody];
}

/**
 * Onderwerp en tekst voor een kale wachtwoord-reset (dus geen nieuwe-account-
 * uitnodiging: iemand met een bestaand account die zelf "wachtwoord vergeten"
 * gebruikt of waarvoor een beheerder een reset opnieuw verstuurt). Gebruikt
 * dezelfde handtekening als de uitnodiging, voor eenzelfde huisstijl in beide
 * mails.
 *
 * @return array{0:string,1:string,2:string} [subject, plain body, html body]
 */
function auth_password_reset_message(PDO $pdo, int $userId, string $displayName, string $link, array $config = []): array
{
    $fields = auth_signature_fields($pdo, $userId);
    $subject = 'Stel je wachtwoord in voor Uren & Facturatie';
    $intro = "Beste {$displayName},\n\n"
        . 'Gebruik de onderstaande persoonlijke link om je wachtwoord in te stellen. '
        . 'De link is twee uur geldig en kan één keer worden gebruikt.';
    $outro = 'Heb je dit niet aangevraagd? Negeer deze e-mail en neem bij twijfel contact op met Backoffice.';
    $plainBody = $intro . "\n\n" . $link . "\n\n" . $outro . "\n\n" . auth_signature_plain($fields);

    $htmlLink = htmlspecialchars($link, ENT_QUOTES);
    $htmlButton = '<a href="' . $htmlLink . '" style="display:inline-block;margin:4px 0 14px;padding:10px 18px;background:#169276;color:#ffffff;font:bold 14px/1 Arial,Helvetica,sans-serif;text-decoration:none;border-radius:6px;">Wachtwoord instellen</a>';
    $htmlBody = '<div style="max-width:520px;">'
        . auth_plain_body_to_html_paragraphs($intro)
        . $htmlButton
        . auth_plain_body_to_html_paragraphs($outro)
        . auth_signature_html($config, $fields)
        . '</div>';

    return [$subject, $plainBody, $htmlBody];
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
    $testNote = $isTestInvitationRedirect
        ? "TESTUITNODIGING — oorspronkelijke account: {$accountEmail}\n\n"
        : '';
    $testSubjectPrefix = $isTestInvitationRedirect
        ? '[TEST uitnodiging voor ' . $accountEmail . '] '
        : '';

    if ($purpose === 'invitation') {
        [$subject, $body, $htmlBody] = auth_invitation_message($pdo, $userId, $displayName, $link, $config);
    } else {
        [$subject, $body, $htmlBody] = auth_password_reset_message($pdo, $userId, $displayName, $link, $config);
    }
    $subject = $testSubjectPrefix . $subject;
    $body = $testNote . $body;
    if ($testNote !== '') {
        $htmlBody = '<p style="margin:0 0 14px;font:bold 13px/1.4 Arial,Helvetica,sans-serif;color:#bb7623;">'
            . nl2br(htmlspecialchars(rtrim($testNote), ENT_QUOTES), false) . '</p>' . $htmlBody;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO email_deliveries
         (user_id, channel, recipient_email, cc_email, subject_snapshot, body_snapshot, html_snapshot,
          attachment_policy, dry_run, status)
         VALUES (:user_id, "password_reset", :recipient, NULL, :subject, :body, :html_body, "none", 0, "queued")'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':recipient' => $recipient,
        ':subject' => $subject,
        ':body' => $body,
        ':html_body' => $htmlBody,
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
    // De rem op herhaald aanvragen geldt voor de publieke "wachtwoord vergeten"
    // (anti-misbruik). Een beheerder die vanuit de app een uitnodiging of reset
    // (opnieuw) verstuurt, is een ingelogde handeling en wordt niet geremd --
    // meerdere pogingen tijdens inrichten of testen moeten gewoon lukken.
    if ($realDelivery && $purpose !== 'invitation') {
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
