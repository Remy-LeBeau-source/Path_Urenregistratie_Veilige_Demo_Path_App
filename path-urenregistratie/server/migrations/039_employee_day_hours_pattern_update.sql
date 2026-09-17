-- Echte, blijvende werkpatronen (geen demo-data): Gio gaf op 17 sep door dat
-- deze vier medewerkers allemaal 36 uur werken over vier dagen, niet gelijk
-- verdeeld over vijf. Dit bestand heeft bewust GEEN "_demo_" in de naam: het
-- moet ook op productie de standaard worden zodra deze mensen daar een
-- account hebben (migrate.php slaat elke migratie met "_demo_" in de id
-- onvoorwaardelijk over op production -- deze hoort dat niet te zijn).
--
-- Marc de Roon: ma/di/wo/do 8 uur, vrijdag 4 uur (36 uur, gaf hij zelf door
-- in de Path Testteam-chat).
-- Stasjo van Bakel, Brian Hek, Shawn-Douglas Nahar: ma/di/wo/do 9 uur,
-- vrijdag vrij (36 uur). Voor Stasjo bevestigt dit alleen de al bestaande
-- 038_demo_employee_day_hours_pattern.sql. Brian kreeg tot nu toe geen eigen
-- patroon (36 uur gelijk verdeeld). Shawn stond in 038 nog op maandag vrij --
-- dat is hier gecorrigeerd naar vrijdag vrij, de kloppende afspraak.

START TRANSACTION;

UPDATE employees
SET
  weekly_contract_hours = 36.00,
  hours_monday = 8.00,
  hours_tuesday = 8.00,
  hours_wednesday = 8.00,
  hours_thursday = 8.00,
  hours_friday = 4.00
WHERE company_id = 1
  AND full_name = 'Marc de Roon';

UPDATE employees
SET
  weekly_contract_hours = 36.00,
  hours_monday = 9.00,
  hours_tuesday = 9.00,
  hours_wednesday = 9.00,
  hours_thursday = 9.00,
  hours_friday = 0.00
WHERE company_id = 1
  AND full_name = 'Stasjo van Bakel';

UPDATE employees
SET
  weekly_contract_hours = 36.00,
  hours_monday = 9.00,
  hours_tuesday = 9.00,
  hours_wednesday = 9.00,
  hours_thursday = 9.00,
  hours_friday = 0.00
WHERE company_id = 1
  AND full_name = 'Brian Hek';

UPDATE employees
SET
  weekly_contract_hours = 36.00,
  hours_monday = 9.00,
  hours_tuesday = 9.00,
  hours_wednesday = 9.00,
  hours_thursday = 9.00,
  hours_friday = 0.00
WHERE company_id = 1
  AND full_name = 'Shawn-Douglas Nahar';

COMMIT;
