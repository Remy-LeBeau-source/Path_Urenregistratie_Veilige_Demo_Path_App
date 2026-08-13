<?php

declare(strict_types=1);

require_once __DIR__ . '/cli-bootstrap.php';

/** @return array<string,string|int> */
function provision_company_path_profile(): array
{
    return [
        'slug' => 'path-consultancy',
        'legal_name' => 'QSI Consultancy B.V.',
        'trade_name' => 'Path Consultancy',
        'invoice_name_display' => 'trade_and_legal',
        'app_name' => 'Uren & Facturatie',
        'support_name' => 'Path Consultancy Backoffice',
        'support_email' => 'info@pathconsultancy.nl',
        'brand_primary' => '#0d1b38',
        'brand_accent' => '#3abd9d',
        'chamber_of_commerce_number' => '89320018',
        'vat_number' => 'NL001622017B32',
        'iban' => 'NL95INGB0006947972',
        'address_line' => 'Du Perronstraat 12',
        'postal_code' => '3067 HN',
        'city' => 'Rotterdam',
        'invoice_phone' => '06 21 46 91 72',
        'invoice_email' => 'info@pathconsultancy.nl',
        'country_code' => 'NL',
        'invoice_prefix' => 'PATH',
        'payment_term_days' => 30,
    ];
}

function provision_company_required_option(array $options, string $name): string
{
    $value = trim((string)($options[$name] ?? ''));
    if ($value === '') {
        throw new RuntimeException('Missing required option --' . $name . '=...');
    }
    return $value;
}

/** @return array<string,string|int> */
function provision_company_custom_profile(array $options): array
{
    return [
        'slug' => provision_company_required_option($options, 'slug'),
        'legal_name' => provision_company_required_option($options, 'legal-name'),
        'trade_name' => provision_company_required_option($options, 'trade-name'),
        'invoice_name_display' => trim((string)($options['invoice-name-display'] ?? 'trade_and_legal')),
        'app_name' => trim((string)($options['app-name'] ?? 'Uren & Facturatie')),
        'support_name' => provision_company_required_option($options, 'support-name'),
        'support_email' => provision_company_required_option($options, 'support-email'),
        'brand_primary' => trim((string)($options['brand-primary'] ?? '#0d1b38')),
        'brand_accent' => trim((string)($options['brand-accent'] ?? '#3abd9d')),
        'chamber_of_commerce_number' => provision_company_required_option($options, 'kvk'),
        'vat_number' => provision_company_required_option($options, 'vat'),
        'iban' => provision_company_required_option($options, 'iban'),
        'address_line' => provision_company_required_option($options, 'address'),
        'postal_code' => provision_company_required_option($options, 'postal-code'),
        'city' => provision_company_required_option($options, 'city'),
        'invoice_phone' => provision_company_required_option($options, 'phone'),
        'invoice_email' => provision_company_required_option($options, 'invoice-email'),
        'country_code' => strtoupper(trim((string)($options['country-code'] ?? 'NL'))),
        'invoice_prefix' => strtoupper(provision_company_required_option($options, 'invoice-prefix')),
        'payment_term_days' => (int)($options['payment-term-days'] ?? 30),
    ];
}

/** @param array<string,string|int> $company */
function provision_company_normalize(array $company): array
{
    $company['slug'] = strtolower(trim((string)$company['slug']));
    $company['vat_number'] = strtoupper(str_replace(' ', '', (string)$company['vat_number']));
    $company['iban'] = strtoupper(str_replace(' ', '', (string)$company['iban']));
    $company['postal_code'] = strtoupper(preg_replace('/\s+/', '', (string)$company['postal_code']) ?? '');
    if (preg_match('/^(\d{4})([A-Z]{2})$/', (string)$company['postal_code'], $matches)) {
        $company['postal_code'] = $matches[1] . ' ' . $matches[2];
    }
    $company['country_code'] = strtoupper(trim((string)$company['country_code']));
    $company['invoice_prefix'] = strtoupper(trim((string)$company['invoice_prefix']));
    return $company;
}

/** @param array<string,string|int> $company */
function provision_company_validate(array $company): void
{
    $lengths = [
        'slug' => 100, 'legal_name' => 160, 'trade_name' => 160, 'app_name' => 120,
        'support_name' => 160, 'support_email' => 190, 'chamber_of_commerce_number' => 32,
        'vat_number' => 32, 'iban' => 64, 'address_line' => 180, 'postal_code' => 16,
        'city' => 100, 'invoice_phone' => 40, 'invoice_email' => 190, 'invoice_prefix' => 30,
    ];
    foreach ($lengths as $field => $maximum) {
        $value = trim((string)($company[$field] ?? ''));
        if ($value === '' || strlen($value) > $maximum) {
            throw new RuntimeException($field . ' is required and may contain at most ' . $maximum . ' characters.');
        }
    }
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', (string)$company['slug'])) {
        throw new RuntimeException('slug must be a lowercase URL-safe identifier.');
    }
    if (!in_array($company['invoice_name_display'], ['trade_and_legal', 'legal_only'], true)) {
        throw new RuntimeException('invoice_name_display must be trade_and_legal or legal_only.');
    }
    if (!filter_var($company['support_email'], FILTER_VALIDATE_EMAIL)
        || !filter_var($company['invoice_email'], FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Support and invoice email must both be valid.');
    }
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', (string)$company['brand_primary'])
        || !preg_match('/^#[0-9A-Fa-f]{6}$/', (string)$company['brand_accent'])) {
        throw new RuntimeException('Brand colors must use six-digit hexadecimal notation.');
    }
    if (!preg_match('/^\d{8}$/', (string)$company['chamber_of_commerce_number'])) {
        throw new RuntimeException('Dutch chamber of commerce number must contain eight digits.');
    }
    if (!preg_match('/^NL\d{9}B\d{2}$/', (string)$company['vat_number'])) {
        throw new RuntimeException('Dutch VAT number has an invalid format.');
    }
    if (!preg_match('/^NL\d{2}[A-Z]{4}\d{10}$/', (string)$company['iban'])) {
        throw new RuntimeException('Dutch IBAN has an invalid format.');
    }
    if (!preg_match('/^\d{4} [A-Z]{2}$/', (string)$company['postal_code'])) {
        throw new RuntimeException('Dutch postal code has an invalid format.');
    }
    if (!preg_match('/^[A-Z]{2}$/', (string)$company['country_code'])) {
        throw new RuntimeException('country_code must contain exactly two letters.');
    }
    if (!preg_match('/^[A-Z0-9_-]+$/', (string)$company['invoice_prefix'])) {
        throw new RuntimeException('invoice_prefix contains unsupported characters.');
    }
    if ((int)$company['payment_term_days'] < 1 || (int)$company['payment_term_days'] > 365) {
        throw new RuntimeException('payment_term_days must be between 1 and 365.');
    }
}

