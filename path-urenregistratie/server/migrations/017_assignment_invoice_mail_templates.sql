-- Per-assignment custom invoice subject and body templates.
-- If NULL the server falls back to MAIL_CHANNEL_TEMPLATES defaults.
ALTER TABLE assignments
  ADD COLUMN invoice_subject_template VARCHAR(250) NULL AFTER invoice_number_template,
  ADD COLUMN invoice_body_template    TEXT         NULL AFTER invoice_subject_template;
