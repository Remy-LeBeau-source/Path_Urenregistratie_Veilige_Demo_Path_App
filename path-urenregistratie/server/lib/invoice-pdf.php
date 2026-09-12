<?php

declare(strict_types=1);

/**
 * Opbouw van de factuur-PDF, losgeknipt uit server/api/invoices.php.
 *
 * Dat bestand is een endpoint: bij inladen zet het headers en handelt het
 * meteen het verzoek af. De TEST-reset (server/lib/test-reset.php) wil
 * dezelfde echte factuur kunnen neerzetten in plaats van een leeg
 * testdocument, en kan dat endpoint dus niet binnenhalen. Alleen het bouwen
 * van de bytes staat hier; het opslaan en het bijwerken van pdf_storage_key
 * blijft in het endpoint, want dat is verzoekgedrag.
 */

require_once __DIR__ . '/simple_pdf.php';

function invoices_month_name(int $month): string
{
    $names = [
        1 => 'januari',
        2 => 'februari',
        3 => 'maart',
        4 => 'april',
        5 => 'mei',
        6 => 'juni',
        7 => 'juli',
        8 => 'augustus',
        9 => 'september',
        10 => 'oktober',
        11 => 'november',
        12 => 'december',
    ];

    return $names[$month] ?? sprintf('%02d', $month);
}

/**
 * Build the invoice PDF bytes without touching storage or pdf_storage_key.
 *
 * Losgeknipt van invoices_generate_and_store_pdf() omdat de TEST-reset
 * dezelfde echte factuur wil neerzetten op de opslagsleutel die de rij al
 * heeft (zie test_reset_seed_documents() in server/lib/test-reset.php).
 * Opslaan via invoices_store_pdf_bytes() kan daar niet: die maakt een nieuwe
 * sleutel met een random token, en dan schuift pdf_storage_key bij elke reset
 * terwijl de e2e-isolatievingerafdruk juist die kolom leest.
 *
 * Never throws, net als de functie hierboven: geeft null terug als de factuur
 * niet bestaat of de PDF niet te bouwen is.
 */
