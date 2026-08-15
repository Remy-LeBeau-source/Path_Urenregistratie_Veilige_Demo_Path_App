-- Keep the shared TEST database aligned with the browser demo baseline.
-- The task identities below are the public restore contract: 12 total,
-- 7 actionable for Backoffice and 5 waiting on employees.

START TRANSACTION;

UPDATE timesheets t
JOIN periods p ON p.id = t.period_id
JOIN employees e ON e.id = t.employee_id
SET
  t.status = CASE
    WHEN p.month = 7 AND e.full_name = 'Brian Hek' THEN 'correction'
    WHEN p.month = 8 AND e.full_name IN ('Marc de Roon', 'Brian Hek') THEN 'submitted'
    ELSE t.status
  END,
  t.billable_hours = CASE
    WHEN p.month = 8 AND e.full_name = 'Marc de Roon' THEN 140.00
    ELSE t.billable_hours
  END,
  t.submitted_at = CASE
    WHEN p.month = 8 AND e.full_name IN ('Marc de Roon', 'Brian Hek')
      THEN COALESCE(t.submitted_at, '2026-08-31 16:00:00')
    ELSE t.submitted_at
  END,
  t.approved_at = CASE
    WHEN (p.month = 7 AND e.full_name = 'Brian Hek')
      OR (p.month = 8 AND e.full_name IN ('Marc de Roon', 'Brian Hek')) THEN NULL
    ELSE t.approved_at
  END,
  t.approved_by = CASE
    WHEN (p.month = 7 AND e.full_name = 'Brian Hek')
      OR (p.month = 8 AND e.full_name IN ('Marc de Roon', 'Brian Hek')) THEN NULL
    ELSE t.approved_by
  END,
  t.review_note = CASE
    WHEN p.month = 7 AND e.full_name = 'Brian Hek'
      THEN 'Controleer 22 juli: de uren moeten worden afgestemd met de klantregistratie.'
    WHEN p.month = 8 AND e.full_name IN ('Marc de Roon', 'Brian Hek') THEN NULL
    ELSE t.review_note
  END
WHERE p.company_id = 1
  AND p.year = 2026
  AND (
    (p.month = 7 AND e.full_name = 'Brian Hek')
    OR (p.month = 8 AND e.full_name IN ('Marc de Roon', 'Brian Hek'))
  );

UPDATE customer_timesheets ct
JOIN periods p ON p.id = ct.period_id
JOIN employees e ON e.id = ct.employee_id
SET
  ct.status = CASE
    WHEN p.month = 6 AND e.full_name = 'Marc de Roon' THEN 'received'
    WHEN p.month = 6 AND e.full_name = 'Brian Hek' THEN 'missing'
    WHEN p.month = 7 AND e.full_name = 'Brian Hek' THEN 'sent'
    WHEN p.month = 8 AND e.full_name = 'Marc de Roon' THEN 'received'
    WHEN p.month = 8 AND e.full_name = 'Shawn-Douglas Nahar' THEN 'sent'
    ELSE ct.status
  END,
  ct.storage_key = CASE
    WHEN p.month = 6 AND e.full_name = 'Brian Hek' THEN NULL
    WHEN p.month = 7 AND e.full_name = 'Brian Hek' THEN 'voorbeeld-klanturenstaat.pdf'
    ELSE ct.storage_key
  END,
  ct.original_file_name = CASE
    WHEN p.month = 6 AND e.full_name = 'Brian Hek' THEN NULL
    WHEN p.month = 7 AND e.full_name = 'Brian Hek' THEN 'Klanturenstaat_Brian_Hek_2026-07.pdf'
    ELSE ct.original_file_name
  END,
  ct.stored_file_name = CASE
    WHEN p.month = 6 AND e.full_name = 'Brian Hek' THEN NULL
    WHEN p.month = 7 AND e.full_name = 'Brian Hek' THEN 'Klanturenstaat_Brian_Hek_2026-07.pdf'
    ELSE ct.stored_file_name
  END,
  ct.reviewed_at = CASE
    WHEN (p.month = 6 AND e.full_name IN ('Marc de Roon', 'Brian Hek'))
      OR (p.month = 8 AND e.full_name = 'Marc de Roon') THEN NULL
    WHEN p.month = 7 AND e.full_name = 'Brian Hek' THEN '2026-08-03 09:10:00'
    WHEN p.month = 8 AND e.full_name = 'Shawn-Douglas Nahar' THEN '2026-09-01 09:15:00'
    ELSE ct.reviewed_at
  END,
  ct.reviewed_by = CASE
    WHEN (p.month = 6 AND e.full_name IN ('Marc de Roon', 'Brian Hek'))
      OR (p.month = 8 AND e.full_name = 'Marc de Roon') THEN NULL
    WHEN (p.month = 7 AND e.full_name = 'Brian Hek')
      OR (p.month = 8 AND e.full_name = 'Shawn-Douglas Nahar') THEN 1
    ELSE ct.reviewed_by
  END,
  ct.sent_to_broker_at = CASE
    WHEN (p.month = 6 AND e.full_name IN ('Marc de Roon', 'Brian Hek'))
      OR (p.month = 8 AND e.full_name = 'Marc de Roon') THEN NULL
    WHEN p.month = 7 AND e.full_name = 'Brian Hek' THEN '2026-08-03 10:10:00'
    WHEN p.month = 8 AND e.full_name = 'Shawn-Douglas Nahar' THEN '2026-09-01 10:15:00'
    ELSE ct.sent_to_broker_at
  END
WHERE p.company_id = 1
  AND p.year = 2026
  AND (
    (p.month = 6 AND e.full_name IN ('Marc de Roon', 'Brian Hek'))
    OR (p.month = 7 AND e.full_name = 'Brian Hek')
    OR (p.month = 8 AND e.full_name IN ('Marc de Roon', 'Shawn-Douglas Nahar'))
  );

UPDATE invoices i
JOIN timesheets t ON t.id = i.timesheet_id
JOIN periods p ON p.id = t.period_id
JOIN employees e ON e.id = t.employee_id
SET i.status = 'concept', i.pdf_storage_key = NULL, i.locked_at = NULL, i.sent_at = NULL
WHERE p.company_id = 1
  AND p.year = 2026
  AND (
    (p.month = 7 AND e.full_name = 'Brian Hek')
    OR (p.month = 8 AND e.full_name = 'Brian Hek')
  );

UPDATE invoices i
JOIN timesheets t ON t.id = i.timesheet_id
JOIN periods p ON p.id = t.period_id
JOIN employees e ON e.id = t.employee_id
SET i.status = 'ready', i.locked_at = NULL, i.sent_at = NULL
WHERE p.company_id = 1
  AND p.year = 2026
  AND p.month = 7
  AND e.full_name = 'Marc de Roon';

INSERT INTO timesheet_corrections (timesheet_id, requested_by, correction_message, requested_at)
SELECT t.id, 1,
  'Controleer 22 juli: de uren moeten worden afgestemd met de klantregistratie.',
  '2026-08-05 10:15:00'
FROM timesheets t
JOIN periods p ON p.id = t.period_id
JOIN employees e ON e.id = t.employee_id
WHERE p.company_id = 1 AND p.year = 2026 AND p.month = 7 AND e.full_name = 'Brian Hek'
  AND NOT EXISTS (
    SELECT 1 FROM timesheet_corrections tc
    WHERE tc.timesheet_id = t.id
      AND tc.correction_message = 'Controleer 22 juli: de uren moeten worden afgestemd met de klantregistratie.'
  );

COMMIT;
