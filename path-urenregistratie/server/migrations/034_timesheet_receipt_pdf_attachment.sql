-- PDF-bijlage bij de medewerker-ontvangstmail (timesheet_submission_receipt).
-- Twee losse statements: de ENUM-verbreding is altijd veilig om opnieuw te
-- draaien, ADD COLUMN kan op een eerdere deelrun al toegepast zijn -- zie de
-- les uit migratie 030/031 (een gecombineerd statement laat de ENUM-wijziging
-- ten onrechte terugrollen als de kolom al bestaat).
ALTER TABLE email_deliveries
  MODIFY COLUMN attachment_policy ENUM(
    'none', 'invoice', 'customer_timesheet', 'invoice_and_customer_timesheet', 'timesheet_receipt'
  ) NOT NULL DEFAULT 'none';

ALTER TABLE email_deliveries
  ADD COLUMN pdf_storage_key VARCHAR(255) NULL AFTER attachment_policy;
