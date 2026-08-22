<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

const MAIL_CHANNEL_TEMPLATES = [
    'broker' => [
        'subject' => 'Factuur {factuurnummer} – {periode}',
        'body' =>
            "Geachte relatie,\n\n"
            . "Bijgevoegd ontvangt u factuur {factuurnummer} voor de periode {periode}.\n\n"
            . "Medewerker: {medewerker}\nUren: {uren}\n"
            . "Subtotaal: € {subtotaal}\nBtw: € {btw}\nTotaal: € {bedrag}\n\n"
            . "Met vriendelijke groet,\n{bedrijf}",
    ],
    'accountant' => [
        'subject' => 'Factuuradministratie {factuurnummer} – {periode}',
        'body' =>
            "Ter informatie: factuur {factuurnummer} voor de periode {periode} is definitief gemaakt.\n"
            . "Medewerker: {medewerker}\n"
            . "Subtotaal: € {subtotaal}\nBtw: € {btw}\nTotaal: € {bedrag}",
    ],
    'payroll' => [
        'subject' => 'Ureninformatie {medewerker} – {periode}',
        'body' =>
            "Salarisverwerking:\nMedewerker: {medewerker}\nPeriode: {periode}\n"
            . "Goedgekeurde uren: {uren}",
    ],
    // The settings screen offers 'Overig' as a category, and a recipient with it
    // used to be dropped silently: the channel had no template, so the queue loop
    // skipped it. Someone ticked "Ontvangt mail" and nothing ever arrived. Neutral
    // wording that holds for any recipient; no attachment, same as payroll.
    'other' => [
        'subject' => 'Ureninformatie {medewerker} - {periode}',
        'body' =>
            "Hierbij de ureninformatie van {medewerker} over {periode}.
"
            . "Goedgekeurde uren: {uren}",
    ],
];

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

function mail_month_nl(int $month): string
{
    $names = [
        1 => 'januari', 2 => 'februari', 3 => 'maart', 4 => 'april',
        5 => 'mei', 6 => 'juni', 7 => 'juli', 8 => 'augustus',
        9 => 'september', 10 => 'oktober', 11 => 'november', 12 => 'december',
    ];
    return $names[$month] ?? sprintf('%02d', $month);
}

function mail_render(string $tpl, array $vars): string
{
    $keys   = array_map(static fn($k) => '{' . $k . '}', array_keys($vars));
    return str_replace($keys, array_values($vars), $tpl);
}

function mail_assert_vars(string $tpl, array $vars, string $ctx): void
{
    preg_match_all('/\{([^}]+)\}/', $tpl, $matches);
    $missing = array_diff($matches[1] ?? [], array_keys($vars));
    if (!empty($missing)) {
        throw new \RuntimeException('Missing template vars for ' . $ctx . ': ' . implode(', ', $missing));
    }
}

// ---------------------------------------------------------------------------
// Audit helper
// ---------------------------------------------------------------------------

function mail_audit(
    PDO    $pdo,
    int    $companyId,
    int    $actorUserId,
    string $eventType,
    int    $deliveryId,
    array  $extra = []
): void {
    $data = json_encode(array_merge(['delivery_id' => $deliveryId], $extra), JSON_UNESCAPED_UNICODE);
    $stmt = $pdo->prepare(
        'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
         VALUES (:company_id, :actor, :event_type, :entity_type, :entity_id, :event_data)'
    );
    $stmt->execute([
        ':company_id'   => $companyId,
        ':actor'        => $actorUserId,
        ':event_type'   => $eventType,
        ':entity_type'  => 'email_delivery',
        ':entity_id'    => (string)$deliveryId,
        ':event_data'   => $data,
    ]);
}

// ---------------------------------------------------------------------------
// Delivery insert
// ---------------------------------------------------------------------------

