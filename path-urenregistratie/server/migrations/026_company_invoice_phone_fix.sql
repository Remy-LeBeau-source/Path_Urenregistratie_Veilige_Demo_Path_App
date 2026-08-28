-- Het factuur-telefoonnummer van de onderneming stond op een cijfer verkeerd.
--
-- Het moet 0646328286 zijn, niet 0646328283. De seed en de code zijn
-- bijgewerkt, maar op al gedeployde omgevingen staat de oude waarde nog in
-- companies.invoice_phone. Deze migratie corrigeert precies die ene waarde en
-- laat afwijkende of al goede nummers ongemoeid, dus hij is veilig herhaalbaar.
--
-- LET OP -- de migratieloper knipt dit bestand op puntkomma, ook binnen
-- commentaar. Gebruik hier dus geen puntkomma in een toelichting.
UPDATE companies
   SET invoice_phone = '0646328286'
 WHERE invoice_phone = '0646328283';
