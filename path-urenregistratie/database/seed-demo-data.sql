USE path_urenregistratie;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_log;
TRUNCATE TABLE notifications;
TRUNCATE TABLE email_deliveries;
TRUNCATE TABLE announcement_recipients;
TRUNCATE TABLE announcements;
TRUNCATE TABLE invoices;
TRUNCATE TABLE customer_timesheets;
TRUNCATE TABLE timesheet_corrections;
TRUNCATE TABLE time_entries;
TRUNCATE TABLE timesheets;
TRUNCATE TABLE periods;
TRUNCATE TABLE assignment_mail_routes;
TRUNCATE TABLE mail_recipients;
TRUNCATE TABLE assignments;
TRUNCATE TABLE counterparties;
TRUNCATE TABLE employees;
TRUNCATE TABLE user_preferences;
TRUNCATE TABLE users;
TRUNCATE TABLE companies;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO companies (
  id, slug, legal_name, trade_name, app_name, support_name, support_email,
  brand_primary, brand_accent, chamber_of_commerce_number, vat_number, iban,
  address_line, postal_code, city, country_code, invoice_prefix, payment_term_days,
  customer_timesheet_reminder_enabled, customer_timesheet_reminder_time,
  customer_timesheet_overdue_workdays
) VALUES (
  1, 'path-consultancy', 'QSI Consultancy', 'Path Consultancy', 'Uren & Facturatie',
  'Path Backoffice', 'backoffice@pathconsultancy.nl',
  '#0d1b38', '#3abd9d', '89320018', 'NL001622017B32', 'NL95INGB0006947972',
  'Du Perronstraat 12', '3067 HN', 'Rotterdam', 'NL', 'QSI', 30,
  TRUE, '15:00:00', 2
);

INSERT INTO users (id, company_id, email, display_name, role, active) VALUES
  (1, 1, 'gio@example.invalid', 'Gio Maatsen', 'administrator', TRUE),
  (2, 1, 'joyce@example.invalid', 'Joyce van der Steenhoven', 'administrator', TRUE),
  (3, 1, 'marc@example.invalid', 'Marc de Roon', 'employee', TRUE),
  (4, 1, 'stasjo@example.invalid', 'Stasjo van Bakel', 'employee', TRUE),
  (5, 1, 'brian@example.invalid', 'Brian Hek', 'employee', TRUE),
  (6, 1, 'shawn@example.invalid', 'Shawn-Douglas Nahar', 'employee', TRUE);

INSERT INTO user_preferences (
  user_id, theme, hour_reminders, status_notifications, approval_notifications,
  invoice_notifications, email_notifications
) VALUES
  (1, 'light', TRUE, TRUE, TRUE, TRUE, TRUE),
  (2, 'light', TRUE, TRUE, TRUE, TRUE, TRUE),
  (3, 'light', TRUE, TRUE, TRUE, TRUE, TRUE),
  (4, 'light', TRUE, TRUE, TRUE, TRUE, TRUE),
  (5, 'light', TRUE, TRUE, TRUE, TRUE, TRUE),
  (6, 'light', TRUE, TRUE, TRUE, TRUE, TRUE);

INSERT INTO employees (
  id, company_id, user_id, employee_number, full_name, job_title,
  employment_type, weekly_contract_hours, employment_start_date, active
) VALUES
  (1, 1, 3, 'EMP-001', 'Marc de Roon', 'Testconsultant', 'midlance_70_30', 40.00, '2026-01-01', TRUE),
  (2, 1, 4, 'EMP-002', 'Stasjo van Bakel', 'Test Engineer', 'fixed', 36.00, '2026-01-01', TRUE),
  (3, 1, 5, 'EMP-003', 'Brian Hek', 'Test Engineer', 'fixed', 36.00, '2026-01-01', TRUE),
  (4, 1, 6, 'EMP-004', 'Shawn-Douglas Nahar', 'Test Automation Engineer', 'midlance_75_25', 40.00, '2026-07-01', TRUE);