function mail_insert_delivery(
    PDO    $pdo,
    int    $invoiceId,
    string $channel,
    string $recipientEmail,
    ?string $ccEmail,
    string $subject,
    string $body,
    string $attachmentPolicy,
    bool   $dryRun
): int {
    $ccEmail = $ccEmail !== null && trim($ccEmail) !== '' ? trim($ccEmail) : null;
    $recipientEmail = trim($recipientEmail);
    if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
        throw new \RuntimeException('invalid-recipient-email');
    }
    if ($ccEmail !== null && !filter_var($ccEmail, FILTER_VALIDATE_EMAIL)) {
        throw new \RuntimeException('invalid-cc-email');
    }
    $stmt = $pdo->prepare(
        'INSERT INTO email_deliveries
         (invoice_id, channel, recipient_email, cc_email, subject_snapshot, body_snapshot,
          attachment_policy, dry_run, status)
         VALUES
         (:invoice_id, :channel, :recipient_email, :cc_email, :subject, :body,
          :attachment_policy, :dry_run, :status)'
    );
    $stmt->execute([
        ':invoice_id'       => $invoiceId,
        ':channel'          => $channel,
        ':recipient_email'  => $recipientEmail,
        ':cc_email'         => $ccEmail,
        ':subject'          => $subject,
        ':body'             => $body,
        ':attachment_policy'=> $attachmentPolicy,
        ':dry_run'          => $dryRun ? 1 : 0,
        ':status'           => 'queued',
    ]);
    return (int)$pdo->lastInsertId();
}

// ---------------------------------------------------------------------------
// Main enqueue function
// ---------------------------------------------------------------------------

/**
 * Build and persist email queue items for a locked invoice.
 *
 * Returns an array of created delivery items.
 * Throws \RuntimeException when validation fails (to be caught by caller).
 */
