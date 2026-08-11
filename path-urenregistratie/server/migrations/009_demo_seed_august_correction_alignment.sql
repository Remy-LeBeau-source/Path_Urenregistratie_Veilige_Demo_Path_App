-- Keep local demo baseline deterministic after interactive testing.
-- Stasjo August stays a correction month in baseline data.

START TRANSACTION;

UPDATE timesheets t
JOIN periods p ON p.id = t.period_id
JOIN employees e ON e.id = t.employee_id
SET
  t.status = 'correction',
  t.review_note = 'Controleer 12 augustus: daar staat 8 uur, maar volgens de planning hoort dit 4 uur te zijn.',
  t.submitted_at = COALESCE(t.submitted_at, '2026-08-05 09:30:00'),
  t.approved_at = NULL,
  t.approved_by = NULL
WHERE p.company_id = 1
  AND p.year = 2026
  AND p.month = 8
  AND e.full_name = 'Stasjo van Bakel';

COMMIT;
