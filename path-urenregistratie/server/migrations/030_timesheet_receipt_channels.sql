-- Employee receipt deliveries need their own channel and a version-scoped
-- idempotency key so a correction/resubmission creates a fresh snapshot.
-- The final-approval channel is added at the same time so both employee
-- mail moments share one migration.
--
-- Order matters here: the migration runner executes a file's statements in
-- one pass and stops at the first failure within that pass. It only
-- tolerates a "duplicate column" (1060) error, and then only by marking the
-- *whole migration* done without running any statement after the failing
-- one. So the ENUM widening (always safe to (re)run) goes first, and the
-- ADD COLUMN/INDEX (which can conflict on a re-run after a partial earlier
-- attempt) goes last, where a duplicate-column skip can't hide it.
ALTER TABLE email_deliveries
  MODIFY COLUMN channel ENUM(
    'broker', 'accountant', 'payroll', 'other', 'reminder',
    'customer_timesheet', 'timesheet_submission_receipt', 'timesheet_final_approval',
    'announcement', 'password_reset'
  ) NOT NULL;

ALTER TABLE email_deliveries
  ADD COLUMN timesheet_version INT UNSIGNED NULL AFTER timesheet_id,
  ADD INDEX idx_delivery_timesheet_version (timesheet_id, timesheet_version, channel);