function mail_enqueue_for_invoice(
    PDO    $pdo,
    int    $invoiceId,
    int    $companyId,
    int    $actorUserId,
    bool   $dryRun
): array {
    // Load invoice with all context needed for routing and templates.
    $stmt = $pdo->prepare(
        'SELECT
            i.id AS invoice_id, i.invoice_number, i.locked_at,
            i.subtotal, i.vat_amount, i.total, i.vat_percentage, i.company_id AS invoice_company_id,
            t.id AS timesheet_id, t.billable_hours, t.assignment_id,
            e.full_name AS employee_name,
            a.broker_id, a.broker_mail_enabled, a.broker_invoice_attachment,
            a.bookkeeper_invoice_attachment, a.payroll_invoice_attachment,
            a.invoice_subject_template, a.invoice_body_template,
            a.agreement_number, a.contractor_number,
            p.year, p.month,
            c.trade_name AS company_name,
            cp_client.trade_name AS client_name
         FROM invoices i
         JOIN timesheets t ON t.id = i.timesheet_id
         JOIN employees e ON e.id = t.employee_id
         JOIN assignments a ON a.id = t.assignment_id
         LEFT JOIN counterparties cp_client ON cp_client.id = a.client_id AND cp_client.company_id = :company_id
         JOIN periods p ON p.id = t.period_id
         JOIN companies c ON c.id = i.company_id
         WHERE i.id = :invoice_id AND i.company_id = :company_id2
         LIMIT 1'
    );
    $stmt->execute([':invoice_id' => $invoiceId, ':company_id' => $companyId, ':company_id2' => $companyId]);
    $inv = $stmt->fetch();

    if (!$inv) {
        throw new \RuntimeException('invoice-not-found');
    }
    if ($inv['locked_at'] === null) {
        throw new \RuntimeException('invoice-not-locked');
    }

    $year  = (int)$inv['year'];
    $month = (int)$inv['month'];

    $vars = [
        'medewerker'        => (string)$inv['employee_name'],
        'periode'           => mail_month_nl($month) . ' ' . $year,
        'maand'             => mail_month_nl($month),
        'jaar'              => (string)$year,
        'uren'              => number_format((float)$inv['billable_hours'], 2, ',', '.'),
        'factuurnummer'     => (string)$inv['invoice_number'],
        'subtotaal'         => number_format((float)$inv['subtotal'], 2, ',', '.'),
        'btw'               => number_format((float)$inv['vat_amount'], 2, ',', '.'),
        'bedrag'            => number_format((float)$inv['total'], 2, ',', '.'),
        'bedrijf'           => (string)$inv['company_name'],
        'klant'             => (string)($inv['client_name'] ?? ''),
        'overeenkomstnummer'=> (string)($inv['agreement_number'] ?? ''),
    ];

    // One accompanying text for every recipient. The assignment template used to
    // apply to the broker only, so the bookkeeper and the payroll office silently
    // kept hardcoded wording that nobody could edit. It now wins for every channel;
    // each channel keeps its own default for whatever the assignment leaves empty.
    $assignmentSubject = (string)($inv['invoice_subject_template'] ?? '');
    $assignmentBody = (string)($inv['invoice_body_template'] ?? '');
    $templateFor = static function (string $channel, string $routeSubject = '', string $routeBody = '') use ($assignmentSubject, $assignmentBody): array {
        $base = MAIL_CHANNEL_TEMPLATES[$channel];
        return [
            'subject' => $routeSubject !== '' ? $routeSubject : ($assignmentSubject !== '' ? $assignmentSubject : $base['subject']),
            'body'    => $routeBody !== '' ? $routeBody : ($assignmentBody !== '' ? $assignmentBody : $base['body']),
        ];
    };

    $created = [];

    // ------------------------------------------------------------------
    // Broker channel (via counterparty invoice_email)
    // ------------------------------------------------------------------
    if ((bool)$inv['broker_mail_enabled'] && $inv['broker_id'] !== null) {
        $brokerStmt = $pdo->prepare(
            'SELECT invoice_email, cc_email FROM counterparties
             WHERE id = :id AND company_id = :company_id AND active = 1 LIMIT 1'
        );
        $brokerStmt->execute([':id' => (int)$inv['broker_id'], ':company_id' => $companyId]);
        $broker = $brokerStmt->fetch();

        if ($broker && !empty($broker['invoice_email'])) {
            $tpl = $templateFor('broker');
            mail_assert_vars($tpl['subject'], $vars, 'broker.subject');
            mail_assert_vars($tpl['body'], $vars, 'broker.body');

            // The broker mail sends the finalized invoice only; the customer-timesheet route
            // is handled separately by the dedicated klanturenstaat flow.
            $attachPolicy = (bool)$inv['broker_invoice_attachment']
                ? 'invoice'
                : 'none';
            $id = mail_insert_delivery(
                $pdo, $invoiceId, 'broker',
                (string)$broker['invoice_email'],
                !empty($broker['cc_email']) ? (string)$broker['cc_email'] : null,
                mail_render($tpl['subject'], $vars),
                mail_render($tpl['body'], $vars),
                $attachPolicy, $dryRun
            );
            mail_audit($pdo, $companyId, $actorUserId,
                $dryRun ? 'email.dry_run' : 'email.queued', $id,
                ['channel' => 'broker', 'invoice_number' => $inv['invoice_number']]);
            $created[] = ['id' => $id, 'channel' => 'broker', 'attachment_policy' => $attachPolicy, 'dry_run' => $dryRun];
        }
    }

    // ------------------------------------------------------------------
    // Mail-route channels (bookkeeper / payroll via assignment_mail_routes)
    // ------------------------------------------------------------------
    $routeStmt = $pdo->prepare(
        'SELECT amr.include_invoice_pdf, amr.subject_template, amr.body_template,
                mr.id AS recipient_id, mr.recipient_category,
                mr.display_name, mr.email
         FROM assignment_mail_routes amr
         JOIN mail_recipients mr ON mr.id = amr.mail_recipient_id
         WHERE amr.assignment_id = :assignment_id AND amr.enabled = 1
           AND mr.company_id = :company_id AND mr.active = 1'
    );
    $routeStmt->execute([':assignment_id' => (int)$inv['assignment_id'], ':company_id' => $companyId]);
    $routes = $routeStmt->fetchAll();
    $hasPayrollChannel = false;

    foreach ($routes as $route) {
        $category = (string)$route['recipient_category'];

        // Map category to channel name and attachment policy.
        if ($category === 'payroll') {
            // EasySalary NEVER receives invoice attachment.
            $channel       = 'payroll';
            $attachPolicy  = 'none';
            $hasPayrollChannel = true;
        } elseif ($category === 'accounting') {
            // Bookkeeper: follow route config, but respect assignment flag.
            $channel       = 'accountant';
            $attachPolicy  = ((bool)$route['include_invoice_pdf'] && (bool)$inv['bookkeeper_invoice_attachment'])
                ? 'invoice' : 'none';
        } else {
            // Unknown category: treat as informational, no attachment.
            $channel      = $category;
            $attachPolicy = 'none';
        }

        // An unknown category is informational, not a reason to drop the recipient.
        if (!isset(MAIL_CHANNEL_TEMPLATES[$channel])) {
            $channel = 'other';
        }

        // Inheritance: an override on this recipient wins, otherwise the assignment
        // template, otherwise the channel default. Empty is not an override -- that is
        // what makes one edit on the assignment reach every recipient without one.
        $tpl = $templateFor($channel, (string)($route['subject_template'] ?? ''), (string)($route['body_template'] ?? ''));
        mail_assert_vars($tpl['subject'], $vars, $channel . '.subject');
        mail_assert_vars($tpl['body'], $vars, $channel . '.body');

        $id = mail_insert_delivery(
            $pdo, $invoiceId, $channel,
            (string)$route['email'], null,
            mail_render($tpl['subject'], $vars),
            mail_render($tpl['body'], $vars),
            $attachPolicy, $dryRun
        );
        mail_audit($pdo, $companyId, $actorUserId,
            $dryRun ? 'email.dry_run' : 'email.queued', $id,
            ['channel' => $channel, 'invoice_number' => $inv['invoice_number']]);
        $created[] = ['id' => $id, 'channel' => $channel, 'attachment_policy' => $attachPolicy, 'dry_run' => $dryRun];
    }

    // Keep payroll delivery deterministic even when route data was mutated by prior writes.
    if (!$hasPayrollChannel) {
        $fallbackPayrollStmt = $pdo->prepare(
            'SELECT invoice_email
             FROM counterparties
             WHERE company_id = :company_id AND type = :type AND active = 1 AND invoice_email IS NOT NULL AND invoice_email <> ""
             ORDER BY id ASC
             LIMIT 1'
        );
        $fallbackPayrollStmt->execute([':company_id' => $companyId, ':type' => 'payroll']);
        $fallbackPayrollEmail = (string)($fallbackPayrollStmt->fetchColumn() ?: '');

        if ($fallbackPayrollEmail !== '') {
            $tpl = MAIL_CHANNEL_TEMPLATES['payroll'];
            mail_assert_vars($tpl['subject'], $vars, 'payroll.subject');
            mail_assert_vars($tpl['body'], $vars, 'payroll.body');

            $id = mail_insert_delivery(
                $pdo,
                $invoiceId,
                'payroll',
                $fallbackPayrollEmail,
                null,
                mail_render($tpl['subject'], $vars),
                mail_render($tpl['body'], $vars),
                'none',
                $dryRun
            );
            mail_audit(
                $pdo,
                $companyId,
                $actorUserId,
                $dryRun ? 'email.dry_run' : 'email.queued',
                $id,
                ['channel' => 'payroll', 'invoice_number' => $inv['invoice_number'], 'fallback' => true]
            );
            $created[] = ['id' => $id, 'channel' => 'payroll', 'attachment_policy' => 'none', 'dry_run' => $dryRun];
        }
    }

    return $created;
}

