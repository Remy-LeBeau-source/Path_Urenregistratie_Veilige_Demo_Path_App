-- Store the invoice-facing identity separately from the app brand.
ALTER TABLE companies
    ADD COLUMN invoice_name_display
        ENUM('trade_and_legal', 'legal_only') NOT NULL DEFAULT 'trade_and_legal'
        AFTER trade_name,
    ADD COLUMN invoice_phone VARCHAR(40) NULL AFTER city,
    ADD COLUMN invoice_email VARCHAR(190) NULL AFTER invoice_phone;
