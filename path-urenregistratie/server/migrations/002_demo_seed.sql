-- 002_demo_seed.sql
-- Safe, idempotent demo seed for core tables aligned with existing production-like schema
START TRANSACTION;

-- company (use existing column names)
INSERT INTO companies (slug, legal_name, trade_name, support_email, country_code, app_name, chamber_of_commerce_number, created_at)
SELECT 'demo-bv', 'Demo BV', 'Demo BV', 'support@example.invalid', 'NL', 'Demo App', '00000000', NOW()
FROM (SELECT 1) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE legal_name = 'Demo BV');

-- users (admin + backoffice approver)
INSERT INTO users (company_id, email, display_name, role, active, created_at)
SELECT c.id, 'admin@example.invalid', 'Demo Admin', 'administrator', 1, NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'admin@example.invalid' AND u.company_id = c.id);

INSERT INTO users (company_id, email, display_name, role, active, created_at)
SELECT c.id, 'backoffice1@example.invalid', 'Backoffice User', 'approver', 1, NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'backoffice1@example.invalid' AND u.company_id = c.id);

-- employees (link to users where applicable)
INSERT INTO employees (company_id, user_id, employee_number, full_name, job_title, weekly_contract_hours, employment_start_date, active, created_at)
SELECT c.id, (SELECT u.id FROM users u WHERE u.email = 'admin@example.invalid' AND u.company_id = c.id LIMIT 1), 'E001', 'Jan Jansen', 'Developer', 40.00, '2020-01-01', 1, NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.company_id = c.id AND e.full_name = 'Jan Jansen');

INSERT INTO employees (company_id, user_id, employee_number, full_name, job_title, weekly_contract_hours, employment_start_date, active, created_at)
SELECT c.id, (SELECT u.id FROM users u WHERE u.email = 'backoffice1@example.invalid' AND u.company_id = c.id LIMIT 1), 'E002', 'Piet Pietersen', 'Backoffice', 36.00, '2019-07-01', 1, NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.company_id = c.id AND e.full_name = 'Piet Pietersen');

INSERT INTO employees (company_id, employee_number, full_name, job_title, weekly_contract_hours, employment_start_date, active, created_at)
SELECT c.id, 'E003', 'Klaas Klaassen', 'Consultant', 32.00, '2021-03-01', 1, NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.company_id = c.id AND e.full_name = 'Klaas Klaassen');

-- periods: year/month with statuses (closed/review/open)
INSERT INTO periods (company_id, year, month, status, created_at)
SELECT c.id, 2026, 6, 'closed', NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM periods p WHERE p.company_id = c.id AND p.year = 2026 AND p.month = 6);

INSERT INTO periods (company_id, year, month, status, created_at)
SELECT c.id, 2026, 7, 'review', NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM periods p WHERE p.company_id = c.id AND p.year = 2026 AND p.month = 7);

INSERT INTO periods (company_id, year, month, status, created_at)
SELECT c.id, 2026, 8, 'open', NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM periods p WHERE p.company_id = c.id AND p.year = 2026 AND p.month = 8);

-- assignments (use assignment_name)
-- counterparties/clients required by assignments
INSERT INTO counterparties (company_id, type, legal_name, invoice_email, created_at)
SELECT c.id, 'client', 'Demo Klant', 'klant@example.invalid', NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM counterparties cp WHERE cp.company_id = c.id AND cp.type = 'client' AND cp.legal_name = 'Demo Klant');

-- assignments (use assignment_name)
INSERT INTO assignments (company_id, employee_id, client_id, assignment_name, invoice_project_name, hourly_rate, vat_percentage, start_date, active, created_at)
SELECT c.id, e.id, (SELECT cp.id FROM counterparties cp WHERE cp.company_id = c.id AND cp.type = 'client' LIMIT 1), 'Project Alpha', 'Project Alpha', 50.00, 21.00, CURDATE(), 1, NOW()
FROM companies c
JOIN employees e ON e.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.company_id = c.id AND a.assignment_name = 'Project Alpha')
LIMIT 1;

