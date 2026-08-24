-- Eigen standaardteksten per soort ontvanger.
--
-- Sinds de eenduidige regel geldt: is er bij een ontvanger niets ingevuld, dan
-- krijgt hij de standaardtekst van zijn soort. Daarmee is die standaardtekst het
-- belangrijkste geworden, en hij stond vast in server/mail/templates.php. Om te
-- veranderen wat de boekhouder leest, moest je in de code.
--
-- LET OP -- de migratieloper knipt dit bestand op puntkomma, ook binnen commentaar.
-- Gebruik hier dus geen puntkomma in een toelichting.
--
-- Er komt bewust geen rij per bedrijf bij het aanmaken. Ontbreekt de rij, dan geldt
-- de meegeleverde tekst uit templates.php. Wie niets aanpast loopt dus mee met
-- verbeteringen daaraan, en wie wel aanpast houdt zijn eigen tekst. Een lege tekst
-- betekent hetzelfde als geen rij.
CREATE TABLE IF NOT EXISTS mail_channel_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    channel VARCHAR(40) NOT NULL,
    subject_template VARCHAR(250) NULL,
    body_template TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_mail_channel_templates_company_channel (company_id, channel),
    CONSTRAINT fk_mail_channel_templates_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
