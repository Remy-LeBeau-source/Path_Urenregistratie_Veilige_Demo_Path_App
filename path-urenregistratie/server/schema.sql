-- Minimal schema for app state persistence
-- Safe for production: only CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS `app_state` (
  `id` INT NOT NULL PRIMARY KEY,
  `state` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
