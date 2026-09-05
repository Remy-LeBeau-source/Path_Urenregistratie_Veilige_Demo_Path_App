-- Migratie 022 liet het logo bewust uit de mailhandtekening: een opgemaakte
-- (HTML) mail raakte de platte-tekst-verzendlaag die bewezen werkt voor
-- facturen en klanturenstaten. Dat risico blijft voor die kanalen gelden.
--
-- Voor de accountuitnodiging en wachtwoord-reset is er nu wel expliciet om
-- gevraagd: de handtekening met logo, net als de echte Path-huisstijl. Die
-- twee mails hebben geen PDF-bijlage en geen historie van verzendproblemen,
-- dus de HTML-tegenhanger wordt alleen voor het kanaal "password_reset"
-- opgeslagen en verstuurd. Elk ander kanaal blijft ongewijzigd platte tekst.
--
-- Let op bij het aanvullen van dit commentaar. De migratielezer knipt het
-- bestand op puntkomma's, ook binnen een toelichting, dus die horen hier niet
-- te staan.
ALTER TABLE email_deliveries
  ADD COLUMN html_snapshot MEDIUMTEXT NULL AFTER body_snapshot;