INSERT INTO assignments (company_id, employee_id, client_id, assignment_name, invoice_project_name, hourly_rate, vat_percentage, start_date, active, created_at)
SELECT c.id, e.id, (SELECT cp.id FROM counterparties cp WHERE cp.company_id = c.id AND cp.type = 'client' LIMIT 1), 'Backoffice Support', 'Backoffice', 0.00, 0.00, CURDATE(), 1, NOW()
FROM companies c
JOIN employees e ON e.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.company_id = c.id AND a.assignment_name = 'Backoffice Support')
LIMIT 1;

-- timesheets: create per employee/per period with statuses reflecting demo state
-- June 2026: completed => 'approved'
INSERT INTO timesheets (period_id, employee_id, assignment_id, contractual_hours, billable_hours, status, created_at)
SELECT p.id, e.id, (SELECT a.id FROM assignments a WHERE a.company_id = c.id LIMIT 1), 160.00, 160.00, 'approved', NOW()
FROM companies c
JOIN periods p ON p.company_id = c.id AND p.year = 2026 AND p.month = 6
JOIN employees e ON e.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM timesheets t WHERE t.period_id = p.id AND t.employee_id = e.id)
LIMIT 3;

-- July 2026: insert up to 3 approved timesheets
INSERT INTO timesheets (period_id, employee_id, assignment_id, contractual_hours, billable_hours, status, created_at)
SELECT p.id, e.id, (SELECT a.id FROM assignments a WHERE a.company_id = c.id LIMIT 1), 160.00, 160.00, 'approved', NOW()
FROM companies c
JOIN periods p ON p.company_id = c.id AND p.year = 2026 AND p.month = 7
JOIN employees e ON e.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM timesheets t WHERE t.period_id = p.id AND t.employee_id = e.id)
ORDER BY e.id
LIMIT 3;

-- July 2026: insert 1 submitted timesheet (next employee without timesheet)
INSERT INTO timesheets (period_id, employee_id, assignment_id, contractual_hours, billable_hours, status, created_at)
SELECT p.id, e.id, (SELECT a.id FROM assignments a WHERE a.company_id = c.id LIMIT 1), 160.00, 0.00, 'submitted', NOW()
FROM companies c
JOIN periods p ON p.company_id = c.id AND p.year = 2026 AND p.month = 7
JOIN employees e ON e.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM timesheets t WHERE t.period_id = p.id AND t.employee_id = e.id)
ORDER BY e.id
LIMIT 1;

-- August 2026: insert 2 correction timesheets
INSERT INTO timesheets (period_id, employee_id, assignment_id, contractual_hours, billable_hours, status, created_at)
SELECT p.id, e.id, (SELECT a.id FROM assignments a WHERE a.company_id = c.id LIMIT 1), 160.00, 0.00, 'correction', NOW()
FROM companies c
JOIN periods p ON p.company_id = c.id AND p.year = 2026 AND p.month = 8
JOIN employees e ON e.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM timesheets t WHERE t.period_id = p.id AND t.employee_id = e.id)
ORDER BY e.id
LIMIT 2;

-- August 2026: insert 2 submitted timesheets
INSERT INTO timesheets (period_id, employee_id, assignment_id, contractual_hours, billable_hours, status, created_at)
SELECT p.id, e.id, (SELECT a.id FROM assignments a WHERE a.company_id = c.id LIMIT 1), 160.00, 0.00, 'submitted', NOW()
FROM companies c
JOIN periods p ON p.company_id = c.id AND p.year = 2026 AND p.month = 8
JOIN employees e ON e.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM timesheets t WHERE t.period_id = p.id AND t.employee_id = e.id)
ORDER BY e.id
LIMIT 2;

-- ensure mail recipients exist before creating invoices
INSERT INTO mail_recipients (company_id, recipient_key, display_name, email, active, created_at)
SELECT c.id, 'bookkeeper', 'Boekhouding', 'boekhouding@example.invalid', 1, NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM mail_recipients m WHERE m.company_id = c.id AND m.recipient_key = 'bookkeeper');

-- assignment mail routes (ensure recipients exist)
INSERT INTO assignment_mail_routes (assignment_id, mail_recipient_id, enabled, include_invoice_pdf)
SELECT a.id, mr.id, 1, 1
FROM assignments a
JOIN companies c ON c.id = a.company_id
JOIN mail_recipients mr ON mr.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND mr.recipient_key = 'bookkeeper' AND NOT EXISTS (SELECT 1 FROM assignment_mail_routes am WHERE am.assignment_id = a.id AND am.mail_recipient_id = mr.id)
LIMIT 5;