INSERT INTO counterparties (
  id, company_id, type, legal_name, trade_name, invoice_address_line,
  invoice_postal_code, invoice_city, invoice_email, reference_required, active
) VALUES
  (1, 1, 'client', 'IND', 'IND', NULL, NULL, NULL, NULL, FALSE, TRUE),
  (2, 1, 'client', 'COA', 'COA', NULL, NULL, NULL, NULL, FALSE, TRUE),
  (3, 1, 'client', 'Belastingdienst', 'Belastingdienst', NULL, NULL, NULL, NULL, FALSE, TRUE),
  (10, 1, 'broker', 'ItaQ Consultancy', 'Itaq', 'Laan van ZuidHoorn 165', '2289 DD', 'Rijswijk', 'facturen-itaq@example.invalid', FALSE, TRUE),
  (11, 1, 'broker', 'Circle8', 'circle8', 'Plettenburg-West, Fultonbaan 6', '3439 NE', 'Nieuwegein', 'facturen-circle8@example.invalid', TRUE, TRUE),
  (20, 1, 'accountant', 'Boekhouder', 'Boekhouder', NULL, NULL, NULL, 'boekhouder@example.invalid', FALSE, TRUE),
  (21, 1, 'payroll', 'Salarisadministratie (EasySalary)', 'EasySalary', NULL, NULL, NULL, 'salaris@example.invalid', FALSE, TRUE);

INSERT INTO assignments (
  id, company_id, employee_id, client_id, broker_id, assignment_name,
  invoice_project_name, project_code, agreement_number, creditor_number,
  contractor_number, invoice_number_template, hourly_rate, vat_percentage,
  start_date, invoice_frequency, broker_mail_enabled, broker_invoice_attachment,
  bookkeeper_invoice_attachment, payroll_invoice_attachment,
  customer_timesheet_expected, customer_timesheet_due_workday,
  customer_timesheet_broker_enabled, customer_timesheet_use_broker_email,
  customer_timesheet_broker_email, invoice_without_customer_timesheet_allowed, active
) VALUES
  (1, 1, 1, 1, 10, 'IND', 'IND', 'IND', NULL, NULL, NULL, 'IND-{jaar}-{maand}', 85.00, 21.00, '2026-01-01', 'monthly', TRUE, TRUE, TRUE, FALSE, TRUE, 5, TRUE, TRUE, 'facturen-itaq@example.invalid', TRUE, TRUE),
  (2, 1, 2, 1, 10, 'IND', 'IND', 'IND-TST-2026', NULL, NULL, NULL, 'IND-StvB-{jaar}-{maand}', 80.00, 21.00, '2026-01-01', 'monthly', TRUE, TRUE, TRUE, FALSE, TRUE, 7, TRUE, FALSE, 'urenstaten-itaq@example.invalid', TRUE, TRUE),
  (3, 1, 3, 2, 10, 'COA', 'COA', 'COA', NULL, NULL, NULL, 'COA-{jaar}-{maand}', 72.50, 21.00, '2026-01-01', 'monthly', TRUE, TRUE, TRUE, FALSE, TRUE, 5, TRUE, TRUE, 'facturen-itaq@example.invalid', TRUE, TRUE),
  (4, 1, 4, 3, 11, 'Belastingdienst', 'belastingdienst', '202636991', '202636991', '622085', '217744', 'Bel-Shawn-{jaar}-{maand}', 85.50, 21.00, '2026-07-01', 'monthly', TRUE, TRUE, TRUE, FALSE, TRUE, 10, TRUE, FALSE, 'urenstaten-circle8@example.invalid', TRUE, TRUE);

