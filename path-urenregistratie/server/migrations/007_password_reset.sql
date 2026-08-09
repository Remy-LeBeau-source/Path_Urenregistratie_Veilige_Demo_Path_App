-- Migration 007: password reset tokens + force_password_change flag + rate-limit index.

SET @has_force_pw := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'force_password_change'
);
SET @sql_force_pw := IF(@has_force_pw = 0,
  'ALTER TABLE users ADD COLUMN force_password_change TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 AFTER password_hash',
  'DO 1');
PREPARE s FROM @sql_force_pw; EXECUTE s; DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL COMMENT 'SHA-256 hex of the raw token',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE INDEX uq_prt_token_hash (token_hash),
  INDEX idx_prt_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Speed up rate-limit queries on failed login attempts.
SET @has_rate_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auth_login_audit'
    AND INDEX_NAME = 'idx_auth_login_audit_rate_limit'
);
SET @sql_rate_idx := IF(@has_rate_idx = 0,
  'ALTER TABLE auth_login_audit ADD INDEX idx_auth_login_audit_rate_limit (email, status, created_at)',
  'DO 1');
PREPARE s FROM @sql_rate_idx; EXECUTE s; DEALLOCATE PREPARE s;
