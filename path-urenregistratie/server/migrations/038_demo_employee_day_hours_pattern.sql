-- Demo-werkpatroon per weekdag toepassen (037_employee_day_hours.sql voegde
-- de kolommen toe, maar zette nog nergens een waarde -- alle medewerkers
-- stonden nog op "gelijk verdeeld"). Op verzoek van de gebruiker: 36 uur is
-- het gangbare contract, verdeeld over 4 dagen van 9 uur met een vaste
-- vrije dag per persoon (niet altijd dezelfde dag), i.p.v. de wiskundig
-- correcte maar onwerkbare 36 / 5 = 7,2 uur/dag bij een gelijke verdeling.
--
-- Stasjo van Bakel: 36 uur, vrijdag vrij -> ma/di/wo/do 9 uur.
-- Shawn-Douglas Nahar: was 40 uur (even verdeeld, 5 keer 8 uur) en wordt
-- 36 uur met maandag vrij -> di/wo/do/vr 9 uur. Marc de Roon en Brian Hek
-- blijven ongewijzigd (resp. 40 en 36 uur, gelijk verdeeld) -- voor hen is
-- geen specifieke vrije dag opgegeven.

START TRANSACTION;

UPDATE employees
SET
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
  hours_monday = 0.00,
  hours_tuesday = 9.00,
  hours_wednesday = 9.00,
  hours_thursday = 9.00,
  hours_friday = 9.00
WHERE company_id = 1
  AND full_name = 'Shawn-Douglas Nahar';

COMMIT;
