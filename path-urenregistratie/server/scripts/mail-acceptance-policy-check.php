<?php

declare(strict_types=1);

require_once __DIR__ . '/../mail/acceptance.php';

$environmentKeys = ['PATH_APP_ENVIRONMENT', 'PLAYWRIGHT_ENVIRONMENT', 'APP_ENV', 'PLAYWRIGHT_STAGE'];
foreach ($environmentKeys as $key) {
    putenv($key);
    unset($_ENV[$key], $_SERVER[$key]);
}

$config = require __DIR__ . '/../config.example.php';
$config['mail']['allowed_recipients'] = ['giovanno.maatsen@pathconsultancy.nl'];
$config['mail']['acceptance_test'] = [
    'enabled' => true,
    'business_recipient' => 'giovanno.maatsen@pathconsultancy.nl',
    'password_reset_recipient' => 'giovanno.maatsen@pathconsultancy.nl',
    'invitation_recipient' => 'giovanno.maatsen@pathconsultancy.nl',
];

$definitions = mail_acceptance_scenario_definitions($config);
$expected = [
    'broker_bundle' => 1,
    'accountant_invoice' => 1,
    'payroll_hours' => 0,
    'password_reset' => 0,
    'account_invitation' => 0,
];
$checks = [
    'production_console_unavailable' => false,
    'test_console_available' => false,
    'test_runtime_override_available' => false,
    'local_preview_requires_local_host_and_dry_run' => false,
    'exactly_five_scenarios' => count($definitions) === 5,
    'no_bulk_scenario' => !isset($definitions['bulk']) && !isset($definitions['send_all']),
    'fixed_business_recipient' => true,
    'fixed_invitation_recipient' => true,
    'attachment_counts_exact' => true,
    'attachment_preview_names_exact' => true,
    'pdfs_valid_and_marked' => true,
    'acceptance_failure_is_single_shot' => false,
    'normal_delivery_keeps_bounded_retry' => false,
    'smtp_failure_keeps_safe_response_detail' => false,
    'ordinary_test_mail_redirects_to_sink' => false,
    'ordinary_password_reset_redirects_to_sink' => false,
    'staff_invitation_uses_fixed_recipient' => false,
    'acceptance_invitation_keeps_fixed_recipient' => false,
    'production_invitation_keeps_account_recipient' => false,
    'production_never_redirects' => false,
    'user_action_dispatch_only_in_guarded_test' => false,
];
$checks['production_console_unavailable'] = mail_acceptance_available_for_environment([
    'environment' => 'production',
]) === false;
$checks['test_console_available'] = mail_acceptance_available_for_environment([
    'environment' => 'test',
]) === true;
putenv('PATH_APP_ENVIRONMENT=test');
$checks['test_runtime_override_available'] = mail_acceptance_available_for_environment([
    'environment' => 'production',
]) === true;
putenv('PATH_APP_ENVIRONMENT');
unset($_ENV['PATH_APP_ENVIRONMENT'], $_SERVER['PATH_APP_ENVIRONMENT']);

$localPreviewConfig = $config;
$localPreviewConfig['environment'] = 'local';
$localPreviewConfig['mail']['enabled'] = false;
$originalHost = $_SERVER['HTTP_HOST'] ?? null;
$_SERVER['HTTP_HOST'] = 'localhost:8000';
$localPreviewAllowed = mail_acceptance_local_preview_mode($localPreviewConfig)
    && mail_acceptance_available_for_environment($localPreviewConfig);
$_SERVER['HTTP_HOST'] = 'uren.pathconsultancy.nl';
$localPreviewBlockedOutsideLocalhost = !mail_acceptance_local_preview_mode($localPreviewConfig);
$localPreviewConfig['mail']['enabled'] = true;
$_SERVER['HTTP_HOST'] = 'localhost:8000';
$localPreviewBlockedWithRealMail = !mail_acceptance_local_preview_mode($localPreviewConfig);
if ($originalHost === null) {
    unset($_SERVER['HTTP_HOST']);
} else {
    $_SERVER['HTTP_HOST'] = $originalHost;
}
$checks['local_preview_requires_local_host_and_dry_run'] = $localPreviewAllowed
    && $localPreviewBlockedOutsideLocalhost
    && $localPreviewBlockedWithRealMail;

