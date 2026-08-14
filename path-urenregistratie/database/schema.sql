CREATE DATABASE IF NOT EXISTS path_urenregistratie
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE path_urenregistratie;

CREATE TABLE companies (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(100) NOT NULL UNIQUE,
  legal_name VARCHAR(160) NOT NULL,
  trade_name VARCHAR(160) NOT NULL,
  invoice_name_display ENUM('trade_and_legal', 'legal_only') NOT NULL DEFAULT 'trade_and_legal',
  app_name VARCHAR(120) NOT NULL DEFAULT 'Uren & Facturatie',
  support_name VARCHAR(160) NULL,
  support_email VARCHAR(190) NULL,
  brand_primary CHAR(7) NOT NULL DEFAULT '#0d1b38',
  brand_accent CHAR(7) NOT NULL DEFAULT '#3abd9d',
  brand_logo_key VARCHAR(255) NULL,
  chamber_of_commerce_number VARCHAR(32) NOT NULL,
  vat_number VARCHAR(32) NULL,
  iban VARCHAR(64) NULL,
  address_line VARCHAR(180) NULL,
  postal_code VARCHAR(16) NULL,
  city VARCHAR(100) NULL,
  invoice_phone VARCHAR(40) NULL,
  invoice_email VARCHAR(190) NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'NL',
  invoice_prefix VARCHAR(30) NOT NULL DEFAULT 'PATH',
  payment_term_days SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  customer_timesheet_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  customer_timesheet_reminder_time TIME NOT NULL DEFAULT '15:00:00',
  customer_timesheet_overdue_workdays TINYINT UNSIGNED NOT NULL DEFAULT 2,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  google_subject VARCHAR(255) NULL UNIQUE,
  email VARCHAR(190) NOT NULL UNIQUE,
  display_name VARCHAR(160) NOT NULL,
  role ENUM('employee', 'approver', 'administrator') NOT NULL DEFAULT 'employee',
  profile_photo_key VARCHAR(255) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated_at TIMESTAMP NULL,
  deactivated_by BIGINT UNSIGNED NULL,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_users_deactivated_by FOREIGN KEY (deactivated_by) REFERENCES users(id)
);

CREATE TABLE user_preferences (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  theme ENUM('system', 'light', 'dark') NOT NULL DEFAULT 'system',
  hour_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  status_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  approval_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  invoice_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE employees (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL UNIQUE,
  employee_number VARCHAR(32) NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  job_title VARCHAR(160) NULL,
  employment_type ENUM('fixed', 'midlance_70_30', 'midlance_75_25', 'other') NOT NULL DEFAULT 'fixed',
  weekly_contract_hours DECIMAL(5,2) NOT NULL DEFAULT 36.00,
  employment_start_date DATE NOT NULL,
  employment_end_date DATE NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE counterparties (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  type ENUM('client', 'broker', 'accountant', 'payroll') NOT NULL,
  legal_name VARCHAR(180) NOT NULL,
  trade_name VARCHAR(180) NULL,
  chamber_of_commerce_number VARCHAR(32) NULL,
  vat_number VARCHAR(32) NULL,
  invoice_address_line VARCHAR(180) NULL,
  invoice_postal_code VARCHAR(16) NULL,
  invoice_city VARCHAR(100) NULL,
  invoice_email VARCHAR(190) NULL,
  cc_email VARCHAR(190) NULL,
  reference_required BOOLEAN NOT NULL DEFAULT FALSE,
  default_payment_term_days SMALLINT UNSIGNED NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_counterparties_company FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_counterparties_type (company_id, type, active)
);

CREATE TABLE assignments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  client_id BIGINT UNSIGNED NOT NULL,
  broker_id BIGINT UNSIGNED NULL,
  assignment_name VARCHAR(180) NOT NULL,
  invoice_project_name VARCHAR(180) NULL,
  project_code VARCHAR(80) NULL,
  agreement_number VARCHAR(80) NULL,
  creditor_number VARCHAR(80) NULL,
  contractor_number VARCHAR(80) NULL,
  invoice_number_template VARCHAR(120) NULL,
  purchase_order_number VARCHAR(80) NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  vat_percentage DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  invoice_frequency ENUM('monthly', 'four_weekly') NOT NULL DEFAULT 'monthly',
  requires_timesheet_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  broker_mail_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  broker_invoice_attachment BOOLEAN NOT NULL DEFAULT TRUE,
  bookkeeper_invoice_attachment BOOLEAN NOT NULL DEFAULT TRUE,
  payroll_invoice_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  customer_timesheet_expected BOOLEAN NOT NULL DEFAULT TRUE,
  customer_timesheet_due_workday TINYINT UNSIGNED NOT NULL DEFAULT 5,
  customer_timesheet_broker_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  customer_timesheet_use_broker_email BOOLEAN NOT NULL DEFAULT TRUE,
  customer_timesheet_broker_email VARCHAR(190) NULL,
  invoice_without_customer_timesheet_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_assignments_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_assignments_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_assignments_client FOREIGN KEY (client_id) REFERENCES counterparties(id),
  CONSTRAINT fk_assignments_broker FOREIGN KEY (broker_id) REFERENCES counterparties(id),
  CONSTRAINT chk_customer_timesheet_due_workday CHECK (customer_timesheet_due_workday BETWEEN 1 AND 23),
  INDEX idx_assignments_active (employee_id, start_date, end_date, active)
);

CREATE TABLE mail_recipients (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  recipient_key VARCHAR(80) NULL,
  recipient_category VARCHAR(60) NOT NULL DEFAULT 'other',
  display_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mail_recipients_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT uq_mail_recipient_email UNIQUE (company_id, email),
  CONSTRAINT uq_mail_recipient_key UNIQUE (company_id, recipient_key),
  INDEX idx_mail_recipients_active (company_id, active)
);

CREATE TABLE assignment_mail_routes (
  assignment_id BIGINT UNSIGNED NOT NULL,
  mail_recipient_id BIGINT UNSIGNED NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  include_invoice_pdf BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_id, mail_recipient_id),
  CONSTRAINT fk_assignment_mail_routes_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_mail_routes_recipient FOREIGN KEY (mail_recipient_id) REFERENCES mail_recipients(id),
  INDEX idx_assignment_mail_routes_enabled (mail_recipient_id, enabled)
);

