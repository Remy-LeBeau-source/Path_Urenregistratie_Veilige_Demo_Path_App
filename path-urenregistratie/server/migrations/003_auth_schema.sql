-- Auth schema uitbreiding voor alle omgevingen.
-- Deze core-migratie wijzigt uitsluitend het schema. Demo-accounts en
-- tijdelijke hashes horen alleen in de expliciete demo-migraties 004/005.

SET @has_password_hash := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'password_hash'
);

SET @add_password_hash_sql := IF(
  @has_password_hash = 0,
  'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email',
  'DO 1'
);

PREPARE add_password_hash_stmt FROM @add_password_hash_sql;
EXECUTE add_password_hash_stmt;
DEALLOCATE PREPARE add_password_hash_stmt;

SET @has_last_login_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'last_login_at'
);

SET @add_last_login_sql := IF(
  @has_last_login_at = 0,
  'ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL AFTER deactivated_by',
  'DO 1'
);

PREPARE add_last_login_stmt FROM @add_last_login_sql;
EXECUTE add_last_login_stmt;
DEALLOCATE PREPARE add_last_login_stmt;

CREATE TABLE IF NOT EXISTS auth_login_audit (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  email VARCHAR(190) NULL,
  event_type ENUM('login','logout','me') NOT NULL,
  status ENUM('success','failed') NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  message VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_login_audit_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_auth_login_audit_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_auth_login_audit_user_created (user_id, created_at),
  INDEX idx_auth_login_audit_company_created (company_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
