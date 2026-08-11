-- Align local demo seed baseline with agreed UX expectations.
-- Keeps Stasjo on 3 open actions in demo flow:
-- - June: hours still draft
-- - July: customer-timesheet resubmit
-- - August: correction stays open

START TRANSACTION;

UPDATE timesheets t
JOIN periods p ON p.id = t.period_id
JOIN employees e ON e.id = t.employee_id
SET
  t.status = 'draft',
  t.billable_hours = 0.00,
  t.submitted_at = NULL,
  t.approved_at = NULL,
  t.approved_by = NULL,
  t.review_note = NULL
WHERE p.company_id = 1
  AND p.year = 2026
  AND p.month = 6
  AND e.full_name = 'Stasjo van Bakel';

UPDATE customer_timesheets ct
JOIN periods p ON p.id = ct.period_id
JOIN employees e ON e.id = ct.employee_id
SET
  ct.status = 'resubmit',
  ct.sent_to_broker_at = NULL
WHERE p.company_id = 1
  AND p.year = 2026
  AND p.month = 7
  AND e.full_name = 'Stasjo van Bakel';

COMMIT;
