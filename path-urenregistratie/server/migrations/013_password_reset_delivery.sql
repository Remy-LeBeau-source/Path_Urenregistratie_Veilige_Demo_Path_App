-- Security mail can be queued independently from an invoice. Every operation
-- is safe on both an upgraded database and a fresh canonical schema.
SET @has_delivery_user := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_deliveries' AND COLUMN_NAME = 'user_id'
);
SET @sql_delivery_user := IF(@has_delivery_user = 0,
  'ALTER TABLE email_deliveries ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id',
  'DO 1');
PREPARE s FROM @sql_delivery_user; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_delivery_user_fk := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'email_deliveries'
    AND CONSTRAINT_NAME = 'fk_email_deliveries_user'
);
SET @sql_delivery_user_fk := IF(@has_delivery_user_fk = 0,
  'ALTER TABLE email_deliveries ADD CONSTRAINT fk_email_deliveries_user FOREIGN KEY (user_id) REFERENCES users(id)',
  'DO 1');
PREPARE s FROM @sql_delivery_user_fk; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_delivery_user_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_deliveries' AND INDEX_NAME = 'idx_delivery_user'
);
SET @sql_delivery_user_idx := IF(@has_delivery_user_idx = 0,
  'ALTER TABLE email_deliveries ADD INDEX idx_delivery_user (user_id, created_at)',
  'DO 1');
PREPARE s FROM @sql_delivery_user_idx; EXECUTE s; DEALLOCATE PREPARE s;

ALTER TABLE email_deliveries
    MODIFY COLUMN channel
        ENUM('broker', 'accountant', 'payroll', 'other', 'reminder', 'customer_timesheet', 'announcement', 'password_reset')
        NOT NULL;