function invoices_build_pdf_bytes(PDO $pdo, int $invoiceId, int $companyId): ?string
{
    try {
        $stmt = $pdo->prepare(
            'SELECT i.invoice_number, i.invoice_date, i.due_date, i.subtotal, i.vat_percentage, i.vat_amount, i.total,
                    e.full_name AS employee_name, t.billable_hours,
                    CONCAT(p.year, "-", LPAD(p.month, 2, "0")) AS period_key,
                    c.trade_name, c.legal_name, c.invoice_name_display,
                    c.address_line, c.postal_code, c.city, c.invoice_phone, c.invoice_email,
                    c.chamber_of_commerce_number, c.vat_number, c.iban, c.payment_term_days,
                    a.invoice_project_name, a.agreement_number, a.creditor_number, a.contractor_number, a.hourly_rate,
                    r.trade_name AS recipient_trade_name, r.legal_name AS recipient_legal_name,
                    r.invoice_address_line AS recipient_address_line,
                    r.invoice_postal_code AS recipient_postal_code, r.invoice_city AS recipient_city
             FROM invoices i
             JOIN timesheets t ON t.id = i.timesheet_id
             JOIN employees e ON e.id = t.employee_id
             JOIN periods p ON p.id = t.period_id
             JOIN companies c ON c.id = i.company_id
             JOIN assignments a ON a.id = t.assignment_id
             LEFT JOIN counterparties r ON r.id = i.recipient_id AND r.company_id = i.company_id
             WHERE i.id = :id AND i.company_id = :company_id
             LIMIT 1'
        );
        $stmt->execute([':id' => $invoiceId, ':company_id' => $companyId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        $vatPercentageLabel = rtrim(rtrim(number_format((float)$row['vat_percentage'], 2, ',', '.'), '0'), ',');
        $hoursLabel = rtrim(rtrim(number_format((float)$row['billable_hours'], 2, ',', '.'), '0'), ',');
        $addressLine = trim(
            trim((string)$row['address_line']) . ' '
            . trim((string)$row['postal_code']) . ' '
            . trim((string)$row['city'])
        );

        $tradeName = trim((string)$row['trade_name']);
        $legalName = trim((string)$row['legal_name']);
        $combinedIdentity = (string)$row['invoice_name_display'] !== 'legal_only'
            && $tradeName !== ''
            && $legalName !== ''
            && strcasecmp($tradeName, $legalName) !== 0;
        $companyHeading = $combinedIdentity ? $tradeName : ($legalName !== '' ? $legalName : $tradeName);

        $recipientName = trim((string)($row['recipient_trade_name'] ?? '')) !== ''
            ? trim((string)$row['recipient_trade_name'])
            : trim((string)($row['recipient_legal_name'] ?? ''));
        $recipientAddress = trim(
            trim((string)($row['recipient_address_line'] ?? '')) . ' '
            . trim((string)($row['recipient_postal_code'] ?? '')) . ' '
            . trim((string)($row['recipient_city'] ?? ''))
        );
        $projectName = trim((string)($row['invoice_project_name'] ?? ''));
        $references = array_filter([
            'Overeenkomstnummer' => trim((string)($row['agreement_number'] ?? '')),
            'Crediteurennummer' => trim((string)($row['creditor_number'] ?? '')),
            'Nummer opdrachtuitvoerder' => trim((string)($row['contractor_number'] ?? '')),
        ]);
        $monthLabel = invoices_month_name((int)substr((string)$row['period_key'], 5, 2));
        $rateLabel = number_format((float)$row['hourly_rate'], 2, ',', '.');
        $paymentTermDays = (int)($row['payment_term_days'] ?? 30);

        $lines = [
            ['text' => 'FACTUUR ' . (string)$row['invoice_number'], 'size' => 14],
            'Factuurdatum ' . (string)$row['invoice_date'] . ' | Betreft ' . $monthLabel,
            ' ',
            ['text' => 'Facturerende onderneming', 'size' => 9],
            ['text' => $companyHeading, 'size' => 12],
            ...($combinedIdentity ? [['text' => 'Handelsnaam van ' . $legalName, 'size' => 9]] : []),
            ['text' => $addressLine, 'size' => 9],
            'KvK: ' . trim((string)$row['chamber_of_commerce_number']) . ' | Btw: ' . trim((string)$row['vat_number']),
            'IBAN: ' . trim((string)$row['iban']),
            trim((string)$row['invoice_phone']) . ' | ' . trim((string)$row['invoice_email']),
            ' ',
            ['text' => 'Factuur aan', 'size' => 9],
            ['text' => ($recipientName !== '' ? $recipientName : 'Nog te bevestigen'), 'size' => 12],
            ($recipientAddress !== '' ? $recipientAddress : 'Factuuradres: nog definitief bevestigen'),
            ...($projectName !== '' ? ['Project: ' . $projectName] : []),
            'Omschrijving: Maand ' . $monthLabel,
            ...(!empty($references) ? [' '] : []),
            ...array_map(
                fn($label, $value) => $label . ': ' . $value,
                array_keys($references),
                array_values($references)
            ),
            ' ',
            'Beste,',
            'Hierbij doe ik u de factuur toekomen betreft de volgende werkzaamheden.',
            ' ',
            ['text' => 'Omschrijving / Uren / Tarief / Totaal', 'size' => 9],
            'Maand ' . $monthLabel . '   ' . $hoursLabel . ' uur   EUR ' . $rateLabel . '/uur   EUR ' . number_format((float)$row['subtotal'], 2, ',', '.'),
            ' ',
            'Totaal exclusief: EUR ' . number_format((float)$row['subtotal'], 2, ',', '.'),
            'Btw (' . $vatPercentageLabel . '%): EUR ' . number_format((float)$row['vat_amount'], 2, ',', '.'),
            ['text' => 'Totaal inclusief: EUR ' . number_format((float)$row['total'], 2, ',', '.'), 'size' => 12],
            ' ',
            ['text' => 'Betalingsinformatie', 'size' => 9],
            'U wordt vriendelijk verzocht uw betaling binnen ' . $paymentTermDays . ' dagen van de factuurdatum over te',
            'maken op rekening: ' . trim((string)$row['iban']) . ' onder vermelding van factuurnummer: ' . (string)$row['invoice_number'],
            ' ',
            'Met vriendelijke groet,',
            ['text' => $companyHeading, 'size' => 10],
        ];

        $logoPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'path-logo.png';
        try {
            return simple_pdf_branded_text_document($lines, $logoPath);
        } catch (RuntimeException $gdError) {
            // GD unavailable on this server – use plain-text fallback with consistent layout
            // to ensure mail attachment looks identical to app preview
            return simple_pdf_text_document_with_branding_fallback($lines);
        }
    } catch (Throwable $e) {
        error_log('invoices_build_pdf_bytes failed: ' . $e->getMessage());
        return null;
    }
}
