<?php

declare(strict_types=1);

require_once __DIR__ . '/../auth/session.php';
require_once __DIR__ . '/../auth/password-reset-service.php';

function policy_config(
    string $environment,
    bool $enabled,
    bool $testEnabled,
    array $recipients,
    string $productionMode = 'disabled'
): array
{
    return [
        'environment' => $environment,
        'app_origin' => 'https://uren-test.pathconsultancy.nl',
        'app' => ['app_origin' => 'https://uren-test.pathconsultancy.nl'],
        'mail' => [
            'enabled' => $enabled,
            'production_mode' => $productionMode,
            'test_delivery_enabled' => $testEnabled,
            'allowed_recipients' => $recipients,
            'transport' => 'smtp_relay',
            'smtp_relay' => [
                'host' => 'smtp-relay.gmail.com',
                'port' => 587,
                'encryption' => 'starttls',
                'from_email' => 'backoffice@pathconsultancy.nl',
            ],
        ],
    ];
}

$allowedAddress = 'backoffice@pathconsultancy.nl';
$productionClosed = policy_config('production', true, false, [], 'disabled');
$productionPilot = policy_config('production', true, false, [$allowedAddress], 'pilot');
$productionLive = policy_config('production', true, false, [], 'live');
$testClosed = policy_config('test', true, false, []);
$testGuarded = policy_config('test', true, true, [$allowedAddress]);
$development = policy_config('development', true, true, [$allowedAddress]);
$guardedResponse = auth_password_reset_public_response($testGuarded, str_repeat('a', 64), '2099-01-01 00:00:00');
$closedResponse = auth_password_reset_public_response($testClosed, str_repeat('b', 64), '2099-01-01 00:00:00');

// Een met naam genoemde tester (bv. een echte medewerker die zijn eigen
// wachtwoordreset wil kunnen beproeven) mag dat ene kanaal rechtstreeks
// ontvangen, zonder dat andere TEST-mail aan hem ook meteen ongefilterd
// doorgaat -- zie mail_test_extra_password_reset_recipients().
$namedTester = 'stasjovanbakel@pathconsultancy.nl';
$testGuardedWithNamedTester = $testGuarded;
$testGuardedWithNamedTester['mail']['allowed_recipients'][] = $namedTester;
$testGuardedWithNamedTester['mail']['test_sink_recipient'] = $allowedAddress;
$testGuardedWithNamedTester['mail']['test_redirect_all'] = true;
$testGuardedWithNamedTester['mail']['acceptance_test'] = [
    'extra_password_reset_recipients' => [$namedTester],
];
$namedTesterResetDelivery = mail_effective_delivery($testGuardedWithNamedTester, [
    'recipient_email' => $namedTester,
    'channel' => 'password_reset',
    'subject_snapshot' => 'Wachtwoord resetten',
    'body_snapshot' => 'Link.',
]);
$namedTesterOtherChannelDelivery = mail_effective_delivery($testGuardedWithNamedTester, [
    'recipient_email' => $namedTester,
    'channel' => 'broker',
    'subject_snapshot' => 'Factuur',
    'body_snapshot' => 'Bijlage.',
]);

// Sinds 11 sep (gebruikersverzoek): naast wachtwoordreset mag een genoemde
// tester ook expliciet opgegeven kanalen (hier: het urenoverzicht)
// rechtstreeks ontvangen -- en de omleidingsmailbox blijft daarbij op de
// hoogte via een gewone cc, ook bij de reset zelf.
$testGuardedWithNamedTesterChannel = $testGuardedWithNamedTester;
$testGuardedWithNamedTesterChannel['mail']['acceptance_test']['named_tester_timesheet_channels'] = ['timesheet_submission_receipt'];
$namedTesterTimesheetDelivery = mail_effective_delivery($testGuardedWithNamedTesterChannel, [
    'recipient_email' => $namedTester,
    'channel' => 'timesheet_submission_receipt',
    'subject_snapshot' => 'Urenoverzicht',
    'body_snapshot' => 'Overzicht.',
]);
$namedTesterUnlistedChannelDelivery = mail_effective_delivery($testGuardedWithNamedTesterChannel, [
    'recipient_email' => $namedTester,
    'channel' => 'timesheet_final_approval',
    'subject_snapshot' => 'Goedgekeurd',
    'body_snapshot' => 'Melding.',
]);
$namedTesterResetDeliveryWithChannelConfig = mail_effective_delivery($testGuardedWithNamedTesterChannel, [
    'recipient_email' => $namedTester,
    'channel' => 'password_reset',
    'subject_snapshot' => 'Wachtwoord resetten',
    'body_snapshot' => 'Link.',
]);

// UI-takenlijst #41 (gebruiker, 11 sep): onderwerp en tekst moeten exact
// zoals productie blijven zodat je de echte mail beoordeelt, maar de
// ontvanger moet wel kunnen zien dat het van TEST komt -- anders is een
// echte werkinbox een TEST-mail niet van een productiemelding te
// onderscheiden. html_snapshot expliciet meegeven: alleen dan hoort er ook
// een HTML-onderschrift bij te komen, niet alleen in platte tekst.
$namedTesterTimesheetDeliveryWithHtml = mail_effective_delivery($testGuardedWithNamedTesterChannel, [
    'recipient_email' => $namedTester,
    'channel' => 'timesheet_submission_receipt',
    'subject_snapshot' => 'Urenoverzicht',
    'body_snapshot' => 'Overzicht.',
    'html_snapshot' => '<p>Overzicht.</p>',
]);

