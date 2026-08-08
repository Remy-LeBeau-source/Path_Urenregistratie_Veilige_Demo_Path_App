-- Auth schema uitbreiding (veilige demo)
-- Tijdelijke demo-loginaccounts, vervang in productie met echte IAM/SSO
-- NOOIT plaintext wachtwoorden of productie-wachtwoorden committen in Git

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
  'SELECT 1'
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
  'SELECT 1'
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

-- Zorg dat bestaande demo-admin een tijdelijke hash krijgt.
UPDATE users u
SET u.password_hash = '$2y$12$qVvbQn6GLOj5EDXAmIext.Y5us9ejel4LxvWst/BQOUMyJpjpPaQ2'
WHERE u.email = 'admin@example.invalid' AND (u.password_hash IS NULL OR u.password_hash = '');

-- Voeg een veilige tijdelijke demo-medewerker toe voor loginflow tests.
INSERT INTO users (company_id, email, password_hash, display_name, role, active, created_at)
SELECT c.id, 'employee.demo@example.invalid', '$2y$12$VexlAU0ANf/srY4uy5FhYeAYFNnaEswmf6yrts.SUwfa2P1G5hYxi', 'Demo Medewerker', 'employee', 1, NOW()
FROM companies c
WHERE c.legal_name = 'Demo BV'
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.company_id = c.id AND u.email = 'employee.demo@example.invalid'
  );

-- Houd de tijdelijke demo-medewerker hash bijgewerkt als deze al bestond zonder wachtwoord.
UPDATE users u
SET u.password_hash = '$2y$12$VexlAU0ANf/srY4uy5FhYeAYFNnaEswmf6yrts.SUwfa2P1G5hYxi'
WHERE u.email = 'employee.demo@example.invalid' AND (u.password_hash IS NULL OR u.password_hash = '');
