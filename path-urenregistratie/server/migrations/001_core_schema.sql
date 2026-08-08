-- 001_core_schema.sql
-- Core production schema (safe): only CREATE TABLE IF NOT EXISTS, no DROP/TRUNCATE

-- companies
CREATE TABLE IF NOT EXISTS `companies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `country` VARCHAR(2) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- users (admins, backoffice users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) DEFAULT 'user',
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  INDEX(`email`),
  CONSTRAINT `fk_users_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- employees
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `employee_number` VARCHAR(100) DEFAULT NULL,
  `first_name` VARCHAR(191) NOT NULL,
  `last_name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) DEFAULT NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  INDEX(`email`),
  CONSTRAINT `fk_employees_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- periods (year-month keys)
CREATE TABLE IF NOT EXISTS `periods` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `period_key` VARCHAR(7) NOT NULL,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  INDEX(`period_key`),
  CONSTRAINT `fk_periods_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- assignments (employee assignments to customers/projects)
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `name` VARCHAR(191) DEFAULT NULL,
  `billable` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  INDEX(`employee_id`),
  CONSTRAINT `fk_assignments_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignments_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- timesheets (per employee per period)
CREATE TABLE IF NOT EXISTS `timesheets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `period_id` INT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'concept',
  `total_hours` DECIMAL(5,2) DEFAULT 0,
  `invoice_number` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  INDEX(`employee_id`),
  INDEX(`period_id`),
  INDEX(`status`),
  CONSTRAINT `fk_timesheets_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_timesheets_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_timesheets_period` FOREIGN KEY (`period_id`) REFERENCES `periods`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- time_entries (individual day entries)
CREATE TABLE IF NOT EXISTS `time_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `timesheet_id` INT NOT NULL,
  `assignment_id` INT DEFAULT NULL,
  `date` DATE NOT NULL,
  `hours` DECIMAL(4,2) DEFAULT 0,
  `note` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(`timesheet_id`),
  INDEX(`assignment_id`),
  CONSTRAINT `fk_time_entries_timesheet` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheets`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_time_entries_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- timesheet_corrections
CREATE TABLE IF NOT EXISTS `timesheet_corrections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `timesheet_id` INT NOT NULL,
  `requested_by` VARCHAR(191) DEFAULT NULL,
  `message` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(`timesheet_id`),
  CONSTRAINT `fk_timesheet_corrections_timesheet` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- customer_timesheets (uploaded PDFs metadata)
CREATE TABLE IF NOT EXISTS `customer_timesheets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `timesheet_id` INT NOT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `mime_type` VARCHAR(100) DEFAULT 'application/pdf',
  `uploaded_by` VARCHAR(191) DEFAULT NULL,
  `uploaded_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX(`timesheet_id`),
  CONSTRAINT `fk_customer_timesheets_timesheet` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- invoices
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `timesheet_id` INT DEFAULT NULL,
  `number` VARCHAR(100) DEFAULT NULL,
  `amount` DECIMAL(10,2) DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'draft',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  INDEX(`timesheet_id`),
  INDEX(`status`),
  CONSTRAINT `fk_invoices_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoices_timesheet` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheets`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- mail_recipients (bookkeeper, payroll etc.)
CREATE TABLE IF NOT EXISTS `mail_recipients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  CONSTRAINT `fk_mail_recipients_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- assignment_mail_routes (per assignment mail settings)
CREATE TABLE IF NOT EXISTS `assignment_mail_routes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `assignment_id` INT NOT NULL,
  `recipient_id` INT NOT NULL,
  `invoice_attachment` TINYINT(1) DEFAULT 1,
  CONSTRAINT `fk_assignment_mail_routes_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assignment_mail_routes_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `mail_recipients`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- announcements
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'draft',
  `created_by` VARCHAR(191) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  INDEX(`status`),
  CONSTRAINT `fk_announcements_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- announcement_recipients
CREATE TABLE IF NOT EXISTS `announcement_recipients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `announcement_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  CONSTRAINT `fk_announcement_recipients_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_announcement_recipients_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `employee_id` INT DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `view` VARCHAR(100) DEFAULT NULL,
  `read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  INDEX(`employee_id`),
  CONSTRAINT `fk_notifications_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- email_deliveries (queue/history)
CREATE TABLE IF NOT EXISTS `email_deliveries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL,
  `recipient` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(255) DEFAULT NULL,
  `body` MEDIUMTEXT,
  `status` VARCHAR(50) DEFAULT 'queued',
  `attempts` INT DEFAULT 0,
  `last_error` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(`company_id`),
  INDEX(`status`),
  CONSTRAINT `fk_email_deliveries_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- audit_log
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT DEFAULT NULL,
  `entity` VARCHAR(100) DEFAULT NULL,
  `entity_id` INT DEFAULT NULL,
  `action` VARCHAR(100) DEFAULT NULL,
  `data` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
