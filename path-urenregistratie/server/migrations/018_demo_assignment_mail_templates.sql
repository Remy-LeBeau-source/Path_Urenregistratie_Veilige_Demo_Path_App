-- Reapply the agreed LOCAL/TEST per-assignment mail templates after demo reset.
UPDATE assignments SET
  invoice_subject_template = 'IND - factuur en uren {medewerker} - {maand} {jaar}',
  invoice_body_template = 'Middag,\n\nHierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.\n\nDaadwerkelijk gewerkte uren: {uren} uur.'
WHERE id = 1 AND company_id = 1;
UPDATE assignments SET
  invoice_subject_template = 'Factuur en uren {medewerker} ({klant}) maand {maand} {jaar}',
  invoice_body_template = 'Middag,\n\nHierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.\n\nDaadwerkelijk gewerkte uren: {uren} uur.'
WHERE id IN (2, 3) AND company_id = 1;
UPDATE assignments SET
  invoice_subject_template = '{factuurnummer} - {medewerker} - overeenkomst {overeenkomstnummer}',
  invoice_body_template = 'Middag,\n\nHierbij stuur ik de ureninformatie van {medewerker} over {maand} {jaar}.\n\nDaadwerkelijk gewerkte uren: {uren} uur.'
WHERE id = 4 AND company_id = 1;
