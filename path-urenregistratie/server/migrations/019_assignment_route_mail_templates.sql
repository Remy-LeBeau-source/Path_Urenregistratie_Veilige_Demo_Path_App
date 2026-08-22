-- Per-recipient overrides for the accompanying invoice mail.
-- NULL or empty means: inherit the assignment template, and if that is empty too,
-- the MAIL_CHANNEL_TEMPLATES default for that channel. Inheriting rather than
-- copying keeps one edit reaching every recipient that has no deliberate exception.
ALTER TABLE assignment_mail_routes
  ADD COLUMN subject_template VARCHAR(250) NULL AFTER include_invoice_pdf,
  ADD COLUMN body_template    TEXT         NULL AFTER subject_template;