$redirectConfig = $config;
$redirectConfig['environment'] = 'test';
$redirectConfig['mail']['test_redirect_all'] = true;
$redirectConfig['mail']['test_sink_recipient'] = 'giovanno.maatsen@pathconsultancy.nl';
$ordinary = mail_effective_delivery($redirectConfig, [
    'recipient_email' => 'facturen-broker@example.invalid',
    'cc_email' => 'cc@example.invalid',
    'subject_snapshot' => 'Factuur 2026-001',
    'body_snapshot' => 'Testinhoud',
    'acceptance_test' => false,
]);
$repeatableTestConfig = $config;
$repeatableTestConfig['environment'] = 'test';
$repeatableTestConfig['app_origin'] = 'https://uren-test.pathconsultancy.nl';
$checks['test_security_scenarios_repeatable'] = mail_acceptance_repeatable_security_flow($repeatableTestConfig)
    && !mail_acceptance_repeatable_security_flow(array_replace($repeatableTestConfig, ['environment' => 'production']))
    && !mail_acceptance_repeatable_security_flow(array_replace($repeatableTestConfig, ['app_origin' => 'https://uren.pathconsultancy.nl']));
$invitation = mail_effective_delivery($redirectConfig, [
    'channel' => 'password_reset',
    'recipient_email' => 'giovanno.maatsen@pathconsultancy.nl',
    'subject_snapshot' => 'Uitnodiging',
    'body_snapshot' => 'Testinhoud',
    'acceptance_test' => true,
]);
$ordinaryResetAccount = 'nieuwe.medewerker@example.invalid';
$ordinaryResetQueueRecipient = auth_password_reset_queue_recipient(
    $redirectConfig,
    $ordinaryResetAccount,
    'password_reset'
);
$ordinaryReset = mail_effective_delivery($redirectConfig, [
    'channel' => 'password_reset',
    'recipient_email' => $ordinaryResetQueueRecipient,
    'subject_snapshot' => 'Wachtwoord instellen',
    'body_snapshot' => 'Testinhoud',
    'acceptance_test' => false,
]);
$staffInvitationRecipient = auth_password_reset_queue_recipient(
    $redirectConfig,
    $ordinaryResetAccount,
    'invitation'
);
$staffInvitation = mail_effective_delivery($redirectConfig, [
    'channel' => 'password_reset',
    'recipient_email' => $staffInvitationRecipient,
    'subject_snapshot' => 'Uitnodiging',
    'body_snapshot' => 'Testinhoud',
    'acceptance_test' => false,
]);
$productionConfig = $redirectConfig;
$productionConfig['environment'] = 'production';
$production = mail_effective_delivery($productionConfig, [
    'recipient_email' => 'broker@example.com',
    'subject_snapshot' => 'Factuur',
    'body_snapshot' => 'Productie',
]);
$checks['ordinary_test_mail_redirects_to_sink'] = $ordinary['recipient'] === 'giovanno.maatsen@pathconsultancy.nl'
    && $ordinary['cc'] === null && $ordinary['redirected'] === true
    && str_contains($ordinary['subject'], '[TEST voor facturen-broker@example.invalid]')
    && str_contains($ordinary['body'], 'Oorspronkelijke ontvanger: facturen-broker@example.invalid');
$checks['ordinary_password_reset_redirects_to_sink'] = $ordinaryResetQueueRecipient === $ordinaryResetAccount
    && $ordinaryReset['recipient'] === 'giovanno.maatsen@pathconsultancy.nl'
    && $ordinaryReset['redirected'] === true;
$checks['staff_invitation_uses_fixed_recipient'] = $staffInvitationRecipient === 'giovanno.maatsen@pathconsultancy.nl'
    && $staffInvitation['recipient'] === 'giovanno.maatsen@pathconsultancy.nl'
    && $staffInvitation['redirected'] === false;
$checks['acceptance_invitation_keeps_fixed_recipient'] = $invitation['recipient'] === 'giovanno.maatsen@pathconsultancy.nl'
    && $invitation['redirected'] === false;