INSERT INTO mail_recipients (id, company_id, recipient_key, recipient_category, display_name, email, active) VALUES
  (1, 1, 'bookkeeper', 'accounting', 'Boekhouder', 'boekhouder@example.invalid', TRUE),
  (2, 1, 'payroll', 'payroll', 'Salarisadministratie (EasySalary)', 'salaris@example.invalid', TRUE);

INSERT INTO assignment_mail_routes (assignment_id, mail_recipient_id, enabled, include_invoice_pdf) VALUES
  (1, 1, TRUE, TRUE), (1, 2, TRUE, FALSE),
  (2, 1, TRUE, TRUE), (2, 2, TRUE, FALSE),
  (3, 1, TRUE, TRUE), (3, 2, TRUE, FALSE),
  (4, 1, TRUE, TRUE), (4, 2, TRUE, FALSE);

INSERT INTO periods (id, company_id, year, month, status, closed_at, closed_by) VALUES
  (1, 1, 2026, 6, 'closed', '2026-07-03 16:00:00', 1),
  (2, 1, 2026, 7, 'review', NULL, NULL),
  (3, 1, 2026, 8, 'open', NULL, NULL);

INSERT INTO timesheets (
  id, period_id, employee_id, assignment_id, contractual_hours, billable_hours,
  leave_hours, sickness_hours, status, submitted_at, approved_at, approved_by, review_note
) VALUES
  (1, 1, 1, 1, 144.00, 144.00, 0.00, 0.00, 'approved', '2026-06-30 16:00:00', '2026-07-01 10:00:00', 1, NULL),
  (2, 1, 2, 2, 144.00, 144.00, 0.00, 0.00, 'approved', '2026-06-30 16:05:00', '2026-07-01 10:02:00', 1, NULL),
  (3, 1, 3, 3, 144.00, 136.00, 0.00, 0.00, 'approved', '2026-06-30 16:10:00', '2026-07-01 10:04:00', 1, NULL),
  (4, 1, 4, 4, 144.00, 144.00, 0.00, 0.00, 'approved', '2026-06-30 16:15:00', '2026-07-01 10:06:00', 1, NULL),
  (5, 2, 1, 1, 164.00, 164.00, 0.00, 0.00, 'approved', '2026-07-31 16:00:00', '2026-08-03 10:00:00', 1, NULL),
  (6, 2, 2, 2, 153.00, 153.00, 0.00, 0.00, 'approved', '2026-07-31 16:05:00', '2026-08-03 10:02:00', 1, NULL),
  (7, 2, 3, 3, 117.00, 117.00, 0.00, 0.00, 'approved', '2026-07-31 16:10:00', '2026-08-03 10:04:00', 1, NULL),
  (8, 2, 4, 4, 144.00, 144.00, 0.00, 0.00, 'approved', '2026-07-31 16:15:00', '2026-08-03 10:06:00', 1, NULL),
  (9, 3, 1, 1, 151.20, 0.00, 0.00, 0.00, 'draft', NULL, NULL, NULL, NULL),
  (10, 3, 2, 2, 151.20, 80.00, 0.00, 0.00, 'correction', '2026-08-05 09:30:00', NULL, NULL, 'Controleer 12 augustus: daar staat 8 uur, maar volgens de planning hoort dit 4 uur te zijn.'),
  (11, 3, 3, 3, 151.20, 144.00, 0.00, 0.00, 'approved', '2026-08-31 16:00:00', '2026-09-01 10:00:00', 1, NULL),
  (12, 3, 4, 4, 151.20, 144.00, 0.00, 0.00, 'approved', '2026-08-31 16:10:00', '2026-09-01 10:05:00', 1, NULL);

