-- Het contractveld bewaren.
--
-- Het formulier bood "Contract" aan (bijvoorbeeld "Vast · 36 uur"), bewaarde dat
-- in de browser, en verloor het bij een herlaad. Er was namelijk geen kolom voor.
-- Een veld dat lijkt op te slaan en dat niet doet is erger dan een veld dat er
-- niet is: je vult het in, ziet geen fout, en mist het pas veel later.
--
-- LET OP -- de migratieloper knipt dit bestand op puntkomma, ook binnen commentaar.
-- Gebruik hier dus geen puntkomma in een toelichting.
--
-- De app leidt uit deze tekst ook het aantal contracturen af, dus hij is niet
-- louter een label.
ALTER TABLE assignments
    ADD COLUMN contract_label VARCHAR(120) NULL AFTER hourly_rate;
