-- CRUD smoke test voor lokale DB-isolatie
-- Doel: expliciet testen van INSERT, SELECT, UPDATE en DELETE zonder demo-data te wijzigen.
-- Gebruik:
--   mysql -u root -p path_urenregistratie < database/queries/crud-smoke.sql

DROP TEMPORARY TABLE IF EXISTS db_crud_smoke;

CREATE TEMPORARY TABLE db_crud_smoke (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1) INSERT
INSERT INTO db_crud_smoke (name) VALUES ('crud-smoke');

-- 2) SELECT
SELECT id, name, created_at FROM db_crud_smoke ORDER BY id DESC LIMIT 1;

-- 3) UPDATE
UPDATE db_crud_smoke
SET name = 'crud-smoke-updated'
WHERE id = LAST_INSERT_ID();

-- 4) SELECT na update
SELECT id, name FROM db_crud_smoke WHERE id = LAST_INSERT_ID();

-- 5) DELETE
DELETE FROM db_crud_smoke WHERE id = LAST_INSERT_ID();

-- 6) SELECT na delete (moet 0 opleveren)
SELECT COUNT(*) AS remaining_rows FROM db_crud_smoke WHERE id = LAST_INSERT_ID();
