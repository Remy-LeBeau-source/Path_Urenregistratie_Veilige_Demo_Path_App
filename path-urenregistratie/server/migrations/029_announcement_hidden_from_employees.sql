-- "Bij medewerkers verwijderen" beloofde dat het bericht en de intrekking uit
-- de bel en mededelingenlijst van elke ontvanger verdwijnen, terwijl
-- Backoffice het intern blijft zien. De server zette tot nu toe alleen de
-- bijbehorende notificaties op gelezen -- de medewerker zag de mededeling dus
-- gewoon nog gewoon terug in Mijn mededelingen, alleen niet meer als ongelezen.
--
-- Deze kolom laat de server het bericht ook echt uit de eigen lijst van de
-- medewerker filteren. De rij zelf (en daarmee de interne geschiedenis voor
-- Backoffice) blijft gewoon bestaan.
--
-- Let op bij het aanvullen van dit commentaar. De migratielezer knipt het
-- bestand op puntkomma's, ook binnen een toelichting, dus die horen hier niet
-- te staan.
ALTER TABLE announcements
  ADD COLUMN hidden_from_employees BOOLEAN NOT NULL DEFAULT FALSE AFTER status;
