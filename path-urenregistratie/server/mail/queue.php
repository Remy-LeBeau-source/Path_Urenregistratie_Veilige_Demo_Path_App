<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

require_once __DIR__ . '/templates.php';

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
            c.support_name AS support_name,
            c.support_email AS support_email,
            c.website AS company_website,
            c.tagline AS company_tagline,
            cp_client.trade_name AS client_name,
            COALESCE(NULLIF(cp_broker.trade_name, \'\'), cp_broker.legal_name) AS broker_name
         FROM invoices i
         JOIN timesheets t ON t.id = i.timesheet_id
         JOIN employees e ON e.id = t.employee_id
         JOIN assignments a ON a.id = t.assignment_id
         LEFT JOIN counterparties cp_client ON cp_client.id = a.client_id AND cp_client.company_id = :company_id
         LEFT JOIN counterparties cp_broker ON cp_broker.id = a.broker_id AND cp_broker.company_id = :company_id3
         JOIN periods p ON p.id = t.period_id
         JOIN companies c ON c.id = i.company_id
         WHERE i.id = :invoice_id AND i.company_id = :company_id2
         LIMIT 1'
    );
    // Named placeholders are not reused: this PDO connection runs with native
    // prepares (emulation off), which rejects a repeated :name with HY093. Each
    // occurrence of the company id gets its own bind.
    $stmt->execute([
        ':invoice_id'  => $invoiceId,
        ':company_id'  => $companyId,
        ':company_id2' => $companyId,
        ':company_id3' => $companyId,
    ]);
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
        'ondersteuning'     => (string)($inv['support_name'] ?? ''),
        'contactmail'       => (string)($inv['support_email'] ?? ''),
        'website'           => (string)($inv['company_website'] ?? ''),
        'slogan'            => (string)($inv['company_tagline'] ?? ''),
        'klant'             => (string)($inv['client_name'] ?? ''),
        'broker'            => (string)($inv['broker_name'] ?? ''),
        'overeenkomstnummer'=> (string)($inv['agreement_number'] ?? ''),
    ];

    // Welke begeleidende tekst een ontvanger krijgt. Eén regel, voor iedereen:
    //
    //   1. de tekst die bij die ene ontvanger is ingevuld -- die wint
    //   2. anders de standaardtekst van zijn soort
    //
    // Hier stond eerder een tussenstap: "de tekst bij de opdracht", die iedereen
    // erfde behalve de boekhouder en de salarisadministratie. Dat was de bron van
    // het probleem. Die tekst is namelijk aan de broker geschreven ("Hierbij stuur
    // ik de ureninformatie van...") en las bij een andere ontvanger als een bericht
    // aan de verkeerde persoon. De uitzondering die dat repareerde, maakte het
    // scherm onnavolgbaar: waar je keek gold een andere regel.
    //
    // De opdrachttekst is daarom geen aparte laag meer maar wat hij altijd al was:
    // de eigen tekst van de broker. Alleen die leest hem nog.
    // De standaardteksten zoals dit bedrijf ze heeft ingesteld. Zonder eigen
    // instelling zijn dat de meegeleverde teksten.
    $sjablonen = mail_channel_templates_for($pdo, $companyId);
    $assignmentSubject = (string)($inv['invoice_subject_template'] ?? '');
    $assignmentBody = (string)($inv['invoice_body_template'] ?? '');
    $templateFor = static function (string $channel, string $routeSubject = '', string $routeBody = '') use ($assignmentSubject, $assignmentBody, $sjablonen): array {
        $base = $sjablonen[$channel];
        // Alleen de broker leest de opdrachttekst, want dat is zijn eigen tekst.
        // Elke andere ontvanger valt terug op de standaardtekst van zijn soort.
        $viaOpdracht = $channel === 'broker';
        $opdrachtSubject = $viaOpdracht ? $assignmentSubject : '';
        $opdrachtBody = $viaOpdracht ? $assignmentBody : '';
        return [
            'subject' => $routeSubject !== '' ? $routeSubject : ($opdrachtSubject !== '' ? $opdrachtSubject : $base['subject']),
            'body'    => $routeBody !== '' ? $routeBody : ($opdrachtBody !== '' ? $opdrachtBody : $base['body']),
        ];
    };

    // De handtekening hoort bij de afzender, niet bij de tekst. Hij gaat daarom
    // onder elke mail, ook onder een eigen tekst bij een ontvanger of de tekst
    // bij de opdracht. Lege velden slaan we over, zodat er geen witregels
    // blijven staan wanneer website of slogan niet zijn ingevuld.
    $handtekeningRegels = array_values(array_filter([
        (string)($inv['support_name'] ?? ''),
        (string)$inv['company_name'],
        (string)($inv['support_email'] ?? ''),
        (string)($inv['company_website'] ?? ''),
    ], static fn (string $regel): bool => trim($regel) !== ''));

    $slogan = trim((string)($inv['company_tagline'] ?? ''));
    $handtekening = "\n\nMet vriendelijke groet,\n\n" . implode("\n", $handtekeningRegels);
    if ($slogan !== '') $handtekening .= "\n\n" . $slogan;

    $metHandtekening = static function (string $tekst) use ($handtekening): string {
        return rtrim($tekst) . $handtekening;
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
            mail_assert_vars($metHandtekening($tpl['body']), $vars, 'broker.body');

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
                mail_render($metHandtekening($tpl['body']), $vars),
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
            // Een ontvanger van het type Overig kreeg hier altijd 'none', ongeacht
            // het vinkje "Factuur meesturen". Dat vinkje werd wel opgeslagen en bleef
            // aangevinkt staan, dus je zag een instelling die niets deed -- en dat merk
            // je pas als de ontvanger je belt dat de factuur ontbreekt.
            $channel      = $category;
            $attachPolicy = (bool)$route['include_invoice_pdf'] ? 'invoice' : 'none';
        }

        // An unknown category is informational, not a reason to drop the recipient.
        if (!isset($sjablonen[$channel])) {
            $channel = 'other';
        }

        // Inheritance: an override on this recipient wins, otherwise the assignment
        // template, otherwise the channel default. Empty is not an override -- that is
        // what makes one edit on the assignment reach every recipient without one.
        $tpl = $templateFor($channel, (string)($route['subject_template'] ?? ''), (string)($route['body_template'] ?? ''));
        mail_assert_vars($tpl['subject'], $vars, $channel . '.subject');
        mail_assert_vars($metHandtekening($tpl['body']), $vars, $channel . '.body');

        $id = mail_insert_delivery(
            $pdo, $invoiceId, $channel,
            (string)$route['email'], null,
            mail_render($tpl['subject'], $vars),
            mail_render($metHandtekening($tpl['body']), $vars),
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
            $tpl = $sjablonen['payroll'];
            mail_assert_vars($tpl['subject'], $vars, 'payroll.subject');
            mail_assert_vars($metHandtekening($tpl['body']), $vars, 'payroll.body');

            $id = mail_insert_delivery(
                $pdo,
                $invoiceId,
                'payroll',
                $fallbackPayrollEmail,
                null,
                mail_render($tpl['subject'], $vars),
                mail_render($metHandtekening($tpl['body']), $vars),
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
