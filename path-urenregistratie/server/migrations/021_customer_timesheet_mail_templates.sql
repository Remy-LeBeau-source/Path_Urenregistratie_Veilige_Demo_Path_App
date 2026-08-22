-- The settings screen offers four editable klanturenstaat mail texts, and the
-- form collects them on save, but there were no columns to store them: the texts
-- lived only in the browser of whoever typed them. Pressing F5 lost the change.
ALTER TABLE companies
  ADD COLUMN customer_timesheet_submission_subject VARCHAR(250) NULL AFTER customer_timesheet_overdue_workdays,
  ADD COLUMN customer_timesheet_submission_body    TEXT         NULL AFTER customer_timesheet_submission_subject,
  ADD COLUMN customer_timesheet_broker_subject     VARCHAR(250) NULL AFTER customer_timesheet_submission_body,
  ADD COLUMN customer_timesheet_broker_body        TEXT         NULL AFTER customer_timesheet_broker_subject;
