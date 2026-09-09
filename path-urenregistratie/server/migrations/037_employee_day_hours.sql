-- Optioneel eigen werkpatroon per weekdag per medewerker.
-- NULL blijft de bestaande situatie: contracturen worden gelijk verdeeld
-- over alle werkdagen in de maand (weekuren / 5). Zodra een admin hier een
-- waarde invult (bv. vrijdag = 0), wordt die dag voortaan met dat aantal
-- uren meegeteld in de maandelijkse contracturen-som en als beginwaarde
-- getoond in Mijn uren, in plaats van het gemiddelde.
ALTER TABLE employees
  ADD COLUMN hours_monday DECIMAL(4,2) NULL AFTER weekly_contract_hours,
  ADD COLUMN hours_tuesday DECIMAL(4,2) NULL AFTER hours_monday,
  ADD COLUMN hours_wednesday DECIMAL(4,2) NULL AFTER hours_tuesday,
  ADD COLUMN hours_thursday DECIMAL(4,2) NULL AFTER hours_wednesday,
  ADD COLUMN hours_friday DECIMAL(4,2) NULL AFTER hours_thursday;