-- invoices for approved timesheets
INSERT INTO invoices (company_id, timesheet_id, invoice_number, invoice_date, due_date, recipient_id, subtotal, vat_percentage, vat_amount, total, status, created_by, created_at)
SELECT
	c.id,
	t.id,
	CONCAT('INV-', LPAD(t.id,6,'0')),
	CURDATE(),
	DATE_ADD(CURDATE(), INTERVAL COALESCE(c.payment_term_days,30) DAY),
	(SELECT cp.id FROM counterparties cp WHERE cp.company_id = c.id AND cp.type = 'client' LIMIT 1),
	(t.billable_hours * 50.00) as subtotal,
	21.00 as vat_percentage,
	(t.billable_hours * 50.00) * 0.21 as vat_amount,
	(t.billable_hours * 50.00) * 1.21 as total,
	'sent',
	(SELECT u.id FROM users u WHERE u.company_id = c.id AND u.email = 'backoffice1@example.invalid' LIMIT 1),
	NOW()
FROM companies c
JOIN timesheets t ON t.period_id IN (SELECT id FROM periods WHERE company_id = c.id) AND t.status = 'approved'
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.timesheet_id = t.id)
LIMIT 10;

-- mail recipients (adapted to recipient_key/display_name schema)
INSERT INTO mail_recipients (company_id, recipient_key, display_name, email, active, created_at)
SELECT c.id, 'bookkeeper', 'Boekhouding', 'boekhouding@example.invalid', 1, NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM mail_recipients m WHERE m.company_id = c.id AND m.recipient_key = 'bookkeeper');

-- assignment mail routes
INSERT INTO assignment_mail_routes (assignment_id, mail_recipient_id, enabled, include_invoice_pdf)
SELECT a.id, mr.id, 1, 1
FROM assignments a
JOIN companies c ON c.id = a.company_id
JOIN mail_recipients mr ON mr.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND mr.recipient_key = 'bookkeeper' AND NOT EXISTS (SELECT 1 FROM assignment_mail_routes am WHERE am.assignment_id = a.id AND am.mail_recipient_id = mr.id)
LIMIT 5;

-- announcements and recipients
INSERT INTO announcements (company_id, title, message, status, created_by, audience_label, email_requested, created_at)
SELECT c.id, 'Welkom Demo', 'Dit is een veilige demo-aankondiging.', 'sent', (SELECT u.id FROM users u WHERE u.company_id = c.id AND u.email = 'admin@example.invalid' LIMIT 1), 'all', 0, NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM announcements an WHERE an.company_id = c.id AND an.title = 'Welkom Demo');


INSERT INTO notifications (company_id, user_id, notification_type, title, message, target_route, created_at)
SELECT c.id, (SELECT u.id FROM users u WHERE u.company_id = c.id AND u.email = 'backoffice1@example.invalid' LIMIT 1), 'timesheet_reminder', 'Backoffice taak', 'Controleer facturen', '/inbox', NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND (SELECT COUNT(*) FROM notifications n WHERE n.company_id = c.id AND n.notification_type = 'timesheet_reminder') < 4
LIMIT 4;

INSERT INTO notifications (company_id, user_id, notification_type, title, message, target_route, created_at)
SELECT c.id, COALESCE(e.user_id, (SELECT u.id FROM users u WHERE u.company_id = c.id LIMIT 1)), 'timesheet_submitted', 'Medewerker taak', 'Bekijk uren', '/timesheets', NOW()
FROM companies c
JOIN employees e ON e.company_id = c.id
WHERE c.legal_name = 'Demo BV' AND (SELECT COUNT(*) FROM notifications n WHERE n.company_id = c.id AND n.notification_type = 'timesheet_submitted') < 3
LIMIT 3;

-- audit_log marker
INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data, created_at)
SELECT c.id, (SELECT u.id FROM users u WHERE u.company_id = c.id AND u.email = 'admin@example.invalid' LIMIT 1), 'demo_seed', 'seed', '0', JSON_OBJECT('applied_at', NOW()), NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV' AND NOT EXISTS (SELECT 1 FROM audit_log al WHERE al.company_id = c.id AND al.event_type = 'demo_seed');

COMMIT;

-- End of demo seed