// ---------------------------------------------------------------------------
// Retry function
// ---------------------------------------------------------------------------

/**
 * Reset a failed delivery to queued for another dispatch attempt.
 * Throws \RuntimeException with a code string when validation fails.
 */
function mail_retry_delivery(PDO $pdo, int $deliveryId, int $companyId, int $actorUserId): array
{
    $stmt = $pdo->prepare(
        'SELECT ed.id, ed.status, ed.attempt_count, ed.channel, ed.dry_run,
                COALESCE(i.company_id, u.company_id) AS delivery_company_id
         FROM email_deliveries ed
         LEFT JOIN invoices i ON i.id = ed.invoice_id
         LEFT JOIN users u ON u.id = ed.user_id
         WHERE ed.id = :id'
    );
    $stmt->execute([':id' => $deliveryId]);
    $delivery = $stmt->fetch();

    if (!$delivery) {
        throw new \RuntimeException('delivery-not-found');
    }
    if ((int)$delivery['delivery_company_id'] !== $companyId) {
        throw new \RuntimeException('forbidden');
    }
    if ((string)$delivery['channel'] === 'password_reset') {
        throw new \RuntimeException('reset-reissue-required');
    }
    if ((string)$delivery['status'] !== 'failed') {
        throw new \RuntimeException('not-failed');
    }
    if ((int)$delivery['attempt_count'] >= MAIL_MAX_ATTEMPTS) {
        throw new \RuntimeException('max-attempts-reached');
    }

    $update = $pdo->prepare(
        'UPDATE email_deliveries
         SET status = \'queued\', last_error = NULL
         WHERE id = :id AND status = \'failed\''
    );
    $update->execute([':id' => $deliveryId]);

    mail_audit($pdo, $companyId, $actorUserId, 'email.retry_requested', $deliveryId,
        ['channel' => $delivery['channel'], 'attempts_so_far' => (int)$delivery['attempt_count']]);

    return [
        'id'            => $deliveryId,
        'status'        => 'queued',
        'attempt_count' => (int)$delivery['attempt_count'],
        'dry_run'       => (bool)$delivery['dry_run'],
    ];
}
