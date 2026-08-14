-- Marks deliberately triggered acceptance messages without changing the
-- existing business channel contract. Safe on upgraded and fresh databases.
SET @has_acceptance_test := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'email_deliveries'
    AND COLUMN_NAME = 'acceptance_test'
);
SET @sql_acceptance_test := IF(@has_acceptance_test = 0,
  'ALTER TABLE email_deliveries ADD COLUMN acceptance_test TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 AFTER dry_run',
  'DO 1');
PREPARE s FROM @sql_acceptance_test; EXECUTE s; DEALLOCATE PREPARE s;
