<?php

declare(strict_types=1);

require_once __DIR__ . '/../mail/acceptance.php';

$environmentKeys = ['PATH_APP_ENVIRONMENT', 'PLAYWRIGHT_ENVIRONMENT', 'APP_ENV', 'PLAYWRIGHT_STAGE'];
foreach ($environmentKeys as $key) {
    putenv($key);
    unset($_ENV[$key], $_SERVER[$key]);
}

$config = require __DIR__ . '/../config.example.php';
$config['mail']['allowed_recipients'] = ['giovanno.maatsen@pathconsultancy.nl', 'kenrich.lieveld@pathconsultancy.nl'];
$config['mail']['acceptance_test'] = [
    'enabled' => true,
    'business_recipient' => 'giovanno.maatsen@pathconsultancy.nl',
    'password_reset_recipient' => 'giovanno.maatsen@pathconsultancy.nl',
    'invitation_recipient' => 'kenrich.lieveld@pathconsultancy.nl',
];

$definitions = mail_acceptance_scenario_definitions($config);
$expected = [
    'broker_bundle' => 2,
    'accountant_invoice' => 1,
    'payroll_hours' => 0,
    'password_reset' => 0,
    'account_invitation' => 0,
];
$checks = [
    'production_console_unavailable' => false,
    'test_console_available' => false,
    'test_runtime_override_available' => false,
    'exactly_five_scenarios' => count($definitions) === 5,
    'no_bulk_scenario' => !isset($definitions['bulk']) && !isset($definitions['send_all']),
    'fixed_business_recipient' => true,
    'fixed_invitation_recipient' => true,
    'attachment_counts_exact' => true,
    'pdfs_valid_and_marked' => true,
    'acceptance_failure_is_single_shot' => false,
    'normal_delivery_keeps_bounded_retry' => false,
    'smtp_failure_keeps_safe_response_detail' => false,
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
            && ($scenario['recipient'] ?? '') === 'kenrich.lieveld@pathconsultancy.nl';
    } else {
        $checks['fixed_business_recipient'] = $checks['fixed_business_recipient']
            && ($scenario['recipient'] ?? '') === 'giovanno.maatsen@pathconsultancy.nl';
    }
    $attachments = mail_acceptance_test_attachments((string)$scenario['attachment_policy']);
    if (count($attachments) !== $attachmentCount) {
        $checks['attachment_counts_exact'] = false;
    }
    foreach ($attachments as $attachment) {
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
