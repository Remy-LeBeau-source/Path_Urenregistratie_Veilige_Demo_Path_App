-- health-check.sql
-- Veilige READ-only queries voor lokaal DB-onderhoud en productiecontrole.
-- Bevat GEEN DROP / DELETE / TRUNCATE / UPDATE.

-- ============================================================
-- 1. Tabeloverzicht met record-aantallen
-- ============================================================
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'path_urenregistratie'
ORDER BY table_rows DESC;

-- ============================================================
-- 2. Perioden: échte demo-data vs. CI-testdata
-- ============================================================
SELECT
  CASE
    WHEN year <= 2026 THEN 'Demo/productie (2026 en eerder)'
    WHEN year BETWEEN 2027 AND 2098 THEN 'Toekomstdata (2027-2098)'
    WHEN year BETWEEN 2099 AND 9000 THEN 'CI-testdata (jaar >= 2099)'
    ELSE 'Onbekend'
  END AS categorie,
  COUNT(*) AS perioden
FROM periods
GROUP BY categorie
ORDER BY MIN(year);

-- ============================================================
-- 3. Timesheets per status
-- ============================================================
SELECT status, COUNT(*) AS aantal
FROM timesheets
GROUP BY status
ORDER BY aantal DESC;

-- ============================================================
-- 4. Invoices per status met totaalbedragen
-- ============================================================
SELECT
  status,
  COUNT(*) AS facturen,
  ROUND(SUM(subtotal), 2) AS subtotaal_eur,
  ROUND(SUM(total), 2) AS totaal_eur
FROM invoices
GROUP BY status
ORDER BY facturen DESC;

-- ============================================================
-- 5. Email_deliveries per channel en status
-- ============================================================
SELECT channel, status, COUNT(*) AS aantal
FROM email_deliveries
GROUP BY channel, status
ORDER BY channel, status;

-- ============================================================
-- 6. Users per rol en actief/inactief
-- ============================================================
SELECT role, active, COUNT(*) AS aantal
FROM users
GROUP BY role, active
ORDER BY role, active DESC;

-- ============================================================
-- 7. Audit_log: top 15 event-types
-- ============================================================
SELECT event_type, COUNT(*) AS aantal
FROM audit_log
GROUP BY event_type
ORDER BY aantal DESC
LIMIT 15;

-- ============================================================
-- 8. Orphan-check: timesheets zonder bijbehorende periode
-- ============================================================
SELECT COUNT(*) AS timesheets_zonder_periode
FROM timesheets t
LEFT JOIN periods p ON p.id = t.period_id
WHERE p.id IS NULL;

-- ============================================================
-- 9. Orphan-check: invoices zonder bijbehorende timesheet
-- ============================================================
SELECT COUNT(*) AS invoices_zonder_timesheet
FROM invoices i
LEFT JOIN timesheets t ON t.id = i.timesheet_id
WHERE t.id IS NULL;

-- ============================================================
-- 10. Orphan-check: notifications zonder user
-- ============================================================
SELECT COUNT(*) AS notifications_zonder_user
FROM notifications n
LEFT JOIN users u ON u.id = n.user_id
WHERE u.id IS NULL;

-- ============================================================
-- 11. Companies en aantallen per company
-- ============================================================
SELECT
  c.id,
  c.legal_name,
  COUNT(DISTINCT u.id)  AS users,
  COUNT(DISTINCT e.id)  AS employees,
  COUNT(DISTINCT p.id)  AS periods,
  COUNT(DISTINCT t.id)  AS timesheets,
  COUNT(DISTINCT i.id)  AS invoices
FROM companies c
LEFT JOIN users u ON u.company_id = c.id
LEFT JOIN employees e ON e.company_id = c.id
LEFT JOIN periods p ON p.company_id = c.id
LEFT JOIN timesheets ts ON ts.period_id = p.id
LEFT JOIN timesheets t ON t.employee_id = e.id
LEFT JOIN invoices i ON i.company_id = c.id
GROUP BY c.id, c.legal_name;

-- ============================================================
-- 12. Recente audit_log entries (laatste 20)
-- ============================================================
SELECT id, event_type, entity_type, entity_id, created_at
FROM audit_log
ORDER BY id DESC
LIMIT 20;
