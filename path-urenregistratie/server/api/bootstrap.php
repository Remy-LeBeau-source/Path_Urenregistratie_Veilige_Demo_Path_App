<?php

declare(strict_types=1);

require __DIR__ . '/common.php';

api_require_get_only();
$pdo = api_pdo();

try {
    $companies = $pdo->query(
        'SELECT id, slug, legal_name, trade_name, app_name, support_name, support_email, country_code, invoice_prefix, payment_term_days, customer_timesheet_reminder_enabled, customer_timesheet_reminder_time, customer_timesheet_overdue_workdays, created_at, updated_at FROM companies ORDER BY id'
    )->fetchAll();

    $users = $pdo->query(
        'SELECT id, company_id, email, display_name, role, active, deactivated_at, last_login_at, created_at, updated_at FROM users ORDER BY id'
    )->fetchAll();

    $employees = $pdo->query(
        'SELECT id, company_id, user_id, employee_number, full_name, job_title, employment_type, weekly_contract_hours, employment_start_date, employment_end_date, active, created_at, updated_at FROM employees ORDER BY id'
    )->fetchAll();

    $periods = $pdo->query(
        "SELECT id, company_id, year, month, status, CONCAT(year, '-', LPAD(month, 2, '0')) AS period_key, created_at FROM periods ORDER BY year, month, id"
    )->fetchAll();

    $assignments = $pdo->query(
        'SELECT id, company_id, employee_id, client_id, broker_id, assignment_name, invoice_project_name, project_code, agreement_number, creditor_number, contractor_number, invoice_number_template, purchase_order_number, hourly_rate, vat_percentage, start_date, end_date, invoice_frequency, requires_timesheet_attachment, broker_mail_enabled, broker_invoice_attachment, bookkeeper_invoice_attachment, payroll_invoice_attachment, customer_timesheet_expected, customer_timesheet_due_workday, customer_timesheet_broker_enabled, customer_timesheet_use_broker_email, customer_timesheet_broker_email, invoice_without_customer_timesheet_allowed, active, created_at, updated_at FROM assignments ORDER BY id'
    )->fetchAll();

    $mailRecipients = $pdo->query(
        'SELECT id, company_id, recipient_key, recipient_category, display_name, email, active, deactivated_at, created_at, updated_at FROM mail_recipients ORDER BY id'
    )->fetchAll();

    api_send_json([
        'ok' => true,
        'companies' => $companies,
        'users' => $users,
        'employees' => $employees,
        'periods' => $periods,
        'assignments' => $assignments,
        'mail_recipients' => $mailRecipients,
        'mailRecipients' => $mailRecipients,
    ]);
} catch (Throwable $e) {
    api_send_json([
        'ok' => false,
        'error' => 'bootstrap-query-failed',
        'message' => $e->getMessage(),
    ], 500);
}
