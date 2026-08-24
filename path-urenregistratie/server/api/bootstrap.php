<?php

declare(strict_types=1);

require __DIR__ . '/common.php';
require_once __DIR__ . '/../mail/templates.php';
require_once __DIR__ . '/../auth/password-reset-service.php';

api_require_get_only();
$pdo = api_auth_pdo();
$currentUser = api_require_authenticated_read_user($pdo);
$isEmployee = (string)$currentUser['role'] === 'employee';
$employee = $isEmployee ? api_require_employee_context($pdo, $currentUser) : null;
$companyId = (int)$currentUser['company_id'];

try {
    $companiesStmt = $pdo->prepare(
        'SELECT id, slug, legal_name, trade_name, invoice_name_display, app_name, support_name, support_email, website, tagline, brand_primary, brand_accent, chamber_of_commerce_number, vat_number, iban, address_line, postal_code, city, invoice_phone, invoice_email, country_code, invoice_prefix, payment_term_days, customer_timesheet_reminder_enabled, customer_timesheet_reminder_time, customer_timesheet_overdue_workdays, customer_timesheet_submission_subject, customer_timesheet_submission_body, customer_timesheet_broker_subject, customer_timesheet_broker_body, created_at, updated_at FROM companies WHERE id = :company_id ORDER BY id'
    );
    $companiesStmt->execute([':company_id' => $companyId]);
    $companies = $companiesStmt->fetchAll();

    $usersSql = "SELECT id, company_id, email, display_name, role, active,
                        CASE WHEN password_hash IS NOT NULL AND password_hash <> '' THEN 1 ELSE 0 END AS password_ready,
                        deactivated_at, last_login_at, created_at, updated_at
                 FROM users WHERE company_id = :company_id";
    $usersParams = [':company_id' => $companyId];
    if ($isEmployee) {
        $usersSql .= ' AND id = :user_id';
        $usersParams[':user_id'] = (int)$currentUser['id'];
    }
    $usersSql .= ' ORDER BY id';
    $usersStmt = $pdo->prepare($usersSql);
    $usersStmt->execute($usersParams);
    $users = $usersStmt->fetchAll();

    $employeesSql = 'SELECT id, company_id, user_id, employee_number, full_name, job_title, employment_type, weekly_contract_hours, employment_start_date, employment_end_date, active, created_at, updated_at FROM employees WHERE company_id = :company_id';
    $employeesParams = [':company_id' => $companyId];
    if ($isEmployee && $employee) {
        $employeesSql .= ' AND id = :employee_id';
        $employeesParams[':employee_id'] = (int)$employee['id'];
    }
    $employeesSql .= ' ORDER BY id';
    $employeesStmt = $pdo->prepare($employeesSql);
    $employeesStmt->execute($employeesParams);
    $employees = $employeesStmt->fetchAll();

    $periodsStmt = $pdo->prepare(
        "SELECT id, company_id, year, month, status, CONCAT(year, '-', LPAD(month, 2, '0')) AS period_key, created_at FROM periods WHERE company_id = :company_id ORDER BY year, month, id"
    );
    $periodsStmt->execute([':company_id' => $companyId]);
    $periods = $periodsStmt->fetchAll();

    $assignmentsSql = 'SELECT id, company_id, employee_id, client_id, broker_id, assignment_name, invoice_project_name, project_code, agreement_number, creditor_number, contractor_number, invoice_number_template, invoice_subject_template, invoice_body_template, purchase_order_number, hourly_rate, vat_percentage, start_date, end_date, invoice_frequency, requires_timesheet_attachment, broker_mail_enabled, broker_invoice_attachment, bookkeeper_invoice_attachment, payroll_invoice_attachment, customer_timesheet_expected, customer_timesheet_due_workday, customer_timesheet_broker_enabled, customer_timesheet_use_broker_email, customer_timesheet_broker_email, invoice_without_customer_timesheet_allowed, active, created_at, updated_at FROM assignments WHERE company_id = :company_id';
    $assignmentsParams = [':company_id' => $companyId];
    if ($isEmployee && $employee) {
        $assignmentsSql .= ' AND employee_id = :employee_id';
        $assignmentsParams[':employee_id'] = (int)$employee['id'];
    }
    $assignmentsSql .= ' ORDER BY id';
    $assignmentsStmt = $pdo->prepare($assignmentsSql);
    $assignmentsStmt->execute($assignmentsParams);
    $assignments = $assignmentsStmt->fetchAll();

    $counterpartiesStmt = $pdo->prepare(
        'SELECT id, company_id, type, legal_name, trade_name, invoice_address_line, invoice_postal_code, invoice_city, invoice_email, active
         FROM counterparties
         WHERE company_id = :company_id
         ORDER BY id'
    );
    $counterpartiesStmt->execute([':company_id' => $companyId]);
    $counterparties = $counterpartiesStmt->fetchAll();

    $assignmentMailRoutesStmt = $pdo->prepare(
        'SELECT
            amr.assignment_id,
            amr.mail_recipient_id,
            amr.enabled,
            amr.include_invoice_pdf,
            amr.subject_template,
            amr.body_template,
            mr.recipient_key,
            mr.display_name
         FROM assignment_mail_routes amr
         JOIN mail_recipients mr ON mr.id = amr.mail_recipient_id
         WHERE mr.company_id = :company_id
         ORDER BY amr.assignment_id, amr.mail_recipient_id'
    );
    $assignmentMailRoutesStmt->execute([':company_id' => $companyId]);
    $assignmentMailRoutes = $assignmentMailRoutesStmt->fetchAll();

    $mailRecipients = [];
    if (!$isEmployee) {
        $mailRecipientsStmt = $pdo->prepare(
            'SELECT id, company_id, recipient_key, recipient_category, display_name, email, active, deactivated_at, created_at, updated_at FROM mail_recipients WHERE company_id = :company_id ORDER BY id'
        );
        $mailRecipientsStmt->execute([':company_id' => $companyId]);
        $mailRecipients = $mailRecipientsStmt->fetchAll();
    }

    api_send_json([
        'ok' => true,
        // Zodat het instellingenscherm kan laten zien welke tekst een ontvanger
        // krijgt zolang er niets eigens is ingevuld.
        // Wat er werkelijk geldt voor dit bedrijf: de meegeleverde teksten, met
        // daaroverheen wat er bij Instellingen is ingesteld.
        'mail_channel_defaults' => mail_channel_templates_for($pdo, $companyId),
        // En de meegeleverde teksten apart, zodat het scherm kan laten zien
        // waar "Terug naar de standaard" naartoe gaat.
        'mail_channel_shipped' => MAIL_CHANNEL_TEMPLATES,
        // Welke kanalen werkelijk een eigen rij hebben. Nodig omdat een opgeslagen
        // tekst die gelijk is aan de meegeleverde er aan de buitenkant hetzelfde
        // uitziet, maar wel de tekst bevriest.
        'mail_channel_customised' => mail_channel_customised_for($pdo, $companyId),
        'companies' => $companies,
        'users' => $users,
        'employees' => $employees,
        'periods' => $periods,
        'assignments' => $assignments,
        'counterparties' => $counterparties,
        'assignment_mail_routes' => $assignmentMailRoutes,
        'mail_recipients' => $mailRecipients,
        'capabilities' => [
            'password_reset_delivery' => auth_password_reset_delivery_available(auth_load_raw_config()),
        ],
    ]);
} catch (Throwable $e) {
    api_send_json([
        'ok' => false,
        'error' => 'bootstrap-query-failed',
        'message' => 'De gegevens konden niet worden geladen. Ververs de pagina.',
    ], 500);
}
