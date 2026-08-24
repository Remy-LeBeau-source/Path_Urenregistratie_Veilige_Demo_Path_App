-- Herstel van de soort ontvanger bij boekhouder en salarisadministratie.
--
-- De kolom recipient_category bepaalt welke mailtekst iemand krijgt. De demo-seed
-- vulde hem niet, dus viel hij terug op de standaardwaarde 'other'. Gevolg: de
-- boekhouder kreeg de algemene tekst en niet de boekhoudertekst, en dat viel niet
-- op omdat er wel gewoon een mail uitging.
--
-- LET OP -- de migratieloper knipt dit bestand op puntkomma, ook binnen commentaar.
-- Gebruik hier dus geen puntkomma in een toelichting.
--
-- Alleen de twee vaste sleutels worden hersteld, en alleen wanneer er nog niets
-- bewusts is ingesteld. Een ontvanger die iemand zelf op 'Overig' heeft gezet
-- blijft dus staan zoals hij stond.
UPDATE mail_recipients
SET recipient_category = 'accounting'
WHERE recipient_key = 'bookkeeper' AND recipient_category = 'other';

UPDATE mail_recipients
SET recipient_category = 'payroll'
WHERE recipient_key = 'payroll' AND recipient_category = 'other';
