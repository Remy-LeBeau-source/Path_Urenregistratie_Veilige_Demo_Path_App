Feature: Urenregistratie lifecycle via API
# Step definitions mapping: tests/playwright/steps/timesheets.steps.ts
# Dit featurebestand dekt uren write-flow, review-flow en optimistic-locking gedrag.
# Hash-overzicht testcase-doel:
# [TS-API-H-001] Save draft slaat basisuren op met versiebeheer.
# [TS-API-H-002] Read-back toont inhoud en audittrail van draft.
# [TS-API-H-003] Submit verhoogt versie en zet status op submitted.
# [TS-API-N-001] Schrijven voor andere medewerker wordt geblokkeerd.
# [TS-API-H-004] Submit produceert traceerbaar audit-event.
# [TS-API-N-002] Gesloten status kan niet terug naar draft.
# [TS-REV-API-H-001] Admin vraagt correctie aan met expected_version.
# [TS-REV-API-H-002] Medewerker dient na correctie opnieuw in.
# [TS-REV-API-H-003] Admin keurt herindiening goed.
# [TS-REV-API-N-001] Verouderde expected_version geeft conflict.
# [TS-REV-UI-H-001] Correctieverzoek via UI wordt zichtbaar voor medewerker.
# [TS-REV-UI-H-002] Herindiening + goedkeuring via UI eindigt in Goedgekeurd.

  # Happy flows

  Scenario: [TS-API-H-001] Medewerker slaat concepturen op met versiebeheer
    Given een ingelogde medewerker met een schrijfbare testperiode zodat writes veilig uitgevoerd kunnen worden
    When de medewerker save_draft uitvoert met geldige daguren
    Then wordt de urenstaat als draft opgeslagen met een nieuwe versie zodat optimistic locking voorbereid is

  Scenario: [TS-API-H-002] Medewerker leest volledige conceptinhoud terug
    Given een bestaande draft urenstaat in de testperiode
    When de medewerker de urenstaat terugleest
    Then ziet de medewerker draftstatus dagregels correctiehistorie en laatste audit-event zodat traceerbaarheid compleet is

  Scenario: [TS-API-H-003] Medewerker dient eigen uren in met versieverhoging
    Given een draft urenstaat van de ingelogde medewerker
    When de medewerker submit uitvoert
    Then wordt de urenstaat submitted met submitted_at en hogere versie zodat de overgang controleerbaar is

  Scenario: [TS-API-H-004] Indienen schrijft audit-event voor traceerbaarheid
    Given een medewerker dient een draft urenstaat in
    When de urenstaat opnieuw wordt uitgelezen
    Then is het laatste audit-event timesheet.submitted zodat audittrail aantoonbaar klopt

  Scenario: [TS-REV-API-H-001] Administrator vraagt correctie aan met optimistic locking
    Given een ingediende urenstaat met bekende versie
    When de administrator request_correction uitvoert met de juiste expected_version
    Then wordt de urenstaat correction met correctiebericht en audit-event zodat het reviewpad aantoonbaar is

  Scenario: [TS-REV-API-H-002] Medewerker dient na correctieverzoek opnieuw in
    Given een urenstaat in correction met open correctieverzoek
    When de medewerker submit uitvoert met de juiste expected_version
    Then wordt de urenstaat opnieuw submitted en correctie als resubmitted gemarkeerd zodat de herstelcyclus sluit

  Scenario: [TS-REV-API-H-003] Administrator keurt heringediende uren goed met version check
    Given een ingediende urenstaat na herindiening met bekende versie
    When de administrator approve uitvoert met de juiste expected_version
    Then wordt de urenstaat approved met approved_at approved_by en audit-event zodat de finale status aantoonbaar is

  Scenario: [TS-REV-UI-H-001] Administrator vraagt via de browser-UI een correctie aan
    Given een medewerker heeft in de browser een ingediende urenstaat in de gekozen periode
    When de administrator opent goedkeuringen en kiest Correctie vragen met een verplichte toelichting
    Then ziet de medewerker in de urenweergave de status Correctie nodig met dezelfde toelichting zodat feedback 1-op-1 behouden blijft

  Scenario: [TS-REV-UI-H-002] Medewerker dient na UI-correctie opnieuw in en administrator keurt goed
    Given een medewerker ziet in de browser een open correctieverzoek
    When de medewerker past uren aan en dient opnieuw in waarna de administrator goedkeurt
    Then ziet de medewerker in de browser de status Goedgekeurd voor dezelfde periode zodat end-to-end UI-flow bevestigd is

  # Negative flows

  Scenario: [TS-API-N-001] Medewerker kan geen uren van een andere medewerker aanpassen
    Given een ingelogde medewerker
    When de medewerker een andere employee_id probeert te schrijven
    Then krijgt de medewerker een forbidden response met scope-fout zodat tenant-scope afgedwongen wordt

  Scenario: [TS-API-N-002] Ingediende urenstaat kan niet opnieuw als concept worden opgeslagen
    Given een ingediende urenstaat
    When de medewerker opnieuw save_draft of submit probeert
    Then krijgt de medewerker een conflictresponse zodat ongeldige statusovergangen worden geblokkeerd

  Scenario: [TS-REV-API-N-001] Verouderde expected_version wordt geblokkeerd
    Given een ingediende urenstaat met bekende versie
    When request_correction of approve met verouderde expected_version wordt uitgevoerd
    Then krijgt de gebruiker een stale-version conflictresponse zodat concurrency-fouten veilig worden afgewezen