CREATE TABLE periods (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  status ENUM('open', 'review', 'closed') NOT NULL DEFAULT 'open',
  closed_at TIMESTAMP NULL,
  closed_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_periods_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_periods_closed_by FOREIGN KEY (closed_by) REFERENCES users(id),
  CONSTRAINT uq_period UNIQUE (company_id, year, month),
  CONSTRAINT chk_month CHECK (month BETWEEN 1 AND 12)
);

CREATE TABLE timesheets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  period_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  assignment_id BIGINT UNSIGNED NOT NULL,
  contractual_hours DECIMAL(7,2) NOT NULL DEFAULT 0,
  billable_hours DECIMAL(7,2) NOT NULL DEFAULT 0,
  leave_hours DECIMAL(7,2) NOT NULL DEFAULT 0,
  sickness_hours DECIMAL(7,2) NOT NULL DEFAULT 0,
  status ENUM('draft', 'submitted', 'approved', 'correction', 'rejected', 'invoiced') NOT NULL DEFAULT 'draft',
  employee_note TEXT NULL,
  review_note TEXT NULL,
  submitted_at TIMESTAMP NULL,
  approved_at TIMESTAMP NULL,
  approved_by BIGINT UNSIGNED NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_timesheets_period FOREIGN KEY (period_id) REFERENCES periods(id),
  CONSTRAINT fk_timesheets_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_timesheets_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  CONSTRAINT fk_timesheets_approver FOREIGN KEY (approved_by) REFERENCES users(id),
  CONSTRAINT uq_timesheet UNIQUE (period_id, employee_id, assignment_id),
  INDEX idx_timesheet_status (period_id, status)
);

CREATE TABLE time_entries (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  timesheet_id BIGINT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  entry_type ENUM('billable', 'leave', 'sickness', 'training', 'other') NOT NULL DEFAULT 'billable',
  hours DECIMAL(5,2) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_time_entries_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
  CONSTRAINT uq_time_entry UNIQUE (timesheet_id, work_date, entry_type),
  CONSTRAINT chk_entry_hours CHECK (hours >= 0 AND hours <= 24),
  INDEX idx_time_entries_date (work_date)
);

CREATE TABLE timesheet_corrections (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  timesheet_id BIGINT UNSIGNED NOT NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  correction_message TEXT NOT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resubmitted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_corrections_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
  CONSTRAINT fk_corrections_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  INDEX idx_corrections_timesheet (timesheet_id, requested_at)
);

CREATE TABLE customer_timesheets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  period_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  assignment_id BIGINT UNSIGNED NOT NULL,
  status ENUM('missing', 'draft', 'received', 'approved', 'resubmit', 'skipped', 'sent', 'sent_to_broker') NOT NULL DEFAULT 'missing',
  storage_key VARCHAR(255) NULL,
  original_file_name VARCHAR(255) NULL,
  stored_file_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  uploaded_at TIMESTAMP NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  review_note TEXT NULL,
  sent_to_broker_at TIMESTAMP NULL,
  reminder_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_timesheets_period FOREIGN KEY (period_id) REFERENCES periods(id),
  CONSTRAINT fk_customer_timesheets_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_customer_timesheets_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  CONSTRAINT fk_customer_timesheets_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id),
  CONSTRAINT fk_customer_timesheets_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  CONSTRAINT uq_customer_timesheet UNIQUE (period_id, employee_id, assignment_id),
  INDEX idx_customer_timesheets_status (period_id, status)
);

