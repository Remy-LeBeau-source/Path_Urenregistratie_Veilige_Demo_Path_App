-- Verlof en ziekte stonden altijd vast uitgeschakeld op de eigen urenstaat:
-- die uren gaan voorlopig via de salarisadministratie, niet via de app. Op
-- verzoek van 5 sep 2026 wordt dit per organisatie omschakelbaar: een
-- beheerder kan bij Instellingen aanzetten dat medewerkers verlof en ziekte
-- zelf invullen.
--
-- Standaard uit (FALSE), zodat het gedrag voor elke bestaande organisatie
-- ongewijzigd blijft totdat een beheerder het bewust aanzet.
--
-- Let op bij het aanvullen van dit commentaar. De migratielezer knipt het
-- bestand op puntkomma's, ook binnen een toelichting, dus die horen hier niet
-- te staan.
ALTER TABLE companies
  ADD COLUMN leave_sick_entry_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER customer_timesheet_overdue_workdays;
