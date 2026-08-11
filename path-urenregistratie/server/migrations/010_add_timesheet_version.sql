ALTER TABLE timesheets ADD COLUMN `version` INT UNSIGNED NOT NULL DEFAULT 1;
UPDATE timesheets SET `version` = 1 WHERE `version` = 0;