/** @param array<string,mixed> $existing @param array<string,string|int> $expected */
function provision_company_matches(array $existing, array $expected): bool
{
    foreach ($expected as $field => $value) {
        if ((string)($existing[$field] ?? '') !== (string)$value) {
            return false;
        }
    }
    return true;
}

$options = ops_options($argv);
try {
    if (($options['execute'] ?? false) !== true) {
        ops_print([
            'ok' => true,
            'mode' => 'check',
            'writes_performed' => false,
            'profiles' => ['path-consultancy', 'custom'],
            'message' => 'Use --execute --confirm=PROVISION_COMPANY --profile=path-consultancy after database migration and backup.',
        ]);
    }
    if (($options['confirm'] ?? '') !== 'PROVISION_COMPANY') {
        throw new RuntimeException('Execution requires --confirm=PROVISION_COMPANY.');
    }

    $config = ops_load_config($options);
    $environment = strtolower(trim((string)($config['environment'] ?? ($config['app']['environment'] ?? 'production'))));
    if ($environment !== 'production' || ($config['allow_demo_migrations'] ?? true) !== false) {
        throw new RuntimeException('Company provisioning requires production with demo migrations disabled.');
    }

    $profile = strtolower(trim((string)($options['profile'] ?? '')));
    if ($profile === 'path-consultancy') {
        $company = provision_company_path_profile();
    } elseif ($profile === 'custom') {
        $company = provision_company_custom_profile($options);
    } else {
        throw new RuntimeException('Profile must be path-consultancy or custom.');
    }
    $company = provision_company_normalize($company);
    provision_company_validate($company);

    $pdo = ops_pdo($config);
    $pdo->beginTransaction();
    try {
        $existingRows = $pdo->query(
            'SELECT slug, legal_name, trade_name, invoice_name_display, app_name, support_name, support_email,
                    brand_primary, brand_accent, chamber_of_commerce_number, vat_number, iban, address_line,
                    postal_code, city, invoice_phone, invoice_email, country_code, invoice_prefix, payment_term_days
             FROM companies ORDER BY id FOR UPDATE'
        )->fetchAll();
        if (count($existingRows) > 1) {
            throw new RuntimeException('Refusing to provision: multiple companies already exist.');
        }
        if (count($existingRows) === 1) {
            if (!provision_company_matches($existingRows[0], $company)) {
                throw new RuntimeException('Refusing to overwrite an existing company with different data.');
            }
            $companyId = (int)$pdo->query('SELECT id FROM companies ORDER BY id LIMIT 1')->fetchColumn();
            $pdo->commit();
            ops_print([
                'ok' => true,
                'mode' => 'execute',
                'writes_performed' => false,
                'action' => 'unchanged',
                'company_id' => $companyId,
                'legal_name' => $company['legal_name'],
                'trade_name' => $company['trade_name'],
            ]);
        }

        $insert = $pdo->prepare(
            'INSERT INTO companies (
                slug, legal_name, trade_name, invoice_name_display, app_name, support_name, support_email,
                brand_primary, brand_accent, chamber_of_commerce_number, vat_number, iban, address_line,
                postal_code, city, invoice_phone, invoice_email, country_code, invoice_prefix, payment_term_days
             ) VALUES (
                :slug, :legal_name, :trade_name, :invoice_name_display, :app_name, :support_name, :support_email,
                :brand_primary, :brand_accent, :chamber_of_commerce_number, :vat_number, :iban, :address_line,
                :postal_code, :city, :invoice_phone, :invoice_email, :country_code, :invoice_prefix, :payment_term_days
             )'
        );
        $insert->execute($company);
        $companyId = (int)$pdo->lastInsertId();
        $audit = $pdo->prepare(
            'INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data)
             VALUES (:company_id, NULL, :event_type, :entity_type, :entity_id, :event_data)'
        );
        $audit->execute([
            ':company_id' => $companyId,
            ':event_type' => 'company.production_provisioned',
            ':entity_type' => 'company',
            ':entity_id' => (string)$companyId,
            ':event_data' => json_encode([
                'slug' => $company['slug'],
                'legal_name' => $company['legal_name'],
                'trade_name' => $company['trade_name'],
                'profile' => $profile,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
        $pdo->commit();

        ops_print([
            'ok' => true,
            'mode' => 'execute',
            'writes_performed' => true,
            'action' => 'created',
            'company_id' => $companyId,
            'legal_name' => $company['legal_name'],
            'trade_name' => $company['trade_name'],
        ]);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $error;
    }
} catch (Throwable $error) {
    ops_print(['ok' => false, 'writes_performed' => false, 'error' => $error->getMessage()], 1);
}
