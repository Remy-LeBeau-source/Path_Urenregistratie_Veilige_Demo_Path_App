-- Per-assignment custom invoice subject and body templates.
-- If NULL the server falls back to MAIL_CHANNEL_TEMPLATES defaults.
ALTER TABLE assignments
  ADD COLUMN invoice_subject_template VARCHAR(250) NULL AFTER invoice_number_template,
  ADD COLUMN invoice_body_template    TEXT         NULL AFTER invoice_subject_template;

-- Seed per-medewerker demo templates from the agreed demo baseline.
UPDATE assignments SET
  invoice_subject_template = 'IND - factuur en uren {medewerker} - {maand} {jaar}',
  invoice_body_template    = 'Middag,\n\nHierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.\n\nDaadwerkelijk gewerkte uren: {uren} uur.'
WHERE id = 1 AND company_id = 1;

UPDATE assignments SET
  invoice_subject_template = 'Factuur en uren {medewerker} ({klant}) maand {maand} {jaar}',
  invoice_body_template    = 'Middag,\n\nHierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.\n\nDaadwerkelijk gewerkte uren: {uren} uur.'
WHERE id = 2 AND company_id = 1;

UPDATE assignments SET
  invoice_subject_template = 'Factuur en uren {medewerker} ({klant}) maand {maand} {jaar}',
  invoice_body_template    = 'Middag,\n\nHierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.\n\nDaadwerkelijk gewerkte uren: {uren} uur.'
WHERE id = 3 AND company_id = 1;

UPDATE assignments SET
  invoice_subject_template = '{factuurnummer} - {medewerker} - overeenkomst {overeenkomstnummer}',
  invoice_body_template    = 'Middag,\n\nHierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.\n\nDaadwerkelijk gewerkte uren: {uren} uur.'
WHERE id = 4 AND company_id = 1;
