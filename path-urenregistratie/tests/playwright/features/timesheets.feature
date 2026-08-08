Feature: Urenregistratie lifecycle via API
# Step definitions mapping: tests/playwright/steps/timesheets.steps.ts

  Scenario: [TS-API-001] Medewerker slaat concepturen op met versiebeheer
    Given een ingelogde medewerker met een schrijfbare testperiode
    When de medewerker save_draft uitvoert met geldige daguren
    Then wordt de urenstaat als draft opgeslagen met een nieuwe versie

  Scenario: [TS-API-001] Medewerker leest volledige conceptinhoud terug
    Given een bestaande draft urenstaat in de testperiode
    When de medewerker de urenstaat terugleest
    Then ziet de medewerker draftstatus dagregels correctiehistorie en laatste audit-event

  Scenario: [TS-API-001] Medewerker dient eigen uren in met versieverhoging
    Given een draft urenstaat van de ingelogde medewerker
    When de medewerker submit uitvoert
    Then wordt de urenstaat submitted met submitted_at en hogere versie

  Scenario: [TS-API-002] Medewerker kan geen uren van een andere medewerker aanpassen
    Given een ingelogde medewerker
    When de medewerker een andere employee_id probeert te schrijven
    Then krijgt de medewerker een forbidden response met scope-fout

  Scenario: [TS-API-001] Indienen schrijft audit-event voor traceerbaarheid
    Given een medewerker dient een draft urenstaat in
    When de urenstaat opnieuw wordt uitgelezen
    Then is het laatste audit-event timesheet.submitted

  Scenario: [TS-API-001] Ingediende urenstaat kan niet opnieuw als concept worden opgeslagen
    Given een ingediende urenstaat
    When de medewerker opnieuw save_draft of submit probeert
    Then krijgt de medewerker een conflictresponse

  Scenario: [TS-REV-API-001] Administrator vraagt correctie aan met optimistic locking
    Given een ingediende urenstaat met bekende versie
    When de administrator request_correction uitvoert met de juiste expected_version
    Then wordt de urenstaat correction met correctiebericht en audit-event

  Scenario: [TS-REV-API-001] Medewerker dient na correctieverzoek opnieuw in
    Given een urenstaat in correction met open correctieverzoek
    When de medewerker submit uitvoert met de juiste expected_version
    Then wordt de urenstaat opnieuw submitted en correctie als resubmitted gemarkeerd

  Scenario: [TS-REV-API-001] Administrator keurt heringediende uren goed met version check
    Given een ingediende urenstaat na herindiening met bekende versie
    When de administrator approve uitvoert met de juiste expected_version
    Then wordt de urenstaat approved met approved_at approved_by en audit-event

  Scenario: [TS-REV-API-001] Verouderde expected_version wordt geblokkeerd
    Given een ingediende urenstaat met bekende versie
    When request_correction of approve met verouderde expected_version wordt uitgevoerd
    Then krijgt de gebruiker een stale-version conflictresponse

  Scenario: [TS-REV-UI-001] Administrator vraagt via de browser-UI een correctie aan
    Given een medewerker heeft in de browser een ingediende urenstaat in de gekozen periode
    When de administrator opent goedkeuringen en kiest Correctie vragen met een verplichte toelichting
    Then ziet de medewerker in de urenweergave de status Correctie nodig met dezelfde toelichting

  Scenario: [TS-REV-UI-001] Medewerker dient na UI-correctie opnieuw in en administrator keurt goed
    Given een medewerker ziet in de browser een open correctieverzoek
    When de medewerker past uren aan en dient opnieuw in waarna de administrator goedkeurt
    Then ziet de medewerker in de browser de status Goedgekeurd voor dezelfde periode
