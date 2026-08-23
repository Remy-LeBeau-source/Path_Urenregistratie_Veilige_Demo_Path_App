-- De mails van Backoffice sluiten af met naam, bedrijf en e-mailadres. In de
-- echte handtekening van Path staan daar ook de website en de slogan onder.
-- Die twee stonden nergens, niet in de instellingen en niet in de database, dus
-- ze waren ook niet in een mail te gebruiken.
--
-- Het logo uit die handtekening blijft er bewust af. De mails gaan als platte
-- tekst de deur uit met de factuur als PDF-bijlage. Een afbeelding vraagt een
-- opgemaakte mail, en dat raakt de verzendlaag die nu bewezen werkt.
--
-- Let op bij het aanvullen van dit commentaar. De migratielezer knipt het
-- bestand op puntkomma's, ook binnen een toelichting, dus die horen hier niet
-- te staan.
ALTER TABLE companies
  ADD COLUMN website VARCHAR(190) NULL AFTER support_email,
  ADD COLUMN tagline VARCHAR(190) NULL AFTER website;
