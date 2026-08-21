<?php

declare(strict_types=1);

/**
 * Offline acceptance preflight for the first production mail bundle.
 *
 * This script opens no network connection and performs no database writes.
 * It renders the real templates and MIME messages using visibly fake PDFs.
 */

require_once __DIR__ . '/cli-bootstrap.php';
require_once __DIR__ . '/../mail/config.php';
require_once __DIR__ . '/../mail/queue.php';
require_once __DIR__ . '/../mail/smtp.php';

$options = ops_options($argv);

try {
    $config = ops_load_config($options);
    $relayErrors = mail_validate_relay_config($config);
    $mail = isset($config['mail']) && is_array($config['mail']) ? $config['mail'] : [];
    $relay = isset($mail['smtp_relay']) && is_array($mail['smtp_relay']) ? $mail['smtp_relay'] : [];

    $scenario = [
        'employee_name' => 'Stasjo van Bakel',
        'period' => 'juli 2026',
        'hours' => '144,00',
        'invoice_number' => 'PATH-2026-007',
        'subtotal' => '11.520,00',
        'vat' => '2.419,20',
        'total' => '13.939,20',
        'company' => 'Path Consultancy — handelsnaam van QSI Consultancy B.V.',
    ];
    $vars = [
        'medewerker' => $scenario['employee_name'],
        'periode' => $scenario['period'],
        'uren' => $scenario['hours'],
        'factuurnummer' => $scenario['invoice_number'],
        'subtotaal' => $scenario['subtotal'],
        'btw' => $scenario['vat'],
        'bedrag' => $scenario['total'],
        'bedrijf' => $scenario['company'],
    ];

    $fakePdf = base64_encode("%PDF-1.4\n% VOORBEELD - NIET VERZENDEN\n%%EOF\n");
    $routes = [
        [
            'channel' => 'broker',
            'to' => 'rana.ramjanam@pathconsultancy.nl',
            'policy' => 'invoice',
            'attachments' => [
                ['filename' => 'VOORBEELD-NIET-GELDIG-Factuur-PATH-2026-007.pdf', 'mime' => 'application/pdf', 'data' => $fakePdf],
            ],
        ],
        [
            'channel' => 'accountant',
            'to' => 'giovanno.maatsen@pathconsultancy.nl',
            'policy' => 'invoice',
            'attachments' => [
                ['filename' => 'VOORBEELD-NIET-GELDIG-Factuur-PATH-2026-007.pdf', 'mime' => 'application/pdf', 'data' => $fakePdf],
            ],
        ],
        [
            'channel' => 'payroll',
            'to' => 'giovanno.maatsen@pathconsultancy.nl',
            'policy' => 'none',
            'attachments' => [],
        ],
    ];

    $checks = [];
    $results = [];
    foreach ($routes as $route) {
        $template = MAIL_CHANNEL_TEMPLATES[$route['channel']];
        $subject = mail_render($template['subject'], $vars);
        $body = mail_render($template['body'], $vars);
        $mime = smtp_build_message(
            (string)($relay['from_email'] ?? ''),
            (string)($relay['from_name'] ?? ''),
            $route['to'],
            null,
            $subject,
            $body,
            $route['attachments']
        );
        $attachmentCount = substr_count($mime, 'Content-Disposition: attachment;');
        $results[] = [
            'channel' => $route['channel'],
            'to' => $route['to'],
            'subject' => $subject,
            'attachment_policy' => $route['policy'],
            'attachment_count' => $attachmentCount,
            'body' => $body,
        ];
        $checks[$route['channel'] . '_mime_attachment_count'] = $attachmentCount === count($route['attachments']);
    }

    $checks += [
        'relay_config_valid' => $relayErrors === [],
        'real_delivery_disabled' => mail_is_dry_run($config) && !mail_is_smtp_relay_enabled($config),
        'no_smtp_credentials' => trim((string)($relay['username'] ?? '')) === '' && trim((string)($relay['password'] ?? '')) === '',
        'from_address_exact' => ($relay['from_email'] ?? '') === 'backoffice@pathconsultancy.nl',
        'broker_recipient_exact' => $results[0]['to'] === 'rana.ramjanam@pathconsultancy.nl',
        'accountant_recipient_exact' => $results[1]['to'] === 'giovanno.maatsen@pathconsultancy.nl',
        'payroll_recipient_exact' => $results[2]['to'] === 'giovanno.maatsen@pathconsultancy.nl',
        'broker_one_attachment' => $results[0]['attachment_count'] === 1,
        'accountant_one_attachment' => $results[1]['attachment_count'] === 1,
        'payroll_zero_attachments' => $results[2]['attachment_count'] === 0,
        'payroll_contains_only_required_data' => str_contains($results[2]['body'], 'Stasjo van Bakel')
            && str_contains($results[2]['body'], 'juli 2026')
            && str_contains($results[2]['body'], '144')
            && !str_contains($results[2]['body'], 'PATH-')
            && !str_contains($results[2]['body'], '€')
            && !str_contains(strtolower($results[2]['body']), 'factuur'),
        'subjects_are_utf8' => str_contains($results[0]['subject'], '–') && !str_contains($results[0]['subject'], '\\u2013'),
    ];

    $ok = !in_array(false, $checks, true);
    ops_print([
        'ok' => $ok,
        'mode' => 'offline_preflight',
        'network_connections' => 0,
        'database_writes' => 0,
        'smtp_delivery_enabled' => !mail_is_dry_run($config),
        'relay_errors' => $relayErrors,
        'scenario' => $scenario,
        'messages' => $results,
        'checks' => $checks,
    ], $ok ? 0 : 1);
} catch (Throwable $error) {
    ops_print(['ok' => false, 'mode' => 'offline_preflight', 'error' => $error->getMessage()], 1);
}
