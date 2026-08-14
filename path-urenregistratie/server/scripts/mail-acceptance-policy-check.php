<?php

declare(strict_types=1);

require_once __DIR__ . '/../mail/acceptance.php';

$config = require __DIR__ . '/../config.example.php';
$config['mail']['allowed_recipients'] = ['info@pathconsultancy.nl', 'gch.lieveld@live.nl'];
$config['mail']['acceptance_test'] = [
    'enabled' => true,
    'business_recipient' => 'info@pathconsultancy.nl',
    'password_reset_recipient' => 'info@pathconsultancy.nl',
    'invitation_recipient' => 'gch.lieveld@live.nl',
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
    'exactly_five_scenarios' => count($definitions) === 5,
    'no_bulk_scenario' => !isset($definitions['bulk']) && !isset($definitions['send_all']),
    'fixed_business_recipient' => true,
    'fixed_invitation_recipient' => true,
    'attachment_counts_exact' => true,
    'pdfs_valid_and_marked' => true,
];

foreach ($expected as $key => $attachmentCount) {
    $scenario = $definitions[$key] ?? null;
    if (!is_array($scenario) || (int)($scenario['attachment_count'] ?? -1) !== $attachmentCount) {
        $checks['attachment_counts_exact'] = false;
        continue;
    }
    if ($key === 'account_invitation') {
        $checks['fixed_invitation_recipient'] = $checks['fixed_invitation_recipient']
            && ($scenario['recipient'] ?? '') === 'gch.lieveld@live.nl';
    } else {
        $checks['fixed_business_recipient'] = $checks['fixed_business_recipient']
            && ($scenario['recipient'] ?? '') === 'info@pathconsultancy.nl';
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