$checks = [
    'production_enabled_without_mode_is_blocked' => !mail_real_delivery_allowed_for_environment($productionClosed),
    'production_disabled_mode_has_config_error' => mail_validate_relay_config($productionClosed) !== [],
    'production_pilot_is_enabled' => mail_real_delivery_allowed_for_environment($productionPilot),
    'production_pilot_allowlisted_recipient_is_allowed' => mail_recipient_is_allowed($productionPilot, $allowedAddress),
    'production_pilot_other_recipient_is_blocked' => !mail_recipient_is_allowed($productionPilot, 'ander@example.com'),
    'production_live_is_enabled_without_allowlist' => mail_real_delivery_allowed_for_environment($productionLive),
    'production_live_recipient_is_allowed' => mail_recipient_is_allowed($productionLive, 'zakelijk@example.com'),
    'test_without_guard_is_blocked' => !mail_real_delivery_allowed_for_environment($testClosed),
    'test_without_guard_has_config_error' => mail_validate_relay_config($testClosed) !== [],
    'guarded_test_is_enabled' => mail_real_delivery_allowed_for_environment($testGuarded),
    'guarded_test_config_is_valid' => mail_validate_relay_config($testGuarded) === [],
    'allowlisted_recipient_is_allowed' => mail_recipient_is_allowed($testGuarded, strtoupper($allowedAddress)),
    'other_recipient_is_blocked' => !mail_recipient_is_allowed($testGuarded, 'ander@example.com'),
    'cc_outside_allowlist_is_blocked' => mail_validate_delivery_recipients(
        $testGuarded,
        $allowedAddress,
        'ander@example.com'
    ) !== [],
    'development_remains_blocked' => !mail_real_delivery_allowed_for_environment($development),
    'development_enabled_has_config_error' => mail_validate_relay_config($development) !== [],
    'guarded_test_reset_uses_real_delivery' => ($guardedResponse['dry_run'] ?? true) === false
        && ($guardedResponse['delivery_available'] ?? false) === true
        && !array_key_exists('token', $guardedResponse),
    'closed_test_reset_returns_local_token' => ($closedResponse['dry_run'] ?? false) === true
        && ($closedResponse['delivery_available'] ?? true) === false
        && ($closedResponse['token'] ?? '') === str_repeat('b', 64),
    'named_tester_password_reset_is_not_redirected' => $namedTesterResetDelivery['redirected'] === false
        && $namedTesterResetDelivery['recipient'] === $namedTester,
    // De reset-uitzondering cc't de omleidingsmailbox altijd mee, niet pas
    // zodra named_tester_timesheet_channels is ingevuld -- gebruikersverzoek
    // 11 sep was expliciet "alles cc'en, ook de reset-link".
    'named_tester_password_reset_ccs_the_sink' => $namedTesterResetDelivery['cc'] === $allowedAddress,
    'named_tester_other_channel_still_redirects_to_sink' => $namedTesterOtherChannelDelivery['redirected'] === true
        && $namedTesterOtherChannelDelivery['recipient'] === $allowedAddress,
    'named_tester_timesheet_channel_is_not_redirected' => $namedTesterTimesheetDelivery['redirected'] === false
        && $namedTesterTimesheetDelivery['recipient'] === $namedTester,
    'named_tester_timesheet_channel_ccs_the_sink' => $namedTesterTimesheetDelivery['cc'] === $allowedAddress,
    'named_tester_unlisted_channel_still_redirects_to_sink' => $namedTesterUnlistedChannelDelivery['redirected'] === true
        && $namedTesterUnlistedChannelDelivery['recipient'] === $allowedAddress,
    'named_tester_password_reset_still_works_alongside_channel_config' =>
        $namedTesterResetDeliveryWithChannelConfig['redirected'] === false
        && $namedTesterResetDeliveryWithChannelConfig['recipient'] === $namedTester
        && $namedTesterResetDeliveryWithChannelConfig['cc'] === $allowedAddress,
    'named_tester_delivery_subject_stays_unmodified' =>
        $namedTesterTimesheetDelivery['subject'] === 'Urenoverzicht',
    'named_tester_delivery_body_gets_test_footer' =>
        str_contains($namedTesterTimesheetDelivery['body'], 'TEST-omgeving'),
    'named_tester_delivery_html_gets_test_footer' =>
        str_contains($namedTesterTimesheetDeliveryWithHtml['html'], 'TEST-omgeving'),
    'named_tester_password_reset_also_gets_test_footer' =>
        str_contains($namedTesterResetDelivery['body'], 'TEST-omgeving'),
    'redirected_delivery_is_not_double_marked' =>
        substr_count($namedTesterOtherChannelDelivery['body'] ?? '', 'TEST-omgeving') === 0,
];

$ok = !in_array(false, $checks, true);
echo json_encode([
    'ok' => $ok,
    'writes_performed' => false,
    'network_connections' => 0,
    'checks' => $checks,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
exit($ok ? 0 : 1);
