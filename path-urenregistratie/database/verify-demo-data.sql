USE path_urenregistratie;

SELECT 'companies' AS check_name, COUNT(*) AS value FROM companies;
SELECT 'users' AS check_name, COUNT(*) AS value FROM users;
SELECT 'employees' AS check_name, COUNT(*) AS value FROM employees;
SELECT 'periods' AS check_name, COUNT(*) AS value FROM periods;
SELECT 'timesheets' AS check_name, COUNT(*) AS value FROM timesheets;
SELECT 'customer_timesheets' AS check_name, COUNT(*) AS value FROM customer_timesheets;
SELECT 'invoices' AS check_name, COUNT(*) AS value FROM invoices;

SELECT
  CONCAT(p.year, '-', LPAD(p.month, 2, '0')) AS period_key,
  SUM(CASE WHEN i.status = 'sent' THEN 1 ELSE 0 END) AS gecontroleerd,
  SUM(CASE WHEN i.status = 'ready' THEN 1 ELSE 0 END) AS klaar_voor_controle,
  SUM(CASE WHEN t.status IN ('draft', 'correction', 'submitted') THEN 1 ELSE 0 END) AS uren_blokkades,
  COUNT(*) AS medewerkers
FROM periods p
JOIN timesheets t ON t.period_id = p.id
JOIN invoices i ON i.timesheet_id = t.id
GROUP BY p.year, p.month
ORDER BY p.year, p.month;

SELECT
  'open_werkvoorraad' AS check_name,
  SUM(open_action_count) AS totaal,
  SUM(backoffice_count) AS bij_backoffice,
  SUM(employee_count) AS bij_medewerkers
FROM (
  SELECT
    t.id,
    CASE
      WHEN t.status = 'submitted' THEN 1
      WHEN t.status IN ('draft', 'correction') THEN 1
      ELSE 0
    END +
    CASE
      WHEN ct.status = 'received' THEN 1
      WHEN ct.status = 'approved' AND a.customer_timesheet_broker_enabled = TRUE THEN 1
      WHEN ct.status IN ('missing', 'draft', 'resubmit') THEN 1
      ELSE 0
    END +
    CASE
      WHEN t.status = 'approved' AND i.status <> 'sent' THEN 1
      ELSE 0
    END AS open_action_count,
    CASE
      WHEN t.status = 'submitted' THEN 1
      ELSE 0
    END +
    CASE
      WHEN ct.status = 'received' THEN 1
      WHEN ct.status = 'approved' AND a.customer_timesheet_broker_enabled = TRUE THEN 1
      ELSE 0
    END +
    CASE
      WHEN t.status = 'approved' AND i.status <> 'sent' THEN 1
      ELSE 0
    END AS backoffice_count,
    CASE
      WHEN t.status IN ('draft', 'correction') THEN 1
      ELSE 0
    END +
    CASE
      WHEN ct.status IN ('missing', 'draft', 'resubmit') THEN 1
      ELSE 0
    END AS employee_count
  FROM timesheets t
  JOIN assignments a ON a.id = t.assignment_id
  JOIN customer_timesheets ct ON ct.period_id = t.period_id AND ct.employee_id = t.employee_id AND ct.assignment_id = t.assignment_id
  JOIN invoices i ON i.timesheet_id = t.id
  JOIN periods p ON p.id = t.period_id
  WHERE p.year IN (2026)
    AND p.month IN (7, 8)
) counted;

SELECT
  CONCAT(p.year, '-', LPAD(p.month, 2, '0')) AS period_key,
  e.full_name,
  t.status AS timesheet_status,
  ct.status AS customer_timesheet_status,
  i.status AS invoice_status
FROM timesheets t
JOIN periods p ON p.id = t.period_id
JOIN employees e ON e.id = t.employee_id
JOIN customer_timesheets ct ON ct.period_id = t.period_id AND ct.employee_id = t.employee_id AND ct.assignment_id = t.assignment_id
JOIN invoices i ON i.timesheet_id = t.id
WHERE p.year = 2026 AND p.month IN (7, 8)
ORDER BY p.year, p.month, e.id;
