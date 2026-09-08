-- Serverplanning voor de vier hoofdmenu-herinneringen die al in de
-- instellingen-UI stonden (weekly/month_end/overdue/approval) maar nog nooit
-- in de database bestonden -- ze leefden alleen in de browser (state.settings)
-- en de planner verstuurde nooit iets automatisch.
ALTER TABLE companies
  ADD COLUMN weekly_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN weekly_reminder_day TINYINT UNSIGNED NOT NULL DEFAULT 5,
  ADD COLUMN weekly_reminder_time TIME NOT NULL DEFAULT '15:00:00',
  ADD COLUMN month_end_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN month_end_reminder_time TIME NOT NULL DEFAULT '15:00:00',
  ADD COLUMN overdue_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN overdue_reminder_time TIME NOT NULL DEFAULT '09:00:00',
  ADD COLUMN approval_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN approval_reminder_time TIME NOT NULL DEFAULT '10:00:00';

-- Idempotency: per medewerker/type/periode maximaal één verstuurde herinnering.
-- period_key is bewust een vrije string (ISO-week voor wekelijks, jaar-maand
-- voor maandeinde, jaar-maand+datum voor achterstand zodat die kan herhalen
-- totdat de urenstaat alsnog is ingediend, datum voor de dagelijkse
-- goedkeuringsherinnering aan Backoffice).
CREATE TABLE reminder_log (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  reminder_type ENUM('weekly', 'month_end', 'overdue', 'approval') NOT NULL,
  period_key VARCHAR(32) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reminder_log_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_reminder_log_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT uq_reminder_log UNIQUE (user_id, reminder_type, period_key)
);