$checks['production_invitation_keeps_account_recipient'] = auth_password_reset_queue_recipient(
    $productionConfig,
    'echte.gebruiker@pathconsultancy.nl',
    'invitation'
) === 'echte.gebruiker@pathconsultancy.nl';
$checks['production_never_redirects'] = $production['recipient'] === 'broker@example.com'
    && $production['redirected'] === false;
$guardedUserActionConfig = $redirectConfig;
$guardedUserActionConfig['mail']['enabled'] = true;
$guardedUserActionConfig['mail']['transport'] = 'smtp_relay';
$guardedUserActionConfig['mail']['test_delivery_enabled'] = true;
$checks['user_action_dispatch_only_in_guarded_test'] = mail_dispatch_after_user_action($guardedUserActionConfig)
    && !mail_dispatch_after_user_action(array_replace($guardedUserActionConfig, ['environment' => 'production']))
    && !mail_dispatch_after_user_action(array_replace($guardedUserActionConfig, ['environment' => 'local']))
    && !mail_dispatch_after_user_action(array_replace_recursive($guardedUserActionConfig, ['mail' => ['test_delivery_enabled' => false]]));

$acceptanceFailure = mail_failed_delivery_retry_state(['acceptance_test' => true], 1);
$normalFirstFailure = mail_failed_delivery_retry_state(['acceptance_test' => false], 1);
$normalFinalFailure = mail_failed_delivery_retry_state(['acceptance_test' => false], MAIL_MAX_ATTEMPTS);
$checks['acceptance_failure_is_single_shot'] = $acceptanceFailure === [
    'status' => 'failed',
    'attempt_count' => MAIL_MAX_ATTEMPTS,
];
$checks['normal_delivery_keeps_bounded_retry'] = $normalFirstFailure === [
    'status' => 'queued',
    'attempt_count' => 1,
] && $normalFinalFailure === [
    'status' => 'failed',
    'attempt_count' => MAIL_MAX_ATTEMPTS,
];
try {
    smtp_expect(['250'], "550 5.7.1 Sender rejected by relay\r\n", 'MAIL FROM');
} catch (RuntimeException $error) {
    $checks['smtp_failure_keeps_safe_response_detail'] = str_contains(
        $error->getMessage(),
        '550 5.7.1 Sender rejected by relay'
    );
}

foreach ($expected as $key => $attachmentCount) {
    $scenario = $definitions[$key] ?? null;
    if (!is_array($scenario) || (int)($scenario['attachment_count'] ?? -1) !== $attachmentCount) {
        $checks['attachment_counts_exact'] = false;
        continue;
    }
    if ($key === 'account_invitation') {
        $checks['fixed_invitation_recipient'] = $checks['fixed_invitation_recipient']
            && ($scenario['recipient'] ?? '') === 'giovanno.maatsen@pathconsultancy.nl';
    } else {
        $checks['fixed_business_recipient'] = $checks['fixed_business_recipient']
            && ($scenario['recipient'] ?? '') === 'giovanno.maatsen@pathconsultancy.nl';
    }
    $attachments = mail_acceptance_test_attachments(null, (string)$scenario['attachment_policy']);
    $attachmentNames = mail_acceptance_test_attachment_names(null, (string)$scenario['attachment_policy']);
    if (count($attachments) !== $attachmentCount) {
        $checks['attachment_counts_exact'] = false;
    }
    foreach ($attachments as $index => $attachment) {
        if (($attachment['filename'] ?? '') !== ($attachmentNames[$index] ?? null)) {
            $checks['attachment_preview_names_exact'] = false;
        }
        $decoded = base64_decode((string)($attachment['data'] ?? ''), true);
        if (!str_contains((string)($attachment['filename'] ?? ''), 'ACCEPTATIETEST-NIET-BOEKEN')
            || !is_string($decoded)
            || !simple_pdf_looks_valid($decoded)) {
            $checks['pdfs_valid_and_marked'] = false;
        }
    }
}

$ok = !in_array(false, $checks, true);
echo json_encode([
    'ok' => $ok,
    'writes_performed' => false,
    'network_connections' => 0,
    'checks' => $checks,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
exit($ok ? 0 : 1);