CREATE TABLE invoices (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  timesheet_id BIGINT UNSIGNED NOT NULL UNIQUE,
  invoice_number VARCHAR(64) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  recipient_id BIGINT UNSIGNED NOT NULL,
  purchase_order_number VARCHAR(80) NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  vat_percentage DECIMAL(5,2) NOT NULL,
  vat_amount DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  status ENUM('concept', 'ready', 'sent', 'paid', 'cancelled') NOT NULL DEFAULT 'concept',
  pdf_storage_key VARCHAR(255) NULL,
  locked_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  paid_at TIMESTAMP NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_invoices_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id),
  CONSTRAINT fk_invoices_recipient FOREIGN KEY (recipient_id) REFERENCES counterparties(id),
  CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_invoices_status (company_id, status, invoice_date)
);

CREATE TABLE announcements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  correction_of_id BIGINT UNSIGNED NULL,
  superseded_by_id BIGINT UNSIGNED NULL,
  withdrawal_of_id BIGINT UNSIGNED NULL,
  kind ENUM('standard', 'correction', 'withdrawal') NOT NULL DEFAULT 'standard',
  status ENUM('draft', 'sent', 'withdrawn') NOT NULL DEFAULT 'draft',
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  audience_label VARCHAR(255) NOT NULL,
  email_requested BOOLEAN NOT NULL DEFAULT FALSE,
  withdrawal_reason VARCHAR(750) NULL,
  withdrawn_by BIGINT UNSIGNED NULL,
  withdrawn_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_announcements_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_announcements_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_announcements_correction FOREIGN KEY (correction_of_id) REFERENCES announcements(id),
  CONSTRAINT fk_announcements_superseded FOREIGN KEY (superseded_by_id) REFERENCES announcements(id),
  CONSTRAINT fk_announcements_withdrawal FOREIGN KEY (withdrawal_of_id) REFERENCES announcements(id),
  CONSTRAINT fk_announcements_withdrawer FOREIGN KEY (withdrawn_by) REFERENCES users(id),
  INDEX idx_announcements_company (company_id, status, created_at)
);

CREATE TABLE announcement_recipients (
  announcement_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  email_requested BOOLEAN NOT NULL DEFAULT FALSE,
  email_status ENUM('not_requested', 'skipped_preference', 'queued', 'sent', 'failed') NOT NULL DEFAULT 'not_requested',
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id, user_id),
  CONSTRAINT fk_announcement_recipients_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id),
  CONSTRAINT fk_announcement_recipients_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_announcement_recipients_user (user_id, read_at)
);

CREATE TABLE email_deliveries (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  invoice_id BIGINT UNSIGNED NULL,
  timesheet_id BIGINT UNSIGNED NULL,
  customer_timesheet_id BIGINT UNSIGNED NULL,
  announcement_id BIGINT UNSIGNED NULL,
  channel ENUM('broker', 'accountant', 'payroll', 'reminder', 'customer_timesheet', 'announcement', 'password_reset') NOT NULL,
  recipient_email VARCHAR(190) NOT NULL,
  cc_email VARCHAR(190) NULL,
  subject_snapshot VARCHAR(255) NOT NULL,
  body_snapshot TEXT NOT NULL,
  attachment_policy ENUM('none', 'invoice', 'customer_timesheet', 'invoice_and_customer_timesheet') NOT NULL DEFAULT 'none',
  dry_run TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  acceptance_test TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
  gmail_message_id VARCHAR(255) NULL,
  status ENUM('queued', 'processing', 'sent', 'failed') NOT NULL DEFAULT 'queued',
  attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_email_deliveries_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_email_deliveries_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_email_deliveries_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id),
  CONSTRAINT fk_email_deliveries_customer_timesheet FOREIGN KEY (customer_timesheet_id) REFERENCES customer_timesheets(id),
  CONSTRAINT fk_email_deliveries_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id),
  INDEX idx_delivery_queue (status, created_at),
  INDEX idx_delivery_user (user_id, created_at)
);

CREATE TABLE notifications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  period_id BIGINT UNSIGNED NULL,
  announcement_id BIGINT UNSIGNED NULL,
  notification_type ENUM('timesheet_submitted', 'timesheet_reminder', 'correction_required', 'timesheet_approved', 'invoice_ready', 'customer_timesheet_received', 'customer_timesheet_reminder', 'customer_timesheet_approved', 'customer_timesheet_resubmit', 'announcement') NOT NULL,
  title VARCHAR(160) NOT NULL,
  message VARCHAR(500) NOT NULL,
  target_route VARCHAR(100) NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_notifications_period FOREIGN KEY (period_id) REFERENCES periods(id),
  CONSTRAINT fk_notifications_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id),
  INDEX idx_notifications_unread (user_id, read_at, created_at)
);

CREATE TABLE audit_log (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  event_data JSON NULL,
  ip_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
  INDEX idx_audit_entity (entity_type, entity_id, created_at),
  INDEX idx_audit_company_date (company_id, created_at)
);