INSERT INTO time_entries (timesheet_id, work_date, entry_type, hours, description) VALUES
  (1, '2026-06-30', 'billable', 8.00, 'Demo dagentry'),
  (2, '2026-06-30', 'billable', 8.00, 'Demo dagentry'),
  (3, '2026-06-30', 'billable', 8.00, 'Demo dagentry'),
  (4, '2026-06-30', 'billable', 8.00, 'Demo dagentry'),
  (5, '2026-07-31', 'billable', 8.00, 'Demo dagentry'),
  (6, '2026-07-31', 'billable', 8.00, 'Demo dagentry'),
  (7, '2026-07-31', 'billable', 8.00, 'Demo dagentry'),
  (8, '2026-07-31', 'billable', 8.00, 'Demo dagentry'),
  (10, '2026-08-12', 'billable', 4.00, 'Demo dagentry met correctieverzoek'),
  (11, '2026-08-31', 'billable', 8.00, 'Demo dagentry'),
  (12, '2026-08-31', 'billable', 8.00, 'Demo dagentry');

INSERT INTO timesheet_corrections (id, timesheet_id, requested_by, correction_message, requested_at) VALUES
  (1, 10, 1, 'Controleer 12 augustus: daar staat 8 uur, maar volgens de planning hoort dit 4 uur te zijn.', '2026-08-05 10:15:00');

INSERT INTO customer_timesheets (
  id, period_id, employee_id, assignment_id, status, storage_key,
  original_file_name, stored_file_name, mime_type, uploaded_at, uploaded_by,
  reviewed_at, reviewed_by, sent_to_broker_at, reminder_count, last_reminder_at
) VALUES
  (1, 1, 1, 1, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Marc_de_Roon_2026-06.pdf', 'Klanturenstaat_Marc_de_Roon_2026-06.pdf', 'application/pdf', '2026-07-01 08:30:00', 3, '2026-07-01 09:00:00', 1, '2026-07-01 10:00:00', 0, NULL),
  (2, 1, 2, 2, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Stasjo_van_Bakel_2026-06.pdf', 'Klanturenstaat_Stasjo_van_Bakel_2026-06.pdf', 'application/pdf', '2026-07-01 08:35:00', 4, '2026-07-01 09:05:00', 1, '2026-07-01 10:05:00', 0, NULL),
  (3, 1, 3, 3, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Brian_Hek_2026-06.pdf', 'Klanturenstaat_Brian_Hek_2026-06.pdf', 'application/pdf', '2026-07-01 08:40:00', 5, '2026-07-01 09:10:00', 1, '2026-07-01 10:10:00', 0, NULL),
  (4, 1, 4, 4, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Shawn-Douglas_Nahar_2026-06.pdf', 'Klanturenstaat_Shawn-Douglas_Nahar_2026-06.pdf', 'application/pdf', '2026-07-01 08:45:00', 6, '2026-07-01 09:15:00', 1, '2026-07-01 10:15:00', 0, NULL),
  (5, 2, 1, 1, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Marc_de_Roon_2026-07.pdf', 'Klanturenstaat_Marc_de_Roon_2026-07.pdf', 'application/pdf', '2026-08-03 08:30:00', 3, '2026-08-03 09:00:00', 1, '2026-08-03 10:00:00', 0, NULL),
  (6, 2, 2, 2, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Stasjo_van_Bakel_2026-07.pdf', 'Klanturenstaat_Stasjo_van_Bakel_2026-07.pdf', 'application/pdf', '2026-08-03 08:35:00', 4, '2026-08-03 09:05:00', 1, '2026-08-03 10:05:00', 0, NULL),
  (7, 2, 3, 3, 'missing', NULL, NULL, NULL, 'application/pdf', NULL, NULL, NULL, NULL, NULL, 1, '2026-08-06 15:00:00'),
  (8, 2, 4, 4, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Shawn-Douglas_Nahar_2026-07.pdf', 'Klanturenstaat_Shawn-Douglas_Nahar_2026-07.pdf', 'application/pdf', '2026-08-03 08:45:00', 6, '2026-08-03 09:15:00', 1, '2026-08-03 10:15:00', 0, NULL),
  (9, 3, 1, 1, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Marc_de_Roon_2026-08.pdf', 'Klanturenstaat_Marc_de_Roon_2026-08.pdf', 'application/pdf', '2026-09-01 08:30:00', 3, '2026-09-01 09:00:00', 1, '2026-09-01 10:00:00', 0, NULL),
  (10, 3, 2, 2, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Stasjo_van_Bakel_2026-08.pdf', 'Klanturenstaat_Stasjo_van_Bakel_2026-08.pdf', 'application/pdf', '2026-09-01 08:35:00', 4, '2026-09-01 09:05:00', 1, '2026-09-01 10:05:00', 0, NULL),
  (11, 3, 3, 3, 'sent', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Brian_Hek_2026-08.pdf', 'Klanturenstaat_Brian_Hek_2026-08.pdf', 'application/pdf', '2026-09-01 08:40:00', 5, '2026-09-01 09:10:00', 1, '2026-09-01 10:10:00', 0, NULL),
  (12, 3, 4, 4, 'received', 'voorbeeld-klanturenstaat.pdf', 'Klanturenstaat_Shawn-Douglas_Nahar_2026-08.pdf', 'Klanturenstaat_Shawn-Douglas_Nahar_2026-08.pdf', 'application/pdf', '2026-09-01 08:45:00', 6, NULL, NULL, NULL, 0, NULL);

INSERT INTO invoices (
  id, company_id, timesheet_id, invoice_number, invoice_date, due_date,
  recipient_id, subtotal, vat_percentage, vat_amount, total, status,
  pdf_storage_key, locked_at, sent_at, created_by
) VALUES
  (1, 1, 1, 'IND-2026-juni', '2026-07-01', '2026-07-31', 10, 12240.00, 21.00, 2570.40, 14810.40, 'sent', 'invoices/IND-2026-juni.pdf', '2026-07-01 10:00:00', '2026-07-01 10:10:00', 1),
  (2, 1, 2, 'IND-StvB-2026-juni', '2026-07-01', '2026-07-31', 10, 11520.00, 21.00, 2419.20, 13939.20, 'sent', 'invoices/IND-StvB-2026-juni.pdf', '2026-07-01 10:05:00', '2026-07-01 10:15:00', 1),
  (3, 1, 3, 'COA-2026-juni', '2026-07-01', '2026-07-31', 10, 9860.00, 21.00, 2070.60, 11930.60, 'sent', 'invoices/COA-2026-juni.pdf', '2026-07-01 10:10:00', '2026-07-01 10:20:00', 1),
  (4, 1, 4, 'Bel-Shawn-2026-juni', '2026-07-01', '2026-07-31', 11, 12312.00, 21.00, 2585.52, 14897.52, 'sent', 'invoices/Bel-Shawn-2026-juni.pdf', '2026-07-01 10:15:00', '2026-07-01 10:25:00', 1),
  (5, 1, 5, 'IND-2026-juli', '2026-08-01', '2026-08-31', 10, 13940.00, 21.00, 2927.40, 16867.40, 'sent', 'invoices/IND-2026-juli.pdf', '2026-08-03 10:00:00', '2026-08-03 10:10:00', 1),
  (6, 1, 6, 'IND-StvB-2026-juli', '2026-08-01', '2026-08-31', 10, 12240.00, 21.00, 2570.40, 14810.40, 'sent', 'invoices/IND-StvB-2026-juli.pdf', '2026-08-03 10:05:00', '2026-08-03 10:15:00', 1),
  (7, 1, 7, 'COA-2026-juli', '2026-08-01', '2026-08-31', 10, 8482.50, 21.00, 1781.33, 10263.83, 'sent', 'invoices/COA-2026-juli.pdf', '2026-08-03 10:10:00', '2026-08-03 10:20:00', 1),
  (8, 1, 8, 'Bel-Shawn-2026-juli', '2026-08-01', '2026-08-31', 11, 12312.00, 21.00, 2585.52, 14897.52, 'ready', 'invoices/Bel-Shawn-2026-juli.pdf', NULL, NULL, 1),
  (9, 1, 9, 'IND-2026-augustus', '2026-09-01', '2026-10-01', 10, 0.00, 21.00, 0.00, 0.00, 'concept', NULL, NULL, NULL, 1),
  (10, 1, 10, 'IND-StvB-2026-augustus', '2026-09-01', '2026-10-01', 10, 6400.00, 21.00, 1344.00, 7744.00, 'concept', NULL, NULL, NULL, 1),
  (11, 1, 11, 'COA-2026-augustus', '2026-09-01', '2026-10-01', 10, 10440.00, 21.00, 2192.40, 12632.40, 'ready', 'invoices/COA-2026-augustus.pdf', NULL, NULL, 1),
  (12, 1, 12, 'Bel-Shawn-2026-augustus', '2026-09-01', '2026-10-01', 11, 12312.00, 21.00, 2585.52, 14897.52, 'ready', 'invoices/Bel-Shawn-2026-augustus.pdf', NULL, NULL, 1);

INSERT INTO announcements (
  id, company_id, created_by, kind, status, title, message,
  audience_label, email_requested, created_at, updated_at
) VALUES
  (1, 1, 1, 'standard', 'sent', 'Uren juli indienen', 'Dien je uren over juli uiterlijk maandag 3 augustus in. Controleer vóór het indienen of alle werkdagen zijn ingevuld.', 'Alle medewerkers', TRUE, '2026-07-30 10:15:00', '2026-07-30 10:15:00'),
  (2, 1, 2, 'standard', 'draft', 'Reminder klanturenstaten', 'Controleer of je officiële klanturenstaat van de klant al is geüpload.', 'Alle medewerkers', FALSE, '2026-08-06 14:30:00', '2026-08-06 14:30:00');

INSERT INTO announcement_recipients (announcement_id, user_id, email_requested, email_status) VALUES
  (1, 3, TRUE, 'sent'), (1, 4, TRUE, 'sent'), (1, 5, TRUE, 'sent'), (1, 6, TRUE, 'sent'),
  (2, 3, FALSE, 'not_requested'), (2, 4, FALSE, 'not_requested'), (2, 5, FALSE, 'not_requested'), (2, 6, FALSE, 'not_requested');

INSERT INTO notifications (
  id, company_id, user_id, period_id, notification_type, title, message, target_route, read_at, created_at
) VALUES
  (1, 1, 1, 3, 'correction_required', 'Correctie nodig', 'Stasjo moet augustus nog aanpassen.', 'approvals', NULL, '2026-08-05 10:15:00'),
  (2, 1, 1, 3, 'timesheet_submitted', 'Uren ingediend', 'Shawn-Douglas heeft augustus 2026 ingediend.', 'approvals', NULL, '2026-08-07 09:18:00'),
  (3, 1, 1, 2, 'invoice_ready', 'Maandcontrole juli bijna klaar', 'Juli 2026 heeft nog één resterende verzendcontrole, augustus toont de open blokkades.', 'invoices', NULL, '2026-08-07 09:25:00'),
  (4, 1, 4, 3, 'correction_required', 'Correctie gevraagd', 'Controleer 12 augustus en dien de maand daarna opnieuw in.', 'timesheet', NULL, '2026-08-05 10:15:00'),
  (5, 1, 6, 3, 'timesheet_submitted', 'Uren wachten op controle', 'Je uren voor augustus 2026 zijn ingediend.', 'employee-dashboard', NULL, '2026-08-07 09:18:00');

INSERT INTO audit_log (company_id, actor_user_id, event_type, entity_type, entity_id, event_data) VALUES
  (1, 1, 'demo_seed_loaded', 'database', 'path_urenregistratie', JSON_OBJECT('version', '0.9.21', 'note', 'Demo-data sluit aan op de browser-GUI basisstand.'));
